import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static SPA. Everything under public/ (data + art) is served as-is and
// fetched at runtime, so adding chapters/books/art never triggers a rebuild.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
