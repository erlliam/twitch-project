import Fastify from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifyPostgres from "@fastify/postgres";

import routes from "./src/routes.js";

const fastify = Fastify({
  logger: true,
});

await fastify.register(fastifySwagger);
await fastify.register(import("@fastify/swagger-ui"), {
  routePrefix: "/api/docs",
});

fastify.register(fastifyPostgres, {
  connectionString: "postgres://postgres:example@db:5432",
});

fastify.register(routes, { prefix: "/api/" });

try {
  await fastify.listen({ host: "0.0.0.0", port: 3000 });
} catch (error) {
  fastify.log.error(error);
  process.exit(1);
}
