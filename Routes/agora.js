import express from "express";
import pkg from "agora-access-token";
const { RtcTokenBuilder, RtcRole } = pkg;

const router = express.Router();

router.get("/agora-token", (req, res) => {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERT;
  const channel = req.query.channel || "video-meet";
  const uid = req.query.uid ? parseInt(req.query.uid) : 0;
  const role = RtcRole.PUBLISHER;
  const expireTime = 3600;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channel,
    uid,
    role,
    Math.floor(Date.now() / 1000) + expireTime
  );

  res.json({ token });
});


export default router;
