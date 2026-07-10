"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Heart,
  Instagram,
  Github,
} from "lucide-react";
import { BRAND, LINKS, INVITE_URL, SUPPORT_URL } from "@/lib/config";

const sections = [
  {
    title: "Producto",
    links: [
      { label: "Inicio", href: LINKS.home, external: false },
      { label: "Comandos", href: LINKS.commands, external: false },
      { label: "Dashboard", href: LINKS.dashboard, external: false },
      { label: "Añadir a Discord", href: INVITE_URL, external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Términos de Servicio", href: LINKS.terms, external: false },
      { label: "Política de Privacidad", href: LINKS.privacy, external: false },
    ],
  },
  {
    title: "Comunidad",
    links: [
      ...(SUPPORT_URL
        ? [{ label: "Servidor de Soporte", href: SUPPORT_URL, external: true }]
        : []),
      { label: "Instagram", href: BRAND.social.instagram, external: true },
      { label: "TikTok", href: BRAND.social.tiktok, external: true },
      { label: "GitHub", href: LINKS.github, external: true },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/5 bg-black/40 backdrop-blur-sm overflow-hidden mt-16">
      {/* Glow accents */}
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-discord/50 to-transparent" />
      <div className="pointer-events-none absolute -bottom-32 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-discord/5 rounded-full blur-[120px]" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 mb-5"
            >
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 bg-discord rounded-2xl blur-md opacity-60" />
                <Image
                  src="/avatar.png"
                  alt={BRAND.name}
                  width={48}
                  height={48}
                  className="relative rounded-2xl border border-white/10"
                />
              </div>
              <div>
                <div className="font-black text-xl tracking-tight">
                  System <span className="gradient-text-brand">777</span>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Sparkles size={11} className="text-yellow-400" />
                  {BRAND.author}
                </div>
              </div>
            </motion.div>

            <p className="text-sm text-gray-500 leading-relaxed max-w-sm mb-6">
              {BRAND.description}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-discord hover:bg-discord-dark transition-all duration-200 shadow-lg shadow-discord/20 hover:shadow-discord/40 hover:-translate-y-0.5"
              >
                <ShieldCheck size={15} />
                Agregar a Discord
                <ArrowUpRight
                  size={14}
                  className="opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                />
              </a>
              <Link
                href={LINKS.dashboard}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold glass glass-hover"
              >
                Dashboard
              </Link>
            </div>
          </div>

          {/* Spacer column for alignment on desktop */}
          <div className="hidden md:block md:col-span-1" />

          {/* Link sections */}
          {sections.map((s) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-2"
            >
              <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-[0.15em]">
                {s.title}
              </h3>
              <ul className="space-y-2.5 text-sm text-gray-500">
                {s.links.map((l) =>
                  l.external ? (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-white transition-colors"
                      >
                        {l.label}
                        <ArrowUpRight size={12} className="opacity-50" />
                      </a>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="hover:text-white transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-xs text-gray-600">
            <span>© {year} {BRAND.name}. Todos los derechos reservados.</span>
            <span className="hidden sm:block w-1 h-1 rounded-full bg-gray-700" />
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              Sistema operativo
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={BRAND.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="p-2 rounded-lg text-gray-500 hover:text-pink-400 hover:bg-white/5 transition-all"
            >
              <Instagram size={16} />
            </a>
            <a
              href={LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
            >
              <Github size={16} />
            </a>
            <span className="text-xs text-gray-700 hidden sm:inline-flex items-center gap-1.5 ml-2">
              Hecho con <Heart size={11} className="text-red-500 fill-red-500" /> por {BRAND.author}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
