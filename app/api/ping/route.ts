import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ pong: true, status: "ok" });
}

export async function POST() {
    return NextResponse.json({ pong: true, status: "ok" });
}
