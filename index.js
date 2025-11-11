import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url"; // add this
import { MongoClient, ServerApiVersion } from "mongodb";
import UserRoutes from "./Routes/userRoutes.js";
import agoraRoutes from "./Routes/agora.js";
import meetingsRoutes from "./Routes/meetings.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ES module এ __dirname তৈরি
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const uri = process.env.MONGO_URL;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1 }
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("video-meet");
    const usersCollection = db.collection("users");

    // Routes
    app.use("/users", UserRoutes(usersCollection)); 
    app.use("/api", agoraRoutes); 
    app.use("/api/meetings", meetingsRoutes); 

  } catch (err) {
    console.error("MongoDB connection failed:", err);
  }
}

run().catch(console.error);

app.get("/", (req, res) => {
  res.send("Video meet API is running...");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
