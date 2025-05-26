// src/components/ReportView.tsx
"use client"; // Has an onClick handler

import React from 'react';
import { FinalReport, SkillType } from '@/types'; // Updated path
import { Button } from '@/components/Button'; // Updated path
import { ptTranslations } from '@/localization/pt'; // Updated path

interface ReportViewProps {
    report: FinalReport;
    onRestart: () => void;
}

const getSkillColor = (skill: SkillType): string => {
    switch (skill) {
        case SkillType.VOCABULARY: return 'bg-blue-500';
        case SkillType.GRAMMAR: return 'bg-green-500';
        case SkillType.READING: return 'bg-indigo-500';
        case SkillType.LISTENING: return 'bg-purple-500';
        case SkillType.WRITING: return 'bg-pink-500';
        case SkillType.SPEAKING: return 'bg-teal-500';
        default: return 'bg-slate-500';
    }
};

export const ReportView: React.FC<ReportViewProps> = ({ report, onRestart }) => {
    return (
        <div className="p-2 md:p-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-100 mb-4">
                {ptTranslations.assessment_report_title}
            </h2>

            <div className="bg-slate-750 p-6 rounded-lg shadow-xl border border-slate-700 mb-8">
                <p className="text-xl text-slate-300 mb-1">
                    <span className="font-semibold text-slate-100">{ptTranslations.student_label}:</span> {report.studentName}
                </p>
                <p className="text-xl text-slate-300 mb-1">
                    <span className="font-semibold text-slate-100">{ptTranslations.target_level_label}:</span> {report.assessedCefrLevel}
                </p>
                <p className="text-2xl text-primary-400 font-bold">
                    <span className="font-semibold text-slate-100">{ptTranslations.overall_estimated_cefr_level_label}:</span> {report.overallEstimatedCefrLevel}
                </p>
            </div>

            {report.levelProgressionSuggestion && (
                <div className="bg-slate-700 p-5 rounded-lg shadow-lg border border-slate-600 mb-8">
                    <h3 className="text-xl font-semibold text-slate-100 mb-3">
                        {ptTranslations.level_progression_suggestion_title}
                    </h3>
                    <p className="text-slate-300 whitespace-pre-line">{report.levelProgressionSuggestion}</p>
                </div>
            )}

            <h3 className="text-2xl font-semibold text-slate-100 mb-6">
                {ptTranslations.skill_breakdown_title}
            </h3>
            <div className="space-y-6 mb-8">
                {report.skillSummaries.map((summary, index) => {
                    // Ensure summary.skill is a valid SkillType key for ptTranslations
                    const skillKey = summary.skill.toLowerCase().replace(/\s+/g, '_') as keyof typeof ptTranslations;
                    const translatedSkillName = ptTranslations[skillKey] || summary.skill;

                    return (
                        <div key={index} className="bg-slate-700 p-5 rounded-lg shadow-lg border border-slate-600">
                            <div className="flex items-center mb-3">
                                <span className={`w-4 h-4 rounded-full mr-3 ${getSkillColor(summary.skill)}`} aria-hidden="true"></span>
                                <h4 className="text-xl font-semibold text-primary-300">{translatedSkillName}</h4>
                                {summary.achievedLevel && (
                                    <span className="ml-auto text-sm font-medium bg-primary-700 text-primary-100 px-2.5 py-0.5 rounded-full">
                        {summary.achievedLevel === 'As targeted' ? ptTranslations.as_targeted_level : summary.achievedLevel}
                    </span>
                                )}
                                {summary.score !== undefined && (
                                    <span className={`ml-2 text-sm font-medium ${summary.score >= 70 ? 'text-green-400' : summary.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {summary.score.toFixed(0)}%
                  </span>
                                )}
                            </div>

                            <div className="grid md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <h5 className="font-semibold text-slate-300 mb-1">{ptTranslations.strengths_label}</h5>
                                    <p className="text-slate-400 whitespace-pre-line">{summary.strengths || ptTranslations.not_applicable_short}</p>
                                </div>
                                <div>
                                    <h5 className="font-semibold text-slate-300 mb-1">{ptTranslations.weaknesses_label}</h5>
                                    <p className="text-slate-400 whitespace-pre-line">{summary.weaknesses || ptTranslations.not_applicable_short}</p>
                                </div>
                                <div>
                                    <h5 className="font-semibold text-slate-300 mb-1">{ptTranslations.recommendations_label}</h5>
                                    <p className="text-slate-400 whitespace-pre-line">{summary.recommendations || ptTranslations.not_applicable_short}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {report.detailedFeedback && (
                <div className="bg-slate-700 p-5 rounded-lg shadow-lg border border-slate-600 mb-8">
                    <h3 className="text-xl font-semibold text-slate-100 mb-3">
                        {ptTranslations.overall_feedback_next_steps_title}
                    </h3>
                    <p className="text-slate-300 whitespace-pre-line">{report.detailedFeedback}</p>
                </div>
            )}

            <div className="text-center mt-10">
                <Button onClick={onRestart} size="lg">
                    {ptTranslations.start_new_assessment_button}
                </Button>
            </div>
        </div>
    );
};