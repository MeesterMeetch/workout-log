import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_SECRET || "dev-only-secret-change-me";
const COOKIE = "wl_session";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export function issueSession(res, user) {
  const token = jwt.sign(
    { id: user.id, username: user.username, displayName: user.display_name },
    SECRET,
    { expiresIn: "30d" }
  );

  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: THIRTY_DAYS,
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE);
}

export function readSession(req) {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export function requireUser(req, res, next) {
  const user = readSession(req);
  if (!user) {
    return res.status(401).json({ error: "Sign in to continue." });
  }
  req.user = user;
  next();
}
