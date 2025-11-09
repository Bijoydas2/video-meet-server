const express = require("express");
const cors = require("cors");
const path = require("path");
const { MongoClient, ServerApiVersion } = require("mongodb");
const dotenv = require("dotenv");
const UserRoutes = require("./Routes/UserRoutes");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());


app.use("/uploads", express.static(path.join(__dirname, "uploads")));
console.log("Uploads path:", path.join(__dirname, "uploads"));


const uri = process.env.MONGO_URL;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log(" Connected to MongoDB");

    const db = client.db("video-meet");
    const usersCollection = db.collection("users");


   app.use("/users", UserRoutes(usersCollection));

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
