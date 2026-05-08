import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const accounts = await prisma.hostingAccount.findMany({
      include: { client: true },
      orderBy: { primaryDomain: "asc" },
    });
    return NextResponse.json(accounts);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Hosting connectivity error:", message);
    return NextResponse.json(
      { error: "Failed to load hosting accounts", detail: message },
      { status: 502 }
    );
  }
}
