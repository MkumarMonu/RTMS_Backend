import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  organizationName: {
    type: String,
    required: true,
    trim: true,
  },
  wellNumber: {
    type: String,
    required: true,
  },
  notificationNo: { type: Number, required: false },
  wellType: {
    type: String,
    required: true,
  },
  nodeID: {
    type: String,
    required: true,
  },
  issues: {
    type: Array,
    required: true,
  },
  wellLocation: {
    type: String,
    required: true,
    trim: true,
  },
  wellInstallation: {
    type: String,
    required: true,
    trim: true,
  },
  notificationStatus: {
    type: String,
    enum: ["Pending","Close with Comment", "Converted to Complaint"],
    default: "Pending",
  },
  notificationDescription: {
    type: String,
    trim: true,
  },
  isApprovedByEmployee: {
    type: Boolean,
    default: false,
  },
  employeeApprovalDescription: {
    type: String,
    trim: true,
  },
  isApprovedByManager: {
    type: Boolean,
    default: false,
  },
  managerApprovalDescription: {
    type: String,
    trim: true,
  },
  isApprovedByOwner: {
    type: Boolean,
    default: false,
  },
  ownerApprovalDescription: {
    type: String,
    trim: true,
  },
  comment: { 
    type: Object,
    required: false
  },
  viewed: { type: Boolean, default: false },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// comment - { userId, message }
const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
