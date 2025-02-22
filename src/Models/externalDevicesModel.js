import mongoose from "mongoose";

const externalDeviceSchema = new mongoose.Schema({
  data: { 
    type: Map, 
    of: String, 
  },
  createAt: {
    type: Date,
    default: Date.now(),
  },
});

const ExternalDevice = mongoose.model("ExternalDevice", externalDeviceSchema);

export default ExternalDevice;

