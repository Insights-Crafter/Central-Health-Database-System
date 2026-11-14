import { prisma } from "../backend/db/prisma.mjs";

try {
  await prisma.$connect();
  console.log("Database connection succeeded.");
} catch (error) {
  const code = error?.errorCode || error?.code;
  if (code === "P1000") console.error("PostgreSQL was reached, but rejected the configured database username/password. Copy the full connection string from the intended Neon project and branch, then check the role and password there.");
  else if (code === "P1001") console.error("The configured PostgreSQL server could not be reached. Check the endpoint, network access, and Neon compute status.");
  else console.error(`Database connection failed${code ? ` (${code})` : ""}. Check DATABASE_URL and the database service, then retry.`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
