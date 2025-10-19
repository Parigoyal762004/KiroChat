/**
 * socketManager.js
 * Enhanced socket manager with admin controls, room settings, and recording support
 */

import { randomUUID } from "crypto";
import chalk from "chalk";
import Message from "./models/Message.js";
import Room from "./models/Room.js";

import ScheduledMeeting from "./models/ScheduledMeeting.js";

/**
 * rooms: Map<roomId, {
 *   password?: string,
 *   admin: { socketId, username },
 *   participants: Map<socketId, { socketId, username, isAudio, isVideo, approved }>,
 *   settings: { allowScreenShare, requireApproval, muteAllOnEntry, isRecordingEnabled },
 *   pendingRequests: Array,
 *   createdAt: Date
 * }>
 */
const rooms = new Map();

export default function initSocketManager(io) {
  io.on("connection", (socket) => {
    console.log(chalk.cyan(`📌 Socket connected: ${socket.id}`));

    // ---------- CREATE ROOM ----------
    socket.on("create-room", async (payload, ack) => {
      try {
        const id = payload?.roomId?.trim() || generateRoomId();
        const password = payload?.password ? String(payload.password) : null;
        const settings = payload?.settings || {};

        if (rooms.has(id)) {
          const msg = `Room ${id} already exists`;
          console.warn(chalk.yellow(`⚠️ create-room failed: ${msg}`));
          return ack?.({ success: false, error: msg });
        }

        const admin = {
          socketId: socket.id,
          username: payload.username || "Admin",
        };

        const room = {
          password,
          admin,
          participants: new Map(),
          settings: {
            allowScreenShare: settings.allowScreenShare !== false,
            requireApproval: settings.requireApproval || false,
            muteAllOnEntry: settings.muteAllOnEntry || false,
            isRecordingEnabled: settings.isRecordingEnabled || false,
          },
          pendingRequests: [],
          createdAt: new Date(),
        };

        rooms.set(id, room);

        // Save to database
        try {
          await Room.create({
            roomId: id,
            createdBy: admin.username,
            password,
            adminControls: room.settings,
          });
        } catch (dbErr) {
          console.error(chalk.red("❌ Failed to save room to DB:"), dbErr);
        }

        console.log(
          chalk.green(
            `🆕 Room created: ${id} ${password ? "(protected)" : ""} by ${admin.username}`
          )
        );
        ack?.({ success: true, roomId: id });
      } catch (err) {
        console.error(chalk.red("❌ create-room error:"), err);
        ack?.({ success: false, error: err.message });
      }
    });

    // ---------- JOIN ROOM ----------
    socket.on("join-room", async (payload, ack) => {
      const { roomId, username = "Anonymous", password } = payload || {};
      if (!roomId) {
        const err = "Missing roomId";
        console.warn(chalk.yellow(`⚠️ join-room failed: ${err}`));
        return ack?.({ success: false, error: err });
      }

      // Auto-create room if missing
      // Auto-create room if missing — assign the first user as admin
if (!rooms.has(roomId)) {
  const admin = {
    socketId: socket.id,
    username,
  };

  const room = {
    password: null,
    admin, // ✅ assign current user as admin
    participants: new Map(),
    settings: {
      allowScreenShare: true,
      requireApproval: false,
      muteAllOnEntry: false,
      isRecordingEnabled: false,
    },
    pendingRequests: [],
    createdAt: new Date(),
  };

  rooms.set(roomId, room);
  console.log(chalk.green(`🆕 Room auto-created: ${roomId} (admin: ${username})`));
}

      const room = rooms.get(roomId);
      if (room.admin?.username === username && room.admin?.socketId !== socket.id) {
  room.admin.socketId = socket.id;
  console.log(chalk.yellow(`⚙️ Admin ${username} reconnected, socket reassigned.`));
}

      // Password check
      if (room.password && room.password !== password) {
        const err = "Invalid password";
        console.warn(chalk.yellow(`🔐 join-room failed: ${err} for ${username}`));
        return ack?.({ success: false, error: err });
      }

      const isAdmin = room.admin?.socketId === socket.id;
      const requireApproval = room.settings.requireApproval && !isAdmin;

      if (requireApproval) {
        // Add to pending requests
        room.pendingRequests.push({
          socketId: socket.id,
          username,
          requestedAt: new Date(),
        });

        // Notify admin
        if (room.admin) {
          io.to(room.admin.socketId).emit("pending-approval", {
            socketId: socket.id,
            username,
            timestamp: Date.now(),
          });
        }

        return ack?.({
          success: false,
          error: "waiting_approval",
          message: "Waiting for admin approval",
        });
      }

      // Add participant
      room.participants.set(socket.id, {
        socketId: socket.id,
        username,
        isAudio: true,
        isVideo: true,
        approved: true,
      });

      socket.join(roomId);
      console.log(chalk.green(`🟢 ${username} joined room ${roomId} (${socket.id})`));

      // Mute on entry if enabled
      if (room.settings.muteAllOnEntry && !isAdmin) {
        io.to(socket.id).emit("admin-mute-all");
      }

      // Notify others
      socket.to(roomId).emit("user-joined", {
        socketId: socket.id,
        username,
        timestamp: Date.now(),
        message: `🟢 ${username} joined the chat zone.`,
      });

      // Send current participants
      const participants = [...room.participants.values()].map((p) => ({
        socketId: p.socketId,
        username: p.username,
      }));

      // Fetch previous messages
      let messages = [];
      try {
        messages = await Message.find({ roomId }).sort({ timestamp: 1 }).lean();
      } catch (err) {
        console.error(chalk.red("❌ Failed to fetch messages:"), err);
      }

      ack?.({
        success: true,
        roomId,
        participants,
        messages,
        adminUsername: room.admin?.username,
        roomSettings: room.settings,
        isAdmin: true && room.admin?.socketId === socket.id,
      });
    });

    // ---------- APPROVE USER ----------
    socket.on("admin-approve-user", (payload, ack) => {
      const { roomId, socketId } = payload || {};
      const room = rooms.get(roomId);
      if (!room || !room.admin || room.admin.socketId !== socket.id) {
        return ack?.({ success: false, error: "Not authorized" });
      }

      const pendingIndex = room.pendingRequests.findIndex((p) => p.socketId === socketId);
      if (pendingIndex === -1) return ack?.({ success: false, error: "User not found" });

      const pending = room.pendingRequests[pendingIndex];
      room.pendingRequests.splice(pendingIndex, 1);
      room.participants.set(socketId, {
        socketId,
        username: pending.username,
        isAudio: true,
        isVideo: true,
        approved: true,
      });

      io.to(socketId).emit("approval-granted", { roomId });
      io.to(roomId).emit("user-joined", {
        socketId,
        username: pending.username,
        timestamp: Date.now(),
      });

      console.log(chalk.green(`✅ ${pending.username} approved for room ${roomId}`));
      ack?.({ success: true });
    });

    // ---------- DENY USER ----------
    socket.on("admin-deny-user", (payload, ack) => {
      const { roomId, socketId } = payload || {};
      const room = rooms.get(roomId);
      if (!room || !room.admin || room.admin.socketId !== socket.id) {
        return ack?.({ success: false, error: "Not authorized" });
      }

      const pendingIndex = room.pendingRequests.findIndex((p) => p.socketId === socketId);
      if (pendingIndex === -1) return ack?.({ success: false, error: "User not found" });

      room.pendingRequests.splice(pendingIndex, 1);
      io.to(socketId).emit("approval-denied", { roomId });

      console.log(chalk.red(`❌ User denied access to room ${roomId}`));
      ack?.({ success: true });
    });

    // ---------- UPDATE PARTICIPANT PERMISSIONS ----------
    socket.on("admin-update-permissions", (payload, ack) => {
      const { roomId, socketId, canAudio, canVideo } = payload || {};
      const room = rooms.get(roomId);
      if (!room || !room.admin || room.admin.socketId !== socket.id) {
        return ack?.({ success: false, error: "Not authorized" });
      }

      const participant = room.participants.get(socketId);
      if (participant) {
        participant.isAudio = canAudio;
        participant.isVideo = canVideo;
        io.to(socketId).emit("admin-permission-update", { canAudio, canVideo });
        console.log(
          chalk.blue(`🔧 Permissions updated for ${participant.username} - Audio: ${canAudio}, Video: ${canVideo}`)
        );
      }

      ack?.({ success: true });
    });

    // ---------- MUTE ALL PARTICIPANTS ----------
    socket.on("admin-mute-all-participants", (payload, ack) => {
      const { roomId } = payload || {};
      const room = rooms.get(roomId);
      if (!room || !room.admin || room.admin.socketId !== socket.id) {
        return ack?.({ success: false, error: "Not authorized" });
      }

      room.participants.forEach((p) => {
        p.isAudio = false;
      });
      io.to(roomId).emit("admin-mute-all");
      console.log(chalk.blue(`🔇 All participants muted in room ${roomId}`));
      ack?.({ success: true });
    });

    // ---------- SIGNALING ----------
    socket.on("offer", ({ to, sdp, from }, ack) => {
      if (!to) return ack?.({ success: false, error: "Missing target socket id" });
      io.to(to).emit("offer", { from, offer: sdp });
      ack?.({ success: true });
    });

    socket.on("answer", ({ to, sdp, from }, ack) => {
      if (!to) return ack?.({ success: false, error: "Missing target socket id" });
      io.to(to).emit("answer", { from, answer: sdp });
      ack?.({ success: true });
    });

    socket.on("ice-candidate", ({ to, candidate, from }, ack) => {
      if (!to) return ack?.({ success: false, error: "Missing target socket id" });
      io.to(to).emit("ice-candidate", { from, candidate });
      ack?.({ success: true });
    });

    // ---------- CHAT ----------
    socket.on("chat-message", async (payload, ack) => {
      const { roomId, username = "Anon", text } = payload || {};
      if (!roomId || !text) return ack?.({ success: false, error: "Missing roomId or text" });

      const message = { roomId, username, text, timestamp: new Date() };
      try {
        const savedMessage = await Message.create(message);
        io.in(roomId).emit("chat-message", savedMessage);
        ack?.({ success: true, message: savedMessage });
      } catch (err) {
        console.error(chalk.red("❌ Failed to save chat message:"), err);
        ack?.({ success: false, error: err.message });
      }
    });

    // ---------- LEAVE ROOM ----------
    socket.on("leave-room", (payload, ack) => {
      const { roomId } = payload || {};
      if (!roomId) return ack?.({ success: false, error: "Missing roomId" });

      const room = rooms.get(roomId);
      if (!room) return ack?.({ success: false, error: "Room not found" });

      const participant = room.participants.get(socket.id);
      if (participant) {
        room.participants.delete(socket.id);
        socket.leave(roomId);
        console.log(chalk.magenta(`🔴 ${participant.username} left ${roomId}`));
        socket.to(roomId).emit("user-left", {
          socketId: socket.id,
          username: participant.username,
          message: `🔴 ${participant.username} left`,
        });
      }

      if (room.participants.size === 0) {
        rooms.delete(roomId);
        console.log(chalk.gray(`🧹 Room ${roomId} deleted (empty)`));
      }

      ack?.({ success: true });
    });

    // ---------- DISCONNECT ----------
    socket.on("disconnect", (reason) => {
      for (const [roomId, room] of rooms.entries()) {
        if (room.participants.has(socket.id)) {
          const participant = room.participants.get(socket.id);
          room.participants.delete(socket.id);
          socket.to(roomId).emit("user-left", {
            socketId: socket.id,
            username: participant.username,
            message: `🔴 ${participant.username} disconnected (${reason})`,
          });
          console.log(
            chalk.red(`❌ ${participant.username} disconnected from ${roomId} – ${reason}`)
          );

          if (room.participants.size === 0) {
            rooms.delete(roomId);
            console.log(chalk.gray(`🧹 Room ${roomId} deleted (empty)`));
          }
        }
      }
      console.log(chalk.gray(`📌 Socket disconnected: ${socket.id} (${reason})`));
    });
  });
}

// Utility
function generateRoomId() {
  return Math.random().toString(36).slice(2, 9);
}