import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BOT_API = process.env.BOT_API_URL ?? process.env.NEXT_PUBLIC_BOT_API_URL ?? "";

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
}

interface BotGuild {
  id: string;
  name: string;
  icon: string | null;
  members: number;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!BOT_API) {
    return NextResponse.json(
      { error: "BOT_API_URL no configurada" },
      { status: 503 }
    );
  }

  try {
    const [userGuildsRes, botGuildsRes] = await Promise.all([
      fetch("https://discord.com/api/v10/users/@me/guilds", {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
      }),
      fetch(`${BOT_API}/api/public/guilds`, { cache: "no-store" }),
    ]);

    if (!userGuildsRes.ok) {
      return NextResponse.json(
        { error: "Discord rechazó el token" },
        { status: 401 }
      );
    }
    if (!botGuildsRes.ok) {
      return NextResponse.json(
        { error: "Bot offline" },
        { status: 502 }
      );
    }

    const userGuilds = (await userGuildsRes.json()) as DiscordGuild[];
    const botGuilds = (await botGuildsRes.json()) as BotGuild[];
    const botGuildIds = new Set(botGuilds.map((g) => g.id));

    const ADMIN = 0x8;
    const merged = userGuilds
      .filter((g) => (parseInt(g.permissions) & ADMIN) === ADMIN)
      .map((g) => {
        const bot = botGuilds.find((b) => b.id === g.id);
        return {
          id: g.id,
          name: g.name,
          icon: g.icon
            ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
            : null,
          members: bot?.members ?? 0,
          inBot: botGuildIds.has(g.id),
          isAdmin: true,
        };
      })
      .sort((a, b) => (b.inBot ? 1 : 0) - (a.inBot ? 1 : 0));

    return NextResponse.json(merged);
  } catch (e) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
