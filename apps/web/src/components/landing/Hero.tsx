import { PasteBar } from './PasteBar';
import { PickScreenshotLink } from './PickScreenshotLink';

/** UI spec §3.1 item 2 / §3.3. */
export function Hero() {
  return (
    <section className="relative z-10 mx-auto flex max-w-nav flex-col items-center px-4 pt-14 text-center md:px-8 md:pt-[88px]">
      <h1 className="max-w-[900px] text-h1-m font-semibold md:text-h1">Your website, beautifully framed.</h1>
      <p className="mt-5 max-w-[620px] text-[17px] leading-[1.5] text-ws-text-2 md:mt-6 md:text-[20px]">
        Paste a link or an image. WeShot wraps it in a macOS window on the background you pick, ready to download as an image or a scroll
        video.
      </p>
      <div className="mt-8 w-full md:mt-10">
        <div className="hidden md:block">
          <PasteBar caption="Free, no account. Drop a screenshot anywhere on the page to frame it." />
        </div>
        <div className="md:hidden">
          <PasteBar inputId="ws-paste-input-hero-m" />
          <PickScreenshotLink />
        </div>
      </div>
    </section>
  );
}
