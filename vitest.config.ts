import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/**/*.test.ts", "tests/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@animation-factory/schema": path.resolve(__dirname, "packages/schema/src/index.ts"),
      "@animation-factory/anim-core": path.resolve(__dirname, "packages/anim-core/src/index.ts"),
      "@animation-factory/validator": path.resolve(__dirname, "packages/validator/src/index.ts"),
      "@animation-factory/compiler": path.resolve(__dirname, "packages/compiler/src/index.ts"),
      "@animation-factory/runtime-pixi": path.resolve(__dirname, "packages/runtime-pixi/src/index.ts")
    }
  }
});
