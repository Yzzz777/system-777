import type { Metadata } from "next";
import Footer from "@/components/Footer";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: `Política de privacidad de ${BRAND.name}.`,
};

const SECTIONS = [
  {
    title: "1. Datos que recopilamos",
    body: `${BRAND.name} almacena únicamente los datos necesarios para su funcionamiento: IDs de servidor, IDs de usuario, configuraciones de moderación, datos de economía y niveles, registros de tickets y eventos de auditoría. No almacenamos contraseñas ni información personal sensible.`,
  },
  {
    title: "2. Discord OAuth2 (Dashboard)",
    body: `Al iniciar sesión en el dashboard utilizamos los scopes públicos "identify" y "guilds" de Discord OAuth2. Esto nos da acceso a tu username, avatar, ID y lista de servidores donde estás. No accedemos a mensajes privados, no leemos DMs, ni publicamos en tu nombre.`,
  },
  {
    title: "3. Uso de los datos",
    body: `Los datos se usan exclusivamente para proveer las funciones del bot (moderación, economía, giveaways, tickets, niveles, logs). No vendemos, alquilamos ni compartimos datos con terceros. No utilizamos los datos para publicidad.`,
  },
  {
    title: "4. Almacenamiento y seguridad",
    body: `Los datos se almacenan en bases de datos privadas dentro de la infraestructura del bot (Railway). Aplicamos prácticas razonables de seguridad: variables de entorno cifradas, conexiones HTTPS, control de acceso por roles. Ninguna transmisión por internet es 100% segura, pero hacemos todo lo razonable para protegerlos.`,
  },
  {
    title: "5. Cookies y sesiones",
    body: `El dashboard utiliza cookies HTTP-only seguras para mantener la sesión iniciada con NextAuth. No usamos cookies de seguimiento publicitario ni servicios de analytics que identifiquen al usuario.`,
  },
  {
    title: "6. Retención y eliminación",
    body: `Cuando expulsas al bot de tu servidor, los datos asociados a ese servidor se marcan para eliminación. Para eliminar tus datos personales del dashboard, cierra sesión y contacta a ${BRAND.author}. Procesaremos la solicitud en un plazo razonable.`,
  },
  {
    title: "7. Menores de edad",
    body: `${BRAND.name} sigue las políticas de Discord respecto a edad mínima (13 años o la edad legal en tu país). Si descubrimos que un menor proporcionó datos personales sin consentimiento parental, eliminaremos esa información.`,
  },
  {
    title: "8. Cambios a esta política",
    body: `Podemos actualizar esta política. La versión vigente se publica siempre en esta página con su fecha de actualización. El uso continuado del bot tras cambios implica aceptación.`,
  },
  {
    title: "9. Contacto",
    body: `Para preguntas sobre privacidad, ejercer derechos de acceso/rectificación/eliminación, o reportar incidencias, contacta a ${BRAND.author} a través de las redes sociales oficiales o el servidor de soporte.`,
  },
];

export default function PrivacyPage() {
  return (
    <>
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <h1 className="text-4xl sm:text-5xl font-black mb-3">
              Política de <span className="gradient-text-brand">Privacidad</span>
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
              Tus datos, tus derechos. Contacta a{" "}
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
