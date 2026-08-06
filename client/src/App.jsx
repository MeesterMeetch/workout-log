import { useEffect, useMemo, useState } from "react";
import { WEEKS, KIND_LABEL } from "./routine.js";

function todayKey() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function prettyDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function repsOf(entry) {
  if (Array.isArray(entry.rep_list) && entry.rep_list.length) return entry.rep_list;
  return Array.from({ length: entry.sets }, () => entry.reps);
}

function repsText(entry) {
  return repsOf(entry).join(" / ");
}

function volume(entry) {
  return repsOf(entry).reduce((a, b) => a + b, 0) * entry.weight;
}

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options,
  });
  if (res.status === 401) throw new Error("unauthorized");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    api("/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setBooting(false));
  }, []);

  if (booting) {
    return <div className="boot">Loading</div>;
  }

  if (!user) {
    return <SignIn onSignedIn={setUser} />;
  }

  return <Log user={user} onSignOut={() => setUser(null)} />;
}

function SignIn({ onSignedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const me = await api("/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onSignedIn(me);
    } catch (err) {
      setError(err.message === "unauthorized" ? "That did not match." : err.message);
      setBusy(false);
    }
  }

  return (
    <div className="gate">
      <div className="gate-card">
        <p className="eyebrow">Home gym</p>
        <h1 className="wordmark">Workout Log</h1>
        <label className="field">
          <span>Username</span>
          <input
            autoCapitalize="none"
            autoCorrect="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" onClick={submit} disabled={busy}>
          {busy ? "Signing in" : "Sign in"}
        </button>
      </div>
    </div>
  );
}

function Log({ user, onSignOut }) {
  const [week, setWeek] = useState("A");
  const [dayIdx, setDayIdx] = useState(0);
  const [date, setDate] = useState(todayKey());
  const [entries, setEntries] = useState([]);
  const [view, setView] = useState("today");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/entries")
      .then(setEntries)
      .catch((err) => setError(err.message));
  }, []);

  const day = WEEKS[week][dayIdx];

  const byExercise = useMemo(() => {
    const map = {};
    for (const e of entries) {
      (map[e.exercise_id] ||= []).push(e);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.log_date < b.log_date ? 1 : -1));
    }
    return map;
  }, [entries]);

  async function save(exercise, values) {
    const saved = await api("/entries", {
      method: "POST",
      body: JSON.stringify({
        logDate: date,
        week,
        dayId: day.id,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        ...values,
      }),
    });
    setEntries((prev) => [saved, ...prev.filter((e) => e.id !== saved.id)]);
  }

  async function remove(id) {
    await api(`/entries/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function signOut() {
    await api("/logout", { method: "POST" });
    onSignOut();
  }

  return (
    <div className="shell">
      <header className="top">
        <div>
          <p className="eyebrow">{user.displayName}</p>
          <h1 className="wordmark">Workout Log</h1>
        </div>
        <button className="ghost" onClick={signOut}>
          Sign out
        </button>
      </header>

      <nav className="tabs">
        <button
          className={view === "today" ? "tab on" : "tab"}
          onClick={() => setView("today")}
        >
          Session
        </button>
        <button
          className={view === "history" ? "tab on" : "tab"}
          onClick={() => setView("history")}
        >
          History
        </button>
      </nav>

      {error && <p className="error">{error}</p>}

      {view === "today" ? (
        <>
          <div className="controls">
            <div className="switch">
              {["A", "B"].map((w) => (
                <button
                  key={w}
                  className={week === w ? "switch-btn on" : "switch-btn"}
                  onClick={() => {
                    setWeek(w);
                    setDayIdx(0);
                  }}
                >
                  Week {w}
                </button>
              ))}
            </div>
            <input
              className="date"
              type="date"
              value={date}
              max={todayKey()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="days">
            {WEEKS[week].map((d, i) => (
              <button
                key={d.id}
                className={i === dayIdx ? `day on ${d.kind}` : `day ${d.kind}`}
                onClick={() => setDayIdx(i)}
              >
                <span className="day-num">Day {i + 1}</span>
                <span className="day-kind">{KIND_LABEL[d.kind]}</span>
              </button>
            ))}
          </div>

          <p className="day-label">{day.label}</p>

          {day.exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              date={date}
              history={byExercise[ex.id] || []}
              onSave={(values) => save(ex, values)}
            />
          ))}
        </>
      ) : (
        <History entries={entries} onDelete={remove} />
      )}
    </div>
  );
}

function ExerciseCard({ exercise, date, history, onSave }) {
  const todayEntry = history.find((e) => e.log_date === date) || null;
  const previous = history.find((e) => e.log_date < date) || null;

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState(["12", "12", "12"]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const source = todayEntry || previous;
    setEditing(false);
    setWeight(source ? String(source.weight) : "");
    setReps(source ? repsOf(source).map(String) : ["12", "12", "12"]);
  }, [exercise.id, date, todayEntry?.id, previous?.id]);

  const volumeDelta =
    todayEntry && previous ? volume(todayEntry) - volume(previous) : null;

  function setRep(i, value) {
    setReps((prev) => prev.map((r, idx) => (idx === i ? value : r)));
  }

  async function submit() {
    setBusy(true);
    try {
      await onSave({ weight, repList: reps.map((r) => Number(r) || 0) });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  const showForm = !todayEntry || editing;

  return (
    <section className="lift">
      <div className="lift-head">
        <h2>{exercise.name}</h2>
        {exercise.focus && <span className="focus">Focus lift</span>}
      </div>

      <p className="ghost-line">
        {previous
          ? `Last time ${prettyDate(previous.log_date)}: ${previous.weight} lb, ${repsText(previous)}`
          : "No history yet. This one sets the baseline."}
      </p>

      {showForm ? (
        <div className="entry">
          <label className="num">
            <span>Weight</span>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="lb"
            />
          </label>

          <div className="sets">
            {reps.map((r, i) => (
              <label className="num" key={i}>
                <span>Set {i + 1}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={r}
                  onChange={(e) => setRep(i, e.target.value)}
                />
              </label>
            ))}
          </div>

          <div className="set-actions">
            <button
              className="ghost small"
              onClick={() => setReps((prev) => [...prev, prev[prev.length - 1] || "12"])}
              disabled={reps.length >= 10}
            >
              Add set
            </button>
            {reps.length > 1 && (
              <button
                className="ghost small"
                onClick={() => setReps((prev) => prev.slice(0, -1))}
              >
                Remove set
              </button>
            )}
          </div>

          <button className="primary" onClick={submit} disabled={busy}>
            {busy ? "Saving" : todayEntry ? "Update" : "Log it"}
          </button>
        </div>
      ) : (
        <div className="logged">
          <p className="logged-line">
            {todayEntry.weight} lb, {repsText(todayEntry)}
          </p>
          {volumeDelta !== null && volumeDelta !== 0 && (
            <span className={volumeDelta > 0 ? "delta up" : "delta down"}>
              volume {volumeDelta > 0 ? "up" : "down"} {Math.abs(volumeDelta)} lb
            </span>
          )}
          <button className="ghost" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      )}
    </section>
  );
}

function History({ entries, onDelete }) {
  const days = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      if (!map.has(e.log_date)) map.set(e.log_date, []);
      map.get(e.log_date).push(e);
    }
    return [...map.entries()];
  }, [entries]);

  if (days.length === 0) {
    return <p className="empty">Nothing logged yet. Head to the session tab and put a lift in.</p>;
  }

  return (
    <div className="history">
      {days.map(([date, items]) => (
        <section key={date} className="history-day">
          <h3>{prettyDate(date)}</h3>
          {items.map((e) => (
            <div key={e.id} className="history-row">
              <span className="history-name">{e.exercise_name}</span>
              <span className="history-nums">
                {e.weight} lb, {repsText(e)}
              </span>
              <button className="ghost small" onClick={() => onDelete(e.id)}>
                Remove
              </button>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
