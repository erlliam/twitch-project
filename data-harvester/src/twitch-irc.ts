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

// todo: Add twitch target channel to users table in database, we must hit the twitch API for this part
const TWITCH_TARGET_CHANNEL = "xqc";
console.log(await getChannelsToTrack());

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

function validChatJoinedResponse(parsedMessage: ParsedMessage) {
  const validJoinMessage =
    parsedMessage.prefix ===
      `${TWITCH_NICK}!${TWITCH_NICK}@${TWITCH_NICK}.${TWITCH_TMI}` &&
    parsedMessage.command === "JOIN" &&
    parsedMessage.params[0] === `#${TWITCH_TARGET_CHANNEL}`;

  const validRoomStateMessage =
    parsedMessage.prefix === TWITCH_TMI &&
    parsedMessage.command === "ROOMSTATE" &&
    parsedMessage.params[0] === `#${TWITCH_TARGET_CHANNEL}`;

  const valid353Message =
    parsedMessage.prefix === `${TWITCH_NICK}.${TWITCH_TMI}` &&
    parsedMessage.command === "353" &&
    parsedMessage.params[0] === TWITCH_NICK &&
    parsedMessage.params[1] === "=" &&
    parsedMessage.params[2] === `#${TWITCH_TARGET_CHANNEL}` &&
    parsedMessage.params[3] === TWITCH_NICK;

  const valid366Message =
    parsedMessage.prefix === `${TWITCH_NICK}.${TWITCH_TMI}` &&
    parsedMessage.command === "366" &&
    parsedMessage.params[0] === TWITCH_NICK &&
    parsedMessage.params[1] === `#${TWITCH_TARGET_CHANNEL}` &&
    parsedMessage.params[2] === "End of /NAMES list";

  return (
    validJoinMessage ||
    validRoomStateMessage ||
    valid353Message ||
    valid366Message
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

  webSocket.addEventListener("message", (event) => {
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
        webSocket.send(`JOIN #${TWITCH_TARGET_CHANNEL}`);
      }
    } else if (!chatJoined) {
      for (const parsedMessage of parsedMessages) {
        if (validChatJoinedResponse(parsedMessage)) {
          chatJoinedState[parsedMessage.command] = true;
        }
      }

      chatJoined = Object.values(chatJoinedState).every((x) => x === true);
      if (chatJoined) {
        console.log(`Joined chat room: ${TWITCH_TARGET_CHANNEL}`);
      }
    } else {
      for (const parsedMessage of parsedMessages) {
        if (validPingMessage(parsedMessage)) {
          webSocket.send(`PONG :${TWITCH_TMI}`);
        } else if (parsedMessage.command === "PRIVMSG") {
          storeUser({
            id: parsedMessage.tags["room-id"],
            name: TWITCH_TARGET_CHANNEL,
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

          console.log(
            `${new Date().toLocaleString()} - ${parsedMessage.tags["display-name"]}: ${parsedMessage.params[1]}`,
          );
        } // else if (parsedMessage.command === "CLEARCHAT") {
        // storeClearChat({
        //   id: parsedMessage.tags.id,
        //   userId: parsedMessage.tags["target-user-id"],
        //   roomId: parsedMessage.tags["room-id"],
        //   timestamp: parsedMessage.tags["tmi-sent-ts"],
        //   message: parsedMessage.params[1],
        //   duration: parsedMessage.tags["ban-duration"],
        // });
        // console.log(parsedMessage);
        else {
          console.log(parsedMessage);
        }
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
