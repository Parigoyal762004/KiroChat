import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true, required: true }, // Anonymous session ID
  username: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  preferences: {
    audioEnabled: { type: Boolean, default: true },
    videoEnabled: { type: Boolean, default: true },
    notificationsSoundEnabled: { type: Boolean, default: true },
  },
  meetingsHosted: { type: Number, default: 0 },
  meetingsJoined: { type: Number, default: 0 },
});

export default mongoose.model("User", userSchema);