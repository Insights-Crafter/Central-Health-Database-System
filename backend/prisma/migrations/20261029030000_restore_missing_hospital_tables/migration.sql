CREATE TABLE IF NOT EXISTS "Doctor_Dummy" (
    "doctorID" SERIAL NOT NULL,
    "Name" VARCHAR,
    CONSTRAINT "Doctor_Dummy_pkey" PRIMARY KEY ("doctorID")
);

CREATE TABLE IF NOT EXISTS "zz_AppointmentRequest" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "patientUserId" INTEGER,
    "doctorId" INTEGER NOT NULL,
    "appointmentAt" TIMESTAMP(6) NOT NULL,
    "complaint" VARCHAR(500),
    "patientName" VARCHAR(500),
    "patientNationalId" VARCHAR(200),
    "patientPhone" VARCHAR(200),
    "status" VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "zz_AppointmentRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "zz_AppointmentRequest"
    ADD COLUMN IF NOT EXISTS "patientUserId" INTEGER,
    ADD COLUMN IF NOT EXISTS "patientName" VARCHAR(500),
    ADD COLUMN IF NOT EXISTS "patientNationalId" VARCHAR(200),
    ADD COLUMN IF NOT EXISTS "patientPhone" VARCHAR(200);

CREATE UNIQUE INDEX IF NOT EXISTS "zz_AppointmentRequest_doctorId_appointmentAt_key"
    ON "zz_AppointmentRequest"("doctorId", "appointmentAt");
CREATE INDEX IF NOT EXISTS "zz_AppointmentRequest_patientId_appointmentAt_idx"
    ON "zz_AppointmentRequest"("patientId", "appointmentAt");
CREATE INDEX IF NOT EXISTS "zz_AppointmentRequest_patientUserId_appointmentAt_idx"
    ON "zz_AppointmentRequest"("patientUserId", "appointmentAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'zz_AppointmentRequest_doctorId_fkey'
    ) THEN
        ALTER TABLE "zz_AppointmentRequest"
            ADD CONSTRAINT "zz_AppointmentRequest_doctorId_fkey"
            FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'zz_AppointmentRequest_patientId_fkey'
    ) THEN
        ALTER TABLE "zz_AppointmentRequest"
            ADD CONSTRAINT "zz_AppointmentRequest_patientId_fkey"
            FOREIGN KEY ("patientId") REFERENCES "Patients"("patientID")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'zz_AppointmentRequest_patientUserId_fkey'
    ) THEN
        ALTER TABLE "zz_AppointmentRequest"
            ADD CONSTRAINT "zz_AppointmentRequest_patientUserId_fkey"
            FOREIGN KEY ("patientUserId") REFERENCES "Qasim_LabUser"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
