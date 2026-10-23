import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  clean: true,
  // Bundle workspace packages (they ship TS source); keep real npm deps external.
  noExternal: [/^@weshot\//],
});
