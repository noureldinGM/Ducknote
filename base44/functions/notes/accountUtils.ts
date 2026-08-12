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

export async function verifyAccount(
  base44: any,
  id: string,
  token: string
) {
  if (!id || !token) return null;

  // =====================================================
  // 1. Try the old Base44 Account first
  // =====================================================

  const base44Account =
    await base44.asServiceRole.entities.Account
      .get(id)
      .catch(() => null);

  if (
    base44Account &&
    base44Account.active !== false &&
    base44Account.sessionToken === token
  ) {
    return base44Account;
  }

  // =====================================================
  // 2. Verify the Supabase access token
  // =====================================================

  try {
    const deno = (globalThis as any).Deno;

    const supabaseUrl =
      deno?.env?.get("VITE_SUPABASE_URL") ||
      "https://uovssbmxwwowzurblrik.supabase.co";

    const supabasePublishableKey =
      deno?.env?.get("VITE_SUPABASE_PUBLISHABLE_KEY") ||
      "sb_publishable_OJrFUM26Lzv9eWUPMT4r3A_5tO2tFTM";

    const response = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabasePublishableKey,
        },
      }
    );

    if (!response.ok) {
      console.error(
        "verifyAccount: Supabase token verification failed:",
        response.status
      );

      return null;
    }

    const supabaseUser = await response.json();

    if (!supabaseUser?.id) {
      return null;
    }

    // The token must belong to the requested user.
    if (supabaseUser.id !== id) {
      console.error(
        "verifyAccount: Supabase user ID does not match requested account ID."
      );

      return null;
    }

    // =====================================================
    // 3. If a Base44 account exists, use it
    // =====================================================

    if (
      base44Account &&
      base44Account.active !== false
    ) {
      return base44Account;
    }

    // =====================================================
    // 4. New Supabase account
    //    Load its profile from Supabase
    // =====================================================

    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=*`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabasePublishableKey,
        },
      }
    );

    if (!profileResponse.ok) {
      console.error(
        "verifyAccount: Could not load Supabase profile:",
        profileResponse.status
      );

      return null;
    }

    const profiles = await profileResponse.json();
    const profile = profiles?.[0];

    if (!profile || profile.active === false) {
      return null;
    }

    // =====================================================
    // 5. Convert Supabase profile to the account shape
    //    expected by the notes function
    // =====================================================

    return {
      id: profile.id,
      username: profile.username || "",
      displayName:
        profile.display_name ||
        profile.username ||
        "",
      role: profile.role || "user",
      email: profile.email || "",
      profileImage:
        profile.profile_image || "",
      active: profile.active !== false,
      notifyText:
        profile.notify_text !== false,
      notifyAudio:
        profile.notify_audio !== false,

      // No legacy Base44 session token.
      // Authentication was already verified
      // through Supabase above.
      sessionToken: null,
    };
  } catch (error: any) {
    console.error(
      "verifyAccount: Supabase verification error:",
      error?.message || error
    );

    return null;
  }
}