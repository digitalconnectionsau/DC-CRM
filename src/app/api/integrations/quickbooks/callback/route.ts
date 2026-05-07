import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import axios from "axios";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?qb_error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code || !realmId) {
    return NextResponse.json({ error: "Missing code or realmId" }, { status: 400 });
  }

  const clientId = process.env.QB_CLIENT_ID!;
  const clientSecret = process.env.QB_CLIENT_SECRET!;
  const redirectUri = process.env.QB_REDIRECT_URI!;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenRes = await axios.post(
    "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    }
  );

  const { access_token, refresh_token, expires_in } = tokenRes.data;

  // Redirect back to settings with tokens in query params so the UI can store them.
  // In production you should persist these server-side (e.g. in the database).
  const params = new URLSearchParams({
    qb_connected: "true",
    qb_realm_id: realmId,
    qb_access_token: access_token,
    qb_refresh_token: refresh_token,
    qb_expires_in: String(expires_in),
  });

  return NextResponse.redirect(new URL(`/settings?${params.toString()}`, req.url));
}
