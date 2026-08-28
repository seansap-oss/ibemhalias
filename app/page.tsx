import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/hero/hero-section";
import { Footer } from "@/components/landing/footer";
import { LiveClassPromo } from "@/components/live-class/live-class-promo";

export default function HomePage() {
  return (
    <main className="site-home min-h-screen">
      <Navbar />
      <HeroSection />
      <LiveClassPromo />
      <Footer />
    </main>
  );
}

