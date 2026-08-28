import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is missing" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Generate real-time live date and time dynamically
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    };
    const liveDateTimeString = now.toLocaleString('en-US', options);

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: message,
      config: {
        systemInstruction: `You are Aura, an AI assistant. The current live date and time right now is ${liveDateTimeString}. Always use this exact real-time information when the user asks about the date, year, time, or any live scheduling context.`,
      },
    });

    return NextResponse.json({ reply: response.text });
  } catch (error: any) {
    console.error("API Error Details:", error);
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
