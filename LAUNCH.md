# Launch checklist (product spec §10)

Status as of the end of phase 7, October 23, 2026.

| # | Item | Status | Evidence / what is left |
| --- | --- | --- | --- |
| 1 | Final name and domain confirmed; Givonic web-font licence purchased (or Outfit used) | **Not done (owner decision)** | Outfit carries the design today, so the font half is satisfied. The `next/font/local` Givonic slot activates as soon as the WOFF2 files are added. The name and the `weshot.app` domain still need your confirmation. |
| 2 | SSRF tests pass (private IPs, redirects to private IPs, IPv6, DNS rebinding) | **Done** | `apps/worker/test/ssrf.test.ts` and `capture.test.ts`: private and reserved IPv4, IPv6 loopback/ULA/link-local, IPv4-mapped, NAT64, 6to4, the metadata IP, hex and decimal IP forms, non-http schemes, redirects to private IPs, hosts and `[::1]`, DNS rebinding, private subresources, more than 5 redirects. They run through real Chromium and the pinning proxy. 83 worker tests pass. |
| 3 | All 6 built-in backgrounds and 3 presets match the UI spec | **Done** | Compositor snapshots for every background and preset at 1x and 2x, a pixel test of the Honey gradient stops, and e2e coverage of swatches and presets. |
| 4 | Download output matches preview (snapshot test) for PNG at 1x/2x/4x | **Done** | e2e: the worker export and a main-thread render differ by **0 pixels** at 1x, 2x and 4x, also with grain, blur and title-bar text. Node snapshots check scale consistency too. |
| 5 | Recording works for MP4, WebM and GIF on 5 test sites | **Not done** | All three formats are verified with ffprobe and pixel samples on local test pages, and a full-stack MP4 was recorded through the UI. This sandbox has no direct internet access, so no third-party sites were tried. Run five real sites on the Railway deployment before launch. |
| 6 | Error messages from section 6 verified | **Done** | e2e checks the exact copy for INVALID_URL, BLOCKED_HOST, TIMEOUT, BOT_CHECK, HTTP_5XX (503), RATE_LIMIT ("42 min") and IMAGE_TOO_LARGE, with the right actions and the yellow (never red) border. Worker tests check HTTP_4XX (404) and the code mapping. |
| 7 | Lighthouse ≥ 95 performance and accessibility on the landing page | **Partly done** | Desktop: performance 99, accessibility 99. Mobile (simulated 4G, 4x CPU): accessibility 100, performance 94–97 across runs, LCP 1.9–2.5 s. The spec target is under 2.0 s on 4G; most of the remaining time is the Next/React runtime. Re-measure on the production URL. |
| 8 | Terms and Privacy pages published (Nova Pixel Studios) | **Done in code, not yet published** | `/terms` and `/privacy` exist and pass axe. They go live with the first Vercel deploy. Have a lawyer review the wording. |
