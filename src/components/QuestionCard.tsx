// src/components/QuestionCard.tsx
"use client"; // Contains interactive form elements and event handlers

import React from 'react';
import {
    AnyQuestion, MultipleChoiceQuestionType, FillTheBlankQuestion,
    ReadingComprehensionTask, WritingTask,
    SpeakingTask, QuestionOption, SkillType
} from '@/types'; // Updated path
import { ptTranslations } from '@/localization/pt'; // Updated path

interface MultipleChoiceOptionsProps {
    options: QuestionOption[];
    questionId: string;
    selectedAnswer: string | undefined;
    onAnswerChange: (questionId: string, answer: string) => void;
}

const MultipleChoiceOptions: React.FC<MultipleChoiceOptionsProps> = ({
                                                                         options,
                                                                         questionId,
                                                                         selectedAnswer,
                                                                         onAnswerChange,
                                                                     }) => (
    <div className="space-y-3 mt-4">
        {options.map((option) => (
            <label
                key={option.id}
                className={`block w-full p-3 border rounded-lg cursor-pointer transition-all duration-150 ease-in-out
                    ${selectedAnswer === option.id
                    ? 'bg-primary-600 border-primary-500 text-white ring-2 ring-primary-500'
                    : 'bg-slate-700 border-slate-600 hover:bg-slate-600 hover:border-slate-500 text-slate-100'}`}
            >
                <input
                    type="radio"
                    name={questionId} // Ensure unique name for radio group per question
                    value={option.id}
                    checked={selectedAnswer === option.id}
                    onChange={() => onAnswerChange(questionId, option.id)}
                    className="sr-only"
                    aria-labelledby={`<span class="math-inline">\{questionId\}\-option\-</span>{option.id}-label`}
                />
                <span id={`<span class="math-inline">\{questionId\}\-option\-</span>{option.id}-label`}><span className="font-medium">{option.id}.</span> {option.text}</span>
            </label>
        ))}
    </div>
);

interface QuestionCardProps {
    question: AnyQuestion;
    questionIndex: number;
    totalQuestions: number;
    currentAnswer: string | undefined;
    onAnswerChange: (questionId: string, answer: string) => void;
    // Speaking related props are mostly for AssessmentView to manage,
    // QuestionCard just displays the prompt for speaking.
    isRecording?: boolean;
    recordedAudioUrl?: string | null;
    onStartRecording?: () => void;
    onStopRecording?: () => void;
    onPlayRecording?: () => void;
    onRerecord?: () => void;
    isAudioPlaying?: boolean;
    audioRecordingError?: string | null;
}

export const QuestionCard: React.FC<QuestionCardProps> = React.memo(({
                                                                         question,
                                                                         questionIndex,
                                                                         totalQuestions,
                                                                         currentAnswer,
                                                                         onAnswerChange,
                                                                         // Speaking props are not directly used for rendering controls here
                                                                     }) => {

    const renderQuestionContent = () => {
        const q = question; // Alias for brevity

        // Check for MultipleChoiceQuestionType
        if ('options' in q && Array.isArray((q as MultipleChoiceQuestionType).options) && 'correctAnswerId' in q) {
            return (
                <MultipleChoiceOptions
                    options={(q as MultipleChoiceQuestionType).options}
                    questionId={q.id}
                    selectedAnswer={currentAnswer}
                    onAnswerChange={onAnswerChange}
                />
            );
        }

        // Check for FillTheBlankQuestion
        // (Identified by having `correctAnswer` and no `options` array)
        if ('correctAnswer' in q && !('options' in q)) {
            const ftb = q as FillTheBlankQuestion;
            return (
                <input
                    type="text"
                    value={currentAnswer || ''}
                    onChange={(e) => onAnswerChange(ftb.id, e.target.value)}
                    className="w-full mt-4 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
                    placeholder={ptTranslations.answer_placeholder}
                    aria-label={`Answer for question: ${q.questionText}`}
                />
            );
        }

        // Check for WritingTask
        if (q.skill === SkillType.WRITING) {
            const writingTask = q as WritingTask;
            return (
                <div className="mt-4">
                    {writingTask.taskDescription && <p className="text-sm text-slate-400 mb-2">{writingTask.taskDescription}</p>}
                    <textarea
                        value={currentAnswer || ''}
                        onChange={(e) => onAnswerChange(writingTask.id, e.target.value)}
                        rows={8}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
                        placeholder={ptTranslations.writing_response_placeholder}
                        aria-label={`Response for writing task: ${writingTask.questionText}`}
                    />
                </div>
            );
        }

        // For SpeakingTask, just display prompt and description. Controls are in AssessmentView.
        if (q.skill === SkillType.SPEAKING) {
            const speakingTask = q as SpeakingTask;
            return (
                <div className="mt-4">
                    {speakingTask.taskDescription && <p className="text-sm text-slate-400 mb-3">{speakingTask.taskDescription}</p>}
                    {/* Recording controls are handled by AssessmentView */}
                </div>
            );
        }

        // For ReadingComprehensionTask, display the passage. Sub-questions are rendered individually by AssessmentView.
        // This QuestionCard instance would be for the main task prompt itself, not the sub-questions.
        if (q.skill === SkillType.READING && 'passage' in q) {
            const readingTask = q as ReadingComprehensionTask;
            return (
                <div className="mt-4 space-y-6">
                    <div className="p-4 bg-slate-700 rounded-lg prose prose-invert max-w-none">
                        <h4 className="text-sm font-semibold text-slate-400 mb-2">{ptTranslations.reading_passage_card_title}</h4>
                        <p className="text-slate-200 whitespace-pre-line">{readingTask.passage}</p>
                    </div>
                    {/* Sub-questions are handled by AssessmentView, rendering separate QuestionCard instances for each sub-question */}
                </div>
            );
        }

        // For ListeningComprehensionTask, usually AssessmentView handles TTS controls and renders sub-questions.
        // This card might just show a general prompt if the main task itself is passed here.
        if (q.skill === SkillType.LISTENING && 'dialogueLines' in q) {
            // Typically, AssessmentView would render QuestionCards for sub-questions of Listening tasks.
            // If this QuestionCard is for the main listening task prompt itself, no interactive element here.
            // Or, if it's a sub-question of a listening task, it would be an MCQ.
            return null; // Or a generic message if this specific case needs one
        }

        // Fallback if no specific renderer matches (should ideally not happen with well-defined types)
        return <p className="text-red-400 mt-4">{ptTranslations.interactive_component_not_available}</p>;
    };

    return (
        <div className="bg-slate-750 p-6 rounded-lg shadow-lg border border-slate-700">
            <p className="text-sm font-medium text-primary-400 mb-2" aria-live="polite">
                {ptTranslations.question_count_of_total(questionIndex + 1, totalQuestions)}
            </p>
            <h3 className="text-xl font-semibold text-slate-100 mb-1 whitespace-pre-line">{question.questionText}</h3>
            {renderQuestionContent()}
        </div>
    );
});
QuestionCard.displayName = 'QuestionCard';