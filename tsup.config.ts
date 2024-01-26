import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/bin.ts"],
  splitting: true,
});
