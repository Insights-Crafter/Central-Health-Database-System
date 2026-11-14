ALTER TABLE "zz_AppointmentRequest"
    ADD COLUMN "patientUserId" INTEGER,
    ADD COLUMN "patientName" VARCHAR(500),
    ADD COLUMN "patientNationalId" VARCHAR(200),
    ADD COLUMN "patientPhone" VARCHAR(200);

CREATE INDEX "zz_AppointmentRequest_patientUserId_appointmentAt_idx"
    ON "zz_AppointmentRequest"("patientUserId", "appointmentAt");

ALTER TABLE "zz_AppointmentRequest"
    ADD CONSTRAINT "zz_AppointmentRequest_patientUserId_fkey"
    FOREIGN KEY ("patientUserId") REFERENCES "Qasim_LabUser"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
