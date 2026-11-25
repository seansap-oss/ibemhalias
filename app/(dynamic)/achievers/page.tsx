import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { AchieversGalleryClient } from "@/components/gallery/achievers-gallery-client";

export default function AchieversGalleryPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <AchieversGalleryClient />
      <Footer />
    </main>
  );
}
