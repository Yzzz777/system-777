import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";
import { BRAND, WEB_URL, THEME } from "@/lib/config";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: THEME.primary,
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  keywords: [
    "discord bot",
    "system 777",
    "moderación discord",
    "música discord",
    "economía discord",
    "tickets discord",
    "antiraid discord",
    "bot español",
    "dashboard discord",
    "bot premium",
  ],
  authors: [{ name: BRAND.author, url: WEB_URL }],
  creator: BRAND.author,
  publisher: BRAND.author,
  metadataBase: new URL(WEB_URL),
  alternates: { canonical: WEB_URL },
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    url: WEB_URL,
    siteName: BRAND.name,
    type: "website",
    locale: "es_ES",
    images: [
      {
        url: "/avatar.png",
        width: 512,
        height: 512,
        alt: `${BRAND.name} Bot`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    images: ["/avatar.png"],
    creator: BRAND.social.handle,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/avatar.png", type: "image/png" },
    ],
    apple: "/avatar.png",
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  category: "technology",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/avatar.png" />
      </head>
      <body
        className={`${inter.className} bg-[#04040c] text-white antialiased selection:bg-discord/40 selection:text-white`}
      >
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
