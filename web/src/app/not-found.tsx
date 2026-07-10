import Link from "next/link";
import { Ghost } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12">
      <div className="glass rounded-2xl p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-discord/20 flex items-center justify-center mx-auto mb-6">
          <Ghost size={32} className="text-discord" />
        </div>
        <h2 className="text-5xl font-black mb-3 gradient-text">404</h2>
        <p className="text-gray-400 mb-8">
          Esta página se fue al limbo digital.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-discord hover:bg-discord-dark transition-colors font-bold text-white"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
