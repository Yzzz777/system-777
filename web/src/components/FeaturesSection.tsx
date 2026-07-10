"use client";

import { motion } from "framer-motion";
import {
  Shield, Music, Coins, TrendingUp, Ticket, Users,
  Zap, Bell, Lock, Star, Mic, BarChart3,
} from "lucide-react";

const FEATURES = [
  {
    icon: <Shield size={24} />,
    title: "Moderación Avanzada",
    desc: "Ban, kick, mute, warn, lockdown y más. Logs detallados de cada acción.",
    color: "from-red-500/20 to-orange-500/10",
    border: "border-red-500/20",
    iconColor: "text-red-400",
  },
  {
    icon: <Lock size={24} />,
    title: "Protección Anti-Raid",
    desc: "Sistema anti-nuke y anti-raid automático. Protege tu servidor 24/7.",
    color: "from-yellow-500/20 to-orange-500/10",
    border: "border-yellow-500/20",
    iconColor: "text-yellow-400",
  },
  {
    icon: <Music size={24} />,
    title: "Música de Alta Calidad",
    desc: "Reproduce desde YouTube, Spotify y SoundCloud con controles completos.",
    color: "from-green-500/20 to-teal-500/10",
    border: "border-green-500/20",
    iconColor: "text-green-400",
  },
  {
    icon: <Coins size={24} />,
    title: "Sistema de Economía",
    desc: "Balance, banco, trabajo, robos, slots y tabla de ricos.",
    color: "from-amber-500/20 to-yellow-500/10",
    border: "border-amber-500/20",
    iconColor: "text-amber-400",
  },
  {
    icon: <TrendingUp size={24} />,
    title: "Sistema de Niveles",
    desc: "XP por mensajes, rangos automáticos, leaderboard y recompensas.",
    color: "from-blue-500/20 to-cyan-500/10",
    border: "border-blue-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: <Ticket size={24} />,
    title: "Sistema de Tickets",
    desc: "Soporte privado con categorías, transcripts y panel configurable.",
    color: "from-purple-500/20 to-pink-500/10",
    border: "border-purple-500/20",
    iconColor: "text-purple-400",
  },
  {
    icon: <Bell size={24} />,
    title: "Bienvenidas & Despedidas",
    desc: "Mensajes personalizados al entrar y salir del servidor.",
    color: "from-pink-500/20 to-rose-500/10",
    border: "border-pink-500/20",
    iconColor: "text-pink-400",
  },
  {
    icon: <Star size={24} />,
    title: "Giveaways",
    desc: "Crea sorteos con duración, ganadores y requisitos personalizados.",
    color: "from-indigo-500/20 to-purple-500/10",
    border: "border-indigo-500/20",
    iconColor: "text-indigo-400",
  },
  {
    icon: <Zap size={24} />,
    title: "Comandos de Diversión",
    desc: "8ball, verdad o reto, memes, ship, poker y más de 20 comandos.",
    color: "from-cyan-500/20 to-sky-500/10",
    border: "border-cyan-500/20",
    iconColor: "text-cyan-400",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-20 px-4 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-black mb-4 gradient-text">
            Todo lo que necesitas
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Un bot completo con todas las funciones para tu comunidad en un solo lugar.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.5 }}
              className={`relative p-6 rounded-2xl border bg-gradient-to-br ${feat.color} ${feat.border} hover:scale-[1.02] hover:shadow-lg transition-all duration-300 cursor-default`}
            >
              <div className={`inline-flex p-2.5 rounded-xl bg-black/30 mb-4 ${feat.iconColor}`}>
                {feat.icon}
              </div>
              <h3 className="font-bold text-white mb-2">{feat.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
