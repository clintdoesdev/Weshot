const STEPS = [
  { title: 'Paste a link or an image', body: 'Drop in any public URL, or paste a screenshot straight from your clipboard.' },
  { title: 'Style the frame', body: 'Pick a window, a background and the spacing. Every change shows up instantly.' },
  { title: 'Download or share', body: 'Save a PNG, JPG, WebP or scroll video, copy it, or make a share link.' },
];

/** UI spec §3.1 item 5. */
export function Steps() {
  return (
    <section aria-labelledby="steps-title" className="mx-auto max-w-container px-4 py-14 md:px-8 md:py-[88px]">
      <h2 id="steps-title" className="text-center text-h2-m font-semibold md:text-h2">
        From link to post in three steps
      </h2>
      <ol className="mt-8 grid gap-3 md:mt-12 md:grid-cols-3 md:gap-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="glass-tile flex gap-4 rounded-[26px] p-5 md:flex-col md:gap-0 md:p-7">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ws-yellow text-[16px] font-semibold text-ws-on-yellow"
            >
              {i + 1}
            </span>
            <div>
              <h3 className="text-card-m font-semibold md:mt-5 md:text-card">{s.title}</h3>
              <p className="mt-2 text-[15px] text-ws-text-2 md:text-[16px]">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
