import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const domain = await prisma.domain.findUnique({
    where: { id: params.id },
    include: { client: true, dnsRecords: true },
  });
  if (!domain) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(domain);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const domain = await prisma.domain.update({ where: { id: params.id }, data: body });
  return NextResponse.json(domain);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.domain.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
