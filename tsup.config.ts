import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/bin.ts", "src/scripts/convert-source-target.ts"],
  splitting: true,
});
