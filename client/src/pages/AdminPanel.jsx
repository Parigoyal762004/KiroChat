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
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 text-white max-h-28 overflow-y-auto z-50">
      <div className="p-1">
        <div className="flex gap-0.5 mb-1 flex-wrap">
          <button
            onClick={() => setActiveTab("participants")}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              activeTab === "participants"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <Users size={14} />
            Participants ({peers.length})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              activeTab === "pending"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <Lock size={14} />
            Pending {pendingUsers.length > 0 && <span className="bg-red-600 px-1 rounded-full text-xs">{pendingUsers.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              activeTab === "settings"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <Settings size={14} />
            Settings
          </button>
        </div>

        {/* PARTICIPANTS TAB */}
        {activeTab === "participants" && (
          <div className="space-y-1">
            {peers.length === 0 ? (
              <p className="text-gray-400 text-xs">No participants</p>
            ) : (
              peers.map((peer) => (
                <div
                  key={peer.id}
                  className="bg-gray-700 p-2 rounded flex items-center justify-between text-xs"
                >
                  <p className="font-semibold">{peer.id.slice(0, 8)}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        handlePermissionChange(peer.id, "audio", !userPermissions[peer.id]?.audio)
                      }
                      className={`p-1 rounded transition-colors ${
                        userPermissions[peer.id]?.audio === false
                          ? "bg-red-600"
                          : "bg-blue-600 hover:bg-blue-500"
                      }`}
                    >
                      <Volume2 size={12} />
                    </button>
                    <button
                      onClick={() =>
                        handlePermissionChange(peer.id, "video", !userPermissions[peer.id]?.video)
                      }
                      className={`p-1 rounded transition-colors ${
                        userPermissions[peer.id]?.video === false
                          ? "bg-red-600"
                          : "bg-blue-600 hover:bg-blue-500"
                      }`}
                    >
                      <Monitor size={12} />
                    </button>
                    {userPermissions[peer.id] && (
                      <button
                        onClick={() => applyPermissions(peer.id)}
                        className="px-2 py-0 bg-green-600 hover:bg-green-500 rounded text-xs font-semibold transition-colors"
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
              className="w-full mt-1 px-2 py-1 bg-red-600 hover:bg-red-500 rounded font-semibold transition-colors flex items-center justify-center gap-1 text-xs"
            >
              <Volume2 size={12} />
              Mute All
            </button>
          </div>
        )}

        {/* PENDING USERS TAB */}
        {activeTab === "pending" && (
          <div className="space-y-1">
            {pendingUsers.length === 0 ? (
              <p className="text-gray-400 text-xs">No pending</p>
            ) : (
              pendingUsers.map((user) => (
                <div
                  key={user.socketId}
                  className="bg-gray-700 p-2 rounded flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold">{user.username}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onApproveUser(user.socketId)}
                      className="px-2 py-0 bg-green-600 hover:bg-green-500 rounded text-xs font-semibold transition-colors"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => onDenyUser(user.socketId)}
                      className="px-2 py-0 bg-red-600 hover:bg-red-500 rounded text-xs font-semibold transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="space-y-1 text-xs">
            <div className="bg-gray-700 p-2 rounded flex items-center justify-between">
              <span>Screen Share</span>
              <span className={`px-2 py-0 rounded text-xs ${roomSettings.allowScreenShare ? "bg-green-600" : "bg-red-600"}`}>
                {roomSettings.allowScreenShare ? "On" : "Off"}
              </span>
            </div>
            <div className="bg-gray-700 p-2 rounded flex items-center justify-between">
              <span>Approval</span>
              <span className={`px-2 py-0 rounded text-xs ${roomSettings.requireApproval ? "bg-orange-600" : "bg-blue-600"}`}>
                {roomSettings.requireApproval ? "Yes" : "No"}
              </span>
            </div>
            <div className="bg-gray-700 p-2 rounded flex items-center justify-between">
              <span>Mute Entry</span>
              <span className={`px-2 py-0 rounded text-xs ${roomSettings.muteAllOnEntry ? "bg-orange-600" : "bg-blue-600"}`}>
                {roomSettings.muteAllOnEntry ? "Yes" : "No"}
              </span>
            </div>
            <div className="bg-gray-700 p-2 rounded flex items-center justify-between">
              <span>Recording</span>
              <span className={`px-2 py-0 rounded text-xs ${roomSettings.isRecordingEnabled ? "bg-green-600" : "bg-red-600"}`}>
                {roomSettings.isRecordingEnabled ? "On" : "Off"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
