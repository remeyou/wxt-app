import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  imports: false,
  modules: ["@wxt-dev/module-react"],
  manifest: {
    permissions: ["storage", "downloads"],
  },
  hooks: {
    "build:manifestGenerated": (wxt, manifest) => {
      if (wxt.config.mode === "development") {
        manifest.name += " (DEV)";
      }
    },
  },
});
