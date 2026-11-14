import { prisma } from "../backend/db/prisma.mjs";
import { hashPassword } from "../backend/auth/passwords.mjs";

const demoStaff = [
  { name: "Amina Shah", age: 32, role: "Radiology technologist · X-ray and CT", department: "Radiology", workExperienceYears: 8 },
  { name: "Bilal Ahmed", age: 29, role: "Medical laboratory technologist · Hematology", department: "Laboratory", workExperienceYears: 6 },
  { name: "Sana Malik", age: 35, role: "Radiology technologist · MRI", department: "Radiology", workExperienceYears: 11 },
  { name: "Omar Farooq", age: 31, role: "Medical laboratory technologist · Microbiology", department: "Laboratory", workExperienceYears: 7 },
  { name: "Hira Khan", age: 28, role: "Radiology technologist · Ultrasound", department: "Radiology", workExperienceYears: 5 },
  { name: "Zain Abbas", age: 38, role: "Medical laboratory technologist · Clinical chemistry", department: "Laboratory", workExperienceYears: 14 },
  { name: "Noor Siddiqui", age: 33, role: "Medical laboratory technologist · Histopathology", department: "Laboratory", workExperienceYears: 9 },
  { name: "Hamza Raza", age: 30, role: "Radiology technologist · X-ray and CT", department: "Radiology", workExperienceYears: 6 },
];

const usernameFor = (name) => `demo.${name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "")}`;
const passwordFor = (name) => `labstaff-${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

if (process.env.NODE_ENV === "production") {
  console.error("Demo staff seeding is disabled in production.");
  process.exitCode = 1;
} else {
  try {
    await prisma.$connect();
    for (const profile of demoStaff) {
      const username = usernameFor(profile.name);
      const passwordHash = await hashPassword(passwordFor(profile.name));
      const existing = await prisma.labStaffAuthentication.findUnique({ where: { username }, select: { staffId: true } });
      if (existing) {
        await prisma.labStaff.update({ where: { id: existing.staffId }, data: { ...profile, authentication: { update: { passwordHash } } } });
      } else {
        await prisma.labStaff.create({ data: { ...profile, authentication: { create: { username, passwordHash } } } });
      }
    }
    console.log(`Added or updated ${demoStaff.length} demo lab staff accounts.`);
    for (const profile of demoStaff) console.log(`${usernameFor(profile.name)}  ${passwordFor(profile.name)}`);
  } catch (error) {
    const code = error?.errorCode || error?.code || error?.meta?.code;
    if (code === "P1000") console.error("Database sign-in failed (P1000). The configured database role/password was rejected; demo records were not added.");
    else if (code === "P1001") console.error("The database can’t be reached right now (P1001). Demo records were not added.");
    else if (code === "P2021" || code === "P2022") console.error("The database is reachable, but the lab schema migration is missing or incomplete. Run the required SQL migration, then retry.");
    else console.error("Demo staff could not be added. Check the database schema and connection.");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
