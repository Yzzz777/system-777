"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { INVITE_URL, BRAND } from "@/lib/config";

export default function Hero() {
  const inviteUrl = INVITE_URL;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px]" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-2xl opacity-40 scale-125 animate-pulse-slow" />
            <Image
              src="/avatar.png"
              alt="System 777"
              width={112}
              height={112}
              className="relative w-28 h-28 rounded-full border-2 border-white/10 shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://cdn.discordapp.com/embed/avatars/0.png";
              }}
            />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-400 rounded-full border-4 border-[#04040c] flex items-center justify-center">
              <div className="w-2 h-2 bg-green-200 rounded-full animate-ping" />
            </div>
          </div>
        </motion.div>

        {/* Status badge */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-gray-400 mb-8"
        >
          <Sparkles size={13} className="text-yellow-400" />
          Bot profesional para tu comunidad
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse ml-1" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-6xl sm:text-7xl md:text-9xl font-black leading-none mb-6 tracking-tighter"
        >
          <span className="gradient-text">SYSTEM</span>
          <br />
          <span className="gradient-text-brand">777</span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg sm:text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          El bot definitivo para tu servidor de Discord.
          Moderación avanzada, música, economía, niveles y protección anti-raid.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base overflow-hidden bg-discord hover:bg-discord-dark transition-all duration-300 shadow-lg hover:shadow-discord/30 hover:shadow-2xl hover:-translate-y-0.5"
          >
            Añadir al Servidor
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base glass glass-hover"
          >
            Panel de Control
          </Link>
          <Link
            href="/commands"
            className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-gray-400 hover:text-white transition-colors"
          >
            Ver Comandos
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-6 h-10 rounded-full border-2 border-white/10 flex items-start justify-center pt-2"
        >
          <div className="w-1 h-2 bg-white/30 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
