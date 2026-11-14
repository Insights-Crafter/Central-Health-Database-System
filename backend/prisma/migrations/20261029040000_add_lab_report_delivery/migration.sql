ALTER TABLE "zz_LabTestRequest"
    ADD COLUMN "requestedByDoctorId" INTEGER,
    ADD COLUMN "requestedByDoctorSource" VARCHAR(20);

ALTER TABLE "zz_LabReport"
    ADD COLUMN "sentAt" TIMESTAMP(6);
