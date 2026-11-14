CREATE TABLE "Qasim_LabUser" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "patientID" INTEGER,
    CONSTRAINT "Qasim_LabUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "zz_LabTestRequest" (
    "id" SERIAL NOT NULL,
    "patientID" INTEGER NOT NULL,
    "recordID" INTEGER,
    "testName" VARCHAR(150) NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "zz_LabTestRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "zz_LabReport" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "patientID" INTEGER NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "fileType" VARCHAR(100) NOT NULL,
    "fileEncrypted" BYTEA NOT NULL,
    "noteEncrypted" TEXT,
    "uploadedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "zz_LabReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "zz_LabAccessLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "userName" VARCHAR(100) NOT NULL,
    "reportTitle" VARCHAR(255) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "zz_LabAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Qasim_LabUser_username_key" ON "Qasim_LabUser"("username");
CREATE UNIQUE INDEX "Qasim_LabUser_patientID_key" ON "Qasim_LabUser"("patientID");
CREATE UNIQUE INDEX "Qasim_LabUser_one_lab_account_key" ON "Qasim_LabUser"("role") WHERE "role" = 'LAB';
CREATE INDEX "zz_LabTestRequest_status_createdAt_idx" ON "zz_LabTestRequest"("status", "createdAt");
CREATE INDEX "zz_LabTestRequest_patientID_createdAt_idx" ON "zz_LabTestRequest"("patientID", "createdAt");
CREATE UNIQUE INDEX "zz_LabReport_requestId_key" ON "zz_LabReport"("requestId");
CREATE INDEX "zz_LabReport_patientID_createdAt_idx" ON "zz_LabReport"("patientID", "createdAt");
CREATE INDEX "zz_LabAccessLog_createdAt_idx" ON "zz_LabAccessLog"("createdAt");

ALTER TABLE "Qasim_LabUser"
ADD CONSTRAINT "Qasim_LabUser_patientID_fkey"
FOREIGN KEY ("patientID") REFERENCES "Patients"("patientID")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "zz_LabTestRequest"
ADD CONSTRAINT "zz_LabTestRequest_patientID_fkey"
FOREIGN KEY ("patientID") REFERENCES "Patients"("patientID")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "zz_LabTestRequest"
ADD CONSTRAINT "zz_LabTestRequest_recordID_fkey"
FOREIGN KEY ("recordID") REFERENCES "MedicalRecords"("recordID")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "zz_LabReport"
ADD CONSTRAINT "zz_LabReport_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "zz_LabTestRequest"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "zz_LabReport"
ADD CONSTRAINT "zz_LabReport_patientID_fkey"
FOREIGN KEY ("patientID") REFERENCES "Patients"("patientID")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "zz_LabReport"
ADD CONSTRAINT "zz_LabReport_uploadedBy_fkey"
FOREIGN KEY ("uploadedBy") REFERENCES "Qasim_LabUser"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "zz_LabAccessLog"
ADD CONSTRAINT "zz_LabAccessLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "Qasim_LabUser"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
