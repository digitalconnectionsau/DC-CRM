import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCustomers } from "@/lib/quickbooks";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const accessToken = searchParams.get("accessToken");
  const realmId = searchParams.get("realmId");

  if (!accessToken || !realmId) {
    return NextResponse.json({ error: "accessToken and realmId required" }, { status: 400 });
  }

  try {
    const customers = await getCustomers(accessToken, realmId);
    return NextResponse.json(customers);
  } catch {
    return NextResponse.json({ error: "Failed to fetch QB customers" }, { status: 502 });
  }
}
