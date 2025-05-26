// src/features/languageAssessment/LanguageAssessmentFlow.tsx
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import {
    CEFRLevel, SkillType, StudentAnswer, SectionResult, FinalReport, AnyQuestion,
    ReadingComprehensionTask, ListeningComprehensionTask, MultipleChoiceQuestionType,
    FillTheBlankQuestion, WritingTask, SpeakingTask
} from '@/types';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { AssessmentView } from '@/components/AssessmentView';
import { ReportView } from '@/components/ReportView';
import { Button } from '@/components/Button';
import {
    DEFAULT_CEFR_LEVEL, SKILLS_ORDER, RECORDING_MIME_TYPE,
} from '@/constants';
import { ptTranslations } from '@/localization/pt';

import { collection, addDoc, Timestamp, doc, setDoc } from "firebase/firestore";
import { db } from '@/services/firebaseConfig';

// Import Server Actions
import {
    generateQuestionsAction,
    assessStudentWritingAction,
    assessStudentSpeakingAction,
    generateComprehensiveReportAction,
    generateAudioFromDialogueAction // AssessmentView will need this
} from './actions'; // Assuming actions.ts is in the same directory

type LanguageAssessmentStage = 'welcome' | 'assessing' | 'report' | 'error' | 'initial_loading';

interface AppSessionUser {
    id?: string;
    name?: string | null;
    email?: string | null;
}

export const LanguageAssessmentFlow: React.FC = () => {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();

    // Initialize stage to 'initial_loading' to handle auth check explicitly
    const [stage, setStage] = useState<LanguageAssessmentStage>('initial_loading');
    const [selectedCefrLevel, setSelectedCefrLevel] = useState<CEFRLevel>(DEFAULT_CEFR_LEVEL);
    const [currentSkillIndex, setCurrentSkillIndex] = useState<number>(0);
    const [questionsForCurrentSkill, setQuestionsForCurrentSkill] = useState<AnyQuestion[]>([]);
    const [sectionResults, setSectionResults] = useState<SectionResult[]>([]);
    const [finalReport, setFinalReport] = useState<FinalReport | null>(null);

    const [isLoadingData, setIsLoadingData] = useState<boolean>(false); // For question/report generation
    const [isSubmittingSection, setIsSubmittingSection] = useState<boolean>(false); // For processing a section
    const [isSavingToDb, setIsSavingToDb] = useState<boolean>(false); // For Firebase save
    const [error, setError] = useState<string | null>(null);

    const currentSkill = SKILLS_ORDER[currentSkillIndex];
    const currentUser = session?.user as AppSessionUser | undefined;

    // Effect to handle initial stage setting based on auth status
    useEffect(() => {
        console.log("AuthStatus Effect: Current authStatus is", authStatus);
        if (authStatus === "loading") {
            setStage('initial_loading'); // Explicitly stay in initial_loading if auth is loading
        } else if (authStatus === "unauthenticated") {
            console.log("AuthStatus Effect: Unauthenticated, redirecting to login.");
            router.replace(`/login?callbackUrl=/language-assessment`);
        } else if (authStatus === "authenticated") {
            // Only transition to 'welcome' if we were in 'initial_loading' and are now authenticated.
            // If already in another stage (e.g. 'assessing'), don't revert to 'welcome'.
            if (stage === 'initial_loading') {
                console.log("AuthStatus Effect: Authenticated, setting stage to 'welcome'.");
                setStage('welcome');
            }
        }
    }, [authStatus, router, stage]);


    const loadQuestions = useCallback(async () => {
        if (!currentSkill || authStatus !== "authenticated") return;
        setIsLoadingData(true);
        setError(null);
        try {
            console.log(`LanguageAssessmentFlow: Calling Server Action for questions. Skill: ${currentSkill}, Level: ${selectedCefrLevel}`);
            const result = await generateQuestionsAction(currentSkill, selectedCefrLevel);
            if ('error' in result) throw new Error(result.error);
            setQuestionsForCurrentSkill(result);
        } catch (err) {
            console.error("LanguageAssessmentFlow: Error loading questions:", err);
            const skillName = ptTranslations[`skill_${currentSkill?.toLowerCase().replace(/\s+/g, '_') as keyof typeof ptTranslations}`] || currentSkill || "skill";
            if (err instanceof Error) {
                setError(ptTranslations.error_failed_to_load_questions(skillName as string) + ` (${err.message})`);
            } else {
                setError(ptTranslations.error_failed_to_load_questions(skillName as string) + ` (Unknown error)`);
            }
            setStage('error');
        } finally {
            setIsLoadingData(false);
        }
    }, [currentSkill, selectedCefrLevel, authStatus]);

    // Effect to load questions when stage is 'assessing' and conditions are met
    useEffect(() => {
        if (stage === 'assessing' && currentSkill && questionsForCurrentSkill.length === 0 && !isLoadingData && authStatus === "authenticated") {
            loadQuestions();
        }
    }, [stage, currentSkill, questionsForCurrentSkill.length, isLoadingData, loadQuestions, authStatus]);

    const handleStartAssessmentSession = (level: CEFRLevel) => {
        if (authStatus !== "authenticated" || !currentUser?.id) { // Simplified check, name/email are for display/logging
            setError("User not properly authenticated. Please log in again.");
            setStage('error');
            return;
        }
        console.log(`LanguageAssessmentFlow: Starting assessment for ${currentUser.name || 'User'} (ID: ${currentUser.id}) at level ${level}`);
        setSelectedCefrLevel(level);
        setCurrentSkillIndex(0);
        setSectionResults([]);
        setQuestionsForCurrentSkill([]);
        setFinalReport(null);
        setError(null);
        setIsLoadingData(false);
        setIsSubmittingSection(false);
        setIsSavingToDb(false);
        setStage('assessing'); // This will trigger the useEffect to load questions for the first skill
    };

    // processWritingAssessment, processSpeakingAssessment, processStandardSkillAssessment
    // remain largely the same, ensuring they use Server Actions and handle errors.
    const processWritingAssessment = async (questions: AnyQuestion[], answers: StudentAnswer[], level: CEFRLevel): Promise<SectionResult> => {
        const writingQuestion = questions[0] as WritingTask;
        const writingAnswer = answers.find(a => a.questionId === writingQuestion.id);
        let score = 0, feedback = "No answer provided.";
        if (writingAnswer?.answer && typeof writingAnswer.answer === 'string' && writingAnswer.answer.trim()) {
            const result = await assessStudentWritingAction(writingQuestion.questionText, writingAnswer.answer, level);
            if ('error' in result) throw new Error(result.error);
            score = result.score; feedback = result.feedback;
            if(writingAnswer) { writingAnswer.score = result.score; writingAnswer.feedback = result.feedback; }
        }
        return { skill: SkillType.WRITING, questions, answers: [writingAnswer!].filter(Boolean), score, feedback };
    };

    const processSpeakingAssessment = async (questions: AnyQuestion[], answers: StudentAnswer[], level: CEFRLevel): Promise<SectionResult> => {
        const speakingQuestion = questions[0] as SpeakingTask;
        const speakingAnswer = answers.find(a => a.questionId === speakingQuestion.id);
        let score = 0, feedback = "No audio provided.";
        if (speakingAnswer?.answer && typeof speakingAnswer.answer === 'string' && speakingAnswer.answer.length > 0) {
            const result = await assessStudentSpeakingAction(speakingQuestion.questionText, speakingAnswer.answer, RECORDING_MIME_TYPE, level);
            if ('error' in result) throw new Error(result.error);
            score = result.score; feedback = result.feedback;
            if(speakingAnswer) { speakingAnswer.score = result.score; speakingAnswer.feedback = result.feedback; }
        }
        return { skill: SkillType.SPEAKING, questions, answers: [speakingAnswer!].filter(Boolean), score, feedback };
    };

    const processStandardSkillAssessment = (skill: SkillType, questions: AnyQuestion[], answers: StudentAnswer[]): SectionResult => {
        // ... (Same client-side scoring logic as before)
        let actualQuestionsToGrade: AnyQuestion[] = questions;
        if ((skill === SkillType.READING || skill === SkillType.LISTENING) && questions.length > 0) {
            const mainTask = questions[0] as ReadingComprehensionTask | ListeningComprehensionTask;
            actualQuestionsToGrade = mainTask.subQuestions || [];
        }
        const gradedAnswers = answers.map(ans => {
            const question = actualQuestionsToGrade.find(q => q.id === ans.questionId);
            let isCorrect = false;
            if (question) {
                if ('correctAnswerId' in question && (question as MultipleChoiceQuestionType).options) {
                    isCorrect = ans.answer === (question as MultipleChoiceQuestionType).correctAnswerId;
                } else if ('correctAnswer' in question && typeof (question as FillTheBlankQuestion).correctAnswer === 'string') {
                    // Ensure ans.answer is also a string before comparing
                    isCorrect = typeof ans.answer === 'string' && ans.answer.trim().toLowerCase() === (question as FillTheBlankQuestion).correctAnswer.trim().toLowerCase();
                }
            }
            return { ...ans, isCorrect };
        });
        const correctCount = gradedAnswers.filter(a => a.isCorrect).length;
        const scoreVal = actualQuestionsToGrade.length > 0 ? (correctCount / actualQuestionsToGrade.length) * 100 : 0;
        return { skill, questions, answers: gradedAnswers, score: scoreVal };
    };


    const handleAnswersSubmitSession = async (skill: SkillType, questionsFromView: AnyQuestion[], answers: StudentAnswer[]) => {
        if (authStatus !== "authenticated" || !currentUser?.id) { /* ... error handling ... */ return; }

        setIsSubmittingSection(true);
        setError(null);
        try {
            let currentSectionResult: SectionResult;
            if (skill === SkillType.WRITING) currentSectionResult = await processWritingAssessment(questionsFromView, answers, selectedCefrLevel);
            else if (skill === SkillType.SPEAKING) currentSectionResult = await processSpeakingAssessment(questionsFromView, answers, selectedCefrLevel);
            else currentSectionResult = processStandardSkillAssessment(skill, questionsFromView, answers);

            const updatedSectionResults = [...sectionResults, currentSectionResult];
            setSectionResults(updatedSectionResults);

            if (currentSkillIndex < SKILLS_ORDER.length - 1) {
                setCurrentSkillIndex(prev => prev + 1);
                setQuestionsForCurrentSkill([]); // Trigger reload for next skill
            } else {
                setIsLoadingData(true); // For report generation
                const studentName = currentUser.name || "Student";
                const reportResult = await generateComprehensiveReportAction(studentName, updatedSectionResults, selectedCefrLevel);
                if ('error' in reportResult) throw new Error(reportResult.error);
                setFinalReport(reportResult as FinalReport);

                // Firebase save
                if (reportResult && currentUser.id && currentUser.email) {
                    setIsSavingToDb(true);
                    const assessmentData = { /* ... */
                        userId: currentUser.id, userEmail: currentUser.email, studentNameAtTimeOfAssessment: studentName,
                        assessmentDate: Timestamp.now(), targetCefrLevel: selectedCefrLevel, finalReport: { ...(reportResult as FinalReport) },
                    };
                    try {
                        await addDoc(collection(db, "languageAssessments"), assessmentData);
                        await setDoc(doc(db, "users", currentUser.id), {
                            email: currentUser.email, name: studentName, lastAssessmentDate: Timestamp.now(),
                        }, { merge: true });
                        setStage('report');
                    } catch (e) {
                        if (e instanceof Error) {
                            setError("Failed to save results: " + e.message);
                        } else {
                            setError("Failed to save results: Unknown error.");
                        }
                        setStage('report'); // Proceed to report stage even if save fails, error will be shown.
                    }
                    finally { setIsSavingToDb(false); }
                } else {
                    console.error("LanguageAssessmentFlow: Missing reportResult or user details for Firebase save.");
                    setError("Could not save results due to missing data. Please try again.");
                    setStage('report'); // Still go to report stage, but with an error.
                }
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(`Error processing ${skill}: ${err.message}`);
            } else {
                setError(`Error processing ${skill}: Unknown error occurred.`);
            }
            setStage('error');
        } finally {
            setIsSubmittingSection(false);
            if (currentSkillIndex >= SKILLS_ORDER.length - 1) setIsLoadingData(false); // Turn off general loader after report attempt
        }
    };

    const restartAssessmentSession = () => { /* ... same as before ... */
        setStage('initial_loading'); // Go back to initial loading to re-check auth then to welcome
        setSelectedCefrLevel(DEFAULT_CEFR_LEVEL);
        setCurrentSkillIndex(0);
        setQuestionsForCurrentSkill([]);
        setSectionResults([]);
        setFinalReport(null);
        setError(null);
        setIsLoadingData(false);
        setIsSubmittingSection(false);
        setIsSavingToDb(false);
        // The useEffect for authStatus will then transition to 'welcome' if authenticated
    };

    // --- Render Logic ---
    console.log("LAF Render - Stage:", stage, "AuthStatus:", authStatus, "isLoadingData:", isLoadingData, "isSubmitting:", isSubmittingSection, "isSavingToDb:", isSavingToDb, "Error:", error);

    const loadingSpinner = (message?: string) => (
        <div className="flex flex-col items-center justify-center h-64">
            <svg className="animate-spin h-12 w-12 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg text-slate-300">{message || ptTranslations.loading_please_wait}</p>
        </div>
    );

    if (stage === 'initial_loading' || authStatus === "loading") {
        return loadingSpinner("Verifying session...");
    }

    if (error && stage === 'error') {
        return (
            <div className="text-center p-4">
                <h2 className="text-2xl font-semibold text-red-400 mb-4">{ptTranslations.error_occurred_title}</h2>
                <p className="text-slate-300 mb-6 whitespace-pre-line">{error}</p>
                <Button onClick={restartAssessmentSession} className="px-6 py-3">{ptTranslations.try_again}</Button>
            </div>
        );
    }

    // This covers data loading for questions/report and saving to DB
    if (isLoadingData || isSavingToDb || isSubmittingSection) {
        let message = ptTranslations.loading_please_wait;
        if (isSavingToDb) message = ptTranslations.saving_results || "Saving results...";
        else if (isSubmittingSection) message = "Processing answers..."; // Add to ptTranslations if needed
        else if (isLoadingData && stage === 'assessing') message = ptTranslations.loading_questions_for_skill(currentSkill);
        else if (isLoadingData && currentSkillIndex >= SKILLS_ORDER.length -1) message = "Generating final report..."; // Add to ptTranslations
        return loadingSpinner(message);
    }

    // At this point, authStatus should be "authenticated" if no redirect occurred
    if (authStatus !== "authenticated") {
        // This is a fallback, useEffect should have redirected.
        // Could happen if router.replace hasn't completed.
        return loadingSpinner("Redirecting to login...");
    }

    if (stage === 'welcome') {
        return <WelcomeScreen
            onStart={handleStartAssessmentSession}
            prefilledStudentName={currentUser?.name}
        />;
    }

    if (stage === 'assessing' && currentSkill) {
        // Ensure questions are loaded before rendering AssessmentView
        if (questionsForCurrentSkill.length === 0 && !isLoadingData && !error) {
            // This might happen if loadQuestions was called but returned empty or failed silently
            // Or if component re-rendered before questions were set after loading.
            // The useEffect for loadQuestions should handle fetching.
            // If still no questions, it implies an issue or the first skill has no questions.
            console.warn("AssessmentView rendering: No questions loaded and not currently loading. Skill:", currentSkill);
            // It's possible the first skill is speaking, which might not have "questions" in the same way.
            // AssessmentView itself should handle its internal "no questions" state if applicable.
        }
        return (
            <AssessmentView
                skill={currentSkill}
                questions={questionsForCurrentSkill}
                onSubmit={handleAnswersSubmitSession}
                studentName={currentUser?.name || 'Student'}
                cefrLevel={selectedCefrLevel}
                currentProgress={(currentSkillIndex + 1) / SKILLS_ORDER.length * 100}
                onGenerateTTSAudio={generateAudioFromDialogueAction}
            />
        );
    }

    if (stage === 'report' && finalReport) {
        return (
            <div>
                {error && !isSavingToDb && ( // Show non-critical save error if it occurred
                    <p className="p-3 mb-4 text-center bg-red-600 text-white rounded-md shadow-lg">{error}</p>
                )}
                <ReportView report={finalReport} onRestart={restartAssessmentSession} />
            </div>
        );
    }

    console.error("LAF: Reached end of render logic without matching a stage. Stage:", stage, "Auth:", authStatus);
    return <div className="text-center p-4">An unexpected error occurred in the assessment flow. Please try restarting.</div>;
};
