import mongoose from "mongoose";

const messageBoxSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  content: { type: String, required: true },
  action: { type: String, required: false },
  actionData: { type: Object, required: false },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: false,
  },
  createdAt: { type: Date, required: true}
});

const MessageBox = mongoose.model("MessageBox", messageBoxSchema);

export default MessageBox;
