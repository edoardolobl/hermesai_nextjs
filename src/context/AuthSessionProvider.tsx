// src/context/AuthSessionProvider.tsx
"use client"; // This component needs to be a Client Component

import { SessionProvider } from "next-auth/react";
import React from "react";

interface AuthSessionProviderProps {
    children: React.ReactNode;
}

export default function AuthSessionProvider({ children }: AuthSessionProviderProps) {
    // The SessionProvider from next-auth/react needs to be a child of your root layout,
    // and since it uses React Context, it's a Client Component.
    return <SessionProvider>{children}</SessionProvider>;
}