import fp from "fastify-plugin";
import swagger, { FastifySwaggerOptions } from "@fastify/swagger";

export default fp<FastifySwaggerOptions>(
  async (fastify) => {
    fastify.register(swagger);
  },
  {
    name: "swagger",
  }
);
