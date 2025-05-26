// src/app/dashboard/page.tsx
"use client"; // This page uses client-side hooks and event handlers

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/Button';
import { ptTranslations } from '@/localization/pt';

export default function DashboardPage() {
    const router = useRouter();
    const { data: session, status } = useSession({
        required: true, // Require authentication for this page
        onUnauthenticated() {
            // The user is not authenticated, handle accordingly
            router.replace('/login');
        },
    });

    const handleStartLanguageAssessment = () => {
        router.push('/language_assessment');
    };

    const handleStartLearnerProfile = () => {
        // router.push('/learner-profile'); // For future
        alert('Learner Profile Assessment - Not yet implemented!');
    };

    const handleLogout = async () => {
        await signOut({ redirect: true, callbackUrl: '/login' }); // Sign out and redirect to login
    };

    // Display loading state while session is being verified
    if (status === "loading") {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <svg className="animate-spin h-12 w-12 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-4 text-lg text-slate-300">{ptTranslations.loading_please_wait}</p>
            </div>
        );
    }

    // Ensure session is available before rendering page content
    if (!session?.user) {
        // This case should ideally be handled by the onUnauthenticated callback,
        // but it's a good fallback or if required:true is not used.
        return <p>Redirecting to login...</p>;
    }

    return (
        <div className="text-center p-4">
            <h2 className="text-3xl font-semibold text-slate-100 mb-4">
                {ptTranslations.dashboard_title || 'Student Dashboard'}
            </h2>
            {session?.user?.name && ( // Display user's name from session
                <p className="text-slate-300 mb-8">
                    {ptTranslations.welcome_message || 'Welcome,'} {session.user.name}!
                </p>
            )}
            <div className="space-y-4 max-w-md mx-auto">
                <Button onClick={handleStartLanguageAssessment} size="lg" className="w-full">
                    {ptTranslations.start_language_assessment_button || 'Start Language Assessment'}
                </Button>
                <Button onClick={handleStartLearnerProfile} size="lg" className="w-full" variant="secondary">
                    {ptTranslations.start_learner_profile_button || 'Start Learner Profile Assessment'}
                </Button>
                <Button onClick={handleLogout} variant="danger" className="w-full mt-8">
                    {ptTranslations.logout_button || 'Logout'}
                </Button>
            </div>
        </div>
    );
}