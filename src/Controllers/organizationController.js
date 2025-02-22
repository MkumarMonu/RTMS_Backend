import {
  sendNewCreateOrganization,
  sendOTPVerification,
  uploadCloudinary,
} from "../Helpers/helper.js";
import bcrypt from "bcryptjs";
import Organization, {
  APPROVAL_KEYS,
  APPROVAL_LIST,
} from "../Models/organizationsModel.js";
import otpGenerator from "otp-generator";
import Users from "../Models/userModel.js";
import OTP from "../Models/OTP-model.js";
import { ENTITY, OPERATION_TYPE } from "../Models/operationModel.js";
import OperationService from "./operationService.js";

//Add department
export const addDepartment = async (req, res) => {
  try {
    const { organizationName, departmentName } = req.body;
    console.log(req.body)

    // Check if all fields are provided
    if (!organizationName || !departmentName) {
      return res.status(400).json({
        success: false,
        message: "Organization name and department name are required",
      });
    }

    // Find the organization by name
    const organization = await Organization.findOne({ organizationName });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    console.log(organization);
    // Check if the department already exists
    const departmentExists = organization.departments.some(
      (dep) => dep.departmentName === departmentName
    );

    if (departmentExists) {
      return res.status(400).json({
        success: false,
        message: "Department already exists in this organization",
      });
    }

    // Add the new department
    organization.departments.push({ departmentName, positions: [] });

    // Save the updated organization
    await organization.save();

    return res.status(201).json({
      success: true,
      message: `Department ${departmentName} added successfully to organization ${organizationName}`,
      data: organization.departments,
    });
  } catch (error) {
  
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "An error occurred while adding the department",
    });
  }
};

//Update Department
export const updateDepartment = async (req, res) => {
  try {
    const { organizationName, oldDepartmentName, newDepartmentName } = req.body;

    // Validate required fields
    if (!organizationName || !oldDepartmentName || !newDepartmentName) {
      return res.status(400).json({
        success: false,
        message:
          "Organization name, old department name, and new department name are required.",
      });
    }

    // Find the organization by name
    const organization = await Organization.findOne({ organizationName });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    // Find the department by old name
    const department = organization.departments.find(
      (dep) => dep.departmentName === oldDepartmentName
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: `Department ${oldDepartmentName} not found in organization ${organizationName}.`,
      });
    }

    // Update the department name

    department.departmentName = newDepartmentName;

    // Save the updated organization
    await organization.save();

    return res.status(200).json({
      success: true,
      message: `Department updated successfully from ${oldDepartmentName} to ${newDepartmentName}.`,
      data: organization.departments,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the department.",
    });
  }
};

export const sendApprovalForUpdateDepartment = async (req, res) => {
  const { organizationName, oldDepartmentName, newDepartmentName } = req.body;

  // Validate required fields
  if (!organizationName || !oldDepartmentName || !newDepartmentName) {
    return res.status(400).json({
      success: false,
      message:
        "Organization name, old department name, and new department name are required.",
    });
  }
  const result = await OperationService.sendForApproval({
    userId: req.user._id,
    operationType: OPERATION_TYPE.update,
    organizationName,
    entityName: ENTITY.department,
    filterCondition: { organizationName, oldDepartmentName },
    approvalChainKey: APPROVAL_KEYS.UPDATE_DEPARTMENT,
    data: { newDepartmentName },
  });
  res.json(result);
  // res.json(await sendForApproval());
};

//delete department
export const deleteDepartment = async (req, res) => {
  try {
    const { organizationName, departmentName } = req.body;

    // Validate required fields
    if (!organizationName || !departmentName) {
      return res.status(400).json({
        success: false,
        message: "Organization name and department name are required.",
      });
    }

    // Find the organization by name
    const organization = await Organization.findOne({ organizationName });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    // Find the index of the department to delete
    const departmentIndex = organization.departments.findIndex(
      (dep) => dep.departmentName === departmentName
    );

    if (departmentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Department ${departmentName} not found in organization ${organizationName}.`,
      });
    }

    // Remove the department from the organization
    organization.departments.splice(departmentIndex, 1);

    // Save the updated organization
    await organization.save();

    return res.status(200).json({
      success: true,
      message: `Department ${departmentName} deleted successfully from organization ${organizationName}.`,
      data: organization.departments,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the department.",
    });
  }
};

export const sendApprovalForDeleteDepartment = async (req, res) => {
  const { organizationName, departmentName } = req.body;

  // Validate required fields
  if (!organizationName || !departmentName) {
    return res.status(400).json({
      success: false,
      message: "Organization name and department name are required.",
    });
  }

  const result = await OperationService.sendForApproval({
    userId: req.user._id,
    operationType: OPERATION_TYPE.delete,
    organizationName,
    entityName: ENTITY.department,
    filterCondition: { organizationName },
    approvalChainKey: APPROVAL_KEYS.DELETE_DEPARTMENT,
    data: { departmentName },
  });
  res.json(result);
};

export const getDepartments = async (req, res) => {
  const { organizationName } = req.query;
  if (!organizationName) {
    res.json({ message: "Organization Name required", success: false });
    return;
  }

  const result = await Organization.findOne({ organizationName });
  res.json({ success: true, data: result.departments || [] });
};

//Add Position
export const addPosition = async (req, res) => {
  try {
    const { organizationName, departmentName, positions } = req.body;

    // Check if all fields are provided
    if (!organizationName || !departmentName || !positions) {
      return res.status(400).json({
        success: false,
        message:
          "Organization name, department name, and positions are required",
      });
    }

    // Find the organization by name
    const organization = await Organization.findOne({ organizationName });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check if the department exists in the organization
    const departmentIndex = organization.departments.findIndex(
      (dep) => dep.departmentName === departmentName
    );

    if (departmentIndex === -1) {
      // Department does not exist, add a new department with positions
      organization.departments.push({
        departmentName,
        positions,
      });
    } else {
      // Department exists, update the positions array
      organization.departments[departmentIndex].positions = [
        ...organization.departments[departmentIndex].positions,
        ...positions,
      ];
    }
    const newSet = new Set();
    organization.departments[departmentIndex].positions.forEach((i) =>
      newSet.add(i)
    );
    organization.departments[departmentIndex].positions = [...newSet];

    // Save the updated organization
    await organization.save();

    return res.status(200).json({
      success: true,
      message: `Positions added for department ${departmentName}`,
      data: organization.departments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "An error occurred while updating positions",
    });
  }
};

//get Position api
export const getPositions = async (req, res) => {
  try {
    const { organizationName, departmentName } = req.query;

    // Validate required fields
    if (!organizationName || !departmentName) {
      return res.status(400).json({
        success: false,
        message: "Organization name and department name are required.",
      });
    }

    // Find the organization by name
    const organization = await Organization.findOne({ organizationName });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    // Find the department within the organization
    const department = organization.departments.find(
      (dep) => dep.departmentName === departmentName
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: `Department ${departmentName} not found in organization ${organizationName}.`,
      });
    }

    // Check if positions array exists and is not empty
    if (!department.positions || department.positions.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No positions available in this department.",
        data: [], // Empty array since there are no positions
      });
    }

    return res.status(200).json({
      success: true,
      data: department.positions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching positions.",
    });
  }
};

//Update Position
export const updatePosition = async (req, res) => {
  try {
    const {
      organizationName,
      departmentName,
      oldPositionName,
      newPositionName,
    } = req.body;

    // Validate required fields
    if (
      !organizationName ||
      !departmentName ||
      !oldPositionName ||
      !newPositionName
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Organization name, department name, old position name, and new position name are required.",
      });
    }

    // Find the organization by name
    const organization = await Organization.findOne({ organizationName });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    // Find the department within the organization
    const department = organization.departments.find(
      (dep) => dep.departmentName === departmentName
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: `Department ${departmentName} not found in organization ${organizationName}.`,
      });
    }

    // Find the position within the department
    const positionIndex = department.positions.findIndex(
      (pos) => pos === oldPositionName
    );

    if (positionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Position ${oldPositionName} not found in department ${departmentName}.`,
      });
    }

    // Update the position name
    department.positions[positionIndex] = newPositionName;

    // Save the updated organization
    await organization.save();

    return res.status(200).json({
      success: true,
      message: `Position updated from ${oldPositionName} to ${newPositionName}.`,
      data: department.positions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the position.",
    });
  }
};

export const sendApprovalForUpdatePosition = async (req, res) => {
  try {
    const {
      organizationName,
      departmentName,
      oldPositionName,
      newPositionName,
    } = req.body;

    // Validate required fields
    if (
      !organizationName ||
      !departmentName ||
      !oldPositionName ||
      !newPositionName
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Organization name, department name, old position name, and new position name are required.",
      });
    }

    const result = await OperationService.sendForApproval({
      userId: req.user._id,
      operationType: OPERATION_TYPE.update,
      organizationName,
      entityName: ENTITY.position,
      filterCondition: { organizationName, departmentName, oldPositionName },
      approvalChainKey: APPROVAL_KEYS.UPDATE_POSITION,
      data: { newPositionName },
    });
    res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the position.",
    });
  }
};

//delete position
export const deletePosition = async (req, res) => {
  try {
    const { organizationName, departmentName, positionName } = req.body;

    // Validate required fields
    if (!organizationName || !departmentName || !positionName) {
      return res.status(400).json({
        success: false,
        message:
          "Organization name, department name, and position name are required.",
      });
    }

    // Find the organization by name
    const organization = await Organization.findOne({ organizationName });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    // Find the department within the organization
    const department = organization.departments.find(
      (dep) => dep.departmentName === departmentName
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: `Department ${departmentName} not found in organization ${organizationName}.`,
      });
    }

    // Find the index of the position to delete
    const positionIndex = department.positions.findIndex(
      (pos) => pos === positionName
    );

    if (positionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Position ${positionName} not found in department ${departmentName}.`,
      });
    }

    // Remove the position from the department
    department.positions.splice(positionIndex, 1);

    // Save the updated organization
    await organization.save();

    return res.status(200).json({
      success: true,
      message: `Position ${positionName} deleted successfully from department ${departmentName}.`,
      data: department.positions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the position.",
    });
  }
};

export const sendApprovalForDeletePosition = async (req, res) => {
  try {
    const { organizationName, departmentName, positionName } = req.body;

    // Validate required fields
    if (!organizationName || !departmentName || !positionName) {
      return res.status(400).json({
        success: false,
        message:
          "Organization name, department name, and position name are required.",
      });
    }

    const result = await OperationService.sendForApproval({
      userId: req.user._id,
      operationType: OPERATION_TYPE.delete,
      organizationName,
      entityName: ENTITY.position,
      filterCondition: { organizationName, departmentName },
      approvalChainKey: APPROVAL_KEYS.DELETE_POSITION,
      data: { positionName },
    });
    res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the position.",
    });
  }
};

//Add Approval chain
export const addUpdateApprovalChain = async (req, res) => {
  try {
    // const { organizationName, departmentName, action, level1, level2 } =
    const {
      organizationName,
      approvalName,
      approvalKey,
      approval1,
      approval2,
    } = req.body;
    req.body;

    // Check if all fields are provided
    if (
      !organizationName ||
      !approvalName ||
      !approvalKey ||
      !approval1.department ||
      !approval1.level
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All fields (organizationName, approvalName, approvalKey, approval1, approval2) are required",
      });
    }

    // Find the organization by name
    const organization = await Organization.findOne({ organizationName });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    if (!Array.isArray(organization.approvalChain)) {
      organization.approvalChain = [];
    }

    const existingIndex = organization.approvalChain.findIndex(
      (i) => i.approvalKey === approvalKey
    );
    if (existingIndex > -1) {
      organization.approvalChain[existingIndex] = {
        approvalName,
        approvalKey,
        approval1,
        approval2,
      };
    }
    if (existingIndex === -1) {
      organization.approvalChain.push({
        approvalName,
        approvalKey,
        approval1,
        approval2,
      });
    }

    // Save the updated organization
    await organization.save();

    return res.status(200).json({
      success: true,
      message: `Approval chain saved successfully.`,
      data: organization.approvalChain,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message || "An error occurred while adding the approval chain",
    });
  }
};

//Get Approval chain
export const getApprovalChain = async (req, res) => {
  try {
    const { organizationName } = req.query;

    // Check if all fields are provided
    if (!organizationName) {
      return res.status(400).json({
        success: false,
        message: "Organization name is required",
      });
    }

    // Find the organization by name
    const organization = await Organization.findOne({ organizationName });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: organization.approvalChain || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the approval chain",
    });
  }
};

export const getApprovalChainByKey = async (approvalKey, organizationName) => {
  const orgs = await Organization.findOne({ organizationName });

  if (orgs) {
    const approvalKeyChains = orgs.approvalChain;

    return approvalKeyChains.find((i) => i.approvalKey == approvalKey);
  } else return false;
};

//Update Approval chain
export const updateApprovalChain = async (req, res) => {
  // try {
  //   const {
  //     organizationName,
  //     departmentName,
  //     oldAction,
  //     oldLevel1,
  //     oldLevel2,
  //     newAction,
  //     newLevel1,
  //     newLevel2,
  //   } = req.body;
  //   // Check if all required fields are provided
  //   if (
  //     !organizationName ||
  //     !departmentName ||
  //     !oldAction ||
  //     !oldLevel1 ||
  //     !oldLevel2 ||
  //     !newAction ||
  //     !newLevel1 ||
  //     !newLevel2
  //   ) {
  //     return res.status(400).json({
  //       success: false,
  //       message:
  //         "Organization name, department name, old approval chain (action, level1, level2), and new approval chain are required",
  //     });
  //   }
  //   // Find the organization by name
  //   const organization = await Organization.findOne({ organizationName });
  //   if (!organization) {
  //     return res.status(404).json({
  //       success: false,
  //       message: "Organization not found",
  //     });
  //   }
  //   // Find the department by name
  //   const department = organization.departments.find(
  //     (dep) => dep.departmentName === departmentName
  //   );
  //   if (!department) {
  //     return res.status(404).json({
  //       success: false,
  //       message: `Department ${departmentName} not found in the organization`,
  //     });
  //   }
  //   // Find the approval chain by matching the old values
  //   const approvalChainIndex = department.approvalChain.findIndex(
  //     (chain) =>
  //       chain.action === oldAction &&
  //       chain.level1 === oldLevel1 &&
  //       chain.level2 === oldLevel2
  //   );
  //   // If the old approval chain is not found
  //   if (approvalChainIndex === -1) {
  //     return res.status(404).json({
  //       success: false,
  //       message: "Old approval chain not found",
  //     });
  //   }
  //   // Update the approval chain with the new values
  //   department.approvalChain[approvalChainIndex] = {
  //     action: newAction,
  //     level1: newLevel1,
  //     level2: newLevel2,
  //   };
  //   // Save the updated organization
  //   await organization.save();
  //   return res.status(200).json({
  //     success: true,
  //     message: `Approval chain updated successfully for department ${departmentName}`,
  //     data: department.approvalChain,
  //   });
  // } catch (error) {
  //   return res.status(500).json({
  //     success: false,
  //     message: "An error occurred while updating the approval chain",
  //     error: error.message,
  //   });
  // }
};

//Delete Approval chain
export const deleteApprovalChain = async (req, res) => {
  // try {
  //   const { organizationName, departmentName, action, level1, level2 } =
  //     req.body;
  //   // Check if required fields are provided
  //   if (!organizationName || !departmentName || !action || !level1 || !level2) {
  //     return res.status(400).json({
  //       success: false,
  //       message:
  //         "Organization name, department name, action, level1, and level2 are required",
  //     });
  //   }
  //   // Find the organization by name
  //   const organization = await Organization.findOne({ organizationName });
  //   if (!organization) {
  //     return res.status(404).json({
  //       success: false,
  //       message: "Organization not found",
  //     });
  //   }
  //   // Find the department by name
  //   const department = organization.departments.find(
  //     (dep) => dep.departmentName === departmentName
  //   );
  //   if (!department) {
  //     return res.status(404).json({
  //       success: false,
  //       message: `Department ${departmentName} not found in the organization`,
  //     });
  //   }
  //   // Check if the approval chain exists
  //   if (!department.approvalChain || department.approvalChain.length === 0) {
  //     return res.status(404).json({
  //       success: false,
  //       message: `No approval chain found for department ${departmentName}`,
  //     });
  //   }
  //   // Find the index of the approval chain to be deleted
  //   const approvalChainIndex = department.approvalChain.findIndex(
  //     (app) =>
  //       app.action === action && app.level1 === level1 && app.level2 === level2
  //   );
  //   // If the approval chain entry is not found, return an error
  //   if (approvalChainIndex === -1) {
  //     return res.status(404).json({
  //       success: false,
  //       message: `Approval chain with specified action, level1, and level2 not found in department ${departmentName}`,
  //     });
  //   }
  //   // Delete the approval chain entry at the found index
  //   department.approvalChain.splice(approvalChainIndex, 1);
  //   // Save the updated organization
  //   await organization.save();
  //   return res.status(200).json({
  //     success: true,
  //     message: `Approval chain deleted successfully for department ${departmentName}`,
  //     data: department.approvalChain,
  //   });
  // } catch (error) {
  //   return res.status(500).json({
  //     success: false,
  //     message: "An error occurred while deleting the approval chain",
  //     error: error.message,
  //   });
  // }
};

// Organization Add Data
export const organizationAddData = async (req, res) => {
  try {
    const { organizationName } = req.body;

    const {
      subtitlename,
      address,
      city,
      state,
      country,
      pinCode,
      phone,
      fax,
      email,
    } = req.body;

    const organizationlogo = req.files?.organizationlogo;

    // Validate required fields
    if (
      !organizationlogo ||
      !subtitlename ||
      !organizationName ||
      !address ||
      !city ||
      !state ||
      !country ||
      !pinCode ||
      !phone ||
      !fax ||
      !email
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // Find the organization by name
    const organization = await Organization.findOne({ organizationName });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    //validong file types (e.g. images)
    const validImageLogo = ["image/jpeg", "image/png", "imgage/jpg"];
    if (!validImageLogo.includes(organizationlogo.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Ipload Files must be Images (jpeg, png, jpg",
      });
    }

    //iploading logo to cloudinary
    const organizationLogoRes = await uploadCloudinary(
      organizationlogo,
      "Logo",
      1000,
      1000
    );

    // Create the new organization
    (organization.organizationlogo = organizationLogoRes.secure_url),
      (organization.subtitlename = subtitlename),
      (organization.address = address),
      (organization.city = city),
      (organization.state = state),
      (organization.country = country),
      (organization.pinCode = pinCode),
      (organization.phone = phone),
      (organization.fax = fax),
      (organization.email = email),
      await organization.save();

    // Send a success response
    res.status(201).json({
      success: true,
      message: "Organization created successfully.",
      data: organization,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      message: "Failed to create organization.",
    });
  }
};

// Organization Get Data API
export const organizationGetData = async (req, res) => {
  try {
    const { organizationName } = req.query;

    // Validate required fields
    if (!organizationName) {
      return res.status(400).json({
        success: false,
        message: "Organization name is required.",
      });
    }

    // Fetch the organization by name
    const organization = await Organization.findOne({ organizationName });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    // Send a success response
    return res.status(200).json({
      success: true,
      message: "Organization data fetched successfully.",
      data: organization,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch organization data.",
    });
  }
};

// Organization Update Data API (No Need)
export const organizationUpdateData = async (req, res) => {
  try {
    const { organizationName } = req.body;

    const {
      // newOrganizationName,
      organizationlogo,
      subtitlename,
      address,
      city,
      state,
      country,
      pinCode,
      phone,
      fax,
      email,
    } = req.body;

    // Validate required fields
    if (!organizationName) {
      return res.status(400).json({
        success: false,
        message: "Organization name is required.",
      });
    }

    // Find the organization by name
    const organization = await Organization.findOne({ organizationName });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    // Update organization details
    // if (newOrganizationName)
    //   organization.organizationName = newOrganizationName;
    if (organizationlogo?.organizationLogoRes?.secure_url) {
      organization.organizationlogo =
        organizationlogo.organizationLogoRes.secure_url;
    }
    if (subtitlename) organization.subtitlename = subtitlename;
    if (address) organization.address = address;
    if (city) organization.city = city;
    if (state) organization.state = state;
    if (country) organization.country = country;
    if (pinCode) organization.pinCode = pinCode;
    if (phone) organization.phone = phone;
    if (fax) organization.fax = fax;
    if (email) organization.email = email;

    await organization.save();

    // Send a success response
    return res.status(200).json({
      success: true,
      message: "Organization updated successfully.",
      data: organization,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update organization.",
    });
  }
};

//ADMIN TO CREATE ORGANIZATION

//admin Generate Otp for Create Organization
export const generateOtpOragnization = async (req, res) => {
  try {
    const { email, contactNumber } = req.body;

    //checking if all required
    if (!email || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: "All Fields are required",
      });
    }

    // Email validation with min/max length constraints
    const emailRegex =
      /^[\w.%+-]+@([a-zA-Z0-9-]+\.)+(gmail\.com|com|net|org|edu|gov|mil|co\.in|in|co|io|info|biz|tech|me|ai)$/i;
    if (!emailRegex.test(email) || email.length < 5 || email.length > 56) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid email address! Please provide a valid email ending (com|net|org|edu|gov|mil|co.in|in|co|io|info|biz|tech|me|ai)",
      });
    }

    // Contact number validation - must start with '+91'
    const contactNumberRegex = /^\+91\d{10}$/;
    if (!contactNumberRegex.test(contactNumber)) {
      return res.status(400).json({
        success: false,
        message:
          "Contact number must be in the format '+91XXXXXXXXXX' and include the '+91' prefix without any Space.",
      });
    }

    //check if organization is already present
    const checkOrganizationPresent = await Organization.findOne({ email });
    if (checkOrganizationPresent) {
      return res.status(400).json({
        success: false,
        message: "Organization Already Present!",
      });
    }

    // Generate OTP for email
    let emailOtp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    let emailResult = await OTP.findOne({ emailOtp });

    while (emailResult) {
      emailOtp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        specialChars: false,
        lowerCaseAlphabets: false,
      });

      emailResult = await OTP.findOne({ emailOtp });
    }

    //generate contact otp
    // let contactOtp = otpGenerator.generate(6, {
    //   upperCaseAlphabets: false,
    //   specialChars: false,
    //   lowerCaseAlphabets: false,
    // });

    // let contactResult = await OTP.findOne({ contactOtp });

    // while (contactResult) {
    //   contactOtp = otpGenerator.generate(6, {
    //     upperCaseAlphabets: false,
    //     specialChars: false,
    //     lowerCaseAlphabets: false,
    //   });

    //   contactResult = await OTP.findOne({ contactOtp });
    // }

    console.log("email", emailOtp);

    //create new OTP record
    const newOTP = await OTP.create({
      email,
      contactNumber,
      emailOtp,
      contactOtp: emailOtp, // Using the same OTP for both email and contact number
    });

    //send OTP via Email and SMS
    await sendOTPVerification({
      email: newOTP.email,
      mobile: newOTP.contactNumber,
      emailOtp: newOTP.emailOtp,
      contactOtp: newOTP.contactOtp,
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully! Check your email and contact number.",
    });
  } catch (error) {
    console.log("Error in Sending OTP");
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error in Sending OTP!",
    });
  }
};

//Admin Create Organization
export const createOrganization = async (req, res) => {
  try {
    const {
      organizationName,
      username,
      password,
      email,
      contactNumber,
      // contactOtp,
      emailOtp,
    } = req.body;

    //checking if all fileds are provided
    if (
      !organizationName ||
      !username ||
      !password ||
      !email ||
      !contactNumber ||
      // !contactOtp ||
      !emailOtp
    ) {
      return res.status(400).json({
        success: false,
        message: "All Fields are Required",
      });
    }

    //checking if Organization is Allready created
    const existingOrganization = await Organization.findOne({
      $or: [{ email }, { username }, { organizationName }],
    });
    if (existingOrganization) {
      // Check which field is causing the duplicate issue
      let errorMessage = "Organization already exists.";
      if (existingOrganization.email === email) {
        errorMessage = `Email ${email} is already registered.`;
      } else if (existingOrganization.username === username) {
        errorMessage = `Username ${username} is already taken.`;
      } else if (existingOrganization.organizationName === organizationName) {
        errorMessage = `Organization name ${organizationName} is already in use.`;
      }
      return res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }

    //Fetching the most Recent OTP
    const recentOtp = await OTP.findOne({ email }).sort({ createAt: -1 });

    if (!recentOtp) {
      return res.status(400).json({
        success: false,
        message: "OTP not Found",
      });
    }

    // console.log("Recent OTP from DB:", recentOtp.emailOtp);
    // console.log("Provided email OTP:", emailOtp);

    //validing OTPs
    if (
      // contactOtp !== recentOtp.contactOtp ||
      emailOtp !== recentOtp.emailOtp
    ) {
      return res.status(400).json({
        success: false,
        message: "Provided OTPs do not match the most recent OTPs",
      });
    }

    await OTP.deleteOne({ emailOtp: emailOtp });

    //organization Created by Admin
    const newOrganization = await Organization.create({
      username,
      organizationName,
      email,
      contactNumber, // Add contactNumber and email while creating organization
    });

    //hash the password
    const saltRounds = 10; // Number of salt rounds for bcrypt
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // console.log(
    //   "employee id",
    //   `${organizationName.substring(0, 4).toUpperCase()}_OWN`
    // );
    // // Creating new user for organization
    // const newUser = await Users.create({
    //   username,
    //   email,
    //   contactNumber,
    //   organizationName,
    //   roleInRTMS: "owner",
    //   employeeID: `${organizationName.substring(0, 4).toUpperCase()}_OWN`,
    //   password: hashedPassword,
    //   isApprovedByManager: true,
    //   isApprovedByOwner: true,
    // });

    console.log(
      "employee id",
      `${organizationName.trim().substring(0, 4).toUpperCase()}_OWN`
    );

    // Creating new user for organization
    const newUser = await Users.create({
      username,
      email,
      contactNumber,
      organizationName: organizationName.trim(), // Always trim user inputs
      roleInRTMS: "owner",
      employeeID: `${organizationName
        .trim()
        .substring(0, 3)
        .toUpperCase()}_OWN`,
      password: hashedPassword,
      isApprovedByManager: true,
      isApprovedByOwner: true,
    });

    //send Notification to Owner to created organization
    await sendNewCreateOrganization(
      newOrganization.username,
      newOrganization.organizationName,
      newUser.contactNumber,
      newUser.email,
      newUser.password
      // newUser
    );

    res.status(201).json({
      success: true,
      message: "Organization Created successfully.",
      data: {
        _id: newOrganization._id,
        username: newOrganization.username,
        email: newOrganization.email,
        contactNumber: newOrganization.contactNumber,
        organizationName: newOrganization.organizationName,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Duplicate key error. Please check email or organization name.",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to register user",
    });
  }
};

//Organization Dropdown
export const organizationDropDown = async (req, res) => {
  try {
    // Fetch only the 'organizationName' field
    const organizationName = await Organization.find().select(
      "organizationName"
    );

    res.status(200).json({
      success: true,
      message: "All Organization Name Fetch Successfully",
      data: organizationName,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error Fetching Organization Name",
    });
  }
};

//Department Dropdown on the base of orgnaziation name (also get department api)
export const departmentBaseOrgNameDropdown = async (req, res) => {
  try {
    const { organizationName } = req.body;
    const departmentdropdown = await Organization.find({
      organizationName,
    }).select("departments");

    res.status(200).json({
      success: true,
      message:
        "All Department Name Fetch Successfully on the base of Organization",
      data: departmentdropdown,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error Fetching Department Name",
    });
  }
};

export const getApprovalList = (req, res) => {
  res.json({ success: true, data: APPROVAL_LIST });
};
