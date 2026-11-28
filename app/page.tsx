import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/hero/hero-section";
import { CoursesSection } from "@/components/landing/courses-section";
import { StudyEveryDay } from "@/components/landing/study-every-day";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <main className="site-home min-h-screen bg-[#faf8f4]">
      <Navbar />
      <HeroSection />
      <CoursesSection />
      <StudyEveryDay />
      <Footer />
    </main>
  );
}
