import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUserId } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    const { searchParams } = new URL(request.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: { userId: string; date?: { gte?: Date; lte?: Date } } = { userId };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    const trips = await prisma.trip.findMany({
      where,
      include: { legs: { orderBy: { index: "asc" } } },
      orderBy: { date: "asc" },
    });

    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    const rate = settings?.mileageRate ?? 0;

    const headers = ["Date", "Start", "End", "Purpose", "Notes", "Km", "Reimbursement"];
    const rows = trips.map((trip) => {
      const date = new Date(trip.date).toISOString().split("T")[0];
      const start = trip.legs[0]?.fromAddr ?? "";
      const end = trip.legs[trip.legs.length - 1]?.toAddr ?? "";
      const reimbursement = rate > 0 ? (trip.totalKm * rate).toFixed(2) : "";

      return [
        date,
        csvEscape(start),
        csvEscape(end),
        csvEscape(trip.purpose),
        csvEscape(trip.notes),
        trip.totalKm.toFixed(1),
        reimbursement,
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const filename = `trips-${from || "all"}-${to || "all"}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const FORMULA_CHARS = new Set(["=", "+", "-", "@", "\t", "\r"]);

function csvEscape(value: string): string {
  let v = value;
  if (v.length > 0 && FORMULA_CHARS.has(v[0])) {
    v = "\t" + v;
  }
  if (v.includes(",") || v.includes('"') || v.includes("\n") || v.includes("\t")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
