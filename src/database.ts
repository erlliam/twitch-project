import postgres from "postgres";

const sql = postgres({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: " ",
  database: "template1",
});

function initializeTables() {
  createPrivmsgTable();
  // createClearchatTable();
  // createRoomTable();
  // createAccountTable();
}

function createPrivmsgTable() {
  sql`CREATE TABLE IF NOT EXISTS privmsg (
      id          uuid,
      user_id     int,
      room_id     int,
      timestamp   timestamp,
      message     text
    )`.catch(() => {
    console.error("Failed to create privmsg table");
    process.exit();
  });
}

// function createClearchatTable() {
//   sql`CREATE TABLE IF NOT EXISTS clearchat (
//       id          int,
//       user_id     int,
//       room_id     int,
//       timestamp   int,
//       message     text,
//       duration    int
//     )`.catch(() => {
//     console.error("Failed to create clearchat table");
//     process.exit();
//   });
// }

// function createAccountTable() {
//   sql`CREATE TABLE IF NOT EXISTS accounts (
//       id          int,
//       name        text
//     )`.catch(() => {
//     console.error("Failed to create account table");
//     process.exit();
//   });
// }

// function createRoomTable() {
//   sql`CREATE TABLE IF NOT EXISTS room (
//       id          int,
//       name        text
//     )`.catch(() => {
//     console.error("Failed to create room table");
//     process.exit();
//   });
// }

export function storePrivmsg({
  id,
  userId,
  roomId,
  timestamp,
  message,
}: {
  id: String;
  userId: Number;
  roomId: Number;
  timestamp: Number;
  message: String;
}) {
  sql`INSERT INTO privmsg ( 
    id,
    user_id,
    room_id,
    timestamp,
    message
  ) VALUES (
    ${id},
    ${userId},
    ${roomId},
    ${timestamp},
    ${message}
  )`.catch((error) => {
    console.error(error);
    process.exit();
  });
}

initializeTables();

// storeUser({
//   id: parsedMessage.tags["user-id"],
//   name: parsedMessage.tags["display-name"],
// });
// storePrivMsg({
//   id: parsedMessage.tags.id,
//   userId: parsedMessage.tags["user-id"],
//   roomId: parsedMessage.tags["room-id"],
//   timestamp: parsedMessage.tags["tmi-sent-ts"],
//   message: parsedMessage.params[1],
// });

// console.log(
//   `${parsedMessage.tags["display-name"]}: ${parsedMessage.params[1]}`,
// );

// storeClearChat({
//   id: parsedMessage.tags.id,
//   userId: parsedMessage.tags["target-user-id"],
//   roomId: parsedMessage.tags["room-id"],
//   timestamp: parsedMessage.tags["tmi-sent-ts"],
//   message: parsedMessage.params[1],
//   duration: parsedMessage.tags["ban-duration"],
// });
