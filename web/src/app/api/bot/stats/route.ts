import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BOT_API = process.env.BOT_API_URL ?? process.env.NEXT_PUBLIC_BOT_API_URL ?? "";

// Fallback para que la home siempre tenga stats aunque el bot no responda
const FALLBACK = {
  tag: "System 777#0000",
  avatar: "/avatar.png",
  guilds: 50,
  users: 5000,
  ping: 0,
  uptime: 0,
  memory: "0",
  online: true,
  commands: 80,
};

export async function GET() {
  if (!BOT_API) {
    return NextResponse.json(FALLBACK, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" },
    });
  }
  try {
    const r = await fetch(`${BOT_API}/api/public/stats`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (!r.ok) {
      return NextResponse.json(FALLBACK, {
        headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10" },
      });
    }
    const data = await r.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" },
    });
  } catch {
    return NextResponse.json(FALLBACK, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10" },
    });
  }
}
