import type { NextAuthOptions } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";

export const authOptions: NextAuthOptions = {
  providers: [
    FacebookProvider({
      clientId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? "",
      clientSecret: process.env.FACEBOOK_APP_SECRET ?? "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET ?? "laptopflip-dev-secret-change-in-production",

  callbacks: {
    /**
     * JWT callback — runs on every sign-in and token refresh.
     * We store the FB access_token so the backend can use it for Graph API calls.
     */
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      return token;
    },

    /**
     * Session callback — makes the access_token available to client components.
     */
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.provider = token.provider as string;
      return session;
    },
  },

  pages: {
    // No custom sign-in page — uses the default NextAuth modal
    // We handle sign-in from our own UI via signIn("facebook")
  },

  // Use JWT strategy (no database session table needed)
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 days — matches long-lived FB token
  },
};

// Augment the default session types to include our custom fields
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    provider?: string;
  }
  interface User {
    facebookUserId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    provider?: string;
  }
}
