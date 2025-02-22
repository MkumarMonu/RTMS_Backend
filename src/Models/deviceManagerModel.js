import mongoose from "mongoose";
const nodeManagerSchema = new mongoose.Schema({
  deviceManager: {
    type: String,
    required: true,
    trim: true,
  },
  cloudId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  loraId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  landmark: {
    type: String,
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  scanTimer: {
    type: Number,
    required: true,
    min: 0
  },
  publishCode: {
    type: String,
    required: true
  },
  subscribeCode: {
    type: Number,
    required: true,
  }

},{
  timestamps:true
});



const nodeDevice = mongoose.model("Device", nodeManagerSchema);

export default nodeDevice;
