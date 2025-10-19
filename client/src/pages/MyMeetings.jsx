import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Users, Lock, Download, Trash2, Play } from "lucide-react";
import React from 'react';
const SERVER_URL = "https://kirochat.onrender.com";

export default function MyMeetings() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all, upcoming, completed

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${SERVER_URL}/api/my-meetings`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch meetings");
      }

      setMeetings(data.meetings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteMeeting = async (meetingId) => {
    if (!window.confirm("Are you sure you want to delete this meeting?")) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/meeting/${meetingId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete meeting");
      }

      setMeetings((prev) => prev.filter((m) => m._id !== meetingId));
    } catch (err) {
      setError(err.message);
    }
  };

  const downloadRecording = (recordingUrl, meetingTitle) => {
    if (!recordingUrl) return;
    const a = document.createElement("a");
    a.href = recordingUrl;
    a.download = `${meetingTitle}-recording.webm`;
    a.click();
  };

  const joinMeeting = (meetingId, password) => {
    navigate(`/room/${meetingId}`, { state: { password } });
  };

  const getFilteredMeetings = () => {
    const now = new Date();
    return meetings.filter((meeting) => {
      const meetingTime = new Date(meeting.scheduledTime);
      if (filter === "upcoming") return meetingTime > now && meeting.status === "scheduled";
      if (filter === "completed") return meeting.status === "completed";
      return true;
    });
  };

  const filteredMeetings = getFilteredMeetings();

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getMeetingStatus = (meeting) => {
    const now = new Date();
    const meetingTime = new Date(meeting.scheduledTime);

    if (meeting.status === "completed") return "Completed";
    if (meeting.status === "cancelled") return "Cancelled";
    if (now >= meetingTime && meeting.status === "ongoing") return "Ongoing";
    if (meetingTime > now) return "Scheduled";
    return "Expired";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-600";
      case "Ongoing":
        return "bg-blue-600";
      case "Scheduled":
        return "bg-cyan-600";
      case "Cancelled":
        return "bg-red-600";
      default:
        return "bg-gray-600";
    }
  };

  return (
    <div className="w-screen h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-cyan-300 mb-2">My Meetings</h1>
            <p className="text-gray-400">Manage your scheduled video conferences</p>
          </div>
          <button
            onClick={() => navigate("/schedule")}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold transition-colors"
          >
            Schedule New Meeting
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              filter === "all"
                ? "bg-cyan-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            All Meetings ({meetings.length})
          </button>
          <button
            onClick={() => setFilter("upcoming")}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              filter === "upcoming"
                ? "bg-cyan-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              filter === "completed"
                ? "bg-cyan-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Completed
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading meetings...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredMeetings.length === 0 && (
          <div className="text-center py-16 bg-gray-800 rounded-xl">
            <Calendar size={48} className="mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400 mb-4">
              {filter === "all"
                ? "No meetings yet"
                : `No ${filter} meetings`}
            </p>
            <button
              onClick={() => navigate("/schedule")}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold transition-colors"
            >
              Schedule First Meeting
            </button>
          </div>
        )}

        {/* Meetings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeetings.map((meeting) => (
            <div
              key={meeting._id}
              className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700 hover:border-cyan-500 transition-colors"
            >
              {/* Meeting Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex-1 pr-2">
                    {meeting.title}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(
                      getMeetingStatus(meeting)
                    )}`}
                  >
                    {getMeetingStatus(meeting)}
                  </span>
                </div>

                {meeting.description && (
                  <p className="text-sm text-gray-300 mb-4 line-clamp-2">
                    {meeting.description}
                  </p>
                )}

                {/* Meeting Details */}
                <div className="space-y-2 mb-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    {formatDateTime(meeting.scheduledTime)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    {meeting.duration} minutes
                  </div>
                  {meeting.password && (
                    <div className="flex items-center gap-2">
                      <Lock size={16} />
                      Password protected
                    </div>
                  )}
                  {meeting.maxParticipants && (
                    <div className="flex items-center gap-2">
                      <Users size={16} />
                      Max: {meeting.maxParticipants} participants
                    </div>
                  )}
                </div>

                {/* Meeting ID */}
                <div className="bg-gray-700 p-3 rounded mb-4 break-all">
                  <p className="text-xs text-gray-400 mb-1">Meeting ID</p>
                  <p className="text-sm font-mono text-cyan-400">{meeting.meetingId}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {getMeetingStatus(meeting) !== "Expired" &&
                    getMeetingStatus(meeting) !== "Cancelled" && (
                      <button
                        onClick={() =>
                          joinMeeting(meeting.meetingId, meeting.password)
                        }
                        className="flex-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 rounded font-semibold text-sm flex items-center justify-center gap-1 transition-colors"
                      >
                        <Play size={16} />
                        Join
                      </button>
                    )}

                  {meeting.recordingUrl && (
                    <button
                      onClick={() =>
                        downloadRecording(
                          meeting.recordingUrl,
                          meeting.title
                        )
                      }
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold text-sm flex items-center justify-center gap-1 transition-colors"
                      title="Download Recording"
                    >
                      <Download size={16} />
                    </button>
                  )}

                  <button
                    onClick={() => deleteMeeting(meeting._id)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded font-semibold text-sm flex items-center justify-center gap-1 transition-colors"
                    title="Delete Meeting"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}