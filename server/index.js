import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import { pool, migrate, seedUsers } from "./db.js";
import { issueSession, clearSession, requireUser } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "..", "dist");

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/login", async (req, res) => {
  const username = String(req.body?.username || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!username || !password) {
    return res.status(400).json({ error: "Enter a username and password." });
  }

  const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "That username and password do not match." });
  }

  issueSession(res, user);
  res.json({ username: user.username, displayName: user.display_name });
});

app.post("/api/logout", (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

app.get("/api/me", requireUser, (req, res) => {
  res.json({ username: req.user.username, displayName: req.user.displayName });
});

app.get("/api/entries", requireUser, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, to_char(log_date, 'YYYY-MM-DD') AS log_date, week, day_id,
            exercise_id, exercise_name, weight::float AS weight, sets, reps, note
       FROM entries
      WHERE user_id = $1
      ORDER BY log_date DESC, id DESC
      LIMIT 2000`,
    [req.user.id]
  );
  res.json(rows);
});

app.post("/api/entries", requireUser, async (req, res) => {
  const b = req.body || {};
  const logDate = String(b.logDate || "").slice(0, 10);
  const weight = Number(b.weight);
  const sets = Number(b.sets);
  const reps = Number(b.reps);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return res.status(400).json({ error: "Pick a valid date." });
  }
  if (!b.exerciseId || !b.exerciseName) {
    return res.status(400).json({ error: "Missing exercise." });
  }
  if (![weight, sets, reps].every((n) => Number.isFinite(n) && n >= 0)) {
    return res.status(400).json({ error: "Weight, sets and reps all need numbers." });
  }

  const { rows } = await pool.query(
    `INSERT INTO entries (user_id, log_date, week, day_id, exercise_id, exercise_name, weight, sets, reps, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (user_id, exercise_id, log_date)
     DO UPDATE SET weight = EXCLUDED.weight,
                   sets = EXCLUDED.sets,
                   reps = EXCLUDED.reps,
                   week = EXCLUDED.week,
                   day_id = EXCLUDED.day_id,
                   note = EXCLUDED.note
     RETURNING id, to_char(log_date, 'YYYY-MM-DD') AS log_date, week, day_id,
               exercise_id, exercise_name, weight::float AS weight, sets, reps, note`,
    [
      req.user.id,
      logDate,
      String(b.week || "A"),
      String(b.dayId || ""),
      String(b.exerciseId),
      String(b.exerciseName),
      weight,
      sets,
      reps,
      b.note ? String(b.note).slice(0, 280) : null,
    ]
  );

  res.json(rows[0]);
});

app.delete("/api/entries/:id", requireUser, async (req, res) => {
  await pool.query("DELETE FROM entries WHERE id = $1 AND user_id = $2", [
    Number(req.params.id),
    req.user.id,
  ]);
  res.json({ ok: true });
});

app.use(express.static(dist));

// Single page app fallback. Express 5 changed wildcard route syntax,
// so this stays a plain middleware on purpose.
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(dist, "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something broke on the server." });
});

const port = process.env.PORT || 3000;

migrate()
  .then(seedUsers)
  .then(() => {
    app.listen(port, () => console.log(`Workout log listening on ${port}`));
  })
  .catch((err) => {
    console.error("Startup failed:", err);
    process.exit(1);
  });
