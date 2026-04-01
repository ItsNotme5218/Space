import type { FastifyInstance } from "fastify";
import path from "path";
import fastifyStatic from "@fastify/static";
import { APIRouter } from "./api";

const __dirname = process.cwd();

const frontendPath = path.join(__dirname, "dist");

async function router(fastify: FastifyInstance) {
  await fastify.register(fastifyStatic, {
    root: frontendPath,
    prefix: "/",
    index: ["index.html"],
    extensions: ["html"],
    setHeaders: (res, filePath) => {
      if (
        filePath.includes("/res/g/") ||
        filePath.includes("/assets/") ||
        filePath.endsWith(".webp") ||
        filePath.endsWith(".woff2") ||
        filePath.endsWith(".woff")
      ) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (filePath.endsWith(".js") || filePath.endsWith(".css")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  });

  await APIRouter(fastify);
}

export { router };
export default router;
