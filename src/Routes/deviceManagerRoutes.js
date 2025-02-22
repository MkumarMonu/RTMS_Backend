import express from "express";
import {
  allDevice,
  deleteDevice,
  generatePublishSecurityCode,
  generateSubscribeSecurityCode,
  getOneDevice,
  submitDeviceData,
  updateDevice,
} from "../Controllers/deviceManagerController.js";

const deviceRouter = express.Router();

//routes to call API
deviceRouter.post("/publish-code", generatePublishSecurityCode);
deviceRouter.post("/subscribe-code", generateSubscribeSecurityCode);
deviceRouter.get("/all-device", allDevice);
deviceRouter.get("/single-device/:id", getOneDevice);
deviceRouter.post("/submit-device", submitDeviceData);
deviceRouter.delete("/delete-device/:id", deleteDevice);
deviceRouter.put("/update-device/:id", updateDevice);

export default deviceRouter;
