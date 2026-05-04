import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listAccounts } from "@/lib/synergy";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const accounts = await listAccounts();
    return NextResponse.json(accounts);
  } catch {
    return NextResponse.json({ error: "Failed to connect to WHM" }, { status: 502 });
  }
}
