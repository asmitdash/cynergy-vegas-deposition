import { NextResponse } from "next/server";
import { listStories } from "@/lib/stories/registry";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ stories: listStories() });
}
