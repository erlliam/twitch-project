import { Client } from "pg";

type User = {
  id: String;
  name: String;
};

type Privmsg = {
  id: String;
  userId: Number;
  roomId: Number;
  timestamp: Number;
  message: String;
};

const client = new Client({
  connectionString: "postgres://postgres:example@db:5432",
});
await client.connect();

function initializeTables() {
  createUsersTable();
  createPrivmsgTable();
}

async function createPrivmsgTable() {
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS privmsg (
      id          UUID PRIMARY KEY,
      user_id     INT REFERENCES users(id),
      room_id     INT REFERENCES users(id),
      timestamp   TIMESTAMPTZ NOT NULL,
      message     TEXT NOT NULL
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
  }
}

async function createUsersTable() {
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id          INT PRIMARY KEY,
      name        TEXT NOT NULL
    )`);
  } catch {
    console.error("Failed to create users table");
  }
}

export async function storeUser({ id, name }: User) {
  try {
    const text = `
      INSERT INTO users (id, name)
      VALUES ($1, $2)
      ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name
        WHERE users.name IS DISTINCT FROM EXCLUDED.name
    `;
    const values = [id, name];
    await client.query(text, values);
  } catch (error) {
    console.error(error);
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

// storeClearChat({
//   id: parsedMessage.tags.id,
//   userId: parsedMessage.tags["target-user-id"],
//   roomId: parsedMessage.tags["room-id"],
//   timestamp: parsedMessage.tags["tmi-sent-ts"],
//   message: parsedMessage.params[1],
//   duration: parsedMessage.tags["ban-duration"],
// });
