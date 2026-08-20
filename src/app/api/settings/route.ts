import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const email = req.headers.get("x-user-email") || "";
    const result = await db.select().from(userSettings).where(eq(userSettings.userEmail, email));
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
    const email = req.headers.get("x-user-email") || "";
    const body = await req.json();
    const { key, value } = body;

    if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

    // Check if exists
    const existing = await db
      .select()
      .from(userSettings)
      .where(and(eq(userSettings.userEmail, email), eq(userSettings.key, key)));

    if (existing.length) {
      await db
        .update(userSettings)
        .set({ value, updatedAt: new Date() })
        .where(and(eq(userSettings.userEmail, email), eq(userSettings.key, key)));
    } else {
      await db.insert(userSettings).values({ userEmail: email, key, value });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST settings error:", error);
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
  }
}
