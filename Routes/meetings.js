// routes/meetings.js
import express from "express";
import { generateSummary } from "../utils/geminiSummary.js";
import { ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";
// ধরে নিচ্ছি আপনি আপনার verifyAuth মিডলওয়্যার এখানে ইম্পোর্ট করেছেন


const router = express.Router();

const getDb = (req) => req.app.locals.db;

// --- ১. মিটিং তৈরি/শিডিউল করা (Secured) ---
// Note: Uses creatorId (from auth) and generates channelName (meetingId)
router.post("/", async (req, res) => {
    const db = getDb(req);
    const meetingsCollection = db.collection("meetings");
    const creatorId = req.user.uid; // ✅ Secured creatorId from auth
    
    // ফ্রন্টএন্ড থেকে প্রাপ্ত ডেটা
    const { 
        title, 
        scheduledTime, 
        invitees = []
    } = req.body;

    if (!title) {
        return res.status(400).json({ error: "Meeting title is required" });
    }
    
    const newMeeting = {
        meetingId: uuidv4(), // Use a dedicated UUID for the channel name
        title: title,
        creatorId: creatorId,
        scheduledTime: scheduledTime || null,
        invitees: [...new Set([...invitees, creatorId])], // Ensure creator is included
        createdAt: new Date(),
        summary: null, 
        transcript: null,
    };

    try {
        await meetingsCollection.insertOne(newMeeting);
        res.status(201).json({ 
            message: "Meeting created successfully", 
            meetingId: newMeeting.meetingId // Return UUID meetingId for joining
        });
    } catch (err) {
        console.error("Create meeting error:", err);
        res.status(500).json({ error: "Failed to create meeting" });
    }
});

// --- ২. একজন ব্যবহারকারীর সমস্ত মিটিং Fetch করা (Secured) ---
router.get("/", async (req, res) => {
    const db = getDb(req);
    const userId = req.user.uid; // ✅ Secured userId from auth

    try {
        const meetings = await db.collection("meetings").find({
            $or: [
                { creatorId: userId },
                { invitees: userId } // User is an invitee
            ]
        }).sort({ createdAt: -1 }).toArray();
        
        res.json(meetings);
    } catch (err) {
        console.error("Fetch meetings error:", err);
        res.status(500).json({ error: "Failed to fetch meetings" });
    }
});

// --- ৩. ট্রান্সক্রিপ্ট এবং সামারি সেভ করা (Protected) ---
// Note: Assuming :id is the custom 'meetingId' (UUID), not MongoDB _id
router.post("/transcript/:meetingId",  async (req, res) => {
    const db = getDb(req);
    const { meetingId } = req.params;
    const { transcript } = req.body;
    const userId = req.user.uid;

    if (!transcript) {
        return res.status(400).json({ error: "Transcript is required" });
    }

    try {
        // First, check if the user is authorized to update this meeting
        const meeting = await db.collection("meetings").findOne({ meetingId });
        if (!meeting || (meeting.creatorId !== userId && !meeting.invitees.includes(userId))) {
             return res.status(403).json({ error: "Unauthorized to update this meeting." });
        }
        
        // Generate Summary
        const summary = await generateSummary(transcript);
        
        // Update meeting document
        await db.collection("meetings").updateOne(
            { meetingId: meetingId }, 
            { $set: { transcript, summary, updatedAt: new Date() } }
        );

        res.json({ message: "Transcript saved & summarized", summary });
    } catch (error) {
        console.error("Meeting transcript error:", error);
        res.status(500).json({ error: "Failed to process transcript" });
    }
});

// --- ৪. মিটিং ডিলিট করা (Secured & Authorized) ---
// Note: Assuming :id is the custom 'meetingId' (UUID)
router.delete("/:meetingId",  async (req, res) => {
    const db = getDb(req);
    const { meetingId } = req.params;
    const userId = req.user.uid; // Only creator can delete

    try {
        // Find meeting and check authorization
        const result = await db.collection("meetings").deleteOne({ 
            meetingId: meetingId, 
            creatorId: userId // Only delete if the user is the creator
        });

        if (result.deletedCount === 0) {
            // Check if meeting exists but user isn't the creator
            const meeting = await db.collection("meetings").findOne({ meetingId: meetingId });
            if (meeting) {
                 return res.status(403).json({ error: "Access Denied. Only the creator can delete this meeting." });
            }
            return res.status(404).json({ error: "Meeting not found or not deleted." });
        }
        
        res.json({ message: "Meeting deleted successfully" });
    } catch (err) {
        console.error("Delete meeting:", err);
        res.status(500).json({ error: "Failed to delete meeting" });
    }
});

export default router;