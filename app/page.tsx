import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/hero/hero-section";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <Footer />
    </main>
  );
}
