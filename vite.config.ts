import { defineConfig } from "vite";

// Two builds: an ESM library (Strudel imported lazily, on the first play)
// and a single-file IIFE for a plain <script> tag (BUILD=iife).
const iife = process.env.BUILD === "iife";

export default defineConfig({
  // Strudel reads process.env.NODE_ENV; a bundler defines it for the ESM build,
  // but a plain <script> page has no process at all
  define: iife ? { "process.env.NODE_ENV": JSON.stringify("production") } : {},
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
