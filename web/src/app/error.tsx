"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[system777] error boundary:", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12">
      <div className="glass rounded-2xl p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} className="text-red-400" />
        </div>
        <h2 className="text-2xl font-black mb-3 gradient-text">
          Algo salió mal
        </h2>
        <p className="text-gray-500 mb-8 leading-relaxed text-sm">
          La página encontró un error inesperado. Intenta recargar o vuelve al
          inicio.
          {error.digest && (
            <span className="block mt-2 text-xs text-gray-700 font-mono">
              ref: {error.digest}
            </span>
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-discord hover:bg-discord-dark transition-colors font-bold text-white"
          >
            <RefreshCw size={16} />
            Reintentar
          </button>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl glass glass-hover font-bold text-white"
          >
            Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
