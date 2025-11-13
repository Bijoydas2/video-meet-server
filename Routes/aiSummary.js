// Routes/aiSummary.js
import express from "express";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import FormData from "form-data";

dotenv.config();

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default function (meetingsCollection) {

  
  async function speechToText(fileUrl) {
    try {
      // 1️⃣ Download audio file from Supabase URL
      const audioResponse = await axios.get(fileUrl, { responseType: "arraybuffer" });

      // 2️⃣ Prepare multipart form-data for Whisper
      const formData = new FormData();
      formData.append("file", Buffer.from(audioResponse.data), "audio.webm");
      formData.append("model", "whisper-1");

      // 3️⃣ Send to OpenAI Whisper API
      const res = await axios.post("https://api.openai.com/v1/audio/transcriptions", formData, {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
      });

      return res.data.text;
    } catch (err) {
      console.error("Whisper Error:", err.response?.data || err.message);
      throw new Error("Failed to transcribe audio");
    }
  }

  // 🧾 Step 2: Gemini — Generate summary from transcript
  async function generateSummary(transcript) {
    const prompt = `
      You are a professional meeting minutes generator.
      Summarize the following meeting transcript clearly and concisely:

      ${transcript}
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim() || "Summary could not be generated.";
  }

  // 🚀 Step 3: API endpoint
  router.post("/audio-summary", async (req, res) => {
    try {
      const { fileUrl } = req.body;
      if (!fileUrl) return res.status(400).json({ error: "fileUrl required" });

      // 1️⃣ Transcribe audio
      const transcript = await speechToText(fileUrl);

      // 2️⃣ Summarize with Gemini
      const summary = await generateSummary(transcript);

      // 3️⃣ Save in DB
      await meetingsCollection.insertOne({
        fileUrl,
        transcript,
        summary,
        createdAt: new Date(),
      });

      res.json({ transcript, summary });
    } catch (err) {
      console.error("AI Summary error:", err.message);
      res.status(500).json({ error: "Failed to process audio" });
    }
  });

  return router;
}
