import express from "express";
import {
  addDepartment,
  addPosition,
  addUpdateApprovalChain,
  createOrganization,
  deleteDepartment,
  deletePosition,
  departmentBaseOrgNameDropdown,
  generateOtpOragnization,
  getApprovalChain,
  getApprovalList,
  getDepartments,
  // getDataBasedOnOrganization,
  getPositions,
  organizationAddData,
  organizationDropDown,
  organizationGetData,
  organizationUpdateData,
  sendApprovalForDeleteDepartment,
  sendApprovalForDeletePosition,
  sendApprovalForUpdateDepartment,
  sendApprovalForUpdatePosition,
  updateDepartment,
  updatePosition,
} from "../Controllers/organizationController.js";
import {authorize} from "../Helpers/authGuard.js";

const organizationRouter = express.Router();
organizationRouter.post("/organization-add-data", organizationAddData);
organizationRouter.put("/organization-update-data", organizationUpdateData);
organizationRouter.get("/organization-get-data", organizationGetData);
organizationRouter.post("/generate-otp-oragnization", generateOtpOragnization);
organizationRouter.post("/create-organization", createOrganization);
organizationRouter.get("/organization-drop-down", organizationDropDown);
organizationRouter.post(
  "/department-base-org-name-dropdown",
  departmentBaseOrgNameDropdown
);
organizationRouter.post("/add-department", authorize(), addDepartment);
// organizationRouter.put("/update-department", authorize(), sendApprovalForUpdateDepartment);
// organizationRouter.post("/delete-department", authorize(), sendApprovalForDeleteDepartment);
organizationRouter.put("/update-department", authorize(), updateDepartment);
organizationRouter.post("/delete-department", authorize(), deleteDepartment);
organizationRouter.get("/get-department",authorize(), getDepartments);

organizationRouter.post("/add-position",authorize(), addPosition);
organizationRouter.get("/get-positions",authorize(), getPositions);
organizationRouter.put("/update-position",authorize(), updatePosition);
organizationRouter.post("/delete-position",authorize(), updatePosition);
// organizationRouter.put("/update-position",authorize(), sendApprovalForUpdatePosition);
// organizationRouter.post("/delete-position",authorize(), sendApprovalForDeletePosition);

organizationRouter.post("/add-approval-chain", addUpdateApprovalChain);
organizationRouter.get("/get-approval-chain", authorize(),getApprovalChain);
organizationRouter.get("/get-approval-list", authorize(), getApprovalList);
// organizationRouter.put("/update-approval-chain", updateApprovalChain);
// organizationRouter.post("/delete-approval-chain", deleteApprovalChain);

export default organizationRouter;
