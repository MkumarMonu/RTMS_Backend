import Operation, { APPROVAL_STATUS } from "../Models/operationModel.js";
import { APPROVAL_KEYS } from "../Models/organizationsModel.js";
import { sendMessage } from "./messageBoxService.js";
import { getApprovalChainByKey } from "./organizationController.js";
import { getUserDetail, getUserListPartial } from "./usersController.js";
import Organization, { APPROVAL_LIST } from "../Models/organizationsModel.js";

const checkOperationStatus = () => {};

export const approveRejectLevel1 = async (req, res) => {
  const { operationId, status } = req.body;
  if (!APPROVAL_STATUS[status]) {
    res.status(400).json({ success: false, message: "Invalid status" });
  }

  const requestingUser = req.user;
  const userId = requestingUser._id;

  const operationInfo = await Operation.findById(operationId);
  const approvalChainInfo = await getApprovalChainByKey(
    operationInfo.approvalChainKey,
    operationInfo.organizationName
  );
  if (!approvalChainInfo) {
    res
      .status(400)
      .json({ success: false, message: "Approval chain not found" });
  }
  if (!operationInfo) {
    res.status(400).json({ success: false, message: "Operation not found" });
  }

  const userInfo = await getUserDetail({ userId: requestingUser._id });

  if (
    approvalChainInfo.approval1.department === userInfo.department &&
    approvalChainInfo.approval1.level == userInfo.position
  ) {
    const users = await getUserListPartial({
      department: approvalChainInfo.approval1.department,
      position: approvalChainInfo.approval1.level,
      organizationName: operationInfo.organizationName,
    });

    const approvalGeneratedBy = await getUserDetail({
      userId: operationInfo.userId,
    });
    let content = `${
      approvalGeneratedBy.username
    } wants to ${operationInfo.operationType.toLowerCase()} a ${
      operationInfo.entityName
    }.`;

    for (let x = 0; x < users.length; x++) {
      await sendMessage({
        userId: operationInfo.userId,
        subject: "Approval - Level 2",
        content,
        action: "Operation",
        actionData: { operationId: operationInfo._id },
      });
    }

    operationInfo.approval1 = {
      userId,
      status,
      createdAt: new Date(),
    };
    await operationInfo.save();
    res.json({ success: true, message: "Operation sent for level 2 approval" });
  } else {
    res.status(400).json({
      success: false,
      message: "User not allowed to perform this action",
    });
  }
};

export const approvalRejectLevel2 = async (req, res) => {
  const { operationId, status } = req.body;
  if (!APPROVAL_STATUS[status]) {
    res.status(400).json({ success: false, message: "Invalid status" });
  }

  const requestingUser = req.user;

  const operationInfo = await Operation.findById(operationId);
  const approvalChainInfo = await getApprovalChainByKey(
    operationInfo.approvalChainKey,
    operationInfo.organizationName
  );
  if (!approvalChainInfo) {
    res
      .status(400)
      .json({ success: false, message: "Approval chain not found" });
  }
  if (!operationInfo) {
    res.status(400).json({ success: false, message: "Operation not found" });
  }

  if (
    operationInfo.approval1 &&
    operationInfo.approval1.status === APPROVAL_STATUS.Approved
  ) {
    const userInfo = await getUserDetail({ userId: requestingUser._id });
    if (
      approvalChainInfo.approval2.department == userInfo.department &&
      approvalChainInfo.approval2.level == userInfo.position
    ) {
      operationInfo.approval2 = {
        userId: requestingUser._id,
        status,
        createdAt: new Date(),
      };
      await operationInfo.save();

      const result = await performOperation({
        approvalChainKey: approvalChainInfo.approvalKey,
        filterCondition: operationInfo.filterCondition,
        data: operationInfo.data,
      });
      res.json(result);
    } else {
      res.status(400).json({
        success: false,
        message: "User not allowed to perform this action",
      });
    }
  } else {
    res
      .status(400)
      .json({ success: false, message: "Level 1 approval is required" });
  }
};

export const sendForApproval = async ({
  userId,
  organizationName,
  operationType,
  entityName,
  filterCondition,
  approvalChainKey,
  data,
}) => {
  try {
    if (
      !userId ||
      !operationType ||
      !organizationName ||
      !entityName ||
      !filterCondition ||
      !approvalChainKey
    )
      return { success: false, message: "Invalid Payload" };

    const newOperation = await Operation.create({
      userId,
      operationType,
      organizationName,
      entityName,
      filterCondition,
      approvalChainKey,
      data,
      createdAt: new Date(),
    });

    // const approvalChain = await
    const approvalChains = await getApprovalChainByKey(
      approvalChainKey,
      organizationName
    );
    if (!approvalChains)
      return { success: false, message: "Approval chain not found" };
    const users = await getUserListPartial({
      department: approvalChains.approval1.department,
      position: approvalChains.approval1.level,
      organizationName,
    });

    const user = await getUserDetail({ userId });

    let content = `${
      user.username
    } wants to ${operationType.toLowerCase()} a ${entityName}.`;

    for (let x = 0; x < users.length; x++) {
      await sendMessage({
        userId: user._id,
        subject: "Approval",
        content,
        action: "Operation",
        actionData: { operationId: newOperation._id },
      });
    }

    return { success: true, message: entityName + " change sent for approval" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const performOperation = async ({
  approvalChainKey,
  filterCondition,
  data,
}) => {
  if (approvalChainKey === APPROVAL_KEYS.UPDATE_DEPARTMENT) {
    const organization = await Organization.findOne({
      organizationName: filterCondition.organizationName,
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    // Find the department by old name
    const department = organization.departments.find(
      (dep) => dep.departmentName === filterCondition.oldDepartmentName
    );

    if (!department) {
      return {
        success: false,
        message: `Department ${filterCondition.oldDepartmentName} not found in organization ${filterCondition.organizationName}.`,
      };
    }

    department.departmentName = data.newDepartmentName;
    await organization.save();
    return { success: true, message: "Department updated successfully" };
  }
  if (approvalChainKey === APPROVAL_KEYS.DELETE_DEPARTMENT) {
    const organization = await Organization.findOne({
      organizationName: filterCondition.organizationName,
    });

    if (!organization) {
      return {
        success: false,
        message: "Organization not found.",
      };
    }

    // Find the index of the department to delete
    const departmentIndex = organization.departments.findIndex(
      (dep) => dep.departmentName === filterCondition.departmentName
    );

    if (departmentIndex === -1) {
      return {
        success: false,
        message: `Department ${filterCondition.departmentName} not found in organization ${filterCondition.organizationName}.`,
      };
    }

    // Remove the department from the organization
    organization.departments.splice(departmentIndex, 1);

    // Save the updated organization
    await organization.save();
    return { message: "Department deleted successfully", success: false };
  }
  if (approvalChainKey === APPROVAL_KEYS.DELETE_POSITION) {
    const organization = await Organization.findOne({ organizationName: filterCondition.organizationName });

    if (!organization) {
      return ({
        success: false,
        message: "Organization not found.",
      });
    }

    // Find the department within the organization
    const department = organization.departments.find(
      (dep) => dep.departmentName === filterCondition.departmentName
    );

    if (!department) {
      return ({
        success: false,
        message: `Department ${filterCondition.departmentName} not found in organization ${filterCondition.organizationName}.`,
      });
    }

    // Find the index of the position to delete
    const positionIndex = department.positions.findIndex(
      (pos) => pos === data.positionName
    );

    if (positionIndex === -1) {
      return ({
        success: false,
        message: `Position ${filterCondition.positionName} not found in department ${filterCondition.departmentName}.`,
      });
    }

    // Remove the position from the department
    department.positions.splice(positionIndex, 1);

    // Save the updated organization
    await organization.save();

    return ({
      success: true,
      message: `Position ${filterCondition.positionName} deleted successfully from department ${filterCondition.departmentName}.`,
      data: department.positions,
    });
  }
  if (approvalChainKey === APPROVAL_KEYS.UPDATE_POSITION) {
    const organization = await Organization.findOne({
      organizationName: filterCondition.organizationName,
    });

    if (!organization) {
      return {
        success: false,
        message: "Organization not found.",
      };
    }

    // Find the department within the organization
    const department = organization.departments.find(
      (dep) => dep.departmentName === filterCondition.departmentName
    );

    if (!department) {
      return {
        success: false,
        message: `Department ${filterCondition.departmentName} not found in organization ${filterCondition.organizationName}.`,
      };
    }

    // Find the position within the department
    const positionIndex = department.positions.findIndex(
      (pos) => pos === filterCondition.oldPositionName
    );

    if (positionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Position ${filterCondition.oldPositionName} not found in department ${filterCondition.departmentName}.`,
      });
    }

    // Update the position name
    department.positions[positionIndex] = data.newPositionName;

    // Save the updated organization
    await organization.save();

    return ({
      success: true,
      message: `Position updated from ${filterCondition.oldPositionName} to ${data.newPositionName}.`,
      data: department.positions,
    });
  }
};

export default { sendForApproval };
// requirement for sendForApproval
// {
//     "userId",
//     operationType: "UPDATE",
//     entityName: "Department",
//     filterCondition: {},
//     data: {}
// }

// - request to update deprartment
//  - send request to operations according to approval chain( data to update, )
//  - this will send a message with all info ( like table to update, data, )

// now integrate sendFor approval to existing apis.
// create apprrovelevel1
// - verify already approved or rejected
// - get the operation id,
// - get approval chain detail
// - verify user has permission
// - then approve or reject

// create approve level 2
// - get the operation id,
// - get approval chain detail
// - verify user has permission
// - verify approve from level 1
// - then approve or reject
// - call the specific entity for operation

// message box list api

// mesage box detail api
// - based on user if action is operation
// - get operation detail
