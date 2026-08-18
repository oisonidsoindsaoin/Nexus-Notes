import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        connected: false,
        message: "GEMINI_API_KEY environment variable is not set.",
      });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Say hello in one word." }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      }
    );

    if (res.ok) {
      return NextResponse.json({
        connected: true,
        message: "Gemini API connected successfully.",
      });
    } else {
      const errText = await res.text();
      console.error("Gemini test error:", errText);
      return NextResponse.json({
        connected: false,
        message: "Gemini API returned an error. Check your API key.",
      });
    }
  } catch (error) {
    console.error("AI test error:", error);
    return NextResponse.json({
      connected: false,
      message: "Could not connect to Gemini API.",
    });
  }
}
