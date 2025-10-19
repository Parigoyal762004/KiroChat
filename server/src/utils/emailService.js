import nodemailer from "nodemailer";
import chalk from "chalk";

// Configure email service (Gmail with App Password recommended)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // Use Gmail App Password, not regular password
  },
});

/**
 * Send scheduled meeting reminder
 * @param {string} email - recipient email
 * @param {object} meeting - ScheduledMeeting document
 */
export async function sendMeetingReminder(email, meeting) {
  try {
    const meetingTime = new Date(meeting.scheduledTime).toLocaleString();
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0;">KiroChat Meeting Reminder</h1>
        </div>
        <div style="background: white; padding: 20px; border-radius: 0 0 8px 8px;">
          <p>Hi there!</p>
          <p>This is a reminder that your scheduled meeting <strong>"${meeting.title}"</strong> is starting soon.</p>
          <div style="background: #f0f4ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Meeting Title:</strong> ${meeting.title}</p>
            <p style="margin: 5px 0;"><strong>Scheduled Time:</strong> ${meetingTime}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${meeting.duration} minutes</p>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${meeting.meetingLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Meeting</a>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">Note: This is an automated reminder from KiroChat. Please do not reply to this email.</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Reminder: Meeting "${meeting.title}" starting soon`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(chalk.green(`✅ Meeting reminder sent to ${email}`));
    return true;
  } catch (error) {
    console.error(chalk.red("❌ Failed to send meeting reminder:"), error);
    return false;
  }
}

/**
 * Send meeting invitation
 * @param {string} email - recipient email
 * @param {object} meeting - ScheduledMeeting document
 * @param {string} invitedBy - username of inviter
 */
export async function sendMeetingInvitation(email, meeting, invitedBy) {
  try {
    const meetingTime = new Date(meeting.scheduledTime).toLocaleString();
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <div style="background: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0;">You're Invited to a KiroChat Meeting!</h1>
        </div>
        <div style="background: white; padding: 20px; border-radius: 0 0 8px 8px;">
          <p><strong>${invitedBy}</strong> has invited you to a meeting.</p>
          <p style="margin: 20px 0; font-size: 16px;"><strong>"${meeting.title}"</strong></p>
          <div style="background: #f5f3ff; padding: 15px; border-left: 4px solid #7c3aed; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${meetingTime}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${meeting.duration} minutes</p>
            ${meeting.description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${meeting.description}</p>` : ""}
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${meeting.meetingLink}" style="background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Meeting</a>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">This is an automated invitation from KiroChat.</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Meeting Invitation: "${meeting.title}" from ${invitedBy}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(chalk.green(`✅ Meeting invitation sent to ${email}`));
    return true;
  } catch (error) {
    console.error(chalk.red("❌ Failed to send meeting invitation:"), error);
    return false;
  }
}

/**
 * Send meeting summary after completion
 * @param {string} email - recipient email
 * @param {object} meeting - ScheduledMeeting document
 */
export async function sendMeetingSummary(email, meeting) {
  try {
    const startTime = new Date(meeting.createdAt).toLocaleString();
    const endTime = new Date(meeting.closedAt || Date.now()).toLocaleString();
    const participantCount = meeting.participants.length;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <div style="background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0;">Meeting Completed</h1>
        </div>
        <div style="background: white; padding: 20px; border-radius: 0 0 8px 8px;">
          <p>Your meeting "<strong>${meeting.title}</strong>" has been completed.</p>
          <div style="background: #ecfdf5; padding: 15px; border-left: 4px solid #059669; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Meeting Title:</strong> ${meeting.title}</p>
            <p style="margin: 5px 0;"><strong>Started:</strong> ${startTime}</p>
            <p style="margin: 5px 0;"><strong>Ended:</strong> ${endTime}</p>
            <p style="margin: 5px 0;"><strong>Participants:</strong> ${participantCount}</p>
          </div>
          ${meeting.recordingUrl ? `<div style="text-align: center; margin: 20px 0;"><a href="${meeting.recordingUrl}" style="background: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Recording</a></div>` : ""}
          <p style="color: #666; font-size: 12px; margin-top: 20px;">Thank you for using KiroChat!</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Summary: Meeting "${meeting.title}" Completed`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(chalk.green(`✅ Meeting summary sent to ${email}`));
    return true;
  } catch (error) {
    console.error(chalk.red("❌ Failed to send meeting summary:"), error);
    return false;
  }
}

export default { sendMeetingReminder, sendMeetingInvitation, sendMeetingSummary };