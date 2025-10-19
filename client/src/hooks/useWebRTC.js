import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import RecordingManager from "../utils/RecordingManager";
import NotificationManager from "../utils/notificationManager";

const SERVER_URL = "https://kirochat.onrender.com";

export default function useWebRTC(roomId, username, options = {}) {
  const [peers, setPeers] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [adminInfo, setAdminInfo] = useState(null);
  const [roomSettings, setRoomSettings] = useState({});
  const [pendingUsers, setPendingUsers] = useState([]);
  const [isAudioPermitted, setIsAudioPermitted] = useState(true);
  const [isVideoPermitted, setIsVideoPermitted] = useState(true);
  const [recordingBlob, setRecordingBlob] = useState(null);

  const socketRef = useRef(null);
  const peerConnections = useRef({});
  const usernameRef = useRef(username);
  const videoElementsRef = useRef({});
  const localVideoRef = useRef(null);
  const isAdminRef = useRef(false);

  const stableUsername = usernameRef.current;

  // ------------------- INIT -------------------
  useEffect(() => {
    socketRef.current = io(SERVER_URL);

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);

        // Handle mute on entry
        if (options.muteAllOnEntry) {
          stream.getAudioTracks().forEach((t) => (t.enabled = false));
          setIsAudioEnabled(false);
        }

        socketRef.current.emit(
          "join-room",
          { roomId, username: stableUsername, password: options.password },
          ({
            success,
            participants,
            messages: previousMessages,
            adminUsername,
            roomSettings: settings,
            isAdmin,
          }) => {
            if (success) {
              if (previousMessages) setMessages(previousMessages);
              if (adminUsername) setAdminInfo({ username: adminUsername });
              if (settings) setRoomSettings(settings);
              if (isAdmin) isAdminRef.current = true;
              console.log("isAdmin received:", isAdmin);

              participants.forEach((p) => {
                if (p.socketId !== socketRef.current.id) {
                  createPeerConnection(p.socketId, true);
                }
              });
            }
          }
        );
      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    }

    initMedia();

    // ------------------- SOCKET EVENTS -------------------
    socketRef.current.on("connect", () => {
      console.log("Socket connected:", socketRef.current.id);
    });

    socketRef.current.on("user-joined", ({ socketId, username: joinUsername }) => {
      NotificationManager.playSound("join");
      NotificationManager.showBrowserNotification(`${joinUsername} joined the room`);
      createPeerConnection(socketId, false);
    });

    socketRef.current.on("offer", async ({ from, offer }) => {
      const pc = createPeerConnection(from, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit("answer", {
        to: from,
        sdp: pc.localDescription,
        from: socketRef.current.id,
      });
    });

    socketRef.current.on("answer", async ({ from, answer }) => {
      const pc = peerConnections.current[from];
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socketRef.current.on("ice-candidate", ({ from, candidate }) => {
      const pc = peerConnections.current[from];
      if (pc) pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socketRef.current.on("user-left", ({ socketId, username: leftUsername }) => {
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
        setPeers((prev) => prev.filter((p) => p.id !== socketId));
      }
      NotificationManager.playSound("leave");
      NotificationManager.showBrowserNotification(`${leftUsername} left the room`);
    });

    // ------------------- CHAT EVENTS -------------------
    socketRef.current.on("chat-message", (message) => {
      setMessages((prev) => [...prev, message]);
      NotificationManager.playSound("message");
    });

    // ------------------- ADMIN EVENTS -------------------
    socketRef.current.on("admin-mute-all", () => {
      if (localStream) {
        localStream.getAudioTracks().forEach((t) => (t.enabled = false));
        setIsAudioEnabled(false);
      }
    });

    socketRef.current.on("admin-permission-update", ({ canAudio, canVideo }) => {
      setIsAudioPermitted(canAudio);
      setIsVideoPermitted(canVideo);
      if (!canAudio && localStream) {
        localStream.getAudioTracks().forEach((t) => (t.enabled = false));
        setIsAudioEnabled(false);
      }
      if (!canVideo && localStream) {
        localStream.getVideoTracks().forEach((t) => (t.enabled = false));
        setIsVideoEnabled(false);
      }
    });

    socketRef.current.on("pending-approval", ({ socketId, username: pendingUsername }) => {
      setPendingUsers((prev) => [...prev, { socketId, username: pendingUsername }]);
      NotificationManager.playSound("alert");
    });

    socketRef.current.on("room-settings-updated", (newSettings) => {
      setRoomSettings(newSettings);
    });

    return () => {
      socketRef.current.disconnect();
      localStream?.getTracks().forEach((t) => t.stop());
      RecordingManager.cleanup();
    };
  }, [roomId]);

  // ------------------- PEER CONNECTION -------------------
  function createPeerConnection(socketId, isInitiator) {
    if (peerConnections.current[socketId]) return peerConnections.current[socketId];

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", {
          to: socketId,
          candidate: event.candidate,
          from: socketRef.current.id,
        });
      }
    };

    pc.ontrack = (event) => {
      setPeers((prev) => {
        if (prev.find((p) => p.id === socketId)) return prev;
        return [...prev, { id: socketId, stream: event.streams[0], username: "" }];
      });
    };

    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

    peerConnections.current[socketId] = pc;

    if (isInitiator && localStream) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          socketRef.current.emit("offer", {
            to: socketId,
            sdp: pc.localDescription,
            from: socketRef.current.id,
          });
        });
    }

    return pc;
  }

  // ------------------- CONTROLS -------------------
  const toggleAudio = () => {
    if (!localStream || !isAudioPermitted) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsAudioEnabled((prev) => !prev);
  };

  const toggleVideo = () => {
    if (!localStream || !isVideoPermitted) return;
    localStream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsVideoEnabled((prev) => !prev);
  };

  const shareScreen = async () => {
    if (!socketRef.current || !roomSettings.allowScreenShare) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      Object.values(peerConnections.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });

      setLocalStream(screenStream);

      screenTrack.onended = async () => {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(camStream);
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track.kind === "video");
          if (sender) sender.replaceTrack(camStream.getVideoTracks()[0]);
        });
      };
    } catch (err) {
      console.error("Screen share error:", err);
    }
  };

  const sendMessage = (text) => {
  if (!socketRef.current || !text.trim()) return;
  console.log("Sending message:", { roomId, username: stableUsername, text }); // DEBUG
  const payload = { roomId, username: stableUsername, text };
  socketRef.current.emit("chat-message", payload);
};

  // ------------------- RECORDING -------------------
  const startRecording = async () => {
    if (!localStream) return;

    const videoElements = [localVideoRef.current, ...Object.values(videoElementsRef.current)];
    const audioTrack = localStream.getAudioTracks()[0];

    const success = RecordingManager.startRecording(videoElements, audioTrack, {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 2500000,
    });

    if (success) {
      setIsRecording(true);
    }
  };

  const stopRecording = async () => {
    try {
      const blob = await RecordingManager.stopRecording();
      setRecordingBlob(blob);
      setIsRecording(false);
      return blob;
    } catch (error) {
      console.error("Error stopping recording:", error);
    }
  };

  const downloadRecording = () => {
    if (recordingBlob) {
      const filename = `meeting-${roomId}-${new Date().getTime()}.webm`;
      RecordingManager.downloadRecording(recordingBlob, filename);
    }
  };

  const uploadRecording = async () => {
    if (recordingBlob) {
      try {
        const result = await RecordingManager.uploadRecording(recordingBlob, roomId, (progress) => {
          setRecordingProgress(progress);
        });
        console.log("Recording uploaded:", result);
        return result;
      } catch (error) {
        console.error("Error uploading recording:", error);
      }
    }
  };

  // ------------------- ADMIN CONTROLS -------------------
  const approveUser = (socketId) => {
    socketRef.current.emit("admin-approve-user", { roomId, socketId });
    setPendingUsers((prev) => prev.filter((u) => u.socketId !== socketId));
  };

  const denyUser = (socketId) => {
    socketRef.current.emit("admin-deny-user", { roomId, socketId });
    setPendingUsers((prev) => prev.filter((u) => u.socketId !== socketId));
  };

  const updateUserPermissions = (socketId, canAudio, canVideo) => {
    socketRef.current.emit("admin-update-permissions", {
      roomId,
      socketId,
      canAudio,
      canVideo,
    });
  };

  const muteAllParticipants = () => {
    socketRef.current.emit("admin-mute-all-participants", { roomId });
  };

  return {
    peers,
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    shareScreen,
    messages,
    sendMessage,
    isRecording,
    startRecording,
    stopRecording,
    downloadRecording,
    uploadRecording,
    recordingProgress,
    recordingBlob,
    adminInfo,
    isAdmin: isAdminRef.current,
    roomSettings,
    pendingUsers,
    approveUser,
    denyUser,
    updateUserPermissions,
    muteAllParticipants,
    isAudioPermitted,
    isVideoPermitted,
    videoElementsRef,
    localVideoRef,
  };
}