const sessions = new Map();

export function rememberDoctorSession(token, doctorId, expiresIn = 1800, doctorName = "") {
  sessions.set(token, { doctorId: Number(doctorId), doctorName: String(doctorName || "").trim(), expiresAt: Date.now() + Number(expiresIn) * 1000 });
}

export function getDoctorSession(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return session;
}
