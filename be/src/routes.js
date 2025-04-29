export default function (fastify, options) {
  fastify.get("/:id", async (request, reply) => {
    try {
      const { rows } = await client.query(
        "SELECT id, username, hash, salt FROM users WHERE id=$1",
        [request.params.id]
      );
      // Note: avoid doing expensive computation here, this will block releasing the client
      return rows;
    } catch {
      return "Error: failed to query datab1";
    }
  });
}
