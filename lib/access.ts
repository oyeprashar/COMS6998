import { createClient } from "@/lib/supabase/server";

/**
 * Rules are evaluated in Postgres so normal users cannot enumerate the
 * signup allowlists. Requires sql/allowlist_access.sql to be applied.
 *
 * No active entries = open registration.
 * Otherwise the email or domain must match an active entry.
 */
export async function checkAppAccess(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.email) return false;

  // Deploy the database function first, then turn on enforcement.
  if (process.env.ENFORCE_SIGNUP_ALLOWLIST !== "true") return true;

  const { data, error } = await supabase.rpc("is_app_user_allowed");
  if (error) {
    console.error("Signup allowlist verification failed:", error.message);
    // When enforcement is enabled, an RPC outage must not bypass controls.
    return false;
  }
  return data === true;
}
