"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Server, Users, Terminal, Clock } from "lucide-react";

interface Stat {
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
  color: string;
}

interface BotStats {
  guilds: number;
  users: number;
  commands: number;
  online: boolean;
}

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {count.toLocaleString("es-DO")}
      {suffix}
    </span>
  );
}

const FALLBACK: Stat[] = [
  {
    icon: <Server size={22} />,
    value: 50,
    suffix: "+",
    label: "Servidores",
    color: "text-blue-400",
  },
  {
    icon: <Users size={22} />,
    value: 5000,
    suffix: "+",
    label: "Usuarios",
    color: "text-purple-400",
  },
  {
    icon: <Terminal size={22} />,
    value: 80,
    suffix: "+",
    label: "Comandos",
    color: "text-cyan-400",
  },
  {
    icon: <Clock size={22} />,
    value: 99,
    suffix: "%",
    label: "Uptime",
    color: "text-green-400",
  },
];

export default function StatsSection() {
  const [stats, setStats] = useState<Stat[]>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bot/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BotStats | null) => {
        if (cancelled || !data) return;
        setStats([
          { ...FALLBACK[0], value: data.guilds || FALLBACK[0].value },
          { ...FALLBACK[1], value: data.users || FALLBACK[1].value },
          { ...FALLBACK[2], value: data.commands || FALLBACK[2].value },
          FALLBACK[3],
        ]);
      })
      .catch(() => {
        /* fallback estático, la web sigue cargando */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="py-20 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-black mb-4 gradient-text">
            De confianza en comunidades
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Miles de usuarios confían en System 777 para administrar sus servidores.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="glass glass-hover rounded-2xl p-6 text-center"
            >
              <div className={`inline-flex p-3 rounded-xl bg-white/5 mb-4 ${stat.color}`}>
                {stat.icon}
              </div>
              <div className="text-4xl font-black text-white mb-1">
                <Counter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
