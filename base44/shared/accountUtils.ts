const enc = new TextEncoder();

export async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const PBKDF2_ITERATIONS = 100000;

export async function hashPassword(password: string, salt: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hex = [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2$${PBKDF2_ITERATIONS}$${hex}`;
}

export async function verifyPassword(password: string, salt: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith("pbkdf2$")) {
    const parts = storedHash.split("$");
    const iterations = parseInt(parts[1], 10);
    const expected = parts[2];
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: enc.encode(salt), iterations, hash: "SHA-256" },
      keyMaterial,
      256
    );
    const hex = [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
    return hex === expected;
  }
  const legacy = await sha256(salt + ":" + password);
  return legacy === storedHash;
}

export function randomToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function normalizeUsername(value: string): string {
  return (value || "").trim().toLowerCase().replace(/^@/, "");
}

export function toPublicAccount(a: any) {
  return {
    id: a.id,
    username: a.username || "",
    displayName: a.displayName || "",
    role: a.role || "user",
    email: a.email || "",
    profileImage: a.profileImage || "",
    active: a.active !== false,
    notifyText: a.notifyText !== false,
    notifyAudio: a.notifyAudio !== false
  };
}

export async function logActivity(base44: any, actorId: string, actorName: string, action: string, targetType: string, targetId: string, targetLabel: string) {
  try {
    await base44.asServiceRole.entities.ActivityLog.create({
      actorId, actorName, action, targetType, targetId, targetLabel
    });
  } catch {}
}

export async function verifyAccount(base44: any, id: string, token: string) {
  if (!id || !token) return null;
  const acc = await base44.asServiceRole.entities.Account.get(id).catch(() => null);
  if (!acc || acc.active === false) return null;
  if (acc.sessionToken !== token) return null;
  return acc;
}