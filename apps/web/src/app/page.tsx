import { EditorRoot } from '@/components/editor/EditorRoot';
import { Faq } from '@/components/landing/Faq';
import { Footer } from '@/components/landing/Footer';
import { Gallery } from '@/components/landing/Gallery';
import { Hero } from '@/components/landing/Hero';
import { MobileDemoCard } from '@/components/landing/MobileDemoCard';
import { Nav } from '@/components/landing/Nav';
import { Recordings } from '@/components/landing/Recordings';
import { Steps } from '@/components/landing/Steps';
import { Glow } from '@/components/ui/Glow';

export default function Home() {
  return (
    <div className="relative overflow-x-clip">
      <Glow className="hidden md:block" style={{ width: 1100, height: 760, left: '50%', top: 260, transform: 'translateX(-50%)' }} />
      <Glow className="md:hidden" style={{ width: 600, height: 600, left: '50%', top: 120, transform: 'translateX(-50%)' }} />
      <Glow className="md:hidden" style={{ width: 520, height: 520, left: '50%', top: 1400, transform: 'translateX(-50%)', opacity: 0.28 }} />
      <a href="#editor" className="sr-only-focusable fixed left-4 top-4 z-[80] rounded-pill bg-ws-yellow px-4 py-2 font-semibold text-black">
        Skip to the editor
      </a>
      <Nav />
      <main>
        <Hero />
        <MobileDemoCard />
        <section id="editor" aria-label="Editor" className="relative z-10 mx-auto max-w-container px-4 max-md:hidden md:px-8 md:pb-[112px] md:pt-14">
          <EditorRoot />
        </section>
        <Gallery />
        <Steps />
        <Recordings />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
