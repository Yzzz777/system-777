/**
 * Configuración central de System 777
 * Todo URL/branding pasa por aquí. No hardcodear en componentes.
 */

export const BRAND = {
  name: "System 777",
  short: "S777",
  tagline: "El bot definitivo para tu servidor de Discord",
  description:
    "Moderación avanzada, música, economía, niveles, tickets y protección anti-raid en un solo bot profesional.",
  author: "Developer 777",
  social: {
    instagram: "https://instagram.com/yzz.yzx",
    tiktok: "https://tiktok.com/@yzz.yzx",
    handle: "@yzz.yzx",
  },
} as const;

export const WEB_URL =
  process.env.NEXT_PUBLIC_WEB_URL ??
  "https://jrsystem777.com";

export const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID ?? "1502804306125132057";

export const BOT_API_URL =
  process.env.NEXT_PUBLIC_BOT_API_URL ?? "";

export const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&integration_type=0&scope=applications.commands+bot`;

export const SUPPORT_URL = process.env.NEXT_PUBLIC_SUPPORT_URL ?? "";

export const LINKS = {
  home: "/",
  commands: "/commands",
  dashboard: "/dashboard",
  terms: "/terms",
  privacy: "/privacy",
  invite: INVITE_URL,
  support: SUPPORT_URL,
  github: "https://jrsystem777.com",
} as const;

export const THEME = {
  primary: "#5865F2",
  accent: "#F5C518",
  bg: "#04040c",
} as const;
