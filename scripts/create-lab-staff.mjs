import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { prisma } from "../backend/db/prisma.mjs";
import { hashPassword } from "../backend/auth/passwords.mjs";

const input = createInterface({ input: stdin, output: stdout });
try {
  await prisma.$connect();
  const name = (await input.question("Staff name: ")).trim();
  const username = (await input.question("Login username: ")).trim().toLowerCase();
  const ageInput = (await input.question("Age (optional): ")).trim();
  const role = (await input.question("Role / test specialty: ")).trim();
  const department = (await input.question("Department: ")).trim();
  const experienceInput = (await input.question("Years of experience (optional): ")).trim();
  const password = await input.question("Password (min 12 characters): ");
  const age = ageInput ? Number(ageInput) : null;
  const years = experienceInput ? Number(experienceInput) : null;
  if (!name || !username || !role || !department || password.length < 12 || (age !== null && (!Number.isInteger(age) || age < 18 || age > 100)) || (years !== null && (!Number.isInteger(years) || years < 0 || years > 80))) {
    throw new Error("Please review the staff details and enter a password of at least 12 characters.");
  }
  const passwordHash = await hashPassword(password);
  const existing = await prisma.labStaffAuthentication.findUnique({ where: { username }, select: { staffId: true } });
  if (existing) {
    await prisma.labStaff.update({ where: { id: existing.staffId }, data: {
      name, age, role, department, workExperienceYears: years,
      authentication: { update: { passwordHash } },
    } });
  } else {
    await prisma.labStaff.create({ data: {
      name, age, role, department, workExperienceYears: years,
      authentication: { create: { username, passwordHash } },
    } });
  }
  console.log(`Lab staff account ready for ${name}.`);
} catch (error) {
  if (error?.code === "P1000") console.error("Database sign-in failed. Update the username and password in DATABASE_URL in .env, then retry. No staff account was created.");
  else if (error?.code === "P1001") console.error("The database can’t be reached right now. Check the connection and try again. No staff account was created.");
  else console.error(error?.code === "P2002" ? "That username is already in use." : error?.message || "Lab staff account could not be created.");
  process.exitCode = 1;
} finally {
  input.close();
  await prisma.$disconnect();
}
