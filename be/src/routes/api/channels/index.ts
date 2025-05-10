import { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";
import axios from "axios";

type TwitchGetUsersReponse = {
  data: TwitchUser[];
};

type TwitchUser = {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: "partner" | "affiliate" | "";
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  created_at: string;
};

const channels: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify,
  opts
): Promise<void> => {
  fastify.get("/", async (request, reply) => {
    try {
      const { rows } = await fastify.pg.query({
        text: `SELECT DISTINCT room_id FROM privmsg`,
        rowMode: "array",
      });

      // todo: Create a plugin that will allow me to do fastify.twitchApi which is just an axios instance with the proper headers
      // todo: We are only doing this to get a profile picture
      // todo: Cache the twitch profile pictures, probably in the database, we already do a get request when tracking a channel
      const usersResponse = await axios.get<TwitchGetUsersReponse>(
        "https://api.twitch.tv/helix/users",
        {
          headers: {
            Authorization: `Bearer ${process.env.TWITCH_TOKEN}`,
            "Client-Id": process.env.TWITCH_CLIENT_ID,
          },
          params: {
            id: rows.flat(),
          },
        }
      );

      // todo: Auto convert snake case to camelCase when we return something in snake_case (not related to this code anymore)

      return usersResponse.data.data.map((x) => ({
        profilePicture: x.profile_image_url,
        id: x.id,
        name: x.display_name,
      }));
    } catch (error) {
      console.error(error);
      return reply.code(500).send("Error: Failed to query channels");
    }
  });
};

export default channels;
