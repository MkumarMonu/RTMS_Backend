import express from "express";
import {
  addLocation,
  getLocations,
  addInstallationToLocation,
  getInstallationsByLocation,
  allInstallations,
  saveWellTypeForInstallation,
  updateNotFlowingCondition,
  deleteInstallationToLocation,
  getWellDetails,
  deleteLocation,
  saveWellDetails,
  getAllWellNumbers,
  getWellLocations,
  updateWellConfiguration,
  saveFlowingCondition,
  saveNotFlowingCondition,
  updateFlowingCondition,
  getWellConfiguration,
  getWellParameter,
  getWellNodeId,
  saveWellConfiguration, 
  countTotalWellNumbers,
} from "../Controllers/wellMasterController.js";

const wellRouter = express.Router(); // Correctly define wellRouter

// routes to call API
wellRouter.post("/add-location", addLocation);
wellRouter.get("/get-AllLocations", getLocations);
wellRouter.post("/add-InstallationToLocation", addInstallationToLocation);
wellRouter.get('/get-InstallationsByLocation', getInstallationsByLocation);
wellRouter.get('/get-allInstallations',allInstallations);
wellRouter.post('/save-WellTypeForInstallation', saveWellTypeForInstallation);
wellRouter.get('/get-WellDetails',getWellDetails);
wellRouter.post("/delete-installationToLocation", deleteInstallationToLocation);
wellRouter.post("/delete-location", deleteLocation);
wellRouter.post('/save-WellDetails',saveWellDetails);
wellRouter.post('/save-wellConfiguration',saveWellConfiguration);
wellRouter.get('/get-wellNodeId',getWellNodeId);
wellRouter.get('/get-AllWellNumbers',getAllWellNumbers);
wellRouter.get('/get-wellByParameter',getWellParameter);
wellRouter.post('/save-flowingCondition',saveFlowingCondition);
wellRouter.post('/save-notFlowingCondition',saveNotFlowingCondition);
wellRouter.put('/update-flowingCondition',updateFlowingCondition);
wellRouter.put('/update-notFlowingCondition',updateNotFlowingCondition);
wellRouter.put('/update-wellConfiguration',updateWellConfiguration);
wellRouter.get('/get-wellConfiguration',getWellConfiguration);
wellRouter.get('/get-WellLocations', getWellLocations);
wellRouter.get('/count-TotalWellNumbers',countTotalWellNumbers);


export default wellRouter;









