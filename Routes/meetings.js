import express from "express";
import { v4 as uuidv4 } from "uuid";
const router = express.Router();

// Create a meeting
router.post("/meetings", async (req, res) => {
  const { creatorEmail, title, type, scheduledTime, participants } = req.body;
  const meetingId = uuidv4();
  const newMeeting = {
    meetingId,
    creatorEmail,
    channelName: `video-meet-${meetingId}`,
    title,
    type,
    scheduledTime,
    participants,
    transcript: "",
    summary: "",
    status: "scheduled",
    createdAt: new Date(),
  };
  await meetingsCollection.insertOne(newMeeting);
  res.json(newMeeting);
});

// Get all meetings for a user
router.get("/meetings/:email", async (req, res) => {
  const meetings = await meetingsCollection.find({
    $or: [
      { creatorEmail: req.params.email },
      { participants: req.params.email }
    ]
  }).toArray();
  res.json(meetings);
});

// End meeting + save transcript + summary
router.post("/meetings/end/:meetingId", async (req, res) => {
  const { transcript, summary } = req.body;
  await meetingsCollection.updateOne(
    { meetingId: req.params.meetingId },
    { $set: { transcript, summary, status: "ended" } }
  );
  res.json({ message: "Meeting ended & saved." });
});

export default router;
