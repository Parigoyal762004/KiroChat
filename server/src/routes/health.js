import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ status: "alive", mood: "caffeinated" });
});

export default router;
