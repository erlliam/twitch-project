import fp from "fastify-plugin";
import swaggerUi, { FastifySwaggerUiOptions } from "@fastify/swagger-ui";

export default fp<FastifySwaggerUiOptions>(
  async (fastify) => {
    fastify.register(swaggerUi, {
      routePrefix: "/api/docs",
    });
  },
  { dependencies: ["swagger"] }
);
