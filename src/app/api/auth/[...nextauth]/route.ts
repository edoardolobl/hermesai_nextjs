// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// Define a type for your user object if it has more fields than NextAuthUser
interface AppUser extends NextAuthUser {
    id: string;
    // You can add other custom fields like 'role' here later
    // role?: string;
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            // The name to display on the sign-in form (e.g., "Sign in with...")
            name: 'Credentials',
            // `credentials` is used to generate a suitable form on the sign-in page.
            // You can specify whatever fields you are expecting to be submitted.
            // e.g., domain, username, password, 2FA token, etc.
            // You can pass any HTML attribute to the <input> tag through the object.
            credentials: {
                email: { label: "Email", type: "email", placeholder: "user@example.com" },
                password: { label: "Password", type: "password" }
                // For students, we might later add a passcode field or have a separate provider
            },
            async authorize(credentials, _req): Promise<AppUser | null> {
                // IMPORTANT: This is where you'll add your own logic to look up the user
                // from the credentials they provided.
                //
                // For now, we'll implement a VERY simple "master admin" login for testing.
                // In a real application, you would:
                // 1. Validate credentials.email and credentials.password are not empty.
                // 2. Query your database (e.g., Firebase Firestore) for a user with this email.
                // 3. If user found, compare the hashed password from DB with the provided password.
                // 4. If student login, check email and temporary passcode.

                console.log("Auth.js: authorize function called with credentials:", credentials);

                // --- START: Temporary Master Admin Mock Authentication ---
                if (credentials?.email === "admin@example.com" && credentials?.password === "password") {
                    const user: AppUser = {
                        id: "admin001", // A unique ID for the user
                        name: "Master Admin",
                        email: "admin@example.com",
                        // image: null, // Optional: URL to user's profile picture
                        // role: "master_admin", // We can add roles later
                    };
                    console.log("Auth.js: Master Admin authenticated:", user);
                    return user; // Return the user object if authentication is successful
                }
                // --- END: Temporary Master Admin Mock Authentication ---

                // --- Placeholder for School Admin login (to be implemented later) ---
                // if (credentials?.email.endsWith("@school.com") && credentials?.password) {
                //   // Logic to check school admin credentials against your DB
                //   // const schoolAdminUser = await verifySchoolAdmin(credentials.email, credentials.password);
                //   // if (schoolAdminUser) return schoolAdminUser;
                // }

                // --- Placeholder for Student login (to be implemented later) ---
                // This might use the 'password' field for the temporary passcode.
                // if (credentials?.email && credentials?.password) { // 'password' here would be the passcode
                //   // Logic to check student email and passcode against your DB (mockDb for now, then Firebase)
                //   // const studentUser = await verifyStudent(credentials.email, credentials.password);
                //   // if (studentUser) return studentUser;
                // }

                console.log("Auth.js: Authentication failed for credentials:", credentials);
                // If you return null, then an error will be displayed to the user.
                return null;

                // You can also Reject this callback with an Error thus the user will be sent to the error page with the error message as a query parameter.
                // throw new Error("Invalid credentials");
            }
        })
        // We can add more providers here later (e.g., Google, GitHub, or other Credentials providers)
    ],
    session: {
        strategy: "jwt", // Use JSON Web Tokens for session management
    },
    callbacks: {
        async jwt({ token, user }) {
            // This callback is called whenever a JWT is created (i.e. on sign in)
            // or updated (i.e. whenever a session is accessed in the client).
            // `user` is only passed on sign-in.
            if (user) {
                token.id = (user as AppUser).id;
                // token.role = (user as AppUser).role; // Example if you add role to AppUser
            }
            return token;
        },
        async session({ session, token }) {
            // This callback is called whenever a session is checked.
            // By default, only a subset of the token is returned for increased security.
            // We want to pass an `id` (and potentially `role`) to the session object,
            // so it's available on the client via `useSession()`.
            if (session.user) {
                (session.user as AppUser).id = token.id as string;
                // (session.user as AppUser).role = token.role as string; // Example
            }
            return session;
        },
    },
    // You might want to specify pages if you create custom ones, otherwise NextAuth uses defaults
    // pages: {
    //   signIn: '/auth/signin', // Default path NextAuth creates if no custom page
    //   // error: '/auth/error', // Error code passed in query string as ?error=
    // },
    secret: process.env.NEXTAUTH_SECRET, // IMPORTANT: Add this to .env.local
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };