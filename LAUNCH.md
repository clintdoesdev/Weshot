# Launch checklist

Status as of October 24, 2026, after the simplification to snaps only (see `DECISIONS.md`).

| Item | Status |
| --- | --- |
| Final name and domain; Givonic licence (or Outfit) | Not done (owner). Outfit is in use. |
| SSRF tests pass (private IPs, redirects, IPv6, DNS rebinding) | Done: 72 tests in real Chromium, also run against the serverless Chromium build. |
| 6 backgrounds and 3 presets match the UI spec | Done (snapshots + e2e). |
| Download matches preview for PNG at 1x/2x/4x | Done (0 differing pixels in e2e). |
| Recording on 5 test sites | Removed from scope. |
| Error messages verified | Done (e2e). |
| Lighthouse ≥ 95 | Desktop 99/99; mobile 94–97 performance, 100 accessibility (re-measure on the live URL). |
| Terms and Privacy published | Done in code; live with the deploy. Have a lawyer review them. |
| Real-world captures on the live site | Not done: verify a few public sites after deploying (this sandbox has no internet access). |
