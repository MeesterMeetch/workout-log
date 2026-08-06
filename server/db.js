import pg from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it in the Render dashboard.");
  process.exit(1);
}

const isLocal =
  connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

export const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 5,
});

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      log_date DATE NOT NULL,
      week TEXT NOT NULL,
      day_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      weight NUMERIC(6,1) NOT NULL,
      sets INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, exercise_id, log_date)
    );
  `);

  await pool.query(`
    ALTER TABLE entries ADD COLUMN IF NOT EXISTS rep_list INTEGER[];
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS entries_user_exercise_date_idx
      ON entries (user_id, exercise_id, log_date DESC);
  `);
}

/**
 * APP_USERS format: "mitch:somepassword:Mitch,chelsea:otherpassword:Chelsea"
 * Display name is optional and falls back to a capitalized username.
 * Running this on every boot means changing the env var changes the password.
 */
export async function seedUsers() {
  const raw = process.env.APP_USERS;
  if (!raw) {
    console.warn("APP_USERS is not set, so nobody can log in yet.");
    return;
  }

  for (const chunk of raw.split(",")) {
    const [username, password, displayName] = chunk.split(":").map((s) => (s || "").trim());
    if (!username || !password) continue;

    const hash = await bcrypt.hash(password, 10);
    const name = displayName || username.charAt(0).toUpperCase() + username.slice(1);

    await pool.query(
      `INSERT INTO users (username, password_hash, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (username)
       DO UPDATE SET password_hash = EXCLUDED.password_hash,
                     display_name = EXCLUDED.display_name`,
      [username.toLowerCase(), hash, name]
    );
  }
}
