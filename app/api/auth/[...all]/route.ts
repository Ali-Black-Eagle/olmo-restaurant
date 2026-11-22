import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { hasDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

function handler(method: "GET" | "POST") {
  return async (request: Request) => {
    if (!hasDatabase) return NextResponse.json({ error: "Auth is not configured" }, { status: 503 });
    return toNextJsHandler(getAuth())[method](request);
  };
}

export const GET = handler("GET");
export const POST = handler("POST");
