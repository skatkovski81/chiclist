import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Note: Removed PrismaAdapter - not needed for credentials-only auth with JWT
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[AUTH] Authorize called with email:", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log("[AUTH] Missing credentials");
          return null;
        }

        const email = (credentials.email as string).toLowerCase();
        console.log("[AUTH] Looking up user:", email);

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          console.log("[AUTH] User not found");
          return null;
        }

        if (!user.passwordHash) {
          console.log("[AUTH] User has no password hash");
          return null;
        }

        console.log("[AUTH] Comparing passwords...");
        try {
          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );
          console.log("[AUTH] Password valid:", isPasswordValid);

          if (!isPasswordValid) {
            console.log("[AUTH] Invalid password");
            return null;
          }
        } catch (error) {
          console.error("[AUTH] bcrypt.compare error:", error);
          return null;
        }

        console.log("[AUTH] Login successful for user:", user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && user.id) {
        token.id = user.id;
        console.log("[AUTH] JWT callback - added user id to token:", user.id);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async redirect({ baseUrl }) {
      return `${baseUrl}/dashboard`;
    },
  },
});
