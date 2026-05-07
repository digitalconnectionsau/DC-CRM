import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import axios from "axios";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
  const expiresAt = new Date(Date.now() + Number(expires_in) * 1000).toISOString();

  await prisma.$transaction([
    prisma.setting.upsert({
      where: { key: "qb_realm_id" },
      update: { value: String(realmId) },
      create: { key: "qb_realm_id", value: String(realmId) },
    }),
    prisma.setting.upsert({
      where: { key: "qb_access_token" },
      update: { value: String(access_token) },
      create: { key: "qb_access_token", value: String(access_token) },
    }),
    prisma.setting.upsert({
      where: { key: "qb_refresh_token" },
      update: { value: String(refresh_token) },
      create: { key: "qb_refresh_token", value: String(refresh_token) },
    }),
    prisma.setting.upsert({
      where: { key: "qb_access_token_expires_at" },
      update: { value: expiresAt },
      create: { key: "qb_access_token_expires_at", value: expiresAt },
    }),
  ]);

  return NextResponse.redirect(new URL("/settings?qb_connected=true", req.url));
}
