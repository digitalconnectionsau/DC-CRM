import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DomainStatus } from "@prisma/client";
import { differenceInDays } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const domains = await prisma.domain.findMany({
    include: { client: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(domains);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, clientId, registrar, expiresAt, autoRenew, nameservers } = body;

  if (!name || !clientId) {
    return NextResponse.json({ error: "Domain name and client are required" }, { status: 400 });
  }

  let status: DomainStatus = "ACTIVE";
  if (expiresAt) {
    const days = differenceInDays(new Date(expiresAt), new Date());
    if (days < 0) status = "EXPIRED";
    else if (days <= 30) status = "EXPIRING_SOON";
  }

  try {
    const domain = await prisma.domain.create({
      data: {
        name: name.toLowerCase().trim(),
        clientId,
        registrar: registrar || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        autoRenew: autoRenew ?? true,
        nameservers: nameservers ?? [],
        status,
      },
    });
    return NextResponse.json(domain, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Domain already exists" }, { status: 409 });
  }
}
