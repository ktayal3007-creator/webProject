//load environment variables
import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
 const PORT = 3000;


// app.use(cors());
app.use(express.json());

// Temporary OTP storage
// const otpStore = {};

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// API to send OTP
app.post("/send-otp", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false,message: "Email is required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);

  otpStore[email] = {
    otp,
    expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes
  };

  transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    text: 'Your OTP is ${otp}. It will expire in 2 minutes'
  },
    (error) => {
      if (error) {
        console.error(error);
        return res.json({ success: false,message:"Failed to send OTP" });
             }
             res.json({ success: true, message: "OTP sent successfully" });
    }
  );
});

// API to verify OTP
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  const record = otpstore[email];

  if (!record) {
    return res.json({success: false, message: "OTP not found" });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.json({ success: false, message: "OTP expired" });
  }

  if(parseInt(otp) !== record.otp) {
    return res.json({ success: false, message: "Invalid OTP"});
  }
  
    delete otpStore[email];
    res.json({ success: true, message: "OTP verified successfully ✅" });
});

// Start server
app.listen(PORT, () => {
  console.log('Server running on http://localhost:${PORT}');
});