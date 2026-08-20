import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiConversations } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const email = req.headers.get("x-user-email") || "";
    const result = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userEmail, email))
      .orderBy(desc(aiConversations.updatedAt));
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET conversations error:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
