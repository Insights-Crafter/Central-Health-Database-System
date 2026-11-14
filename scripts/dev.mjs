import { context } from "esbuild";
import { spawn } from "node:child_process";
import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const frontend = resolve(root, "frontend");
const outdir = resolve(frontend, "dist", "assets");
await mkdir(outdir, { recursive: true });
await cp(resolve(frontend, "index.html"), resolve(frontend, "dist", "index.html"));
await cp(resolve(frontend, "public"), resolve(frontend, "dist"), { recursive: true });
const esbuild = await context({
  entryPoints: [resolve(frontend, "src/main.jsx")],
  outfile: resolve(outdir, "app.js"),
  bundle: true,
  sourcemap: true,
  format: "esm",
  jsx: "automatic",
  loader: { ".png": "file" },
});
await esbuild.watch();

const tailwind = spawn(process.execPath, [
  resolve(root, "node_modules/@tailwindcss/cli/dist/index.mjs"),
  "-i", resolve(frontend, "src/styles.css"),
  "-o", resolve(outdir, "styles.css"),
  "--watch",
], { cwd: root, stdio: "inherit" });

await import("../backend/server.mjs");

function stop() {
  tailwind.kill();
  esbuild.dispose();
  process.exit();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
