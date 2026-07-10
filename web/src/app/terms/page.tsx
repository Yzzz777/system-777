import type { Metadata } from "next";
import Footer from "@/components/Footer";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = {
  title: "Términos de Servicio",
  description: `Términos de servicio de ${BRAND.name}.`,
};

const SECTIONS = [
  {
    title: "1. Aceptación de los Términos",
    body: `Al añadir ${BRAND.name} a tu servidor de Discord o usar el dashboard, aceptas estos Términos de Servicio. Si no estás de acuerdo, no uses el bot ni la plataforma.`,
  },
  {
    title: "2. Uso permitido",
    body: `${BRAND.name} está diseñado para uso legítimo en servidores de Discord. Está prohibido usar el bot para: (a) actividades ilegales, (b) spam masivo, (c) acoso o discriminación, (d) eludir restricciones de Discord, (e) cualquier acción que viole los Términos de Servicio de Discord (https://discord.com/terms).`,
  },
  {
    title: "3. Disponibilidad del Servicio",
    body: `No garantizamos disponibilidad continua del servicio. Podemos suspender, modificar o discontinuar el bot en cualquier momento, con o sin previo aviso. El servicio se proporciona "tal cual" sin garantías de ningún tipo.`,
  },
  {
    title: "4. Cuentas y autenticación",
    body: `Al iniciar sesión en el dashboard con Discord OAuth2, autorizas el acceso a tu información pública de Discord. Eres responsable de mantener la seguridad de tu cuenta de Discord.`,
  },
  {
    title: "5. Limitación de responsabilidad",
    body: `En la máxima medida permitida por la ley, ${BRAND.author} no será responsable de daños directos, indirectos, incidentales o consecuentes derivados del uso o imposibilidad de uso del bot, incluida pérdida de datos, beneficios o reputación.`,
  },
  {
    title: "6. Propiedad intelectual",
    body: `Todo el código, diseño, marca y materiales de ${BRAND.name} son propiedad de ${BRAND.author}. No se permite la copia, redistribución ni ingeniería inversa sin autorización escrita.`,
  },
  {
    title: "7. Modificaciones",
    body: `Podemos actualizar estos términos en cualquier momento. Publicaremos la versión actualizada con la nueva fecha. El uso continuado tras los cambios implica aceptación.`,
  },
  {
    title: "8. Ley aplicable",
    body: `Estos términos se rigen por las leyes aplicables del país donde reside el operador. Cualquier disputa será resuelta en los tribunales competentes de dicha jurisdicción.`,
  },
];

export default function TermsPage() {
  return (
    <>
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <h1 className="text-4xl sm:text-5xl font-black mb-3">
              Términos de <span className="gradient-text-brand">Servicio</span>
            </h1>
            <p className="text-gray-500 text-sm">
              Última actualización: mayo 2026 · {BRAND.name}
            </p>
          </div>

          <div className="space-y-7 text-gray-300 leading-relaxed">
            {SECTIONS.map((s) => (
              <section
                key={s.title}
                className="glass rounded-2xl p-6 hover:bg-white/[0.04] transition-colors"
              >
                <h2 className="text-lg font-bold text-white mb-3">{s.title}</h2>
                <p className="text-gray-400">{s.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 p-6 rounded-2xl glass text-center">
            <p className="text-sm text-gray-500">
              ¿Dudas? Contacta a {BRAND.author} en{" "}
              <a
                href={BRAND.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-discord hover:underline"
              >
                {BRAND.social.handle}
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
