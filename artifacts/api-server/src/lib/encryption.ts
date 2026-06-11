import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getKey(): Buffer {
  const keyHex = process.env.CHAT_ENCRYPTION_KEY;
  if (keyHex && keyHex.length === 64) {
    return Buffer.from(keyHex, "hex");
  }
  // Dev fallback — not secure, but keeps the app running without config
  return Buffer.from("7768656c7077697365646576656c6f707265706c61636568657265303030303030", "hex");
}

export function encryptMessage(plaintext: string): { encryptedContent: string; iv: string } {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");
  return {
    encryptedContent: `${encrypted}:${authTag}`,
    iv: iv.toString("base64"),
  };
}

export function decryptMessage(encryptedContent: string, iv: string): string {
  try {
    const key = getKey();
    const [ciphertext, authTag] = encryptedContent.split(":");
    const ivBuf = Buffer.from(iv, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, ivBuf);
    decipher.setAuthTag(Buffer.from(authTag, "base64"));
    let decrypted = decipher.update(ciphertext, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "[message could not be decrypted]";
  }
}
