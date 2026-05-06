import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listDomains } from "@/lib/synergy";
import { prisma } from "@/lib/db";
import { differenceInDays } from "date-fns";
import { DomainStatus } from "@prisma/client";

function calcStatus(expiryDate: string | null): DomainStatus {
  if (!expiryDate) return "ACTIVE";
  const days = differenceInDays(new Date(expiryDate), new Date());
  if (days < 0) return "EXPIRED";
  if (days <= 30) return "EXPIRING_SOON";
  return "ACTIVE";
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const swDomains = await listDomains();

    let created = 0;
    let updated = 0;

    for (const d of swDomains) {
      const expiresAt = d.expiryDate ? new Date(d.expiryDate) : null;
      const status = calcStatus(d.expiryDate);
      const autoRenew = d.autoRenew === "YES" || d.autoRenew === "1" || d.autoRenew === "true";

      const existing = await prisma.domain.findUnique({ where: { name: d.domainName.toLowerCase() } });

      if (existing) {
        await prisma.domain.update({
          where: { name: d.domainName.toLowerCase() },
          data: { expiresAt, status, autoRenew, source: "SYNERGY" },
        });
        updated++;
      } else {
        await prisma.domain.create({
          data: {
            name: d.domainName.toLowerCase(),
            expiresAt,
            status,
            autoRenew,
            source: "SYNERGY",
          },
        });
        created++;
      }
    }

    return NextResponse.json({ success: true, created, updated, total: swDomains.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Synergy pull-domains error:", message);
    return NextResponse.json({ error: "Failed to pull domains from Synergy Wholesale", detail: message }, { status: 502 });
  }
}
