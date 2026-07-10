export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center pt-24">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-discord border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Cargando System 777…</p>
      </div>
    </main>
  );
}
