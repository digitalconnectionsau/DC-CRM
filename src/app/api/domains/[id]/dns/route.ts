import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDomainDnsZone } from "@/lib/synergy";
import { DnsType } from "@prisma/client";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const records = await prisma.dnsRecord.findMany({ where: { domainId: params.id } });
  return NextResponse.json(records);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, name, value, ttl, priority } = body;

  const record = await prisma.dnsRecord.create({
    data: { domainId: params.id, type: type as DnsType, name, value, ttl: ttl ?? 3600, priority: priority ?? null },
  });
  return NextResponse.json(record, { status: 201 });
}

export async function PUT(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const domain = await prisma.domain.findUnique({ where: { id: params.id } });
  if (!domain) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const whmRecords = await getDomainDnsZone(domain.name);
    const mapped = whmRecords
      .filter((r: { type: string }) => ["A", "AAAA", "CNAME", "MX", "TXT", "NS"].includes(r.type))
      .map((r: { type: string; name: string; address?: string; cname?: string; txtdata?: string; exchange?: string; ttl?: number; preference?: number }) => ({
        domainId: params.id,
        type: r.type as DnsType,
        name: r.name ?? "@",
        value: r.address ?? r.cname ?? r.txtdata ?? r.exchange ?? "",
        ttl: r.ttl ?? 3600,
        priority: r.preference ?? null,
      }));

    await prisma.dnsRecord.deleteMany({ where: { domainId: params.id } });
    await prisma.dnsRecord.createMany({ data: mapped });

    return NextResponse.json({ synced: mapped.length });
  } catch {
    return NextResponse.json({ error: "Failed to sync from WHM" }, { status: 502 });
  }
}
