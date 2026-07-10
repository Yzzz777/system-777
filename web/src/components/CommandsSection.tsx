"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal } from "lucide-react";

const CATEGORIES = [
  {
    id: "moderation",
    label: "Moderación",
    emoji: "🛡️",
    commands: [
      { name: "ban", desc: "Banea a un usuario del servidor." },
      { name: "kick", desc: "Expulsa a un usuario del servidor." },
      { name: "mute", desc: "Silencia a un usuario por tiempo determinado." },
      { name: "warn", desc: "Advierte a un usuario con registro." },
      { name: "clear", desc: "Elimina mensajes en masa de un canal." },
      { name: "lockdown", desc: "Bloquea todos los canales del servidor." },
    ],
  },
  {
    id: "economy",
    label: "Economía",
    emoji: "💰",
    commands: [
      { name: "balance", desc: "Ver tu dinero en efectivo y banco." },
      { name: "daily", desc: "Recoge tu recompensa diaria." },
      { name: "work", desc: "Trabaja para ganar dinero." },
      { name: "rob", desc: "Intenta robar a otro usuario." },
      { name: "slots", desc: "Juega a las tragamonedas." },
      { name: "richlist", desc: "Los más ricos del servidor." },
    ],
  },
  {
    id: "music",
    label: "Música",
    emoji: "🎵",
    commands: [
      { name: "play", desc: "Reproduce una canción o playlist." },
      { name: "pause", desc: "Pausa la canción actual." },
      { name: "skip", desc: "Salta a la siguiente canción." },
      { name: "queue", desc: "Muestra la cola de reproducción." },
      { name: "volume", desc: "Ajusta el volumen del bot." },
      { name: "stop", desc: "Detiene la música y limpia la cola." },
    ],
  },
  {
    id: "fun",
    label: "Diversión",
    emoji: "🎮",
    commands: [
      { name: "8ball", desc: "Pregunta a la bola mágica." },
      { name: "meme", desc: "Obtén un meme aleatorio." },
      { name: "ship", desc: "Calcula la compatibilidad entre dos usuarios." },
      { name: "trivia", desc: "Pregunta de trivia aleatoria." },
      { name: "dare", desc: "Reto o verdad." },
      { name: "coinflip", desc: "Lanza una moneda." },
    ],
  },
  {
    id: "utility",
    label: "Utilidad",
    emoji: "🔧",
    commands: [
      { name: "userinfo", desc: "Información detallada de un usuario." },
      { name: "serverinfo", desc: "Información del servidor." },
      { name: "avatar", desc: "Muestra el avatar de un usuario." },
      { name: "botinfo", desc: "Estadísticas del bot." },
      { name: "ping", desc: "Latencia del bot." },
      { name: "help", desc: "Lista de todos los comandos." },
    ],
  },
];

export default function CommandsSection() {
  const [active, setActive] = useState("moderation");

  const current = CATEGORIES.find((c) => c.id === active)!;

  return (
    <section className="py-20 px-4" id="commands">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-black mb-4 gradient-text">
            Explora los comandos
          </h2>
          <p className="text-gray-500 text-lg">
            Más de 80 comandos listos para usar en tu servidor.
          </p>
        </motion.div>

        {/* Category tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActive(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                active === cat.id
                  ? "bg-discord text-white shadow-lg shadow-discord/30"
                  : "glass text-gray-400 hover:text-white"
              }`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Commands grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {current.commands.map((cmd) => (
              <div
                key={cmd.name}
                className="glass glass-hover rounded-xl p-4 flex items-start gap-3"
              >
                <Terminal size={15} className="text-discord mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-mono font-bold text-white text-sm">
                    /{cmd.name}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {cmd.desc}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <a
            href="/commands"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass glass-hover text-gray-400 hover:text-white text-sm font-medium"
          >
            Ver todos los comandos →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
