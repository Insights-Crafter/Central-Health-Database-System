-- Rename the existing workflow tables in place so their data and foreign keys survive.
ALTER TABLE "zz_AppointmentRequest" RENAME TO "AppointmentRequest";
ALTER TABLE "zz_DoctorPatientAccess" RENAME TO "DoctorPatientAccess";
ALTER TABLE "zz_LabTestRequest" RENAME TO "LabTestRequest";
ALTER TABLE "zz_LabReport" RENAME TO "LabReport";
ALTER TABLE "zz_LabAccessLog" RENAME TO "LabAccessLog";
ALTER TABLE "LabAccessLog" RENAME COLUMN "laboratoryPersonId" TO "labStaffId";

-- Separate patient accounts from lab staff accounts and remove the old lab-person table name.
ALTER TABLE "Qasim_LabUser" RENAME TO "PatientUser";
ALTER TABLE "Qasim_LabortoryPerson" RENAME TO "LabStaff";
ALTER TABLE "LabStaff" DROP CONSTRAINT IF EXISTS "Qasim_LaboratoryPerson_singleton_check";
CREATE SEQUENCE "LabStaff_id_seq";
SELECT setval('"LabStaff_id_seq"', COALESCE((SELECT MAX("id") FROM "LabStaff"), 0) + 1, false);
ALTER TABLE "LabStaff" ALTER COLUMN "id" SET DEFAULT nextval('"LabStaff_id_seq"');
ALTER SEQUENCE "LabStaff_id_seq" OWNED BY "LabStaff"."id";
ALTER TABLE "LabStaff" ADD COLUMN "age" INTEGER,
  ADD COLUMN "role" VARCHAR(180) NOT NULL DEFAULT 'Laboratory technologist',
  ADD COLUMN "department" VARCHAR(120) NOT NULL DEFAULT 'General laboratory',
  ADD COLUMN "workExperienceYears" INTEGER;

CREATE TABLE "LabStaffAuthentication" (
  "staffId" INTEGER NOT NULL,
  "username" VARCHAR(120) NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  CONSTRAINT "LabStaffAuthentication_pkey" PRIMARY KEY ("staffId"),
  CONSTRAINT "LabStaffAuthentication_staffId_fkey" FOREIGN KEY ("staffId")
    REFERENCES "LabStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LabStaffAuthentication_username_key" ON "LabStaffAuthentication"("username");

INSERT INTO "LabStaffAuthentication" ("staffId", "username", "passwordHash")
SELECT "id", "username", "passwordHash" FROM "LabStaff"
ON CONFLICT ("staffId") DO NOTHING;
ALTER TABLE "LabStaff" DROP CONSTRAINT IF EXISTS "Qasim_LaboratoryPerson_username_key";
ALTER TABLE "LabStaff" DROP COLUMN "username", DROP COLUMN "passwordHash";

ALTER TABLE "LabReport" ADD COLUMN "objectKey" VARCHAR(1024);
ALTER TABLE "LabReport" ALTER COLUMN "fileEncrypted" DROP NOT NULL;
