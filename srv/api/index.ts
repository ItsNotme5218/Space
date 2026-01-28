import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { plusAPI } from "./plus";

async function APIRouter(app: FastifyInstance) {
  // Server only route that the frontend can reference for detection of static shit
  app.get(
    "/api/detect",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply
        .status(200)
        .header("Content-Type", "application/json")
        .header("Cache-Control", "no-cache, no-store, must-revalidate")
        .send({ server: true });
    },
  );

  plusAPI(app);
}

export { APIRouter };
export default APIRouter;
