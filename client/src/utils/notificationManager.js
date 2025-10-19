/**
 * notificationManager.js
 * Handles browser notifications and notification sounds
 * Uses Web Audio API for sound generation (no external audio files needed)
 */

class NotificationManager {
  constructor() {
    this.audioContext = null;
    this.isEnabled = true;
  }

  /**
   * Initialize audio context
   */
  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Play notification sound using Web Audio API
   * @param {string} type - 'join', 'leave', 'message', 'alert'
   */
  playSound(type = "message") {
    if (!this.isEnabled) return;

    const ctx = this.initAudioContext();
    const now = ctx.currentTime;

    try {
      switch (type) {
        case "join":
          this.playJoinSound(ctx, now);
          break;
        case "leave":
          this.playLeaveSound(ctx, now);
          break;
        case "message":
          this.playMessageSound(ctx, now);
          break;
        case "alert":
          this.playAlertSound(ctx, now);
          break;
        default:
          this.playMessageSound(ctx, now);
      }
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }

  /**
   * Join notification - ascending two-tone beep
   */
  playJoinSound(ctx, now) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.linearRampToValueAtTime(1000, now + 0.1);
    osc2.frequency.setValueAtTime(600, now + 0.1);
    osc2.frequency.linearRampToValueAtTime(800, now + 0.2);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.1);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.2);
  }

  /**
   * Leave notification - descending beep
   */
  playLeaveSound(ctx, now) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(400, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Message notification - soft chime
   */
  playMessageSound(ctx, now) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(1200, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Alert notification - three quick beeps
   */
  playAlertSound(ctx, now) {
    const beepDuration = 0.15;
    const gap = 0.1;

    for (let i = 0; i < 3; i++) {
      const time = now + i * (beepDuration + gap);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(900, time);
      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + beepDuration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + beepDuration);
    }
  }

  /**
   * Browser notification using Notification API
   * @param {string} title
   * @param {object} options
   */
  showBrowserNotification(title, options = {}) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });
    }
  }

  /**
   * Request notification permission
   */
  static async requestPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return Notification.permission === "granted";
  }

  /**
   * Toggle sound notifications on/off
   */
  toggleSound(enabled) {
    this.isEnabled = enabled;
  }
}

// Export singleton instance
export default new NotificationManager();