// vite.config.ts
import react from "file:///Users/kevinlallement/Documents/GitHub/mx-swap-widget/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { defineConfig } from "file:///Users/kevinlallement/Documents/GitHub/mx-swap-widget/node_modules/vite/dist/node/index.js";
import { nodePolyfills } from "file:///Users/kevinlallement/Documents/GitHub/mx-swap-widget/node_modules/vite-plugin-node-polyfills/dist/index.js";
import dts from "file:///Users/kevinlallement/Documents/GitHub/mx-swap-widget/node_modules/vite-plugin-dts/dist/index.mjs";
import { resolve } from "path";
import tailwindcss from "file:///Users/kevinlallement/Documents/GitHub/mx-swap-widget/node_modules/@tailwindcss/postcss/dist/index.mjs";
import { readFileSync, writeFileSync, existsSync } from "fs";
import postcss from "file:///Users/kevinlallement/Documents/GitHub/mx-swap-widget/node_modules/postcss/lib/postcss.mjs";
var __vite_injected_original_dirname = "/Users/kevinlallement/Documents/GitHub/mx-swap-widget";
var flattenLayers = {
  postcssPlugin: "flatten-layers",
  AtRule: {
    layer: (rule) => {
      if (rule.nodes) rule.replaceWith(rule.nodes);
      else rule.remove();
    },
    theme: (rule) => {
      rule.remove();
    },
    "custom-variant": (rule) => {
      rule.remove();
    }
  }
};
var addImportantToDistCss = {
  name: "add-important-to-dist-css",
  closeBundle() {
    const cssPath = resolve(__vite_injected_original_dirname, "dist/style.css");
    if (!existsSync(cssPath)) return;
    const css = readFileSync(cssPath, "utf-8");
    const root = postcss.parse(css);
    root.walkDecls((decl) => {
      decl.important = true;
    });
    writeFileSync(cssPath, root.toResult().css, "utf-8");
  }
};
var vite_config_default = defineConfig({
  css: {
    postcss: {
      plugins: [tailwindcss(), flattenLayers]
    }
  },
  plugins: [
    react(),
    dts({ insertTypesEntry: true, rollupTypes: true }),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true }
    }),
    addImportantToDistCss
  ],
  build: {
    lib: {
      entry: resolve(__vite_injected_original_dirname, "src/index.ts"),
      name: "DinovoxSwapWidget",
      fileName: (format) => `mx-swap-widget.${format}.js`
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
        /@multiversx\/sdk-core\/.*/
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react-router-dom": "ReactRouterDom",
          axios: "axios",
          "bignumber.js": "BigNumber"
        }
      }
    },
    sourcemap: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMva2V2aW5sYWxsZW1lbnQvRG9jdW1lbnRzL0dpdEh1Yi9teC1zd2FwLXdpZGdldFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2tldmlubGFsbGVtZW50L0RvY3VtZW50cy9HaXRIdWIvbXgtc3dhcC13aWRnZXQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2tldmlubGFsbGVtZW50L0RvY3VtZW50cy9HaXRIdWIvbXgtc3dhcC13aWRnZXQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHsgbm9kZVBvbHlmaWxscyB9IGZyb20gXCJ2aXRlLXBsdWdpbi1ub2RlLXBvbHlmaWxsc1wiO1xuaW1wb3J0IGR0cyBmcm9tIFwidml0ZS1wbHVnaW4tZHRzXCI7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSBcInBhdGhcIjtcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tIFwiQHRhaWx3aW5kY3NzL3Bvc3Rjc3NcIjtcbmltcG9ydCB0eXBlIHsgQ2hpbGROb2RlLCBBdFJ1bGUgfSBmcm9tIFwicG9zdGNzc1wiO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jLCBleGlzdHNTeW5jIH0gZnJvbSBcImZzXCI7XG5pbXBvcnQgcG9zdGNzcyBmcm9tIFwicG9zdGNzc1wiO1xuXG4vLyBGbGF0dGVuIEBsYXllciB3cmFwcGVycyBzbyB0aGUgQ1NTIGlzIGNvbXBhdGlibGUgd2l0aCBUYWlsd2luZCB2MyBob3N0IGFwcHNcbmNvbnN0IGZsYXR0ZW5MYXllcnMgPSB7XG4gIHBvc3Rjc3NQbHVnaW46IFwiZmxhdHRlbi1sYXllcnNcIixcbiAgQXRSdWxlOiB7XG4gICAgbGF5ZXI6IChydWxlOiBBdFJ1bGUpID0+IHtcbiAgICAgIGlmIChydWxlLm5vZGVzKSBydWxlLnJlcGxhY2VXaXRoKHJ1bGUubm9kZXMgYXMgQ2hpbGROb2RlW10pO1xuICAgICAgZWxzZSBydWxlLnJlbW92ZSgpO1xuICAgIH0sXG4gICAgdGhlbWU6IChydWxlOiBBdFJ1bGUpID0+IHsgcnVsZS5yZW1vdmUoKTsgfSxcbiAgICBcImN1c3RvbS12YXJpYW50XCI6IChydWxlOiBBdFJ1bGUpID0+IHsgcnVsZS5yZW1vdmUoKTsgfSxcbiAgfSxcbn07XG5cbi8vIFBvc3QtYnVpbGQgVml0ZSBwbHVnaW46IGFkZHMgIWltcG9ydGFudCB0byBldmVyeSBkZWNsYXJhdGlvbiBpbiBkaXN0L3N0eWxlLmNzc1xuLy8gc28gaG9zdCBhcHAgc3R5bGVzIChCb290c3RyYXAsIGV0Yy4pIGNhbiBuZXZlciBvdmVycmlkZSB3aWRnZXQgc3R5bGVzLlxuY29uc3QgYWRkSW1wb3J0YW50VG9EaXN0Q3NzID0ge1xuICBuYW1lOiBcImFkZC1pbXBvcnRhbnQtdG8tZGlzdC1jc3NcIixcbiAgY2xvc2VCdW5kbGUoKSB7XG4gICAgY29uc3QgY3NzUGF0aCA9IHJlc29sdmUoX19kaXJuYW1lLCBcImRpc3Qvc3R5bGUuY3NzXCIpO1xuICAgIGlmICghZXhpc3RzU3luYyhjc3NQYXRoKSkgcmV0dXJuO1xuICAgIGNvbnN0IGNzcyA9IHJlYWRGaWxlU3luYyhjc3NQYXRoLCBcInV0Zi04XCIpO1xuICAgIGNvbnN0IHJvb3QgPSBwb3N0Y3NzLnBhcnNlKGNzcyk7XG4gICAgcm9vdC53YWxrRGVjbHMoKGRlY2wpID0+IHsgZGVjbC5pbXBvcnRhbnQgPSB0cnVlOyB9KTtcbiAgICB3cml0ZUZpbGVTeW5jKGNzc1BhdGgsIHJvb3QudG9SZXN1bHQoKS5jc3MsIFwidXRmLThcIik7XG4gIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBjc3M6IHtcbiAgICBwb3N0Y3NzOiB7XG4gICAgICBwbHVnaW5zOiBbdGFpbHdpbmRjc3MoKSwgZmxhdHRlbkxheWVyc10sXG4gICAgfSxcbiAgfSxcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgZHRzKHsgaW5zZXJ0VHlwZXNFbnRyeTogdHJ1ZSwgcm9sbHVwVHlwZXM6IHRydWUgfSksXG4gICAgbm9kZVBvbHlmaWxscyh7XG4gICAgICBnbG9iYWxzOiB7IEJ1ZmZlcjogdHJ1ZSwgZ2xvYmFsOiB0cnVlLCBwcm9jZXNzOiB0cnVlIH0sXG4gICAgfSksXG4gICAgYWRkSW1wb3J0YW50VG9EaXN0Q3NzLFxuICBdLFxuICBidWlsZDoge1xuICAgIGxpYjoge1xuICAgICAgZW50cnk6IHJlc29sdmUoX19kaXJuYW1lLCBcInNyYy9pbmRleC50c1wiKSxcbiAgICAgIG5hbWU6IFwiRGlub3ZveFN3YXBXaWRnZXRcIixcbiAgICAgIGZpbGVOYW1lOiAoZm9ybWF0KSA9PiBgbXgtc3dhcC13aWRnZXQuJHtmb3JtYXR9LmpzYCxcbiAgICB9LFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIC8vIEV4dGVybmFsaXNlIHRvdXRlcyBsZXMgcGVlciBkZXBzIFx1MjAxNCBlbGxlcyBuZSBzZXJvbnQgcGFzIGJ1bmRsXHUwMEU5ZXNcbiAgICAgIGV4dGVybmFsOiBbXG4gICAgICAgIFwicmVhY3RcIixcbiAgICAgICAgXCJyZWFjdC1kb21cIixcbiAgICAgICAgXCJyZWFjdC9qc3gtcnVudGltZVwiLFxuICAgICAgICBcInJlYWN0LXJvdXRlci1kb21cIixcbiAgICAgICAgXCJyZWFjdC1pMThuZXh0XCIsXG4gICAgICAgIFwiYXhpb3NcIixcbiAgICAgICAgXCJiaWdudW1iZXIuanNcIixcbiAgICAgICAgXCJsdWNpZGUtcmVhY3RcIixcbiAgICAgICAgXCJAbXVsdGl2ZXJzeC9zZGstY29yZVwiLFxuICAgICAgICBcIkBtdWx0aXZlcnN4L3Nkay1kYXBwXCIsXG4gICAgICAgIFwiQG11bHRpdmVyc3gvc2RrLWRhcHAvb3V0XCIsXG4gICAgICAgIC9AbXVsdGl2ZXJzeFxcL3Nkay1kYXBwXFwvLiovLFxuICAgICAgICAvQG11bHRpdmVyc3hcXC9zZGstY29yZVxcLy4qLyxcbiAgICAgIF0sXG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgZ2xvYmFsczoge1xuICAgICAgICAgIHJlYWN0OiBcIlJlYWN0XCIsXG4gICAgICAgICAgXCJyZWFjdC1kb21cIjogXCJSZWFjdERPTVwiLFxuICAgICAgICAgIFwicmVhY3Qtcm91dGVyLWRvbVwiOiBcIlJlYWN0Um91dGVyRG9tXCIsXG4gICAgICAgICAgYXhpb3M6IFwiYXhpb3NcIixcbiAgICAgICAgICBcImJpZ251bWJlci5qc1wiOiBcIkJpZ051bWJlclwiLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFpVixPQUFPLFdBQVc7QUFDblcsU0FBUyxvQkFBb0I7QUFDN0IsU0FBUyxxQkFBcUI7QUFDOUIsT0FBTyxTQUFTO0FBQ2hCLFNBQVMsZUFBZTtBQUN4QixPQUFPLGlCQUFpQjtBQUV4QixTQUFTLGNBQWMsZUFBZSxrQkFBa0I7QUFDeEQsT0FBTyxhQUFhO0FBUnBCLElBQU0sbUNBQW1DO0FBV3pDLElBQU0sZ0JBQWdCO0FBQUEsRUFDcEIsZUFBZTtBQUFBLEVBQ2YsUUFBUTtBQUFBLElBQ04sT0FBTyxDQUFDLFNBQWlCO0FBQ3ZCLFVBQUksS0FBSyxNQUFPLE1BQUssWUFBWSxLQUFLLEtBQW9CO0FBQUEsVUFDckQsTUFBSyxPQUFPO0FBQUEsSUFDbkI7QUFBQSxJQUNBLE9BQU8sQ0FBQyxTQUFpQjtBQUFFLFdBQUssT0FBTztBQUFBLElBQUc7QUFBQSxJQUMxQyxrQkFBa0IsQ0FBQyxTQUFpQjtBQUFFLFdBQUssT0FBTztBQUFBLElBQUc7QUFBQSxFQUN2RDtBQUNGO0FBSUEsSUFBTSx3QkFBd0I7QUFBQSxFQUM1QixNQUFNO0FBQUEsRUFDTixjQUFjO0FBQ1osVUFBTSxVQUFVLFFBQVEsa0NBQVcsZ0JBQWdCO0FBQ25ELFFBQUksQ0FBQyxXQUFXLE9BQU8sRUFBRztBQUMxQixVQUFNLE1BQU0sYUFBYSxTQUFTLE9BQU87QUFDekMsVUFBTSxPQUFPLFFBQVEsTUFBTSxHQUFHO0FBQzlCLFNBQUssVUFBVSxDQUFDLFNBQVM7QUFBRSxXQUFLLFlBQVk7QUFBQSxJQUFNLENBQUM7QUFDbkQsa0JBQWMsU0FBUyxLQUFLLFNBQVMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUNyRDtBQUNGO0FBRUEsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsS0FBSztBQUFBLElBQ0gsU0FBUztBQUFBLE1BQ1AsU0FBUyxDQUFDLFlBQVksR0FBRyxhQUFhO0FBQUEsSUFDeEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixJQUFJLEVBQUUsa0JBQWtCLE1BQU0sYUFBYSxLQUFLLENBQUM7QUFBQSxJQUNqRCxjQUFjO0FBQUEsTUFDWixTQUFTLEVBQUUsUUFBUSxNQUFNLFFBQVEsTUFBTSxTQUFTLEtBQUs7QUFBQSxJQUN2RCxDQUFDO0FBQUEsSUFDRDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLEtBQUs7QUFBQSxNQUNILE9BQU8sUUFBUSxrQ0FBVyxjQUFjO0FBQUEsTUFDeEMsTUFBTTtBQUFBLE1BQ04sVUFBVSxDQUFDLFdBQVcsa0JBQWtCLE1BQU07QUFBQSxJQUNoRDtBQUFBLElBQ0EsZUFBZTtBQUFBO0FBQUEsTUFFYixVQUFVO0FBQUEsUUFDUjtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFFBQVE7QUFBQSxRQUNOLFNBQVM7QUFBQSxVQUNQLE9BQU87QUFBQSxVQUNQLGFBQWE7QUFBQSxVQUNiLG9CQUFvQjtBQUFBLFVBQ3BCLE9BQU87QUFBQSxVQUNQLGdCQUFnQjtBQUFBLFFBQ2xCO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFdBQVc7QUFBQSxFQUNiO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
