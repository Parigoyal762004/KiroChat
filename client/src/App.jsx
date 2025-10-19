import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from "./pages/Home";
import Room from "./pages/Room";
import ScheduleMeeting from "./pages/ScheduleMeeting";  // ADD THIS
import MyMeetings from "./pages/MyMeetings";            // ADD THIS
import "./styles/index.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="/schedule" element={<ScheduleMeeting />} />      // ADD THIS
        <Route path="/my-meetings" element={<MyMeetings />} />        // ADD THIS

        {/* Optional: A fallback for paths that don't match */}
        <Route path="*" element={<div className="text-center p-12"><h1>404 | Page Not Found</h1></div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;