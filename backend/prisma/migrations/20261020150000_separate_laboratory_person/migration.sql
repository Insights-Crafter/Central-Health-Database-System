CREATE TABLE "Qasim_LaboratoryPerson" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Qasim_LaboratoryPerson_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Qasim_LaboratoryPerson_singleton_check" CHECK ("id" = 1)
);

CREATE UNIQUE INDEX "Qasim_LaboratoryPerson_username_key"
ON "Qasim_LaboratoryPerson"("username");

INSERT INTO "Qasim_LaboratoryPerson" ("id", "username", "passwordHash", "name")
SELECT 1, "username", "passwordHash", "name"
FROM "Qasim_LabUser"
WHERE "role" = 'LAB'
ORDER BY "id"
LIMIT 1;

ALTER TABLE "zz_LabReport"
DROP CONSTRAINT "zz_LabReport_uploadedBy_fkey";

ALTER TABLE "zz_LabAccessLog"
ADD COLUMN "laboratoryPersonId" INTEGER;

UPDATE "zz_LabReport" AS report
SET "uploadedBy" = 1
FROM "Qasim_LabUser" AS account
WHERE account."role" = 'LAB'
  AND report."uploadedBy" = account."id";

UPDATE "zz_LabAccessLog" AS access_log
SET "laboratoryPersonId" = 1,
    "userId" = NULL
FROM "Qasim_LabUser" AS account
WHERE account."role" = 'LAB'
  AND access_log."userId" = account."id";

DELETE FROM "Qasim_LabUser" WHERE "role" = 'LAB';
DROP INDEX "Qasim_LabUser_one_lab_account_key";

ALTER TABLE "zz_LabReport"
ADD CONSTRAINT "zz_LabReport_uploadedBy_fkey"
FOREIGN KEY ("uploadedBy") REFERENCES "Qasim_LaboratoryPerson"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "zz_LabAccessLog"
ADD CONSTRAINT "zz_LabAccessLog_laboratoryPersonId_fkey"
FOREIGN KEY ("laboratoryPersonId") REFERENCES "Qasim_LaboratoryPerson"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
