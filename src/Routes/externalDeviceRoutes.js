import express from "express";
import {
  getNodeAllDataByOrganization,
  externalDataCollect,
  externalDataShow,
  getSingleWellNodeDataByOrganization,
  getFilterWellNodeData,
} from "../Controllers/externalDevicesControllers.js";

const externaldeviceRouter = express.Router();

//routes to call api of external
externaldeviceRouter.post("/external-device-collect", externalDataCollect);
externaldeviceRouter.get("/external-device-show", externalDataShow);
externaldeviceRouter.get("/get-node-all-data-by-organization", getNodeAllDataByOrganization);
externaldeviceRouter.get("/get-single-well-node-data-by-organization", getSingleWellNodeDataByOrganization);
externaldeviceRouter.get("/get-filter-well-node-data", getFilterWellNodeData);

export default externaldeviceRouter;
