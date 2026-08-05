import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { userEmails } from "@/db/schema";
import { provisionLogin } from "@/lib/auth-provision";

export const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

/** Email-only sign-in for local development. Never active in production. */
export const devLoginEnabled =
  process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN === "1";

const providers = [];
if (googleConfigured) providers.push(Google);
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Dev login",
      credentials: { email: { label: "Email" } },
      async authorize(credentials) {
        if (!devLoginEnabled) return null;
        const email = String(credentials?.email ?? "");
        const provisioned = await provisionLogin(email, {});
        if (!provisioned) return null;
        return { id: provisioned.userId, email: email.toLowerCase() };
      },
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async signIn({ user, account }) {
      // Dev login already provisioned in authorize().
      if (account?.provider === "dev-login") return true;
      if (!user.email) return false;
      const provisioned = await provisionLogin(user.email, {
        name: user.name,
        image: user.image,
      });
      return provisioned !== null;
    },
    async jwt({ token, user }) {
      // On sign-in, resolve the alias to our internal user id.
      if (user?.email) {
        const db = getDb();
        const [alias] = await db
          .select()
          .from(userEmails)
          .where(eq(userEmails.email, user.email.toLowerCase()));
        if (alias) token.userId = alias.userId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string;
      return session;
    },
  },
});
