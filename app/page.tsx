import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/hero/hero-section";
import { Footer } from "@/components/landing/footer";
import { LiveClassPromo } from "@/components/live-class/live-class-promo";
import { HomeHighlights } from "@/components/landing/home-highlights";
import { CoursesSection } from "@/components/landing/courses-section";

export default function HomePage() {
  return (
    <main className="site-home min-h-screen">
      <Navbar />
      <HeroSection />
      <HomeHighlights />
      <CoursesSection />
      <LiveClassPromo />
      <Footer />
    </main>
  );
}

