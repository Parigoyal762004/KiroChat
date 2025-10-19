import { useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import React from "react";
import { Calendar, Lock, Settings, Plus, LogIn } from "lucide-react";

const SERVER_URL = "http://localhost:5000";

export default function Home() {
  const [roomIdInput, setRoomIdInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [roomSettings, setRoomSettings] = useState({
    allowScreenShare: true,
    requireApproval: false,
    muteAllOnEntry: false,
    isRecordingEnabled: false,
    password: "",
  });
  const navigate = useNavigate();

  // Create a socket instance (not auto connected)
  const socket = io(SERVER_URL, { autoConnect: false });

  // Create a new room
  const handleCreateRoom = async () => {
    if (!usernameInput.trim()) return alert("Enter your username");
    setIsCreating(true);

    try {
      socket.connect();
      socket.emit(
        "create-room",
        {
          username: usernameInput,
          settings: roomSettings,
        },
        (res) => {
          if (res.success) {
            navigate(`/room/${res.roomId}`, {
              state: {
                username: usernameInput,
                settings: roomSettings,
                isAdmin: true,
              },
            });
          } else {
            alert("Error creating room: " + res.error);
          }
          setIsCreating(false);
          socket.disconnect();
        }
      );
    } catch (error) {
      alert("Connection error: " + error.message);
      setIsCreating(false);
    }
  };

  // Join an existing room
  const handleJoinRoom = () => {
    if (!roomIdInput.trim() || !usernameInput.trim())
      return alert("Enter room ID and username");
    navigate(`/room/${roomIdInput}`, {
      state: { username: usernameInput, password: passwordInput || null },
    });
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-cyan-400">KiroChat</h1>
          <div className="flex gap-4">
            <button
              onClick={() => navigate("/my-meetings")}
              className="px-4 py-2 rounded font-semibold hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Calendar size={18} />
              My Meetings
            </button>
            <button
              onClick={() => navigate("/schedule")}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded font-semibold transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Schedule
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-3 text-white">
              Welcome to <span className="text-cyan-400">KiroChat</span>
            </h1>
            <p className="text-gray-400 text-lg">
              Connect with others through crystal-clear video calls
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
            {/* Username Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">
                Your Username
              </label>
              <input
                type="text"
                placeholder="Enter your username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              />
            </div>

            {/* Join Existing Room Section */}
            <div className="mb-8 pb-8 border-b border-gray-700">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <LogIn size={20} />
                Join Existing Room
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Room ID
                  </label>
                  <input
                    type="text"
                    placeholder="Enter room ID to join"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 items-center gap-2">
                    <Lock size={16} />
                    Password (if required)
                  </label>
                  <input
                    type="password"
                    placeholder="Leave empty if no password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                </div>

                <button
                  onClick={handleJoinRoom}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn size={18} />
                  Join Room
                </button>
              </div>
            </div>

            {/* Create New Room Section */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Plus size={20} />
                Create New Room
              </h2>

              {/* Advanced Options Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="mb-4 text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                <Settings size={16} />
                {showAdvanced ? "Hide" : "Show"} Advanced Options
              </button>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="bg-gray-700 p-4 rounded-lg mb-4 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Room Password (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="Leave empty for no password"
                      value={roomSettings.password}
                      onChange={(e) =>
                        setRoomSettings({
                          ...roomSettings,
                          password: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roomSettings.allowScreenShare}
                        onChange={(e) =>
                          setRoomSettings({
                            ...roomSettings,
                            allowScreenShare: e.target.checked,
                          })
                        }
                        className="w-4 h-4 accent-cyan-500"
                      />
                      <span className="text-sm">Allow Screen Sharing</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roomSettings.requireApproval}
                        onChange={(e) =>
                          setRoomSettings({
                            ...roomSettings,
                            requireApproval: e.target.checked,
                          })
                        }
                        className="w-4 h-4 accent-cyan-500"
                      />
                      <span className="text-sm">
                        Require Approval to Join
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roomSettings.muteAllOnEntry}
                        onChange={(e) =>
                          setRoomSettings({
                            ...roomSettings,
                            muteAllOnEntry: e.target.checked,
                          })
                        }
                        className="w-4 h-4 accent-cyan-500"
                      />
                      <span className="text-sm">
                        Mute Participants on Entry
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roomSettings.isRecordingEnabled}
                        onChange={(e) =>
                          setRoomSettings({
                            ...roomSettings,
                            isRecordingEnabled: e.target.checked,
                          })
                        }
                        className="w-4 h-4 accent-cyan-500"
                      />
                      <span className="text-sm">Enable Recording</span>
                    </label>
                  </div>
                </div>
              )}

              <button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isCreating
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-cyan-600 hover:bg-cyan-500"
                }`}
              >
                <Plus size={18} />
                {isCreating ? "Creating Room..." : "Create New Room"}
              </button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-center text-gray-400 text-sm">
            <p>
              💡 Tip: Share the Room ID with others to invite them to your
              meeting
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}