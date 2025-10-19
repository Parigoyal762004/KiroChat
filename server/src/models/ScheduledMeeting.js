import mongoose from "mongoose";

const scheduledMeetingSchema = new mongoose.Schema({
  meetingId: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  createdBy: { type: String, required: true }, // username
  scheduledTime: { type: Date, required: true },
  duration: { type: Number, default: 60 }, // in minutes
  password: { type: String, default: null },
  maxParticipants: { type: Number, default: null },
  isRecordingEnabled: { type: Boolean, default: false },
  status: { type: String, enum: ["scheduled", "ongoing", "completed", "cancelled"], default: "scheduled" },
  participants: [
    {
      username: String,
      joinedAt: Date,
      leftAt: { type: Date, default: null },
    },
  ],
  recordingUrl: { type: String, default: null },
  meetingLink: { type: String, required: true },
  reminderSent: { type: Boolean, default: false },
  reminderSentAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("ScheduledMeeting", scheduledMeetingSchema);