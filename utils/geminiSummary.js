// ✅ Correct ES Module Syntax (Recommended)
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateSummary(transcript) {
    if (!transcript || transcript.trim().length === 0) {
        return "No transcript provided.";
    }

    try {
        const result = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            // উন্নত প্রম্পট: অ্যাকশন আইটেম বা সিদ্ধান্ত যোগ করা
            contents: `Please summarise the following meeting transcript, focusing on key decisions, action items, and next steps:\n\n${transcript}`
        });
        return result.text || "Summary unavailable.";
    } catch (err) {
        console.error("Gemini Summary Error:", err);
        return "Failed to generate summary.";
    }
}

export { generateSummary }; // ✅ export keyword