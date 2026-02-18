import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Dev-only auto-login route.
 * Uses the service role key to generate a magic link token and verify it
 * server-side, creating a session without any email step.
 *
 * Requires env vars:
 *   NEXT_PUBLIC_DEV_AUTO_LOGIN_EMAIL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
export async function GET(request: Request) {
  const devEmail = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN_EMAIL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!devEmail || !serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Dev auto-login is not configured" },
      { status: 403 }
    );
  }

  const { origin } = new URL(request.url);

  // Admin client — generate a magic link token without sending email
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: devEmail,
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json(
      { error: linkError?.message || "Failed to generate dev login link" },
      { status: 500 }
    );
  }

  // Verify the token server-side to create a session
  const supabase = await createServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });

  if (verifyError) {
    return NextResponse.json(
      { error: verifyError.message },
      { status: 500 }
    );
  }

  return NextResponse.redirect(`${origin}/`);
}
