import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Lock, Users, Plus } from "lucide-react";
import React from 'react';
const SERVER_URL = "https://kirochat.onrender.com";

export default function ScheduleMeeting() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledTime: "",
    duration: 60,
    password: "",
    maxParticipants: "",
    isRecordingEnabled: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!formData.title.trim()) {
        throw new Error("Meeting title is required");
      }
      if (!formData.scheduledTime) {
        throw new Error("Please select a date and time");
      }

      const scheduledTime = new Date(formData.scheduledTime);
      if (scheduledTime <= new Date()) {
        throw new Error("Please select a future date and time");
      }

      const response = await fetch(`${SERVER_URL}/api/schedule-meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          scheduledTime,
          maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to schedule meeting");
      }

      // Navigate to my meetings or show success
      alert(`Meeting scheduled successfully! Meeting ID: ${data.meetingId}`);
      navigate("/my-meetings");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get minimum datetime (current time + 1 hour)
  const minDateTime = new Date();
  minDateTime.setHours(minDateTime.getHours() + 1);
  const minDateTimeString = minDateTime.toISOString().slice(0, 16);

  return (
    <div className="w-screen h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-cyan-300 mb-2">Schedule Meeting</h1>
          <p className="text-gray-400">Set up a new video conference</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold mb-2">Meeting Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Team Standup, Project Review"
              className="w-full px-4 py-3 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add meeting details..."
              rows="3"
              className="w-full px-4 py-3 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date & Time */}
            <div>
              <label className="block text-sm font-semibold mb-2 items-center gap-2">
                <Calendar size={16} />
                Date & Time *
              </label>
              <input
                type="datetime-local"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleChange}
                min={minDateTimeString}
                className="w-full px-4 py-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold mb-2 items-center gap-2">
                <Clock size={16} />
                Duration (minutes)
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="15"
                max="480"
                step="15"
                className="w-full px-4 py-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password */}
            <div>
              <label className="block text-sm font-semibold mb-2 items-center gap-2">
                <Lock size={16} />
                Password (Optional)
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave empty for no password"
                className="w-full px-4 py-3 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Max Participants */}
            <div>
              <label className="block text-sm font-semibold mb-2 items-center gap-2">
                <Users size={16} />
                Max Participants (Optional)
              </label>
              <input
                type="number"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleChange}
                min="2"
                max="1000"
                placeholder="Leave empty for unlimited"
                className="w-full px-4 py-3 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Recording Enabled */}
          <div className="flex items-center gap-3 bg-gray-700 p-4 rounded">
            <input
              type="checkbox"
              id="recordingEnabled"
              name="isRecordingEnabled"
              checked={formData.isRecordingEnabled}
              onChange={handleChange}
              className="w-4 h-4 accent-cyan-500 cursor-pointer"
            />
            <label htmlFor="recordingEnabled" className="cursor-pointer flex items-center gap-2">
              <span className="text-sm font-semibold">Enable Recording</span>
              <span className="text-xs text-gray-400">(Meeting will be recorded)</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-6 rounded font-semibold flex items-center justify-center gap-2 transition-colors ${
              loading
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-cyan-600 hover:bg-cyan-500"
            }`}
          >
            <Plus size={20} />
            {loading ? "Scheduling..." : "Schedule Meeting"}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          * Required fields. You'll receive a meeting link after scheduling.
        </p>
      </div>
    </div>
  );
}