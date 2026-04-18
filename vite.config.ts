import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react(),
    dts({ insertTypesEntry: true, rollupTypes: true }),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "DinovoxSwapWidget",
      fileName: (format) => `mx-swap-widget.${format}.js`,
    },
    rollupOptions: {
      // Externalise toutes les peer deps — elles ne seront pas bundlées
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react-router-dom",
        "react-i18next",
        "axios",
        "bignumber.js",
        "lucide-react",
        "@multiversx/sdk-core",
        "@multiversx/sdk-dapp",
        "@multiversx/sdk-dapp/out",
        /@multiversx\/sdk-dapp\/.*/,
        /@multiversx\/sdk-core\/.*/,
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react-router-dom": "ReactRouterDom",
          axios: "axios",
          "bignumber.js": "BigNumber",
        },
      },
    },
    sourcemap: true,
  },
});
