CREATE TABLE "zz_AppointmentRequest" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "doctorId" INTEGER NOT NULL,
    "appointmentAt" TIMESTAMP(6) NOT NULL,
    "complaint" VARCHAR(500),
    "status" VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zz_AppointmentRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "zz_AppointmentRequest_doctorId_appointmentAt_key"
    ON "zz_AppointmentRequest"("doctorId", "appointmentAt");
CREATE INDEX "zz_AppointmentRequest_patientId_appointmentAt_idx"
    ON "zz_AppointmentRequest"("patientId", "appointmentAt");

ALTER TABLE "zz_AppointmentRequest"
    ADD CONSTRAINT "zz_AppointmentRequest_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "zz_AppointmentRequest"
    ADD CONSTRAINT "zz_AppointmentRequest_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patients"("patientID")
    ON DELETE RESTRICT ON UPDATE CASCADE;
