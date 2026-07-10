"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Search } from "lucide-react";
import Footer from "@/components/Footer";

const ALL_COMMANDS = [
  // Moderación
  { category: "Moderación", emoji: "🛡️", name: "ban", desc: "Banea a un usuario del servidor.", usage: "/ban @usuario [razón]" },
  { category: "Moderación", emoji: "🛡️", name: "kick", desc: "Expulsa a un usuario del servidor.", usage: "/kick @usuario [razón]" },
  { category: "Moderación", emoji: "🛡️", name: "mute", desc: "Silencia a un usuario por tiempo determinado.", usage: "/mute @usuario [tiempo] [razón]" },
  { category: "Moderación", emoji: "🛡️", name: "unmute", desc: "Quita el silencio a un usuario.", usage: "/unmute @usuario" },
  { category: "Moderación", emoji: "🛡️", name: "warn", desc: "Advierte a un usuario con registro.", usage: "/warn @usuario [razón]" },
  { category: "Moderación", emoji: "🛡️", name: "warns", desc: "Ver advertencias de un usuario.", usage: "/warns @usuario" },
  { category: "Moderación", emoji: "🛡️", name: "clear", desc: "Elimina mensajes en masa.", usage: "/clear [cantidad]" },
  { category: "Moderación", emoji: "🛡️", name: "lockdown", desc: "Bloquea/desbloquea canales.", usage: "/lockdown [on|off]" },
  { category: "Moderación", emoji: "🛡️", name: "slowmode", desc: "Activa modo lento en un canal.", usage: "/slowmode [segundos]" },
  // Protección
  { category: "Protección", emoji: "🔒", name: "antinuke", desc: "Activa protección anti-nuke.", usage: "/antinuke [on|off]" },
  { category: "Protección", emoji: "🔒", name: "antiraid", desc: "Activa protección anti-raid.", usage: "/antiraid [on|off]" },
  { category: "Protección", emoji: "🔒", name: "whitelist", desc: "Gestiona la whitelist del servidor.", usage: "/whitelist add|remove @usuario" },
  // Economía
  { category: "Economía", emoji: "💰", name: "balance", desc: "Ver tu dinero en efectivo y banco.", usage: "/balance [@usuario]" },
  { category: "Economía", emoji: "💰", name: "daily", desc: "Recoge tu recompensa diaria.", usage: "/daily" },
  { category: "Economía", emoji: "💰", name: "work", desc: "Trabaja para ganar dinero.", usage: "/work" },
  { category: "Economía", emoji: "💰", name: "rob", desc: "Intenta robar a otro usuario.", usage: "/rob @usuario" },
  { category: "Economía", emoji: "💰", name: "slots", desc: "Juega a las tragamonedas.", usage: "/slots [apuesta]" },
  { category: "Economía", emoji: "💰", name: "richlist", desc: "Los más ricos del servidor.", usage: "/richlist" },
  { category: "Economía", emoji: "💰", name: "pay", desc: "Transfiere dinero a otro usuario.", usage: "/pay @usuario [cantidad]" },
  { category: "Economía", emoji: "💰", name: "bank", desc: "Deposita o retira dinero del banco.", usage: "/bank deposit|withdraw [cantidad]" },
  // Música
  { category: "Música", emoji: "🎵", name: "play", desc: "Reproduce una canción o playlist.", usage: "/play [búsqueda o URL]" },
  { category: "Música", emoji: "🎵", name: "pause", desc: "Pausa la canción actual.", usage: "/pause" },
  { category: "Música", emoji: "🎵", name: "skip", desc: "Salta a la siguiente canción.", usage: "/skip" },
  { category: "Música", emoji: "🎵", name: "queue", desc: "Muestra la cola de reproducción.", usage: "/queue" },
  { category: "Música", emoji: "🎵", name: "volume", desc: "Ajusta el volumen del bot.", usage: "/volume [1-100]" },
  { category: "Música", emoji: "🎵", name: "stop", desc: "Detiene la música y limpia la cola.", usage: "/stop" },
  // Niveles
  { category: "Niveles", emoji: "⭐", name: "rank", desc: "Ver tu rango y nivel.", usage: "/rank [@usuario]" },
  { category: "Niveles", emoji: "⭐", name: "leaderboard", desc: "Tabla de clasificación de niveles.", usage: "/leaderboard" },
  // Diversión
  { category: "Diversión", emoji: "🎮", name: "8ball", desc: "Pregunta a la bola mágica.", usage: "/8ball [pregunta]" },
  { category: "Diversión", emoji: "🎮", name: "meme", desc: "Obtén un meme aleatorio.", usage: "/meme" },
  { category: "Diversión", emoji: "🎮", name: "ship", desc: "Compatibilidad entre dos usuarios.", usage: "/ship @usuario1 @usuario2" },
  { category: "Diversión", emoji: "🎮", name: "trivia", desc: "Pregunta de trivia aleatoria.", usage: "/trivia" },
  { category: "Diversión", emoji: "🎮", name: "coinflip", desc: "Lanza una moneda.", usage: "/coinflip" },
  { category: "Diversión", emoji: "🎮", name: "dare", desc: "Reto o verdad.", usage: "/dare" },
  { category: "Diversión", emoji: "🎮", name: "hack", desc: "\"Hackea\" a un usuario (broma).", usage: "/hack @usuario" },
  { category: "Diversión", emoji: "🎮", name: "poll", desc: "Crea una encuesta.", usage: "/poll [pregunta]" },
  // Utilidad
  { category: "Utilidad", emoji: "🔧", name: "userinfo", desc: "Información detallada de un usuario.", usage: "/userinfo [@usuario]" },
  { category: "Utilidad", emoji: "🔧", name: "serverinfo", desc: "Información del servidor.", usage: "/serverinfo" },
  { category: "Utilidad", emoji: "🔧", name: "avatar", desc: "Muestra el avatar de un usuario.", usage: "/avatar [@usuario]" },
  { category: "Utilidad", emoji: "🔧", name: "botinfo", desc: "Estadísticas del bot.", usage: "/botinfo" },
  { category: "Utilidad", emoji: "🔧", name: "ping", desc: "Latencia del bot y API.", usage: "/ping" },
  { category: "Utilidad", emoji: "🔧", name: "help", desc: "Lista de todos los comandos.", usage: "/help [comando]" },
  { category: "Utilidad", emoji: "🔧", name: "translate", desc: "Traduce texto a otro idioma.", usage: "/translate [idioma] [texto]" },
  { category: "Utilidad", emoji: "🔧", name: "weather", desc: "Clima de una ciudad.", usage: "/weather [ciudad]" },
  { category: "Utilidad", emoji: "🔧", name: "reminder", desc: "Crea un recordatorio.", usage: "/reminder [tiempo] [texto]" },
];

const CATEGORIES = ["Todos", ...Array.from(new Set(ALL_COMMANDS.map((c) => c.category)))];

export default function CommandsPage() {
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [search, setSearch] = useState("");

  const filtered = ALL_COMMANDS.filter((cmd) => {
    const matchCat = activeCategory === "Todos" || cmd.category === activeCategory;
    const matchSearch =
      !search ||
      cmd.name.toLowerCase().includes(search.toLowerCase()) ||
      cmd.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <main className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-black mb-4 gradient-text">
            Comandos
          </h1>
          <p className="text-gray-500 text-lg">
            {ALL_COMMANDS.length} comandos disponibles en System 777.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-6"
        >
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar comando..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl glass text-white placeholder-gray-600 outline-none focus:border-discord/50 transition-colors"
          />
        </motion.div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeCategory === cat
                  ? "bg-discord text-white"
                  : "glass text-gray-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Count */}
        <p className="text-xs text-gray-600 mb-4">
          {filtered.length} comandos encontrados
        </p>

        {/* Commands grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeCategory}-${search}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {filtered.map((cmd, i) => (
              <motion.div
                key={cmd.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="glass glass-hover rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <Terminal size={14} className="text-discord mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-white text-sm">
                        /{cmd.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500">
                        {cmd.emoji} {cmd.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {cmd.desc}
                    </p>
                    <code className="text-[10px] text-gray-600 mt-1 block">
                      {cmd.usage}
                    </code>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-600">
            No se encontraron comandos para "{search}"
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
