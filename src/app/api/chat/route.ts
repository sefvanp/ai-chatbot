import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, image, model, webSearch, persona } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is missing" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const now = new Date();
    const liveDateTimeString = now.toLocaleString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });

    let contents: any = message;

    if (image) {
      const base64Data = image.split(",")[1];
      const mimeType = image.split(";")[0].split(":")[1];
      contents = [
        message || "Describe this image",
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      ];
    }

    // Strictly using gemini-3.6-flash as requested
    let geminiModel = 'gemini-3.6-flash';

    let systemPrompt = `You are Aura, an advanced AI assistant created by Sefvan. 
Current exact live date and time: ${liveDateTimeString}. Always use 2026 as the current reference year. 
Provide fast, accurate, sharp, and intelligent responses.`;

    let config: any = {
      systemInstruction: systemPrompt,
    };

    if (webSearch || message.toLowerCase().includes("next") || message.toLowerCase().includes("today") || message.toLowerCase().includes("date") || message.toLowerCase().includes("time") || message.toLowerCase().includes("f1") || message.toLowerCase().includes("race")) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: contents,
      config: config,
    });

    return NextResponse.json({ reply: response.text });
  } catch (error: any) {
    console.error("API Error Details:", error);
    let errorMessage = error.message || "Something went wrong";
    if (errorMessage.includes("429") || errorMessage.includes("Quota") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      errorMessage = "Rate limit reached. Please wait about 15-20 seconds before sending the next message.";
    } else if (errorMessage.includes("503") || errorMessage.includes("UNAVAILABLE")) {
      errorMessage = "Gemini servers are experiencing high demand. Please try again in a moment.";
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
