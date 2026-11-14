CREATE TABLE IF NOT EXISTS "Qasim_LabUser" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "patientID" INTEGER,
    CONSTRAINT "Qasim_LabUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Qasim_LabUser_username_key"
ON "Qasim_LabUser"("username");

CREATE UNIQUE INDEX IF NOT EXISTS "Qasim_LabUser_patientID_key"
ON "Qasim_LabUser"("patientID");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Qasim_LabUser_patientID_fkey'
    ) THEN
        ALTER TABLE "Qasim_LabUser"
        ADD CONSTRAINT "Qasim_LabUser_patientID_fkey"
        FOREIGN KEY ("patientID") REFERENCES "Patients"("patientID")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'zz_LabAccessLog_userId_fkey'
    ) THEN
        ALTER TABLE "zz_LabAccessLog"
        ADD CONSTRAINT "zz_LabAccessLog_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "Qasim_LabUser"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
