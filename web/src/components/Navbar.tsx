"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LayoutDashboard, Terminal, LogOut, LogIn } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const links = [
    { href: "/", label: "Inicio" },
    { href: "/commands", label: "Comandos" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/60 backdrop-blur-xl border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 bg-discord rounded-full blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
              <Image
                src="/avatar.png"
                alt="System 777"
                width={36}
                height={36}
                className="relative rounded-full border border-white/10"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://cdn.discordapp.com/embed/avatars/0.png";
                }}
              />
            </div>
            <span className="font-black text-lg tracking-tight">
              System{" "}
              <span className="gradient-text-brand">777</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-discord hover:bg-discord-dark transition-colors"
                >
                  <LayoutDashboard size={15} />
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  aria-label="Cerrar sesión"
                >
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt="avatar"
                      width={24}
                      height={24}
                      className="rounded-full border border-white/10"
                      unoptimized
                    />
                  ) : null}
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn("discord")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-discord hover:bg-discord-dark transition-colors"
              >
                <LogIn size={15} />
                Iniciar sesión
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/80 backdrop-blur-xl border-b border-white/5"
          >
            <div className="px-4 py-4 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all font-medium"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-white/5">
                {session ? (
                  <button
                    onClick={() => { signOut(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <LogOut size={15} />
                    Cerrar sesión
                  </button>
                ) : (
                  <button
                    onClick={() => { signIn("discord"); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-discord hover:bg-discord-dark transition-colors"
                  >
                    <LogIn size={15} />
                    Iniciar sesión con Discord
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
