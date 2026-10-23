import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import templateCompilerOptions from "@tresjs/core/template-compiler-options";

export default defineConfig({
  plugins: [vue({ ...templateCompilerOptions })]
});
