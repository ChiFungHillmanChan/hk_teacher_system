require('dotenv').config();
const nodemailer = require('nodemailer');

(async () => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER, // send to yourself
      subject: 'Test Email from Node.js',
      text: 'This is a test email sent from Node.js using Gmail SMTP.',
    });

    console.log('✅ Email sent! Message ID:', info.messageId);
  } catch (err) {
    console.error('❌ Email failed:', err);
  }
})();
