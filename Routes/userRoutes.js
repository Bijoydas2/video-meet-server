const express = require("express");

module.exports = (usersCollection) => {
  const router = express.Router();

  // Create a new user
  router.post("/", async (req, res) => {
    try {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result)
    } catch (err) {
      res.status(500).json({ message: "Failed to create user" });
    }
  });

router.put("/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).trim().toLowerCase();
    const updateData = req.body;

    const result = await usersCollection.findOneAndUpdate(
      { email },
      { $set: updateData },
      { returnDocument: "after" } 
    );

    if (!result.value) return res.status(404).json({ message: "User not found" });
    res.json(result.value); 
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update user" });
  }
});


  
  router.get("/:email", async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email).trim().toLowerCase();
      const user = await usersCollection.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

 
  router.get("/", async (req, res) => {
    try {
      const result = await usersCollection.find({}).toArray();
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

 


  return router;
};
