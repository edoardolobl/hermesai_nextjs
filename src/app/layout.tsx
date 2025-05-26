// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google"; // Your chosen fonts
import "./globals.css"; // Tailwind and global styles
import AuthSessionProvider from "@/context/AuthSessionProvider"; // Import the provider
import { Header } from "@/components/Header"; // We'll create/move this next
import { Footer } from "@/components/Footer"; // We'll create/move this next

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

// Update metadata for your app
export const metadata: Metadata = {
    title: "Hermes AI - Language Assessment", // Updated title
    description: "AI-powered language proficiency assessment.", // Updated description
    // You might want to add other metadata like icons later
    // icons: {
    //   icon: '/favicon.ico', // Assuming favicon.ico is in public or app folder
    // },
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body
            className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        >
        <AuthSessionProvider>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 flex flex-col items-center p-4">
                <Header />
                <main className="w-full max-w-4xl bg-slate-800 shadow-2xl rounded-lg p-6 md:p-10 my-8 flex-grow">
                    {children} {/* Page content will be rendered here */}
                </main>
                <Footer />
            </div>
        </AuthSessionProvider>
        </body>
        </html>
    );
}