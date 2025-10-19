import { useParams, useLocation } from "react-router-dom";
import useWebRTC from "../hooks/useWebRTC";
import AdminPanel from "./AdminPanel";
import { useRef, useEffect, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Share2,
  Send,
  Download,
  Upload,
  Loader,
} from "lucide-react";
import React from "react";

export default function Room() {
  const { roomId } = useParams();
  const location = useLocation();
  const state = location.state || {};

  // Stable guest ID for this tab
  const usernameRef = useRef(state.username || "Guest" + Math.floor(Math.random() * 10000));
  const username = usernameRef.current;

  const {
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
    isAdmin,
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
  } = useWebRTC(roomId, username, {
    password: state.password,
    muteAllOnEntry: state.settings?.muteAllOnEntry,
  });

  const [newMessage, setNewMessage] = useState("");
  const [isUploadingRecording, setIsUploadingRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const messagesEndRef = useRef(null);

  // Attach local stream to video element
  useEffect(() => {
    if (!localStream) return;
    const videoEl = localVideoRef.current;
    if (videoEl) {
      videoEl.srcObject = localStream;
      videoEl.onloadedmetadata = () => videoEl.play().catch(console.log);
    }
  }, [localStream]);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessage(newMessage);
    setNewMessage("");
  };

  const handleStopRecording = async () => {
    const blob = await stopRecording();
    if (blob) {
      setRecordingBlob(blob);
    }
  };

  const handleUploadRecording = async () => {
    if (!recordingBlob) return;
    setIsUploadingRecording(true);
    try {
      await uploadRecording();
      setRecordingBlob(null);
      alert("Recording uploaded successfully!");
    } catch (error) {
      alert("Failed to upload recording: " + error.message);
    } finally {
      setIsUploadingRecording(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cyan-300">Room: {roomId}</h1>
          <p className="text-sm text-gray-400">You: {username}</p>
        </div>
        <div className="text-sm text-gray-400">
          Participants: {peers.length + 1}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Video Grid Section */}
        <div className="flex-1 flex flex-col">
          {/* Controls */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <button
              onClick={toggleAudio}
              disabled={!isAudioPermitted}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                isAudioEnabled
                  ? "bg-cyan-600 hover:bg-cyan-500"
                  : "bg-red-600 hover:bg-red-500"
              } ${!isAudioPermitted ? "opacity-50 cursor-not-allowed" : ""}`}
              title={!isAudioPermitted ? "Admin has disabled audio" : ""}
            >
              {isAudioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
              {isAudioEnabled ? "Mute" : "Unmute"}
            </button>

            <button
              onClick={toggleVideo}
              disabled={!isVideoPermitted}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                isVideoEnabled
                  ? "bg-cyan-600 hover:bg-cyan-500"
                  : "bg-red-600 hover:bg-red-500"
              } ${!isVideoPermitted ? "opacity-50 cursor-not-allowed" : ""}`}
              title={!isVideoPermitted ? "Admin has disabled video" : ""}
            >
              {isVideoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
              {isVideoEnabled ? "Stop Video" : "Start Video"}
            </button>

            {roomSettings.allowScreenShare && (
              <button
                onClick={shareScreen}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Share2 size={18} />
                Share Screen
              </button>
            )}

            {roomSettings.isRecordingEnabled && (
              <button
                onClick={isRecording ? handleStopRecording : startRecording}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  isRecording
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                <span className="w-2 h-2 bg-white rounded-full" />
                {isRecording ? "Stop Recording" : "Start Recording"}
              </button>
            )}
          </div>

          {/* Recording Status */}
          {isRecording && (
            <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg text-red-200 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              Recording in progress...
            </div>
          )}

          {recordingBlob && (
            <div className="mb-4 p-3 bg-green-900 border border-green-700 rounded-lg text-green-200 text-sm flex items-center justify-between">
              <span>Recording ready. Download or upload?</span>
              <div className="flex gap-2">
                <button
                  onClick={downloadRecording}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-semibold flex items-center gap-1"
                >
                  <Download size={14} />
                  Download
                </button>
                <button
                  onClick={handleUploadRecording}
                  disabled={isUploadingRecording}
                  className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                >
                  {isUploadingRecording ? (
                    <>
                      <Loader size={14} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Video Grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-gray-800 rounded-xl p-4 overflow-auto">
            {/* Local Video */}
            <div className="relative bg-gray-700 rounded-lg shadow border-2 border-cyan-400 overflow-hidden flex items-center justify-center">
              <p className="absolute top-2 left-2 bg-cyan-600 px-2 py-1 text-xs rounded font-semibold z-10">
                {username} (You)
              </p>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {/* Remote Peers */}
            {peers.map((peer) => (
              <div
                key={peer.id}
                className="relative bg-gray-700 rounded-lg shadow border-2 border-purple-400 overflow-hidden flex items-center justify-center"
              >
                <p className="absolute top-2 left-2 bg-purple-600 px-2 py-1 text-xs rounded font-semibold z-10">
                  Peer: {peer.id.slice(0, 8)}
                </p>
                <video
                  autoPlay
                  playsInline
                  ref={(ref) => {
                    if (ref) {
                      ref.srcObject = peer.stream;
                      videoElementsRef.current[peer.id] = ref;
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}

            {/* Placeholder if no peers */}
            {peers.length === 0 && (
              <div className="col-span-full p-6 bg-gray-700 rounded-lg text-gray-400 text-center">
                Waiting for others to join...
              </div>
            )}
          </div>
        </div>

        {/* Chat Section */}
        <div className="w-80 bg-gray-800 rounded-xl shadow-lg flex flex-col border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="font-bold text-lg">Chat</h2>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm mt-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={msg._id || idx}
                  className={`rounded-lg p-3 text-sm ${
                    msg.username === username
                      ? "bg-cyan-600 text-white self-end"
                      : "bg-gray-700 text-gray-200 self-start"
                  }`}
                >
                  <p className="font-semibold text-xs opacity-75 mb-1">
                    {msg.username}
                  </p>
                  <p className="break-words">{msg.text}</p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-gray-700 flex gap-2"
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type message..."
              className="flex-1 px-3 py-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 rounded font-semibold transition-colors flex items-center justify-center"
              title="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* Admin Panel */}
      {isAdmin && (
        <AdminPanel
          peers={peers}
          pendingUsers={pendingUsers}
          roomSettings={roomSettings}
          isAdmin={isAdmin}
          onApproveUser={approveUser}
          onDenyUser={denyUser}
          onUpdatePermissions={updateUserPermissions}
          onMuteAll={muteAllParticipants}
        />
      )}
    </div>
  );
}