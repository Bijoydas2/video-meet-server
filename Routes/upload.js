import express from "express";
import multer from "multer";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../Server/s3Client.js";
import { GoogleGenAI } from "@google/genai";
import FormData from 'form-data'; 

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY; 

export default function UploadRoutes(meetingsCollection) {
    const router = express.Router();

    const upload = multer(); 

    router.use(express.json()); 
    
    router.post("/upload-recording", upload.single("file"), async (req, res) => {
        const file = req.file;
        if (!file) return res.status(400).json({ error: "No file uploaded" });

        try {

            const fileName = `recordings/${crypto.randomUUID()}-${req.file.originalname.replace(/[^a-z0-9.]/gi, '_')}`;
            await s3.send(new PutObjectCommand({
                Bucket: process.env.SUPABASE_S3_BUCKET,
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype || "audio/webm",
            }));
            const fileUrl = `${process.env.SUPABASE_S3_ENDPOINT}/${process.env.SUPABASE_S3_BUCKET}/${fileName}`;
            console.log(`[S3] File uploaded: ${fileUrl}`);
            console.log("[ElevenLabs] Starting Speech-to-Text task...");
            
            const formData = new FormData();
            formData.append('model_id', 'eleven_multilingual_v2'); 
            formData.append('cloud_storage_url', fileUrl); 

            const elevenLabsResponse = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
                method: "POST",
                headers: {
        
                    "xi-api-key": ELEVENLABS_API_KEY,
                },
                body: formData,
            });
            
            const elevenLabsData = await elevenLabsResponse.json();

            if (!elevenLabsResponse.ok || elevenLabsData.error) {
               
                throw new Error(`ElevenLabs STT API failed: ${elevenLabsData.message || elevenLabsResponse.statusText}`);
            }

            const transcript = elevenLabsData.text; 

            if (!transcript) {
                 throw new Error("ElevenLabs returned successfully but no transcript text was found.");
            }
        
            console.log(`[ElevenLabs] Received transcript. Length: ${transcript.length}`);
            
            const summaryPrompt = `You are a professional meeting assistant. Analyze the following meeting transcript. Generate a concise summary focusing on: 1) Key Decisions Made, 2) Action Items, 3) Main Discussion Points. Respond in the language of the transcript or in Bengali.
            Transcript: ${transcript}`;
          
            const summaryResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: summaryPrompt,
            });
            console.log("[Gemini] Summary generated.");

            const meetingDoc = {
                createdAt: new Date(),
                transcript: transcript,
                summary: summaryResponse.text,
                audioUrl: fileUrl, 
                status: "Completed"
            };
            await meetingsCollection.insertOne(meetingDoc);
            console.log(`[DB] Meeting saved successfully.`);


            res.json({
                success: true,
                message: "Transcription and Summary completed successfully.",
                transcript: transcript,
                audioUrl: fileUrl
            });

        } catch (err) {
            console.error("Upload/STT Task Start Error:", err);
            
            res.status(500).json({ error: "Processing failed to start", detail: err.message });
        }
    });



    return router;
}