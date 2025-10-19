import { useState } from "react";
import { Users, Settings, Volume2, Monitor, Lock } from "lucide-react";
import React from "react";
export default function AdminPanel({
  peers,
  pendingUsers,
  roomSettings,
  isAdmin,
  onApproveUser,
  onDenyUser,
  onUpdatePermissions,
  onMuteAll,
}) {
  const [activeTab, setActiveTab] = useState("participants");
  const [userPermissions, setUserPermissions] = useState({});

  if (!isAdmin) return null;

  const handlePermissionChange = (socketId, type, value) => {
    setUserPermissions((prev) => ({
      ...prev,
      [socketId]: { ...prev[socketId], [type]: value },
    }));
  };

  const applyPermissions = (socketId) => {
    const perms = userPermissions[socketId];
    onUpdatePermissions(socketId, perms.audio, perms.video);
    setUserPermissions((prev) => {
      const newState = { ...prev };
      delete newState[socketId];
      return newState;
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 text-white max-h-64 overflow-y-auto z-50">
      <div className="p-4">
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setActiveTab("participants")}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
              activeTab === "participants"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <Users size={18} />
            Participants ({peers.length})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
              activeTab === "pending"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <Lock size={18} />
            Pending {pendingUsers.length > 0 && <span className="bg-red-600 px-2 rounded-full text-xs ml-1">{pendingUsers.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
              activeTab === "settings"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <Settings size={18} />
            Settings
          </button>
        </div>

        {/* PARTICIPANTS TAB */}
        {activeTab === "participants" && (
          <div className="space-y-3">
            {peers.length === 0 ? (
              <p className="text-gray-400 text-sm">No participants yet</p>
            ) : (
              peers.map((peer) => (
                <div
                  key={peer.id}
                  className="bg-gray-700 p-3 rounded flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-sm">Peer: {peer.id.slice(0, 8)}</p>
                    <div className="flex gap-2 mt-1 text-xs text-gray-300">
                      <span>Audio</span>
                      <span>Video</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handlePermissionChange(peer.id, "audio", !userPermissions[peer.id]?.audio)
                      }
                      className={`p-2 rounded transition-colors ${
                        userPermissions[peer.id]?.audio === false
                          ? "bg-red-600"
                          : "bg-blue-600 hover:bg-blue-500"
                      }`}
                    >
                      <Volume2 size={16} />
                    </button>
                    <button
                      onClick={() =>
                        handlePermissionChange(peer.id, "video", !userPermissions[peer.id]?.video)
                      }
                      className={`p-2 rounded transition-colors ${
                        userPermissions[peer.id]?.video === false
                          ? "bg-red-600"
                          : "bg-blue-600 hover:bg-blue-500"
                      }`}
                    >
                      <Monitor size={16} />
                    </button>
                    {userPermissions[peer.id] && (
                      <button
                        onClick={() => applyPermissions(peer.id)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-xs font-semibold transition-colors"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
            <button
              onClick={onMuteAll}
              className="w-full mt-3 px-4 py-2 bg-red-600 hover:bg-red-500 rounded font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Volume2 size={18} />
              Mute All
            </button>
          </div>
        )}

        {/* PENDING USERS TAB */}
        {activeTab === "pending" && (
          <div className="space-y-3">
            {pendingUsers.length === 0 ? (
              <p className="text-gray-400 text-sm">No pending requests</p>
            ) : (
              pendingUsers.map((user) => (
                <div
                  key={user.socketId}
                  className="bg-gray-700 p-3 rounded flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-sm">{user.username}</p>
                    <p className="text-xs text-gray-400">Wants to join</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onApproveUser(user.socketId)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm font-semibold transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => onDenyUser(user.socketId)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-semibold transition-colors"
                    >
                      ✕ Deny
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="space-y-2 text-sm">
            <div className="bg-gray-700 p-3 rounded flex items-center justify-between">
              <span>Screen Sharing</span>
              <span
                className={`px-3 py-1 rounded ${
                  roomSettings.allowScreenShare
                    ? "bg-green-600"
                    : "bg-red-600"
                }`}
              >
                {roomSettings.allowScreenShare ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="bg-gray-700 p-3 rounded flex items-center justify-between">
              <span>Approval Required</span>
              <span
                className={`px-3 py-1 rounded ${
                  roomSettings.requireApproval
                    ? "bg-orange-600"
                    : "bg-blue-600"
                }`}
              >
                {roomSettings.requireApproval ? "Yes" : "No"}
              </span>
            </div>
            <div className="bg-gray-700 p-3 rounded flex items-center justify-between">
              <span>Mute on Entry</span>
              <span
                className={`px-3 py-1 rounded ${
                  roomSettings.muteAllOnEntry
                    ? "bg-orange-600"
                    : "bg-blue-600"
                }`}
              >
                {roomSettings.muteAllOnEntry ? "Yes" : "No"}
              </span>
            </div>
            <div className="bg-gray-700 p-3 rounded flex items-center justify-between">
              <span>Recording Enabled</span>
              <span
                className={`px-3 py-1 rounded ${
                  roomSettings.isRecordingEnabled
                    ? "bg-green-600"
                    : "bg-red-600"
                }`}
              >
                {roomSettings.isRecordingEnabled ? "Yes" : "No"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}