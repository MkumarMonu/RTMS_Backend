import mongoose from "mongoose";

const complaintManagerSchema = new mongoose.Schema({
  complaintNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  senderId: { type: String, required: true },
  senderName: {
    type: String,
    required: true,
    trim: true,
  },
  senderDepartment: {
    type: String,
    required: true,
    trim: true,
  },
  receiverId: { type: String, required: true },
  receiverName: {
    type: String,
    required: true,
    trim: true,
  },
  receiverDepartment: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["Open Complaint", "Closed Complaint"],
    default: "Open Complaint",
    required: false,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  notificationId: { type: String, required: true },
  closedBy: { type: String, required: false },
  closedByComment: { type: String, required: false},
  closedDate: { type: Date, required: false}
}, {
  timestamps: true, // Automatically add `createdAt` and `updatedAt` timestamps
});

const Complaint = mongoose.model("Complaint", complaintManagerSchema);

export default Complaint;
