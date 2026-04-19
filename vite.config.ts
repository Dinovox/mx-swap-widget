import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import dts from "vite-plugin-dts";
import { resolve } from "path";
import tailwindcss from "@tailwindcss/postcss";
import type { ChildNode, AtRule } from "postcss";
import { readFileSync, writeFileSync, existsSync } from "fs";
import postcss from "postcss";

// Flatten @layer wrappers so the CSS is compatible with Tailwind v3 host apps
const flattenLayers = {
  postcssPlugin: "flatten-layers",
  AtRule: {
    layer: (rule: AtRule) => {
      if (rule.nodes) rule.replaceWith(rule.nodes as ChildNode[]);
      else rule.remove();
    },
    theme: (rule: AtRule) => { rule.remove(); },
    "custom-variant": (rule: AtRule) => { rule.remove(); },
  },
};

// Post-build Vite plugin: adds !important to every declaration in dist/style.css
// so host app styles (Bootstrap, etc.) can never override widget styles.
const addImportantToDistCss = {
  name: "add-important-to-dist-css",
  closeBundle() {
    const cssPath = resolve(__dirname, "dist/style.css");
    if (!existsSync(cssPath)) return;
    const css = readFileSync(cssPath, "utf-8");
    const root = postcss.parse(css);
    root.walkDecls((decl) => { decl.important = true; });
    writeFileSync(cssPath, root.toResult().css, "utf-8");
  },
};

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwindcss(), flattenLayers],
    },
  },
  plugins: [
    react(),
    dts({ insertTypesEntry: true, rollupTypes: true }),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
    }),
    addImportantToDistCss,
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
