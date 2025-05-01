import axios from "axios";

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
      const { name } = request.body;
      if (!name) {
        return reply.code(400).send("Error: Name must be provided");
      }

      const userResponse = await axios.get(
        "https://api.twitch.tv/helix/users",
        {
          headers: {
            Authorization: "Bearer 4u1v9u8lc6apa5u2u94ftg554mqq24",
            "Client-Id": "f7cf6pk6ez8ccdeieryzkunmdewymq",
          },
          params: {
            login: name,
          },
        }
      );

      const userId = userResponse.data.data[0].id;
      // todo insert into my users table for the foreign key stuff

      const text = `
        INSERT INTO track (channel_id)
        VALUES ($1)`;
      const values = [userId];
      await fastify.pg.query(text, values);
    } catch (error) {
      console.log(error);
      return reply
        .code(500)
        .send("Error: Failed to add channel to tracking table");
    }
  });
}
