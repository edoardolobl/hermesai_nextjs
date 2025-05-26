// src/services/firebaseConfig.ts
import { initializeApp, FirebaseApp } from "firebase/app";
// It's good practice to import specific services you need, e.g., getFirestore, getAuth
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
// import { getAnalytics, Analytics } from "firebase/analytics"; // Only if you use analytics

// Construct the Firebase configuration object using Next.js public environment variables
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
// let analytics: Analytics | null = null; // Declare analytics if you plan to use it

// Check if Firebase has already been initialized
// This is less of an issue with Next.js module system compared to some older setups,
// but good practice if this file could somehow be imported multiple times causing re-init.
// However, standard ES module imports usually handle this.
// For simplicity, direct initialization is often fine in Next.js.

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    // if (firebaseConfig.measurementId) {
    //   analytics = getAnalytics(app);
    // }
    console.log("Firebase initialized with Project ID:", firebaseConfig.projectId);
} catch (error) {
    if (error instanceof Error) {
        console.error("Error initializing Firebase:", error.message);
    } else {
        console.error("Error initializing Firebase: An unknown error occurred", error);
    }
    // Fallback or rethrow, depending on how critical Firebase is at startup
    // For now, we'll let it throw if config is totally missing,
    // but if it's just an issue with a specific service, you might want to handle it.
    // A more robust approach might be to check if apps are already initialized:
    // import { getApps, getApp } from "firebase/app";
    // if (!getApps().length) {
    //   app = initializeApp(firebaseConfig);
    // } else {
    //   app = getApp();
    // }
    // For now, the direct initializeApp is fine.
    throw error; // Re-throw if initialization fails critically
}


// Export the Firebase services you'll need
export { app, db, auth };
// export { analytics }; // Export if used