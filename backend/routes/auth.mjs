import { rememberDoctorSession } from "../auth/doctorSessions.mjs";

const apiBaseUrl = (process.env.DOCTOR_API_BASE_URL || "https://nhrx-patient-python.onrender.com").replace(/\/+$/, "");

export async function loginDoctor(request) {
  let input;
  try { input = await request.json(); }
  catch { return Response.json({ message: "Request body must be valid JSON." }, { status: 400 }); }

  const doctorId = Number(input?.doctorId);
  const password = typeof input?.password === "string" ? input.password : "";
  if (!Number.isSafeInteger(doctorId) || doctorId < 1 || !password) {
    return Response.json({ message: "Enter a valid doctor ID and password." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${apiBaseUrl}/doctors/auth/login`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId, password }),
      signal: AbortSignal.timeout(60000),
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return Response.json({ message: result.detail || result.message || "Doctor ID or password was rejected." }, { status: upstream.status });
    }
    const token = result.access_token || result.token;
    if (typeof token !== "string" || !token) {
      return Response.json({ message: "The login service returned no session token." }, { status: 502 });
    }
    const expiresIn = result.expires_in || 1800;
    const doctorName = result.doctor?.name || result.doctor?.full_name || result.name || "";
    rememberDoctorSession(token, doctorId, expiresIn, doctorName);
    return Response.json({
      token,
      doctorId,
      role: "DOCTOR",
      name: doctorName || `Doctor ${doctorId}`,
      expiresIn,
    });
  } catch {
    return Response.json({ message: "Doctor login service is unavailable. Try again shortly." }, { status: 502 });
  }
}
