import { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";

const channels: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify,
  opts
): Promise<void> => {
  fastify.get("/", async (request, reply) => {
    try {
      const { rows } = await fastify.pg.query(`
        SELECT DISTINCT users.name, privmsg.room_id
        FROM privmsg
        JOIN users ON users.id = privmsg.room_id;
      `);

      return rows;
    } catch (error) {
      console.error(error);
      return reply.code(500).send("Error: Failed to query channels");
    }
  });
};

export default channels;
