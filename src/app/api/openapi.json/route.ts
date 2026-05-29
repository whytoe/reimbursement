import { NextResponse } from "next/server";
import { generateOpenApiDocument } from "@/lib/openapi/document";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(generateOpenApiDocument());
}
