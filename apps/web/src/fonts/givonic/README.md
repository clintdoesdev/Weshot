# Givonic

Drop the licensed WOFF2 files here with these exact names:

- `Givonic-Regular.woff2` (400)
- `Givonic-Medium.woff2` (500)
- `Givonic-SemiBold.woff2` (600)

`scripts/givonic.mjs` runs before `dev`, `build` and `typecheck` and wires them into `next/font/local`.
Until the files exist, Outfit (Google Fonts) carries the design.
