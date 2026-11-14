const apiBaseUrl = (process.env.DOCTOR_API_BASE_URL || "https://nhrx-patient-python.onrender.com").replace(/\/+$/, "");

export async function getTodayAppointments(request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ message: "Please sign in to view appointments." }, { status: 401 });
  }
  try {
    const upstream = await fetch(`${apiBaseUrl}/doctors/me/appointments/today`, {
      headers: { Accept: "application/json", Authorization: authorization },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const result = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const message = result?.detail || result?.message || "Could not fetch appointments.";
      return Response.json({ message }, { status: upstream.status });
    }
    if (!Array.isArray(result)) {
      return Response.json({ message: "The appointments service returned an invalid response." }, { status: 502 });
    }
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Appointment service is unavailable. Try again shortly." }, { status: 502 });
  }
}
