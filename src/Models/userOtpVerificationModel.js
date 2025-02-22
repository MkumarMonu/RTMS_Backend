import mongoose from 'mongoose';

const userOTPVerificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  emailOTP: {
    type: String,
  },
  mobileOTP: {
    type: String,
  },
  createdAt: {
    type: Date,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  mobileVerified: {
    type: Boolean,
    default: false,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
});

const UserOTPVerification = mongoose.model('UserOTPVerification', userOTPVerificationSchema);

export default UserOTPVerification;
