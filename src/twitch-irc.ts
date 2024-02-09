import { WebSocket, type WebSocket as WebSocketType } from "ws";

const TWITCH_IRC_URI = "wss://irc-ws.chat.twitch.tv:443";
const TWITCH_TMI = "tmi.twitch.tv";
const TWITCH_PASS = "asdf532"; // PASS <random_string>
const TWITCH_NICK = "justinfan12345"; // NICK justinfan<random_number>
const TWITCH_TARGET_CHANNEL = "xqc";

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

const webSocket = new WebSocket(TWITCH_IRC_URI, { autoPong: true } as any);

webSocket.addEventListener("open", () => {
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

  console.log(parsedMessages);

  if (!capabilitiesEnabled) {
    for (const parsedMessage of parsedMessages) {
      if (parsedMessage.prefix !== TWITCH_TMI) {
        continue;
      }

      if (parsedMessage.command !== "CAP") {
        continue;
      }

      if (
        !(
          parsedMessage.params.join("") ===
          "*ACKtwitch.tv/commands twitch.tv/tags"
        )
      ) {
        continue;
      }

      capabilitiesEnabled = true;

      webSocket.send(`PASS ${TWITCH_PASS}`);
      webSocket.send(`NICK ${TWITCH_NICK}`);
    }
  } else if (!authenticated) {
    for (const parsedMessage of parsedMessages) {
      if (parsedMessage.prefix !== TWITCH_TMI) {
        continue;
      }

      if (!Object.keys(authenticated).includes(parsedMessage.command)) {
        continue;
      }

      if (parsedMessage.params[0] !== TWITCH_NICK) {
        continue;
      }

      authenticatedState[parsedMessage.command] = true;
    }

    authenticated = Object.values(authenticated).every((x) => x === true);
    if (authenticated) {
      webSocket.send(`JOIN #${TWITCH_TARGET_CHANNEL}`);
    }
  } else if (!chatJoined) {
    for (const parsedMessage of parsedMessages) {
      let valid = false;
      if (
        parsedMessage.command === "JOIN" &&
        parsedMessage.prefix ===
          `${TWITCH_NICK}!${TWITCH_NICK}@${TWITCH_NICK}.${TWITCH_TMI}` &&
        parsedMessage.params[0] === `#${TWITCH_TARGET_CHANNEL}`
      ) {
        valid = true;
      } else if (
        parsedMessage.command === "353" &&
        parsedMessage.prefix === `${TWITCH_NICK}.${TWITCH_TMI}` &&
        parsedMessage.params.join("") ===
          `${TWITCH_NICK}=#${TWITCH_TARGET_CHANNEL}${TWITCH_NICK}`
      ) {
        valid = true;
      } else if (
        parsedMessage.command === "366" &&
        parsedMessage.prefix === `${TWITCH_NICK}.${TWITCH_TMI}` &&
        parsedMessage.params.join("") ===
          `${TWITCH_NICK}#${TWITCH_TARGET_CHANNEL}End of /NAMES list`
      ) {
        valid = true;
      } else if (
        parsedMessage.command === "ROOMSTATE" &&
        parsedMessage.prefix === TWITCH_TMI &&
        parsedMessage.params[0] === `#${TWITCH_TARGET_CHANNEL}`
      ) {
        valid = true;
      }

      if (valid) {
        chatJoinedState[parsedMessage.command] = true;
      }
    }

    chatJoined = Object.values(chatJoinedState).every((x) => x === true);
  } else {
    console.log(data.split("\r\n").filter((x) => x !== ""));
    console.log(
      data
        .split("\r\n")
        .filter((x) => x !== "")
        .map(parseMessage),
    );
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

interface ParsedMessage {
  tags: Record<string, string>;
  prefix: string;
  command: string;
  params: string[];
}

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

function twitchCapabilitiesResponse(parsedMessage: ParsedMessage) {
  return (
    parsedMessage.prefix === TWITCH_TMI &&
    parsedMessage.command === "CAP" &&
    parsedMessage.params[0] === "*" &&
    parsedMessage.params[1] === "ACK" &&
    parsedMessage.params[2] === "twitch.tv/commands twitch.tv/tags"
  );
}
