import { build } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const frontend = resolve(root, "frontend");
const output = resolve(frontend, "dist");
const assets = resolve(output, "assets");

await rm(output, { recursive: true, force: true });
await mkdir(assets, { recursive: true });
await build({
  entryPoints: [resolve(frontend, "src/main.jsx")],
  outfile: resolve(assets, "app.js"),
  bundle: true,
  minify: process.env.NODE_ENV === "production",
  sourcemap: process.env.NODE_ENV !== "production",
  format: "esm",
  jsx: "automatic",
  loader: { ".png": "file" },
});

const html = await readFile(resolve(frontend, "index.html"), "utf8");
await writeFile(resolve(output, "index.html"), html);
await cp(resolve(frontend, "public"), output, { recursive: true });
