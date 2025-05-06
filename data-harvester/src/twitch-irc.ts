import { WebSocket, type WebSocket as WebSocketType } from "ws";

import { getChannelsToTrack, storePrivmsg, storeUser } from "./database.js";

interface ParsedMessage {
  tags: Record<string, string>;
  prefix: string;
  command: string;
  params: string[];
}

const TWITCH_IRC_URI = "wss://irc-ws.chat.twitch.tv:443";
const TWITCH_TMI = "tmi.twitch.tv";
const TWITCH_PASS = "SCHMOOPIIE"; // Use the same password as tmi.js to blend in?
const TWITCH_NICK = `justinfan${Math.floor(Math.random() * 80000 + 1000)}`;

let capabilitiesEnabled = false;
let authenticated = false;
let chatJoined = false;

const authenticatedState: Record<string, boolean> = {
  "001": false,
  "002": false,
  "003": false,
  "004": false,
  "375": false,
  "372": false,
  "376": false,
};

const chatJoinedState: Record<string, boolean> = {
  JOIN: false,
  ROOMSTATE: false, // Should I even check for this?
  "353": false,
  "366": false,
};

function parseMessage(message: string): ParsedMessage {
  let index = 0;

  let rawTags;
  if (message[index] === "@") {
    index++;
    const tagEndIndex = message.indexOf(" ", index);
    rawTags = message.slice(index, tagEndIndex);
    index = tagEndIndex + 1;
  }

  let tags: Record<string, string> = {};
  if (rawTags) {
    for (const rawTag of rawTags.split(";")) {
      const [tagKey, tagValue] = rawTag.split("=");
      tags[tagKey] = tagValue ?? "";
    }
  }

  let prefix = "";
  if (message[index] === ":") {
    index++;
    const prefixEndIndex = message.indexOf(" ", index);
    prefix = message.slice(index, prefixEndIndex);
    index = prefixEndIndex + 1;
  }

  let command;
  const commandEndIndex = message.indexOf(" ", index);
  command = message.slice(index, commandEndIndex);
  index = commandEndIndex + 1;

  let params;
  const trailingStartIndex = message.indexOf(" :", index);
  if (trailingStartIndex === -1) {
    params = message.slice(index).split(" ");
  } else {
    params = message.slice(index, trailingStartIndex).split(" ");
    params.push(message.slice(trailingStartIndex + 2));
  }

  return {
    tags,
    prefix,
    command,
    params,
  };
}

function validTwitchCapabilitiesResponse(parsedMessage: ParsedMessage) {
  return (
    parsedMessage.prefix === TWITCH_TMI &&
    parsedMessage.command === "CAP" &&
    parsedMessage.params[0] === "*" &&
    parsedMessage.params[1] === "ACK" &&
    parsedMessage.params[2] === "twitch.tv/commands twitch.tv/tags"
  );
}

function validTwitchAuthenticationResponse(parsedMessage: ParsedMessage) {
  // 001, 002, 003, 004, 375, 372, 376
  const authenticationCommands = Object.keys(authenticatedState);

  return (
    parsedMessage.prefix === TWITCH_TMI &&
    authenticationCommands.includes(parsedMessage.command) &&
    parsedMessage.params[0] === TWITCH_NICK
  );
}

function validPingMessage(parsedMessage: ParsedMessage) {
  return (
    parsedMessage.command === "PING" &&
    parsedMessage.params[0] === `:${TWITCH_TMI}`
  );
}

function main() {
  const webSocket = new WebSocket(TWITCH_IRC_URI);

  webSocket.addEventListener("open", () => {
    console.log("WebSocket opened");
    webSocket.send("CAP REQ :twitch.tv/commands twitch.tv/tags");
  });

  webSocket.addEventListener("message", async (event) => {
    const data = event.data;
    if (typeof data !== "string") {
      return;
    }
    const parsedMessages = data
      .split("\r\n")
      .filter((x) => x !== "")
      .map(parseMessage);

    if (!capabilitiesEnabled) {
      for (const parsedMessage of parsedMessages) {
        if (validTwitchCapabilitiesResponse(parsedMessage)) {
          capabilitiesEnabled = true;
          console.log("Capabilities enabled");
          webSocket.send(`PASS ${TWITCH_PASS}`);
          webSocket.send(`NICK ${TWITCH_NICK}`);
        }
      }
    } else if (!authenticated) {
      for (const parsedMessage of parsedMessages) {
        if (validTwitchAuthenticationResponse(parsedMessage)) {
          authenticatedState[parsedMessage.command] = true;
        }
      }

      authenticated = Object.values(authenticatedState).every(
        (x) => x === true,
      );
      if (authenticated) {
        console.log("Authenticated");
        let channelsToJoin: string[] = await getChannelsToTrack();
        for (const channel of channelsToJoin) {
          // todo: Investigate join limits. I believe it's like 20 channels for an unauthenticated user.
          // Then you need to wait like 20 seconds to keep joining?
          webSocket.send(`JOIN #${channel.toUpperCase()}`);
        }
        console.log(await getChannelsToTrack());
      }
    } else {
      for (const parsedMessage of parsedMessages) {
        if (validPingMessage(parsedMessage)) {
          webSocket.send(`PONG :${TWITCH_TMI}`);
          return;
        }

        switch (parsedMessage.command) {
          case "353":
          case "366":
            break;

          case "PRIVMSG":
            storeUser({
              id: parsedMessage.tags["room-id"],
              name: parsedMessage.params[0].replace("#", ""),
            });

            storeUser({
              id: parsedMessage.tags["user-id"],
              name: parsedMessage.tags["display-name"],
            });

            storePrivmsg({
              id: parsedMessage.tags.id,
              userId: parseInt(parsedMessage.tags["user-id"]),
              roomId: parseInt(parsedMessage.tags["room-id"]),
              timestamp: parseInt(parsedMessage.tags["tmi-sent-ts"]),
              message: parsedMessage.params[1],
            });

            // todo: Create debug flags or something
            // console.log(
            //   `${parsedMessage.params[0]}: ${new Date().toLocaleString()} - ${parsedMessage.tags["display-name"]}: ${parsedMessage.params[1]}`,
            // );
            break;

          case "JOIN":
            // todo: Keep track of this somewhere. We want the UI to know what channels we are connected to
            // todo: Determine when we disconnect from a room
            console.log(`===== Successfully joined ${parsedMessage.params[0]}`);
            console.log(parsedMessage);
            console.log("=====");
            break;
          case "ROOMSTATE":
            console.log(`===== Room state for ${parsedMessage.params[0]}`);
            console.log(parsedMessage);
            console.log("=====");
            break;

          default:
            console.log(parsedMessage);
        }

        // else if (parsedMessage.command === "CLEARCHAT") {
        // storeClearChat({
        //   id: parsedMessage.tags.id,
        //   userId: parsedMessage.tags["target-user-id"],
        //   roomId: parsedMessage.tags["room-id"],
        //   timestamp: parsedMessage.tags["tmi-sent-ts"],
        //   message: parsedMessage.params[1],
        //   duration: parsedMessage.tags["ban-duration"],
        // });
      }
    }
  });

  // you should try reconnecting using an exponential backoff approach.
  // If you have no luck, try again in 1 second, 2 seconds, 4 seconds, 8 seconds and so on for the number of attempts you want to make.
  webSocket.addEventListener("close", () => {
    console.log("close");
  });
  webSocket.addEventListener("error", (error) => {
    console.error(error);
  });

  // Without this it takes a while for the dockers to shut down
  process.on("SIGTERM", () => {
    webSocket.close();
    process.exit(0);
  });
}

main();
