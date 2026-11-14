# NHRX Doctor Portal

React-only doctor portal. The frontend is bundled with esbuild and styled with Tailwind CSS; the local Node.js backend serves the built frontend and provides the app-facing APIs.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env`. Set a valid `DATABASE_URL`, prescription R2 credentials, and `R2_REPORTS_ENDPOINT`, `R2_REPORTS_BUCKET`, `R2_REPORTS_ACCESS_KEY_ID`, and `R2_REPORTS_SECRET_ACCESS_KEY`. Keep `DOCTOR_API_BASE_URL` set to the doctor service.
4. Run `npm run db:generate` once after install.
5. Run `npm run db:check` to confirm the database credentials before migrating.
6. Apply the schema changes with `npx prisma migrate deploy --schema backend/prisma/schema.prisma`.
7. Run `npm run dev` and open `http://localhost:4000`.
8. Create or reset lab staff accounts with `npm run lab:create-staff` (passwords are stored as scrypt hashes).
9. For local sample accounts, run `npm run lab:seed-demo`. It generates one-time random passwords and prints them once.

For a production build, run `npm run build` and then `npm start`.

## Project structure

```text
frontend/
  src/pages/       Doctor and lab staff workspaces
  src/components/  Shared React components
  src/api.js       Browser calls to local backend APIs
backend/
  routes/          Node.js API handlers
  auth/            Doctor API session mapping
  db/prisma.mjs    Shared Prisma database client
  prisma/          Database schema and migrations
  storage/r2.mjs   Private Cloudflare R2 PDF storage
  server.mjs       Local API and static frontend server
scripts/           Build and development scripts
```

## Existing API routes

- `POST /api/auth/login` — proxies doctor login to `POST /doctors/auth/login`.
- `GET /api/doctor/appointments/today` — proxies appointment fetching to `GET /doctors/me/appointments/today`.
- `POST /api/doctor/patients/:nationalId/records` — creates a medical record, prescription PDF, and R2 object key.
- `GET /api/doctor/patients/:nationalId/records` — reads medical history and prescription details.
- `GET /api/doctor/patients/:nationalId/records/:recordId/prescription` — streams a stored prescription PDF.
- `GET /api/doctor/patients/:nationalId/reports` and `GET /api/doctor/patients/:nationalId/reports/:reportId` — reads report details and streams a report file.
- `GET /api/doctor/patients/:nationalId/tests` — reads completed test results and lab requests.
- `POST /api/doctor/patients/:nationalId/lab-requests` ? creates a lab test request.
- `POST /api/lab/auth/login`, `GET /api/lab/requests`, and `POST /api/lab/requests/:id/report` ? lab staff sign-in, worklist, and PDF upload.

Prescription PDFs use `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`. Radiology and laboratory reports share the private `R2_REPORTS_BUCKET`; their object keys use the `R2_RADIOLOGY_REPORTS_PREFIX` and `R2_LAB_REPORTS_PREFIX` folders. Set the `R2_REPORTS_*` endpoint and credentials before enabling uploads.

Add future API handlers under `backend/routes/` and register their paths in `backend/server.mjs`. Keep database operations in those server-side handlers; import the shared client with:

```js
import { prisma } from "../db/prisma.mjs";

const records = await prisma.medicalRecords.findMany();
```

Use the Prisma model name from `backend/prisma/schema.prisma` (Prisma exposes model delegates in lower camel case). Do not import the database client into browser code.
