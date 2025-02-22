import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  contactNumber: {
    type: String,
    required: true,
  },
  emailOtp: {
    type: String,
    required: true,
  },
  contactOtp: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 900, // 15 minutes (900 seconds)
  },
});

const OTP = mongoose.model("OTP", otpSchema);

export default OTP;
