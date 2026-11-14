import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(password, encoded) {
  try {
    const [algorithm, saltHex, hashHex] = String(encoded).split("$");
    if (algorithm !== "scrypt" || !/^[a-f\d]{32}$/i.test(saltHex) || !/^[a-f\d]{128}$/i.test(hashHex)) return false;
    const expected = Buffer.from(hashHex, "hex");
    const actual = Buffer.from(await scrypt(password, Buffer.from(saltHex, "hex"), expected.length));
    return timingSafeEqual(actual, expected);
  } catch { return false; }
}
