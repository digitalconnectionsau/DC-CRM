import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const contacts = await prisma.clientContact.findMany({
    where: { clientId: id },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { firstName, lastName, email, phone, mobile, role, isPrimary } = await req.json();

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
  }

  const contact = await prisma.clientContact.create({
    data: {
      clientId: id,
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      mobile: mobile || null,
      role: role || null,
      isPrimary: isPrimary ?? false,
    },
  });
  return NextResponse.json(contact, { status: 201 });
}
