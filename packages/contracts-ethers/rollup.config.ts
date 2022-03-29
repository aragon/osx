import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

export default [
  {
    input: "types/index.ts",
    plugins: [typescript()],
    output: [
      {
        file: "dist/bundle-cjs.js",
        format: "cjs",
      },
      {
        file: "dist/bundle-esm.js",
        format: "es",
      },
    ],
  },
  {
    input: "types/index.ts",
    plugins: [dts()],
    output: [
      {
        file: "dist/bundle.d.ts",
        format: "es",
      },
    ],
  },
];
