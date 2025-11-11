import express from "express";
import dotenv from "dotenv";
import pkg from "agora-access-token";

const { RtcRole, RtcTokenBuilder } = pkg;
dotenv.config();

const router = express.Router();


router.get("/agora-token/:channelName", (req, res) => {
  const { channelName } = req.params;
  const uid = parseInt(req.query.uid) || 0; 

  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERT;

  if (!appId || !appCertificate) {
    return res.status(500).json({ error: "Agora App ID or Certificate missing" });
  }

  const role = RtcRole.PUBLISHER; 
  const expireTime = 3600; 
  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpire = currentTime + expireTime;

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      role,
      privilegeExpire
    );
    res.json({ token, uid });
  } catch (error) {
    console.error("Error generating Agora token:", error);
    res.status(500).json({ error: "Failed to generate Agora token" });
  }
});

export default router;
