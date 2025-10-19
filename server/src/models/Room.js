import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, required: true },
  createdBy: { type: String, required: true }, // username of admin
  password: { type: String, default: null },
  isRecordingEnabled: { type: Boolean, default: false },
  recordingUrl: { type: String, default: null },
  allowedUsers: { type: [String], default: [] }, // usernames allowed to join (empty = all)
  blockedUsers: { type: [String], default: [] },
  adminControls: {
    allowScreenShare: { type: Boolean, default: true },
    requireApprovalToJoin: { type: Boolean, default: false },
    muteAllOnEntry: { type: Boolean, default: false },
  },
  participants: [
    {
      socketId: String,
      username: String,
      joinedAt: Date,
      isAudioEnabled: Boolean,
      isVideoEnabled: Boolean,
      isAdmin: Boolean,
      isPendingApproval: { type: Boolean, default: false },
    },
  ],
  pendingRequests: [
    {
      socketId: String,
      username: String,
      requestedAt: Date,
    },
  ],
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
});

export default mongoose.model("Room", roomSchema);