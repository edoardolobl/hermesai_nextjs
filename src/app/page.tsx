// src/app/page.tsx
"use client"; // This page needs client-side hooks for session and routing

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ptTranslations } from '@/localization/pt'; // For loading message

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect until session status is definitively known
    if (status === "loading") {
      return; // Still loading session, do nothing yet
    }

    if (status === "authenticated") {
      console.log("RootPage: User authenticated, redirecting to /dashboard");
      router.replace('/dashboard');
    } else if (status === "unauthenticated") {
      console.log("RootPage: User unauthenticated, redirecting to /login");
      router.replace('/login');
    }
  }, [status, router]);

  // Display a loading message while session status is being determined or redirecting
  // This content will be briefly visible or not at all if redirection is fast.
  if (status === "loading" || (status === "authenticated" || status === "unauthenticated" && typeof window !== 'undefined')) {
    return (
        <div className="flex flex-col items-center justify-center h-64">
          <svg className="animate-spin h-12 w-12 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg text-slate-300">
            {ptTranslations.loading_please_wait || "Loading, please wait..."}
          </p>
        </div>
    );
  }

  // Fallback content, though ideally redirection should always happen.
  return null;
}