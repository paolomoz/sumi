import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

// Test credentials provider - only active when TEST_USER_EMAIL is set
// and either in development or TEST_MODE is explicitly enabled
const isTestModeEnabled =
  process.env.TEST_USER_EMAIL &&
  (process.env.NODE_ENV !== "production" || process.env.TEST_MODE === "true");

const testCredentialsProvider = isTestModeEnabled
  ? Credentials({
      name: "Test Account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.email === process.env.TEST_USER_EMAIL &&
          credentials?.password === process.env.TEST_USER_PASSWORD
        ) {
          return {
            id: "test:123",
            name: "Test User",
            email: process.env.TEST_USER_EMAIL,
            image: null,
          };
        }
        return null;
      },
    })
  : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    GitHub({ checks: ["state"] }),
    ...(testCredentialsProvider ? [testCredentialsProvider] : []),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
        // For credentials provider, use the user.id directly
        if (account.provider === "credentials" && user?.id) {
          token.testUserId = user.id;
        }
      }
      if (user?.image) {
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      // Handle test user
      if (token.testUserId) {
        session.user.id = token.testUserId as string;
      } else if (token.provider && token.providerAccountId) {
        session.user.id = `${token.provider}:${token.providerAccountId}`;
      }
      if (token.picture) {
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
});
