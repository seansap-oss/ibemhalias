"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Award, BookOpen, ChevronLeft, ChevronRight, Expand, Share2, Star, Users, X } from "lucide-react";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { WhatsNew } from "@/components/portal/whats-new";
import { PortalFloatingControls } from "@/components/portal/portal-floating-controls";

type HeroSlide = { id: string; title: string; description: string; image: string; href: string };
type CmsHeroItem = { id: string; title?: string | null; description?: string | null; media_type?: string | null; media_url?: string | null; external_url?: string | null };

const FALLBACK_HERO: HeroSlide[] = [
  {
    id: "academy",
    title: "Excellence is a Journey. We Guide It.",
    description: "Comprehensive preparation. Expert mentorship. Affordable for all.",
    image: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1800&q=90",
    href: "/courses",
  },
  {
    id: "mentorship",
    title: "Build the Discipline to Lead.",
    description: "Structured learning, current affairs and personal mentorship for serious aspirants.",
    image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1800&q=90",
    href: "/mentorship",
  },
];

const ACHIEVER_POSTERS = [
  { src: "/hero/topper-1.webp", fallback: "/hero/topper-1.jpg", label: "Selected Candidates — Gallery 1" },
  { src: "/hero/topper-2.webp", fallback: "/hero/topper-2.jpg", label: "Selected Candidates — Gallery 2" },
];

const PREMIUM_STATS = [
  { icon: Award, value: "500+", label: "Selections" },
  { icon: Users, value: "10,000+", label: "Aspirants" },
  { icon: BookOpen, value: "100+", label: "Courses" },
  { icon: Star, value: "4.9/5", label: "Student Rating" },
];

function usePremiumHeroSlides() {
  const [slides, setSlides] = React.useState<HeroSlide[]>(FALLBACK_HERO);
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/cms/content?section=hero", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((payload) => {
        if (cancelled) return;
        const cmsSlides = ((payload.items || []) as CmsHeroItem[])
          .filter((item) => item.media_type === "image" && Boolean(item.media_url || item.external_url))
          .map((item, index) => ({
            id: item.id || `cms-${index}`,
            title: item.title || "Ibemhal IAS",
            description: item.description || "Quality education, expert guidance and affordable preparation.",
            image: String(item.media_url || item.external_url),
            href: "/courses",
          }));
        if (cmsSlides.length) setSlides(cmsSlides);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return slides;
}

function HeroLightbox({ slide, onClose }: { slide: HeroSlide; onClose: () => void }) {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-[#021d18]/95 p-3 backdrop-blur-md md:p-8">
      <button onClick={onClose} aria-label="Close expanded hero" className="absolute right-4 top-4 z-10 grid h-12 w-12 place-items-center rounded-full border border-[#d6a958]/50 bg-[#062f28] text-[#f3d18b] md:right-8 md:top-8"><X className="h-6 w-6" /></button>
      <div className="relative h-[86vh] w-full max-w-6xl overflow-hidden rounded-[28px] border border-[#d6a958]/40 bg-black shadow-2xl">
        <img src={slide.image} alt={slide.title} className="h-full w-full object-contain" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-6 text-white">
          <div className="font-serif text-2xl font-bold text-[#f3d18b]">{slide.title}</div>
          <div className="mt-1 max-w-2xl text-sm text-white/75">{slide.description}</div>
        </div>
      </div>
    </div>
  );
}

function AchieversDeck() {
  const [active, setActive] = React.useState(0);
  const [expanded, setExpanded] = React.useState(false);
  const current = ACHIEVER_POSTERS[active];
  const previous = React.useCallback(() => setActive((value) => (value - 1 + ACHIEVER_POSTERS.length) % ACHIEVER_POSTERS.length), []);
  const next = React.useCallback(() => setActive((value) => (value + 1) % ACHIEVER_POSTERS.length), []);

  React.useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, previous, next]);

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Ibemhal IAS Achievers", text: current.label, url: window.location.href });
    } catch {}
  };

  return (
    <>
      <section className="premium-achievers-card">
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-[#9a6a24]">Our Achievers</div><h3 className="mt-1 font-serif text-lg font-bold leading-tight text-[#252118]">Successful Candidates</h3></div>
          <button type="button" onClick={() => setExpanded(true)} className="inline-flex items-center gap-1 text-xs font-black text-[#7a541d]">View All <Expand className="h-3.5 w-3.5" /></button>
        </div>

        <div className="relative mt-3 overflow-hidden px-3 pb-3">
          <button type="button" onClick={previous} aria-label="Previous achievers" className="absolute left-1 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[#d5ad6a] bg-[#06382f] text-[#f3d18b] shadow-lg"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setExpanded(true)} className="block w-full overflow-hidden rounded-2xl border border-[#d9c59a] bg-[#fbf2df]">
            <picture><source srcSet={current.src} type="image/webp" /><img src={current.fallback} alt={current.label} className="aspect-[2.69/1] w-full object-contain" /></picture>
          </button>
          <button type="button" onClick={next} aria-label="Next achievers" className="absolute right-1 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[#d5ad6a] bg-[#06382f] text-[#f3d18b] shadow-lg"><ChevronRight className="h-4 w-4" /></button>
          <div className="mt-2 flex justify-center gap-2">{ACHIEVER_POSTERS.map((poster, index) => <button key={poster.src} onClick={() => setActive(index)} aria-label={`Show achievers poster ${index + 1}`} className={`h-2 rounded-full transition-all ${index === active ? "w-7 bg-[#bf8b38]" : "w-2 bg-[#c7c0ae]"}`} />)}</div>
        </div>
      </section>

      {expanded ? (
        <div className="fixed inset-0 z-[125] bg-[#021d18]/96 p-3 backdrop-blur-lg md:p-8">
          <div className="mx-auto flex h-full max-w-6xl flex-col">
            <div className="flex items-center justify-between gap-3 pb-3 text-[#f3d18b]">
              <div><div className="text-xs font-black uppercase tracking-[.2em]">Our Achievers</div><div className="mt-1 font-serif text-2xl font-bold">{current.label}</div></div>
              <div className="flex gap-2"><button onClick={share} className="grid h-11 w-11 place-items-center rounded-full border border-[#d6a958]/45 bg-[#073a31]" aria-label="Share achievers"><Share2 className="h-5 w-5" /></button><button onClick={() => setExpanded(false)} className="grid h-11 w-11 place-items-center rounded-full border border-[#d6a958]/45 bg-[#073a31]" aria-label="Close achievers"><X className="h-5 w-5" /></button></div>
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[26px] border border-[#d6a958]/45 bg-[#06352e]">
              <button onClick={previous} className="absolute left-2 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-[#d6a958]/45 bg-[#042a24]/90 text-[#f3d18b]" aria-label="Previous poster"><ChevronLeft className="h-6 w-6" /></button>
              <picture><source srcSet={current.src} type="image/webp" /><img src={current.fallback} alt={current.label} className="h-full w-full object-contain" /></picture>
              <button onClick={next} className="absolute right-2 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-[#d6a958]/45 bg-[#042a24]/90 text-[#f3d18b]" aria-label="Next poster"><ChevronRight className="h-6 w-6" /></button>
            </div>
            <div className="flex items-center justify-center gap-3 pt-4">{ACHIEVER_POSTERS.map((poster, index) => <button key={poster.src} onClick={() => setActive(index)} className={`h-2.5 rounded-full transition-all ${index === active ? "w-9 bg-[#e0b35e]" : "w-2.5 bg-white/30"}`} aria-label={`Show poster ${index + 1}`} />)}<span className="ml-2 text-xs font-bold text-white/60">{active + 1} / {ACHIEVER_POSTERS.length}</span></div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function PremiumHome() {
  const slides = usePremiumHeroSlides();
  const [active, setActive] = React.useState(0);
  const [expanded, setExpanded] = React.useState(false);
  const current = slides[active % slides.length];
  const previous = () => setActive((value) => (value - 1 + slides.length) % slides.length);
  const next = () => setActive((value) => (value + 1) % slides.length);

  return (
    <section className="premium-home pt-[76px]">
      <div className="mx-auto max-w-[1580px] px-3 pb-6 pt-4 sm:px-5 lg:px-6">
        <div className="premium-home-grid">
          <PortalSidebar />
          <div className="min-w-0">
            <div className="premium-hero-card">
              <img src={current.image} alt={current.title} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,25,21,.97)_0%,rgba(5,31,26,.78)_40%,rgba(7,24,21,.30)_72%,rgba(0,0,0,.20)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_38%,rgba(212,161,76,.15),transparent_36%)]" />
              <button onClick={() => setExpanded(true)} className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-xl border border-[#d7aa59]/55 bg-[#073a31]/80 text-[#f3d18b] backdrop-blur" aria-label="Expand hero image"><Expand className="h-5 w-5" /></button>

              <div className="relative z-10 flex h-full max-w-[700px] flex-col justify-center px-7 py-12 sm:px-10 lg:px-14">
                <div className="text-xs font-black uppercase tracking-[.25em] text-[#dca94e] sm:text-sm">Empowering Aspirations.<br />Building Officers.</div>
                <div className="mt-5 h-px w-16 bg-[#c6923d]" />
                <h1 className="mt-5 font-serif text-5xl font-semibold leading-[.98] tracking-[-.035em] text-[#fff9ee] sm:text-6xl xl:text-7xl">{current.title}</h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-[#f8eddc]/90 sm:text-lg">{current.description}</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href={current.href} className="premium-gold-button inline-flex min-h-12 items-center gap-3 rounded-xl border border-[#d6a958] bg-[#07352d]/85 px-5 text-sm font-black text-[#f3d18b]">Explore Our Programs <ArrowRight className="h-4 w-4" /></Link>
                  <Link href="/mentorship" className="inline-flex min-h-12 items-center rounded-xl border border-[#f0d096]/25 bg-black/15 px-5 text-sm font-bold text-[#fff5e4] backdrop-blur">Book Guidance</Link>
                </div>
              </div>

              {slides.length > 1 ? <><button onClick={previous} aria-label="Previous hero" className="absolute bottom-5 right-20 z-20 grid h-10 w-10 place-items-center rounded-full border border-[#d6a958]/45 bg-[#062e27]/85 text-[#f3d18b]"><ChevronLeft className="h-4 w-4" /></button><button onClick={next} aria-label="Next hero" className="absolute bottom-5 right-7 z-20 grid h-10 w-10 place-items-center rounded-full border border-[#d6a958]/45 bg-[#062e27]/85 text-[#f3d18b]"><ChevronRight className="h-4 w-4" /></button></> : null}
              <div className="absolute bottom-5 left-7 z-20 flex gap-2 sm:left-10 lg:left-14">{slides.map((slide, index) => <button key={slide.id} onClick={() => setActive(index)} aria-label={`Show hero ${index + 1}`} className={`h-2 rounded-full transition-all ${active === index ? "w-8 bg-[#f3d18b]" : "w-2 bg-[#fff5e4]/45"}`} />)}</div>
            </div>
          </div>
          <div className="premium-home-right min-w-0 space-y-4"><WhatsNew /><AchieversDeck /></div>
        </div>

        <div className="premium-stats mt-4 grid grid-cols-2 overflow-hidden rounded-[26px] border border-[#b98539]/55 bg-[#06372f]/92 text-[#f3d18b] md:grid-cols-4">
          {PREMIUM_STATS.map(({ icon: StatIcon, value, label }, index) => (
            <div key={label} className={`flex min-h-28 items-center justify-center gap-4 px-4 py-5 ${index < 3 ? "md:border-r md:border-[#d6a958]/25" : ""} ${index < 2 ? "border-b border-[#d6a958]/25 md:border-b-0" : ""}`}>
              <StatIcon className="h-9 w-9 shrink-0 stroke-[1.4]" />
              <div><div className="font-serif text-3xl font-bold leading-none">{value}</div><div className="mt-1 text-sm font-semibold text-[#f8ead2]">{label}</div></div>
            </div>
          ))}
        </div>

        <div className="premium-trusted mt-4 rounded-[26px] border border-[#ddc694] bg-[#fbf1dd] px-5 py-7 text-center text-[#2a241b] shadow-xl"><div className="font-serif text-2xl font-bold sm:text-3xl">Trusted by Thousands. Chosen for Results.</div><div className="mx-auto mt-3 h-px w-44 bg-[#b88439]" /><p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#554a39] sm:text-base">Quality education. Affordable fees. Proven results. Your success is our promise.</p></div>
      </div>
      {expanded ? <HeroLightbox slide={current} onClose={() => setExpanded(false)} /> : null}
      <PortalFloatingControls />
    </section>
  );
}
