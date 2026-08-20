import { NextResponse } from "next/server";
import { pool } from "@/db";

export async function POST() {
  try {
    const client = await pool.connect();
    try {
      await client.query("ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_email TEXT NOT NULL DEFAULT ''");
      await client.query("ALTER TABLE folders ADD COLUMN IF NOT EXISTS user_email TEXT NOT NULL DEFAULT ''");
      await client.query("ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS user_email TEXT NOT NULL DEFAULT ''");
      await client.query("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_email TEXT NOT NULL DEFAULT ''");
      await client.query("ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_key_unique");
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
