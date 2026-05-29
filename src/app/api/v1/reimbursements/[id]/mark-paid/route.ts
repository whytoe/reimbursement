import { NextRequest } from "next/server";
import { runReimbursementTransition } from "@/lib/reimbursementTransitions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return runReimbursementTransition(request, id, "mark-paid");
}
