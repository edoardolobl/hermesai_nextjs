// src/components/AssessmentView.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    AnyQuestion, SkillType, StudentAnswer, CEFRLevel,
    ReadingComprehensionTask, ListeningComprehensionTask
} from '@/types';
import { QuestionCard } from '@/components/QuestionCard';
import { Button } from '@/components/Button';
import { decodeBase64_client, decodePcmToAudioBuffer_client } from '@/utils/audioClientUtils';
import { AUDIO_SAMPLE_RATE, RECORDING_MIME_TYPE } from '@/constants';
import { ptTranslations } from '@/localization/pt';
import type { generateAudioFromDialogueAction } from '@/features/languageAssessment/actions';

interface AssessmentViewProps {
    skill: SkillType;
    questions: AnyQuestion[];
    onSubmit: (skill: SkillType, questions: AnyQuestion[], answers: StudentAnswer[]) => void;
    studentName: string;
    cefrLevel: CEFRLevel;
    currentProgress: number;
    onGenerateTTSAudio: typeof generateAudioFromDialogueAction;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const resultString = reader.result as string;
            const base64String = resultString?.split(',')[1];
            if (base64String) {
                resolve(base64String);
            } else {
                reject(new Error("Failed to convert blob to base64: result is null, empty, or invalid Data URL."));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
    });
};

export const AssessmentView: React.FC<AssessmentViewProps> = ({
                                                                  skill,
                                                                  questions,
                                                                  onSubmit,
                                                                  studentName,
                                                                  cefrLevel,
                                                                  currentProgress,
                                                                  onGenerateTTSAudio
                                                              }) => {
    console.log(`AssessmentView (Skill: ${skill}): Received questions prop:`, JSON.stringify(questions, null, 2)); // ADD THIS LINE

    const [currentAnswers, setCurrentAnswers] = useState<Map<string, string>>(new Map());
    const [currentSubQuestionIndex, setCurrentSubQuestionIndex] = useState(0);

    const [ttsAudioCache, setTtsAudioCache] = useState<Map<string, string>>(new Map());
    const [isTTSAudioLoading, setIsTTSAudioLoading] = useState(false);
    const [isTTSAudioPlaying, setIsTTSAudioPlaying] = useState(false);
    const [ttsAudioError, setTtsAudioError] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const currentTTSAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    const [isRecordedAudioPlaying, setIsRecordedAudioPlaying] = useState(false);
    const [recordingError, setRecordingError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    const displayableQuestions: AnyQuestion[] = useMemo(() => {
        if ((skill === SkillType.READING || skill === SkillType.LISTENING) && questions.length > 0) {
            const task = questions[0] as ReadingComprehensionTask | ListeningComprehensionTask;
            return task.subQuestions || [];
        }
        return questions;
    }, [skill, questions]);

    const mainTask: AnyQuestion | null = useMemo(() => {
        if ((skill === SkillType.READING || skill === SkillType.LISTENING || skill === SkillType.SPEAKING) && questions.length > 0) {
            return questions[0];
        }
        return null;
    }, [skill, questions]);

    const stopAndCleanupTTSAudio = useCallback(() => {
        if (currentTTSAudioSourceRef.current) {
            try { currentTTSAudioSourceRef.current.onended = null; currentTTSAudioSourceRef.current.stop(); }
            catch (e) { console.warn("Error stopping TTS audio source:", e); }
            currentTTSAudioSourceRef.current = null;
        }
        setIsTTSAudioPlaying(false);
    }, []);

    const cleanupMediaRecorder = useCallback(() => {
        if (mediaRecorderRef.current) {
            if (mediaRecorderRef.current.state === "recording") mediaRecorderRef.current.stop();
            mediaRecorderRef.current.ondataavailable = null; mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.onerror = null; mediaRecorderRef.current.onstart = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
    }, []);

    useEffect(() => {
        setCurrentAnswers(new Map()); setCurrentSubQuestionIndex(0);
        stopAndCleanupTTSAudio(); setTtsAudioError(null);
        cleanupMediaRecorder(); setIsRecording(false); setRecordedAudioBlob(null);
        if (recordedAudioUrl) { URL.revokeObjectURL(recordedAudioUrl); setRecordedAudioUrl(null); }
        setIsRecordedAudioPlaying(false); setRecordingError(null);
        audioChunksRef.current = [];
    }, [skill, questions, stopAndCleanupTTSAudio, cleanupMediaRecorder]);

    useEffect(() => {
        return () => {
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(err => console.error("Error closing AudioContext on unmount:", err));
            }
            if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
        };
    }, [recordedAudioUrl]);

    const initializeAudioContext = useCallback(async (): Promise<boolean> => {
        if (typeof window === "undefined") return false;
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            try { audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE }); }
            catch (e) { setTtsAudioError(ptTranslations.failed_to_initialize_audio); return false; }
        }
        if (audioContextRef.current.state === 'suspended') {
            try { await audioContextRef.current.resume(); }
            catch (err) { setTtsAudioError(ptTranslations.could_not_resume_audio); return false; }
        }
        return audioContextRef.current.state === 'running';
    }, []);

    const handlePlayDialogueAudio = useCallback(async () => {
        const currentListeningTask = mainTask as ListeningComprehensionTask;
        if (!currentListeningTask?.dialogueLines?.length) { setTtsAudioError(ptTranslations.no_dialogue_available); return; }
        if (isTTSAudioPlaying) { stopAndCleanupTTSAudio(); return; }
        if (isTTSAudioLoading) return;

        const dialogueCacheKey = JSON.stringify(currentListeningTask.dialogueLines);
        let base64AudioToPlay: string | undefined = ttsAudioCache.get(dialogueCacheKey);

        if (!base64AudioToPlay) {
            setIsTTSAudioLoading(true); setTtsAudioError(null);
            try {
                const result = await onGenerateTTSAudio(currentListeningTask.dialogueLines, currentListeningTask.speakerVoiceMap);
                if ('error' in result) throw new Error(result.error);
                base64AudioToPlay = result.audioBase64;
                setTtsAudioCache(prev => new Map(prev).set(dialogueCacheKey, base64AudioToPlay!));
            } catch (err: any) {
                setTtsAudioError(`${ptTranslations.audio_error_prefix}: ${err.message}`);
                stopAndCleanupTTSAudio(); setIsTTSAudioLoading(false); return;
            }
        }

        if (!base64AudioToPlay) { setIsTTSAudioLoading(false); return; }
        if (!await initializeAudioContext() || !audioContextRef.current) { setIsTTSAudioLoading(false); return; }

        setIsTTSAudioLoading(true);
        try {
            const pcmData = decodeBase64_client(base64AudioToPlay);
            const audioBuffer = await decodePcmToAudioBuffer_client(pcmData, audioContextRef.current, AUDIO_SAMPLE_RATE);

            if (currentTTSAudioSourceRef.current) currentTTSAudioSourceRef.current.stop();
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.start();
            currentTTSAudioSourceRef.current = source;
            setIsTTSAudioPlaying(true);
            source.onended = () => { setIsTTSAudioPlaying(false); currentTTSAudioSourceRef.current = null; };
        } catch (err: any) {
            setTtsAudioError(`${ptTranslations.audio_error_prefix}: ${err.message}`); stopAndCleanupTTSAudio();
        } finally {
            setIsTTSAudioLoading(false);
        }
    }, [mainTask, isTTSAudioPlaying, isTTSAudioLoading, initializeAudioContext, stopAndCleanupTTSAudio, onGenerateTTSAudio, ttsAudioCache]);

    const handleStartRecording = useCallback(async () => {
        if (isRecording || mediaRecorderRef.current?.state === "recording") return;
        setRecordingError(null); setRecordedAudioBlob(null);
        if (recordedAudioUrl) { URL.revokeObjectURL(recordedAudioUrl); setRecordedAudioUrl(null); }
        audioChunksRef.current = [];
        try {
            if (!MediaRecorder.isTypeSupported(RECORDING_MIME_TYPE)) { setRecordingError(ptTranslations.recording_format_not_supported_error(RECORDING_MIME_TYPE)); return; }
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, { mimeType: RECORDING_MIME_TYPE });
            mediaRecorderRef.current.onstart = () => setIsRecording(true);
            mediaRecorderRef.current.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
            mediaRecorderRef.current.onstop = () => {
                setIsRecording(false);
                if (audioChunksRef.current.length === 0) { setRecordingError(ptTranslations.no_audio_data_captured_error); return; }
                let audioBlobInstance: Blob;
                try { audioBlobInstance = new Blob(audioChunksRef.current, { type: RECORDING_MIME_TYPE }); }
                catch (error) { setRecordingError(ptTranslations.failed_to_process_recorded_audio_blob_error); cleanupMediaRecorder(); return; }
                if (audioBlobInstance.size === 0) { setRecordingError(ptTranslations.no_audio_data_captured_error); return; }
                setRecordedAudioBlob(audioBlobInstance);
                let tempAudioUrl: string;
                try { tempAudioUrl = URL.createObjectURL(audioBlobInstance); }
                catch (error) { setRecordingError(ptTranslations.failed_to_create_playable_url_error); cleanupMediaRecorder(); return; }
                setRecordedAudioUrl(tempAudioUrl);
                if (mainTask?.skill === SkillType.SPEAKING && mainTask.id) { setCurrentAnswers(prev => new Map(prev).set(mainTask!.id, "recorded")); }
            };
            mediaRecorderRef.current.onerror = (event) => { setRecordingError(`Recording error: ${(event as any).error?.name || 'Unknown'}`); setIsRecording(false); cleanupMediaRecorder(); };
            mediaRecorderRef.current.start();
        } catch (err: any) {
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") { setRecordingError(ptTranslations.microphone_permission_denied_error); }
            else if (err.name === "NotFoundError") { setRecordingError(ptTranslations.no_microphone_found_error); }
            else { setRecordingError(ptTranslations.could_not_start_recording_error(err.message)); }
            setIsRecording(false); cleanupMediaRecorder();
        }
    }, [isRecording, recordedAudioUrl, mainTask, cleanupMediaRecorder]);

    const handleStopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop(); // onstop will handle setIsRecording(false) and track cleanup
            if (mediaStreamRef.current) { // Proactive cleanup of stream tracks
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
                mediaStreamRef.current = null;
            }
        } else if (isRecording) { // Sync state if somehow out of sync
            setIsRecording(false);
        }
    }, [isRecording]);

    const handlePlayRecordedAudio = useCallback(() => {
        if (recordedAudioPlayerRef.current && recordedAudioUrl) {
            if(isRecordedAudioPlaying) { recordedAudioPlayerRef.current.pause(); recordedAudioPlayerRef.current.currentTime = 0; }
            else { recordedAudioPlayerRef.current.play().catch(error => { setRecordingError(ptTranslations.error_playing_recorded_audio(error.message)); setIsRecordedAudioPlaying(false); });}
        }
    }, [recordedAudioUrl, isRecordedAudioPlaying]);

    const handleRerecord = useCallback(() => {
        cleanupMediaRecorder(); setIsRecording(false);
        if (recordedAudioPlayerRef.current?.played && !recordedAudioPlayerRef.current.paused) { recordedAudioPlayerRef.current.pause(); setIsRecordedAudioPlaying(false); }
        setRecordedAudioBlob(null);
        if (recordedAudioUrl) { URL.revokeObjectURL(recordedAudioUrl); setRecordedAudioUrl(null); }
        audioChunksRef.current = []; setRecordingError(null);
        if (mainTask?.skill === SkillType.SPEAKING && mainTask.id) { setCurrentAnswers(prev => { const newMap = new Map(prev); newMap.delete(mainTask!.id); return newMap; }); }
    }, [recordedAudioUrl, isRecordedAudioPlaying, mainTask, cleanupMediaRecorder]);

    const handleAnswerChange = useCallback((questionId: string, answer: string) => { setCurrentAnswers(prev => new Map(prev).set(questionId, answer)); }, []);

    const handleSubmitSection = useCallback(async () => {
        stopAndCleanupTTSAudio();
        if (isRecording && mediaRecorderRef.current?.state === "recording") {
            handleStopRecording(); setRecordingError(ptTranslations.recording_stopped_submit_again_warning); return;
        }
        const answersToSubmit: StudentAnswer[] = [];
        if (skill === SkillType.SPEAKING) {
            if (mainTask && recordedAudioBlob) {
                try { answersToSubmit.push({ questionId: mainTask.id, answer: await blobToBase64(recordedAudioBlob) }); }
                catch (error: any) { setRecordingError(ptTranslations.failed_to_process_audio_for_submission_error + `: ${error.message}`); return; }
            } else if (mainTask) { answersToSubmit.push({ questionId: mainTask.id, answer: '', feedback: 'No audio recorded.' }); }
        } else if (skill === SkillType.READING || skill === SkillType.LISTENING) {
            displayableQuestions.forEach(q => answersToSubmit.push({ questionId: q.id, answer: currentAnswers.get(q.id) || '' }));
        } else {
            questions.forEach(q => answersToSubmit.push({ questionId: q.id, answer: currentAnswers.get(q.id) || '' }));
        }
        onSubmit(skill, questions, answersToSubmit);
    }, [skill, questions, displayableQuestions, currentAnswers, onSubmit, mainTask, recordedAudioBlob, isRecording, stopAndCleanupTTSAudio, handleStopRecording]);

    const handleNextSubQuestion = useCallback(() => {
        if (currentSubQuestionIndex < displayableQuestions.length - 1) { setCurrentSubQuestionIndex(prev => prev + 1); }
        else { handleSubmitSection(); }
    }, [currentSubQuestionIndex, displayableQuestions.length, handleSubmitSection]);

    const canProceed = useMemo((): boolean => {
        if (isTTSAudioPlaying || isTTSAudioLoading || isRecording) return false;
        if (skill === SkillType.SPEAKING) return !!recordedAudioBlob && !isRecording;
        if (skill === SkillType.READING || skill === SkillType.LISTENING) {
            const currentSubQ = displayableQuestions[currentSubQuestionIndex];
            return !!currentSubQ && (currentAnswers.get(currentSubQ.id) || '').trim() !== '';
        }
        if (skill === SkillType.WRITING && questions.length > 0) return (currentAnswers.get(questions[0]?.id) || '').trim() !== '';
        if ((skill === SkillType.VOCABULARY || skill === SkillType.GRAMMAR) && displayableQuestions.length > 0) {
            return displayableQuestions.every(q => (currentAnswers.get(q.id) || '').trim() !== '');
        }
        return false;
    }, [isTTSAudioPlaying, isTTSAudioLoading, isRecording, skill, recordedAudioBlob, displayableQuestions, currentSubQuestionIndex, currentAnswers, questions]);

    const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
        <div className="w-full bg-slate-700 rounded-full h-2.5 mb-6" title={`Progresso: ${progress.toFixed(0)}%`}>
            <div
                className="bg-primary-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} role="progressbar"
                aria-label={`${ptTranslations.assessment_progress || 'Assessment progress'}: ${progress.toFixed(0)}%`}
            ></div>
        </div>
    );
    const translatedSkillName = ptTranslations[`skill_${skill.toLowerCase().replace(/\s+/g, '_') as keyof typeof ptTranslations}`] || skill;

    if (!questions || (questions.length === 0 && !(skill === SkillType.SPEAKING && mainTask))) {
        return <div className="text-center p-8 text-slate-300">{ptTranslations.loading_questions_for_skill(translatedSkillName as string)}</div>;
    }

    return (
        <div className="p-2">
            <ProgressBar progress={currentProgress} />
            <h2 className="text-3xl font-semibold text-slate-100 mb-2">
                {ptTranslations.assessment_title_suffix} {translatedSkillName}
            </h2>
            <p className="text-slate-400 mb-6">
                {ptTranslations.student_label}: {studentName} | {ptTranslations.target_level_label}: {cefrLevel}
            </p>

            {mainTask && (skill === SkillType.READING || skill === SkillType.LISTENING) && (
                <div className="mb-6 p-4 bg-slate-750 rounded-lg border border-slate-700">
                    <h3 className="text-xl font-semibold text-slate-200 mb-3">
                        {mainTask.skill === SkillType.READING
                            ? ptTranslations.reading_passage_title
                            : (mainTask as ListeningComprehensionTask).dialogueTitle || ptTranslations.listening_dialogue_title }
                    </h3>
                    {mainTask.skill === SkillType.READING && <p className="text-slate-300 whitespace-pre-line mb-4">{(mainTask as ReadingComprehensionTask).passage}</p>}
                    {mainTask.skill === SkillType.LISTENING && (
                        <>
                            <div className="space-y-2 mb-4" aria-label="Transcrição do diálogo">
                                {(mainTask as ListeningComprehensionTask).dialogueLines.map((dialogueLine, idx) => (
                                    <p key={idx} className="text-slate-300"><span className="font-semibold text-primary-300">{dialogueLine.speaker}:</span> {dialogueLine.line}</p>
                                ))}
                            </div>
                            <Button onClick={handlePlayDialogueAudio} isLoading={isTTSAudioLoading} loadingText={ptTranslations.loading_audio_button}
                                    disabled={isTTSAudioLoading || !(mainTask as ListeningComprehensionTask).dialogueLines?.length }
                                    variant={isTTSAudioPlaying ? 'danger' : (isTTSAudioLoading ? 'secondary' : 'success')}
                                    className="mb-2 text-sm py-1.5 px-3"
                                    aria-label={isTTSAudioPlaying ? ptTranslations.stop_dialogue_button : ptTranslations.play_dialogue_button}>
                                {isTTSAudioPlaying ? ptTranslations.stop_dialogue_button : ptTranslations.play_dialogue_button}
                            </Button>
                        </>
                    )}
                    {ttsAudioError && <p className="text-sm text-red-400 mt-2 mb-2" role="alert">{ttsAudioError}</p>}
                </div>
            )}

            <div className="space-y-6">
                {displayableQuestions.length > 0 ? (
                    (skill === SkillType.READING || skill === SkillType.LISTENING) ? (
                        displayableQuestions[currentSubQuestionIndex] && (
                            <QuestionCard key={displayableQuestions[currentSubQuestionIndex].id} question={displayableQuestions[currentSubQuestionIndex]}
                                          questionIndex={currentSubQuestionIndex} totalQuestions={displayableQuestions.length}
                                          currentAnswer={currentAnswers.get(displayableQuestions[currentSubQuestionIndex].id)} onAnswerChange={handleAnswerChange} />
                        )
                    ) : (skill === SkillType.SPEAKING && mainTask) ? (
                        <QuestionCard key={mainTask.id} question={mainTask} questionIndex={0} totalQuestions={1}
                                      currentAnswer={recordedAudioBlob ? "recorded" : undefined} onAnswerChange={() => {}} />
                    ) : (
                        displayableQuestions.map((q, index) => (
                            <QuestionCard key={q.id} question={q} questionIndex={index} totalQuestions={displayableQuestions.length}
                                          currentAnswer={currentAnswers.get(q.id)} onAnswerChange={handleAnswerChange} />
                        ))
                    )
                ) : ( (skill !== SkillType.SPEAKING || !mainTask) &&
                    <p className="text-slate-400 text-center py-4">{ptTranslations.no_questions_available}</p>
                )}
            </div>

            {skill === SkillType.SPEAKING && mainTask && (
                <div className="mt-6 p-4 bg-slate-750 rounded-lg border border-slate-700">
                    <h4 className="text-lg font-semibold text-slate-200 mb-3">{ptTranslations.your_response_label}</h4>
                    <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                        {!isRecording && !recordedAudioUrl && (
                            <Button onClick={handleStartRecording} variant="success" aria-label={ptTranslations.start_recording_button}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2"><path d="M12 18.75a6 6 0 0 0 6-6v-1.5a.75.75 0 0 0-1.5 0v1.5a4.5 4.5 0 1 1-9 0v-1.5a.75.75 0 0 0-1.5 0v1.5a6 6 0 0 0 6 6Z" /><path d="M12 5.25a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6A.75.75 0 0 1 12 5.25Z" /></svg>{ptTranslations.start_recording_button}</Button>
                        )}
                        {isRecording && (
                            <Button onClick={handleStopRecording} variant="danger" aria-label={ptTranslations.stop_recording_button}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2"><path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3-3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" /></svg>{ptTranslations.stop_recording_button}</Button>
                        )}
                        {recordedAudioUrl && !isRecording && (
                            <>
                                <Button onClick={handlePlayRecordedAudio} variant="secondary" disabled={isRecordedAudioPlaying} aria-label={isRecordedAudioPlaying ? ptTranslations.playing_button : ptTranslations.playback_button}>{isRecordedAudioPlaying ? ptTranslations.playing_button : ptTranslations.playback_button}</Button>
                                <Button onClick={handleRerecord} variant="secondary" aria-label={ptTranslations.rerecord_button}>{ptTranslations.rerecord_button}</Button>
                            </>
                        )}
                    </div>
                    {isRecording && <p className="text-sm text-yellow-400 mt-2 animate-pulse">{ptTranslations.recording_in_progress_message}</p>}
                    {recordingError && <p className="text-sm text-red-400 mt-2" role="alert">{recordingError}</p>}
                    {recordedAudioUrl && !isRecording && !recordingError && <p className="text-sm text-green-400 mt-2" role="alert">{ptTranslations.audio_recorded_success_message}</p>}
                    {!isRecording && !recordedAudioUrl && !recordingError && <p className="text-sm text-slate-400 mt-2">{ptTranslations.click_start_recording_message}</p>}
                    <audio ref={recordedAudioPlayerRef} src={recordedAudioUrl || undefined} className="hidden"
                           onPlay={() => setIsRecordedAudioPlaying(true)} onPause={() => setIsRecordedAudioPlaying(false)}
                           onEnded={() => setIsRecordedAudioPlaying(false)} onError={() => setRecordingError(ptTranslations.error_playing_recorded_audio_generic)}
                           preload="auto" />
                </div>
            )}

            <div className="mt-8 flex justify-end space-x-4">
                {(skill === SkillType.READING || skill === SkillType.LISTENING) && displayableQuestions.length > 0 && currentSubQuestionIndex < displayableQuestions.length - 1 ? (
                    <Button onClick={handleNextSubQuestion} disabled={!canProceed()}>{ptTranslations.next_question_button}</Button>
                ) : (
                    (displayableQuestions.length > 0 || (skill === SkillType.WRITING && questions.length > 0) || (skill === SkillType.SPEAKING && mainTask != null)) &&
                    <Button onClick={handleSubmitSection} disabled={!canProceed} id="submit-section-button">{ptTranslations.submit_section_button}</Button>
                )}
            </div>
        </div>
    );
};
