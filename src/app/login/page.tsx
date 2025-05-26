// src/app/login/page.tsx
"use client"; // This page is interactive and uses client-side state/hooks

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // For navigation and reading URL params
import { signIn, useSession } from 'next-auth/react'; // Auth.js hooks
import { Button } from '@/components/Button'; // Your Button component
import { ptTranslations } from '@/localization/pt'; // Your translations

// Define the component for the login page
export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, status } = useSession();

    const [email, setEmail] = useState('');
    const [passcode, setPasscode] = useState(''); // Using 'passcode' for the password field for now
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (status === "authenticated") {
            router.replace('/dashboard'); // Or wherever you want to redirect authenticated users
        }
    }, [status, router]);

    // Get error from query parameters (NextAuth.js can redirect with an error)
    useEffect(() => {
        const authError = searchParams.get('error');
        if (authError) {
            switch (authError) {
                case "CredentialsSignin":
                    setError(ptTranslations.error_login_failed || 'Login failed. Invalid email or passcode.');
                    break;
                default:
                    setError("An unknown authentication error occurred.");
                    break;
            }
        }
    }, [searchParams]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            // Use the signIn function from NextAuth.js
            const result = await signIn('credentials', {
                redirect: false, // We'll handle redirect manually or let NextAuth handle it based on callbackUrl
                email: email,
                password: passcode, // 'password' is the expected field name by CredentialsProvider
            });

            if (result?.error) {
                console.error("LoginPage: NextAuth signIn error", result.error);
                // Error messages can be more specific based on result.error
                if (result.error === "CredentialsSignin") {
                    setError(ptTranslations.error_login_failed || 'Login failed. Invalid email or passcode.');
                } else {
                    setError(`Authentication error: ${result.error}`);
                }
            } else if (result?.ok) {
                console.log('LoginPage: NextAuth signIn successful');
                // Successful sign-in, NextAuth typically handles redirection via callbackUrl
                // or we can push. If redirect is false, `result.url` will be null.
                // The useEffect for authenticated status will also trigger a redirect.
                router.push(searchParams.get('callbackUrl') || '/dashboard');
            }
        } catch (err) {
            console.error("LoginPage: handleSubmit unexpected error", err);
            setError("An unexpected error occurred during login.");
        } finally {
            setIsLoading(false);
        }
    };

    if (status === "loading" || status === "authenticated") {
        // Show loading state or null if redirecting
        return (
            <div className="flex-grow flex items-center justify-center">
                <p className="text-lg text-slate-300">{ptTranslations.loading_please_wait || "Loading..."}</p>
            </div>
        );
    }

    // Render the login form if not authenticated
    return (
        <div className="text-center p-4">
            <h2 className="text-3xl font-semibold text-slate-100 mb-6 mt-8 md:mt-12">
                {ptTranslations.login_title || 'Student Login'}
            </h2>
            <p className="text-slate-300 mb-8 max-w-md mx-auto">
                {ptTranslations.login_subtitle || 'Please enter your email and temporary passcode to access the assessments.'}
            </p>
            <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1 text-left">
                        {ptTranslations.email_label || 'Email Address'}
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
                        placeholder={ptTranslations.email_placeholder || 'your.email@example.com'}
                        required
                        aria-required="true"
                    />
                </div>
                <div>
                    <label htmlFor="passcode" className="block text-sm font-medium text-slate-300 mb-1 text-left">
                        {/* For students this will be "Temporary Passcode", for admins "Password" */}
                        {ptTranslations.passcode_label || 'Password / Passcode'}
                    </label>
                    <input
                        type="password"
                        id="passcode"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
                        placeholder={ptTranslations.passcode_placeholder || 'Enter your password or passcode'}
                        required
                        aria-required="true"
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-400 text-center" role="alert">
                        {error}
                    </p>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={isLoading || !email.trim() || !passcode.trim()} isLoading={isLoading}>
                    {ptTranslations.login_button || 'Login'}
                </Button>
            </form>
        </div>
    );
}