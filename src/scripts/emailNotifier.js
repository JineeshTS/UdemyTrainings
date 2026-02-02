/**
 * Email Notifier — Gmail SMTP notifications
 */

require('dotenv').config();
const nodemailer = require('nodemailer');
const { format } = require('date-fns');

let transporter = null;

function init() {
  if (!transporter && process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD }
    });
  }
  return transporter;
}

const RECIPIENT = process.env.EMAIL_RECIPIENT || '';

async function sendCourseCompletion(courseResult) {
  init();
  if (!transporter || !RECIPIENT) {
    console.log('   Email not configured, skipping');
    return { success: false };
  }

  const { course, qualityScore, success, outputDir, errors = [] } = courseResult;
  const status = success ? 'COMPLETED' : 'FAILED';

  try {
    const info = await transporter.sendMail({
      from: `"UdemyCrores" <${process.env.EMAIL_USER}>`,
      to: RECIPIENT,
      subject: `[UdemyCrores] ${status}: ${course?.title || 'Unknown'}`,
      html: `<h1>Course ${status}</h1>
        <ul>
          <li><b>Course:</b> ${course?.title || 'Unknown'}</li>
          <li><b>Category:</b> ${course?.category || 'N/A'}</li>
          <li><b>Quality:</b> ${qualityScore || 0}/100</li>
          <li><b>Output:</b> ${outputDir || 'N/A'}</li>
          <li><b>Time:</b> ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</li>
        </ul>
        ${errors.length > 0 ? `<h2>Errors</h2><ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}`
    });
    console.log(`   Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`   Email error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function sendDailyReport(reportData) {
  init();
  if (!transporter || !RECIPIENT) return { success: false };

  const { coursesGenerated = [], successCount = 0, failedCount = 0 } = reportData;

  try {
    await transporter.sendMail({
      from: `"UdemyCrores" <${process.env.EMAIL_USER}>`,
      to: RECIPIENT,
      subject: `UdemyCrores Daily — ${format(new Date(), 'MMM dd')} — ${successCount} courses`,
      html: `<h1>Daily Report</h1>
        <p>Generated: ${coursesGenerated.length} | Success: ${successCount} | Failed: ${failedCount}</p>
        ${coursesGenerated.map(c => `<p>${c.title || 'Course'}: ${c.success ? 'OK' : 'FAILED'} (${c.qualityScore || 0}/100)</p>`).join('')}`
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { sendCourseCompletion, sendDailyReport };
