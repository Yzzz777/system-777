import Hero from "@/components/Hero";
import StatsSection from "@/components/StatsSection";
import FeaturesSection from "@/components/FeaturesSection";
import CommandsSection from "@/components/CommandsSection";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Hero />
      <StatsSection />
      <FeaturesSection />
      <CommandsSection />
      <Footer />
    </main>
  );
}
