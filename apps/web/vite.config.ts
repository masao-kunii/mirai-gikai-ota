import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    // 公式の指定どおり react プラグインは start プラグインの後に置く
    tanstackStart(),
    viteReact(),
  ],
});
