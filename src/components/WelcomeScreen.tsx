// src/components/WelcomeScreen.tsx
"use client"; // Uses useState and event handlers

import React, { useState } from 'react'; // useEffect was in your original but not used, removed.
import { CEFRLevel } from '@/types'; // Updated path
import { CEFR_LEVELS_OPTIONS, DEFAULT_CEFR_LEVEL } from '@/constants'; // Updated path
import { Button } from '@/components/Button'; // Updated path
import { ptTranslations } from '@/localization/pt'; // Updated path

interface WelcomeScreenProps {
    onStart: (level: CEFRLevel) => void;
    prefilledStudentName?: string | null;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, prefilledStudentName }) => {
    const [level, setLevel] = useState<CEFRLevel>(DEFAULT_CEFR_LEVEL);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onStart(level);
    };

    return (
        <div className="text-center p-4">
            <h2 className="text-3xl font-semibold text-slate-100 mb-6 mt-8 md:mt-12">
                {ptTranslations.welcome_title}
            </h2>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
                {ptTranslations.welcome_subtitle}
            </p>

            {prefilledStudentName && (
                <div className="mb-6 text-left max-w-md mx-auto">
                    <p className="block text-sm font-medium text-slate-300 mb-1">
                        {ptTranslations.student_label || 'Student'}:
                    </p>
                    <p className="w-full px-4 py-2.5 bg-slate-600 border border-slate-500 rounded-lg text-slate-100 truncate">
                        {prefilledStudentName}
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
                <div>
                    <label htmlFor="level" className="block text-sm font-medium text-slate-300 mb-1 text-left">
                        {ptTranslations.target_cefr_level_label}
                    </label>
                    <select
                        id="level"
                        value={level}
                        onChange={(e) => setLevel(e.target.value as CEFRLevel)}
                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                        {CEFR_LEVELS_OPTIONS.map(lvl => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                    </select>
                </div>
                <Button type="submit" size="lg" className="w-full">
                    {ptTranslations.start_assessment_button}
                </Button>
            </form>
        </div>
    );
};