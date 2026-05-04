import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listDomains } from "@/lib/synergy";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const domains = await listDomains();
    return NextResponse.json(domains);
  } catch {
    return NextResponse.json({ error: "Failed to connect to Synergy Wholesale API" }, { status: 502 });
  }
}
