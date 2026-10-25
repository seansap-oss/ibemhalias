import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/hero/hero-section";
import { Footer } from "@/components/landing/footer";
import { LiveClassPromo } from "@/components/live-class/live-class-promo";
import { HomeHighlights } from "@/components/landing/home-highlights";

export default function HomePage() {
  return (
    <main className="site-home min-h-screen">
      <Navbar />
      <HeroSection />
      <HomeHighlights />
      <LiveClassPromo />
      <Footer />
    </main>
  );
}

