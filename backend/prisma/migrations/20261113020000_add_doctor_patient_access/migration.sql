CREATE TABLE "zz_DoctorPatientAccess" (
  "id" SERIAL NOT NULL,
  "doctorId" INTEGER NOT NULL,
  "patientId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "zz_DoctorPatientAccess_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "zz_DoctorPatientAccess_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "zz_DoctorPatientAccess_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patients"("patientID") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "zz_DoctorPatientAccess_doctorId_patientId_key"
  ON "zz_DoctorPatientAccess"("doctorId", "patientId");
CREATE INDEX "zz_DoctorPatientAccess_patientId_idx"
  ON "zz_DoctorPatientAccess"("patientId");
