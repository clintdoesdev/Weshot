/** UI spec §3.1 item 8: © 2026 Nova Pixel Studios · Terms · Privacy · X. */
export function Footer() {
  return (
    <footer className="mx-auto max-w-container px-4 md:px-8">
      <div className="flex flex-col gap-4 border-t border-white/10 py-8 text-[15px] text-ws-text-3 md:flex-row md:items-center md:justify-between">
        <p>© 2026 Nova Pixel Studios</p>
        <ul className="flex gap-1 md:gap-2">
          <li>
            <a href="/terms" className="inline-flex min-h-[44px] items-center rounded-[10px] px-2 hover:text-white">
              Terms
            </a>
          </li>
          <li>
            <a href="/privacy" className="inline-flex min-h-[44px] items-center rounded-[10px] px-2 hover:text-white">
              Privacy
            </a>
          </li>
          <li>
            <a href="https://x.com/weshotapp" rel="noopener" className="inline-flex min-h-[44px] items-center rounded-[10px] px-2 hover:text-white">
              X
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
