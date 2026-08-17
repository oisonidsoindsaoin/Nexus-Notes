import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db.select().from(userSettings);
    const settings: Record<string, unknown> = {};
    for (const row of result) {
      settings[row.key] = row.value;
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

    await db
      .insert(userSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: userSettings.key,
        set: { value, updatedAt: new Date() },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST settings error:", error);
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
  }
}
