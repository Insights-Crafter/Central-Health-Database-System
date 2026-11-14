import crypto from "node:crypto";

function key() {
  const value = process.env.ENCRYPTION_KEY || "";
  if (!/^[a-f\d]{64}$/i.test(value)) throw new Error("The ENCRYPTION_KEY is missing or invalid.");
  return Buffer.from(value, "hex");
}

export function decryptBuffer(stored) {
  const value = Buffer.from(stored);
  if (value.length < 28) throw new Error("Encrypted report data is incomplete.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), value.subarray(0, 12));
  decipher.setAuthTag(value.subarray(12, 28));
  return Buffer.concat([decipher.update(value.subarray(28)), decipher.final()]);
}

export function decryptText(stored) {
  if (!stored) return null;
  return decryptBuffer(Buffer.from(stored, "base64")).toString("utf8");
}

export function encryptText(value) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}
