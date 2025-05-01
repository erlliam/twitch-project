export default function (fastify, options) {
  fastify.get("/tracking", async (request, reply) => {
    try {
      const { rows } = await fastify.pg.query(`
        SELECT channel_id, active
        FROM track;
      `);

      return rows;
    } catch (error) {
      console.log(error);
      return "Error: Failed to query tracking table";
    }
  });

  const trackingOptions = {
    schema: {
      body: {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      },
    },
  };
  fastify.post("/tracking", trackingOptions, async (request, reply) => {
    try {
      await fastify.pg.query(`
        INSERT INTO track (channel_id)
        VALUES ($1)`);
    } catch (error) {
      console.log(error);
      return "Error: Failed to add channel to tracking table";
    }
  });
}
