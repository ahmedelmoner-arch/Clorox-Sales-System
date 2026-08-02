import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configDirectory = dirname(fileURLToPath(import.meta.url));

function offlinePrecache() {
  return {
    name: "offline-precache",
    generateBundle(_, bundle) {
      const urls = Object.values(bundle)
        .map((entry) => entry.fileName)
        .filter(Boolean)
        .map((fileName) => `/${fileName}`);
      this.emitFile({
        type: "asset",
        fileName: "precache-manifest.js",
        source: `self.__CLOROX_PRECACHE = ${JSON.stringify(urls)};\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), offlinePrecache()],
  build: {
    outDir: resolve(configDirectory, "../public"),
    emptyOutDir: true,
  },
});
