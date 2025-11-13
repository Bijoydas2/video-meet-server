import express from "express";
import multer from "multer";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../Server/s3Client.js";

const router = express.Router();
const upload = multer(); // memory storage

router.post("/upload-recording", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const fileName = `recordings/${crypto.randomUUID()}.webm`;

    const uploadParams = {
      Bucket: process.env.SUPABASE_S3_BUCKET,
      Key: fileName,
      Body: file.buffer,
      ContentType: "audio/webm",
      ACL: "public-read", // make it publicly readable (optional)
    };

    await s3.send(new PutObjectCommand(uploadParams));

    const fileUrl = `${process.env.SUPABASE_S3_ENDPOINT}/${process.env.SUPABASE_S3_BUCKET}/${fileName}`;
    res.json({ success: true, url: fileUrl });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed", detail: err.message || err.toString() });
  }
});

export default router;
