import axios from "axios";

// todo: Determine if we should do server sent events on database active changes
// Fuck it, let's support fucking "multiple controllers/users"

export default function (fastify, options) {
  fastify.get("/tracking", async (request, reply) => {
    try {
      const { rows } = await fastify.pg.query(`
        SELECT users.name, track.active
        FROM track
        JOIN users ON track.channel_id = users.id;
      `);

      return rows;
    } catch (error) {
      console.error(error);
      return "Error: Failed to query tracking table";
    }
  });

  fastify.post(
    "/tracking",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
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

        const { id, display_name: displayName } = userResponse.data.data[0];
        // todo: UNDUPLICATE THIS FROM dataharvester/src/database@!!!
        // todo: Make sure displayName exists and what not...
        await fastify.pg.query(
          `
        INSERT INTO users (id, name)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name
        WHERE users.name IS DISTINCT FROM EXCLUDED.name
        `,
          [id, displayName]
        );

        // todo: Errors if the channel is already tracked, I don't think we want to error out though
        await fastify.pg.query(
          `
        INSERT INTO track (channel_id)
        VALUES ($1)
        `,
          [id]
        );
        return reply.code(201).send(`Tracking ${name}`);
      } catch (error) {
        console.error(error);
        return reply
          .code(500)
          .send("Error: Failed to add channel to tracking table");
      }
    }
  );

  fastify.patch(
    "tracking/:name",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { name } = request.params;
        if (!name) {
          return reply.code(400).send("Error: Name must be provided");
        }

        const pgResult = await fastify.pg.query(
          `
          UPDATE track
          SET active = NOT track.active
          FROM users
          WHERE LOWER(users.name) = LOWER($1)
          AND users.id = track.channel_id
          RETURNING track.active;
        `,
          [name]
        );
        return reply.code(200).send(pgResult.rows[0].active);
      } catch (error) {
        console.error(error);
        return reply.code(500).send("Error: Failed to toggle channel");
      }
    }
  );

  fastify.delete(
    "/tracking/:name",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { name } = request.params;
        if (!name) {
          return reply.code(400).send("Error: Name must be provided");
        }

        await fastify.pg.query(
          `
          DELETE FROM track
          USING users
          WHERE LOWER(users.name) = LOWER($1)
          AND users.id = track.channel_id
        `,
          [name]
        );
        return reply.code(200).send(`No longer tracking ${name}`);
      } catch (error) {
        console.error(error);
        return reply
          .code(500)
          .send("Error: Failed to remove channel from tracking");
      }
    }
  );
}
