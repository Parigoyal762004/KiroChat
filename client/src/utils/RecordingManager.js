/**
 * RecordingManager.js
 * Handles client-side recording of video/audio streams
 * Uses MediaRecorder API to record WebRTC streams
 */

class RecordingManager {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.canvas = null;
    this.canvasContext = null;
    this.animationId = null;
  }

  /**
   * Initialize canvas for multi-stream recording
   * @param {number} width
   * @param {number} height
   */
  initCanvas(width = 1280, height = 720) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvasContext = this.canvas.getContext("2d");
    return this.canvas;
  }

  /**
   * Combine multiple video streams into one canvas
   * @param {HTMLVideoElement[]} videoElements - Array of video elements
   * @param {object} layout - { columns: number, rows: number }
   */
  drawMultipleStreams(videoElements, layout = { columns: 2, rows: 2 }) {
    const { columns, rows } = layout;
    const cellWidth = this.canvas.width / columns;
    const cellHeight = this.canvas.height / rows;

    this.canvasContext.fillStyle = "#000000";
    this.canvasContext.fillRect(0, 0, this.canvas.width, this.canvas.height);

    videoElements.forEach((video, index) => {
      if (!video || !video.readyState) return;

      const row = Math.floor(index / columns);
      const col = index % columns;

      if (row >= rows || col >= columns) return;

      const x = col * cellWidth;
      const y = row * cellHeight;

      // Draw video
      this.canvasContext.drawImage(video, x, y, cellWidth, cellHeight);

      // Add username overlay
      this.canvasContext.fillStyle = "rgba(0, 0, 0, 0.7)";
      this.canvasContext.fillRect(x, y, cellWidth, 30);
      this.canvasContext.fillStyle = "#ffffff";
      this.canvasContext.font = "16px Arial";
      this.canvasContext.fillText(video.dataset.username || "User", x + 10, y + 22);
    });

    if (this.isRecording) {
      this.animationId = requestAnimationFrame(() =>
        this.drawMultipleStreams(videoElements, layout)
      );
    }
  }

  /**
   * Start recording with audio and video
   * @param {HTMLVideoElement[]} videoElements - Array of video elements to record
   * @param {AudioTrack} audioTrack - Audio track to record
   * @param {object} options - Recording options
   */
  startRecording(videoElements, audioTrack, options = {}) {
    try {
      const {
        mimeType = "video/webm;codecs=vp9",
        videoBitsPerSecond = 2500000,
        layout = { columns: 2, rows: 2 },
      } = options;

      // Check browser support
      if (!window.MediaRecorder) {
        throw new Error("MediaRecorder API not supported");
      }

      // Initialize canvas
      this.initCanvas(options.width || 1280, options.height || 720);

      // Create audio context to mix audio
      const audioContext = new AudioContext();
      const audioDestination = audioContext.createMediaStreamDestination();

      // Add audio track to destination
      if (audioTrack) {
        const audioSource = audioContext.createMediaStreamSource(
          new MediaStream([audioTrack])
        );
        audioSource.connect(audioDestination);
      }

      // Get canvas stream
      const canvasStream = this.canvas.captureStream(30); // 30 FPS

      // Combine video and audio streams
      const combinedStream = new MediaStream();
      canvasStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));
      audioDestination.stream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));

      // Create MediaRecorder
      const mimeTypeToUse = MediaRecorder.isTypeSupported(mimeType)
        ? mimeType
        : "video/webm";

      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeTypeToUse,
        videoBitsPerSecond,
      });

      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error("Recording error:", event.error);
      };

      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;

      // Start drawing streams to canvas
      this.drawMultipleStreams(videoElements, layout);

      console.log("✅ Recording started");
      return true;
    } catch (error) {
      console.error("Error starting recording:", error);
      return false;
    }
  }

  /**
   * Stop recording and return blob
   * @returns {Promise<Blob>} Recording blob
   */
  stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("No active recording"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        cancelAnimationFrame(this.animationId);
        const blob = new Blob(this.recordedChunks, { type: "video/webm" });
        this.isRecording = false;
        this.recordedChunks = [];
        console.log("✅ Recording stopped");
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Download recording locally
   * @param {Blob} blob - Recording blob
   * @param {string} filename - Output filename
   */
  downloadRecording(blob, filename = "meeting-recording.webm") {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Upload recording to server
   * @param {Blob} blob - Recording blob
   * @param {string} roomId - Meeting room ID
   * @param {function} onProgress - Progress callback
   */
  async uploadRecording(blob, roomId, onProgress = null) {
    try {
      const formData = new FormData();
      formData.append("recording", blob);
      formData.append("roomId", roomId);
      formData.append("timestamp", new Date().toISOString());

      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      return new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("POST", "/api/upload-recording");
        xhr.send(formData);
      });
    } catch (error) {
      console.error("Error uploading recording:", error);
      throw error;
    }
  }

  /**
   * Get recording status
   */
  getStatus() {
    return {
      isRecording: this.isRecording,
      chunksSize: this.recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0),
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    if (this.canvas) {
      this.canvas.remove();
    }
    cancelAnimationFrame(this.animationId);
    this.recordedChunks = [];
    this.isRecording = false;
  }
}

export default new RecordingManager();