import express from "express";
import ScheduledMeeting from "../models/ScheduledMeeting.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import chalk from "chalk";

const router = express.Router();

// Setup multer for file uploads
const uploadDir = "uploads/recordings";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-recording.webm`);
  },
});

const upload = multer({ storage });

// ========== SCHEDULE MEETING ==========
router.post("/schedule-meeting", async (req, res) => {
  try {
    const { title, description, scheduledTime, duration, password, maxParticipants, isRecordingEnabled, username } = req.body;

    if (!title || !scheduledTime) {
      return res.status(400).json({ error: "Title and scheduled time are required" });
    }

    const meetingId = Math.random().toString(36).slice(2, 9);
    const meetingLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/room/${meetingId}`;

    const meeting = await ScheduledMeeting.create({
      meetingId,
      title,
      description,
      createdBy: username || "Anonymous",
      scheduledTime: new Date(scheduledTime),
      duration,
      password: password || null,
      maxParticipants: maxParticipants || null,
      isRecordingEnabled,
      meetingLink,
    });

    console.log(chalk.green(`✅ Meeting scheduled: ${meetingId} - ${title}`));

    res.status(201).json({
      success: true,
      meetingId: meeting.meetingId,
      meeting,
      message: "Meeting scheduled successfully",
    });
  } catch (error) {
    console.error(chalk.red("❌ Schedule meeting error:"), error);
    res.status(500).json({ error: error.message });
  }
});

// ========== GET MY MEETINGS ==========
router.get("/my-meetings", async (req, res) => {
  try {
    const meetings = await ScheduledMeeting.find().sort({ scheduledTime: 1 }).lean();

    res.json({
      success: true,
      meetings,
    });
  } catch (error) {
    console.error(chalk.red("❌ Get meetings error:"), error);
    res.status(500).json({ error: error.message });
  }
});

// ========== GET SINGLE MEETING ==========
router.get("/meeting/:meetingId", async (req, res) => {
  try {
    const meeting = await ScheduledMeeting.findOne({
      meetingId: req.params.meetingId,
    }).lean();

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    res.json({
      success: true,
      meeting,
    });
  } catch (error) {
    console.error(chalk.red("❌ Get meeting error:"), error);
    res.status(500).json({ error: error.message });
  }
});

// ========== DELETE MEETING ==========
router.delete("/meeting/:id", async (req, res) => {
  try {
    const meeting = await ScheduledMeeting.findByIdAndDelete(req.params.id);

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    console.log(chalk.magenta(`🗑️  Meeting deleted: ${meeting.meetingId}`));

    res.json({
      success: true,
      message: "Meeting deleted successfully",
    });
  } catch (error) {
    console.error(chalk.red("❌ Delete meeting error:"), error);
    res.status(500).json({ error: error.message });
  }
});

// ========== UPLOAD RECORDING ==========
router.post("/upload-recording", upload.single("recording"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No recording file provided" });
    }

    const { roomId } = req.body;

    if (!roomId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Room ID is required" });
    }

    let meeting = await ScheduledMeeting.findOne({ meetingId: roomId });

    if (meeting) {
      meeting.recordingUrl = `/uploads/recordings/${req.file.filename}`;
      meeting.status = "completed";
      await meeting.save();

      console.log(chalk.green(`✅ Recording uploaded: ${req.file.filename}`));

      res.json({
        success: true,
        message: "Recording uploaded successfully",
        recordingUrl: meeting.recordingUrl,
      });
    } else {
      res.json({
        success: true,
        message: "Recording saved",
        recordingUrl: `/uploads/recordings/${req.file.filename}`,
      });
    }
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error(chalk.red("❌ Recording upload error:"), error);
    res.status(500).json({ error: error.message });
  }
});

// ========== DOWNLOAD RECORDING ==========
router.get("/recording/:filename", (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Recording not found" });
    }

    res.download(filePath, `recording-${Date.now()}.webm`);
  } catch (error) {
    console.error(chalk.red("❌ Download recording error:"), error);
    res.status(500).json({ error: error.message });
  }
});

export default router;