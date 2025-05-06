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

async function initializeTables() {
  await createChannelsToTrackTable();

  await createUsersTable();
  await createPrivmsgTable();

  await createNotifyActiveUpdateFunction();
  await createTriggerOnActiveUpdate();

  await client.query("LISTEN track_update");
}

async function createNotifyActiveUpdateFunction() {
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION notify_track_update() RETURNS trigger AS $$
        DECLARE
          display_name text;
          channel_id int;
          is_active boolean;

        BEGIN
          IF TG_OP = 'DELETE' THEN
            channel_id := OLD.channel_id;
            is_active = false;
          ELSE
            channel_id := NEW.channel_id;
            is_active = NEW.active;
          END IF;

          SELECT name into display_name
          FROM users
          WHERE id = channel_id;

          PERFORM pg_notify(
          'track_update',
          json_build_object(
            'channel_id', channel_id,
            'name', display_name,
            'active', is_active
            )::text
          );
          RETURN NEW;
        END;
      $$ LANGUAGE plpgsql;
    `);
  } catch (error) {
    console.error("Failed to create active update function");
    console.error(error);
    process.exit();
  }
}

async function createTriggerOnActiveUpdate() {
  // todo: This triggers if active is false and we delete,
  // it can cause us to attempt to leave a channel we already weren't inside of.
  // It seems fine for now, Twitch IRC doesn't care?

  try {
    await client.query(`
      CREATE OR REPLACE TRIGGER trigger_track_insert
      AFTER INSERT ON track
      FOR EACH ROW
      EXECUTE FUNCTION notify_track_update();

      CREATE OR REPLACE TRIGGER trigger_track_delete
      AFTER DELETE ON track
      FOR EACH ROW
      EXECUTE FUNCTION notify_track_update();

      CREATE OR REPLACE TRIGGER trigger_track_update
      AFTER UPDATE OF active ON track
      FOR EACH ROW
      WHEN (OLD.active IS DISTINCT FROM NEW.active)
      EXECUTE FUNCTION notify_track_update();
    `);
  } catch (error) {
    console.error("Failed to create trigger for active change");
    console.error(error);
    process.exit();
  }
}

export async function onTrackActiveChanged(callback: any) {
  client.on("notification", callback);
}
export async function offTrackActiveChanged(callback: any) {
  client.off("notification", callback);
}

async function createChannelsToTrackTable() {
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS track (
      id          SERIAL PRIMARY KEY,
      channel_id  INT REFERENCES users(id) UNIQUE NOT NULL,
      active      BOOLEAN DEFAULT TRUE
    )`);
  } catch (error) {
    console.error("Failed to create track table");
    console.error(error);
    process.exit();
  }
}

export async function getChannelsToTrack(): Promise<string[]> {
  try {
    const result = await client.query(`
        SELECT users.name
        FROM users
        JOIN track ON users.id = track.channel_id
        WHERE track.active = true;
      `);

    return result.rows.map((x) => x.name);
  } catch (error) {
    console.error("Failed to get active tracking channels");
    console.error(error);
  }

  return [];
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
  } catch (error) {
    console.error("Failed to create privmsg table");
    console.error(error);
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
    console.error("Failed to store message");
    console.error(error);
  }
}

async function createUsersTable() {
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id          INT PRIMARY KEY,
      name        TEXT NOT NULL
    )`);
  } catch (error) {
    console.error("Failed to create users table");
    console.error(error);
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
    console.error("Failed to store user");
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
