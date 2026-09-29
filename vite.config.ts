import { defineConfig } from "vite";

// Two builds: an ESM library (Strudel imported lazily, on the first play)
// and a single-file IIFE for a plain <script> tag (BUILD=iife).
const iife = process.env.BUILD === "iife";

export default defineConfig({
  build: {
    target: "es2022",
    emptyOutDir: !iife,
    sourcemap: true,
    lib: {
      entry: "src/index.ts",
      name: "HyperJamPlayer",
      formats: iife ? ["iife"] : ["es"],
      fileName: () => (iife ? "hyperjam-player.iife.js" : "hyperjam-player.js"),
    },
    // the ESM build leaves Strudel to the consumer's bundler (a real dependency, deduped)
    rollupOptions: iife ? { output: { inlineDynamicImports: true } } : { external: [/^@strudel\//] },
  },
});
