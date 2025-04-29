import { Client } from "pg";

const client = new Client({
  connectionString: "postgres://postgres:example@db:5432",
});
await client.connect();

function initializeTables() {
  createPrivmsgTable();
  // createClearchatTable();
  // createRoomTable();
  // createAccountTable();
}

interface Privmsg {
  id: String;
  userId: Number;
  roomId: Number;
  timestamp: Number;
  message: String;
}

async function createPrivmsgTable() {
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS privmsg (
      id          uuid,
      user_id     int,
      room_id     int,
      timestamp   timestamptz,
      message     text
      )`);
  } catch {
    console.error("Failed to create privmsg table");
    process.exit();
  }
}

export async function storePrivmsg({
  id,
  userId,
  roomId,
  timestamp,
  message,
}: Privmsg) {
  try {
    const text = `INSERT INTO privmsg ( 
      id,
      user_id,
      room_id,
      timestamp,
      message
    ) VALUES ($1, $2, $3, TO_TIMESTAMP($4 / 1000.0), $5)`;
    const values = [id, userId, roomId, timestamp, message];
    await client.query(text, values);
  } catch (error) {
    console.error(error);
    process.exit();
  }
}

initializeTables();

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
