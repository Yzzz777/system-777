import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

interface DiscordProfile {
  id: string;
  username: string;
  global_name?: string | null;
  avatar: string | null;
  discriminator: string;
}

const clientId =
  process.env.DISCORD_CLIENT_ID ?? process.env.CLIENT_ID ?? "";
const clientSecret =
  process.env.DISCORD_CLIENT_SECRET ?? process.env.CLIENT_SECRET ?? "";

if (!clientId || !clientSecret) {
  console.warn(
    "[auth] DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET no configurados — el login fallará."
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId,
      clientSecret,
      authorization: {
        params: { scope: "identify guilds email" },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.tokenExpires = account.expires_at
          ? account.expires_at * 1000
          : undefined;
        const dp = profile as DiscordProfile | undefined;
        token.id = dp?.id ?? token.sub;
        token.username = dp?.global_name ?? dp?.username ?? token.name;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      if (session.user) {
        session.user.id = token.id as string;
        if (token.username) session.user.name = token.username as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
