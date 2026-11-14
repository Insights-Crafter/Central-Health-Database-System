import { randomBytes } from "node:crypto";

const sessions = new Map();

export function createLabSession(staffId, expiresIn = 28800) {
  const token = randomBytes(32).toString("base64url");
  sessions.set(token, { staffId: Number(staffId), expiresAt: Date.now() + expiresIn * 1000 });
  return token;
}

export function getLabSession(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) { if (token) sessions.delete(token); return null; }
  return session;
}
