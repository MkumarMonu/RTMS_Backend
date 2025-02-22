// services/wellService.js
import Well from "../Models/wellMasterModel.js";
import Organization from "../Models/organizationsModel.js";
import { findCaseInsensitive,validateWellConfiguration,findWellDetails,convertToBinary,validateCoordinates,validateFlowingCondition,validateNotFlowingCondition,mapWellLocations,mapWellParameters } from "../Helpers/response.js";


export const findOrganizationByName = async (organizationName) => {
  return await Organization.findOne({ organizationName }).select("_id");
};

export const findWellByLocation = async (location, organizationId) => {
  return await Well.findOne({
    location: new RegExp(`^${location.trim()}$`, "i"),
    organization: organizationId,
  });
};

export const addNewWell = async (location, organizationId) => {
  const newWell = new Well({ location, organization: organizationId });
  return await newWell.save();
};


// services/wellService.js
export const getInstallationsByLocationService = async (location, organizationName) => {
  const organization = await Organization.findOne({ organizationName }).select("_id");
  if (!organization) {
    throw new Error("Organization not found");
  }

  const well = await Well.findOne({
    location: new RegExp(`^${location.trim()}$`, "i"),
    organization: organization._id,
  }).select("installations");

  if (!well) {
    throw new Error("No well found for the provided location and organization.");
  }

  return well.installations;
};

//validatesavewelltyeinputs
export const validateSaveWellTypeInputs = ({
  location,
  installation,
  wellType,
  wellNumber,
  organizationName,
}) => {
  const errors = [];
  const predefinedWellTypes = ["self-flowing", "pugger-well"];

  if (!location || typeof location !== "string" || !location.trim()) {
    errors.push("Location is required");
  }
  if (!installation || typeof installation !== "string" || !installation.trim()) {
    errors.push("Installation is required");
  }
  if (!wellType || typeof wellType !== "string" || !wellType.trim()) {
    errors.push("Well type is required");
  } else if (!predefinedWellTypes.includes(wellType.toLowerCase())) {
    errors.push(`Invalid well type. Allowed values: ${predefinedWellTypes.join(", ")}`);
  }
  if (!wellNumber || isNaN(Number(wellNumber))) {
    errors.push("Well number must be a valid number");
  }
  if (!organizationName || typeof organizationName !== "string" || !organizationName.trim()) {
    errors.push("Organization name is required");
  }

  return errors;
};

export const findOrganizationAndWell = async ({ location, organizationName }) => {
  const organization = await Organization.findOne({
    organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
  });

  if (!organization) {
    throw new Error(`Organization "${organizationName}" not found`);
  }

  const well = await Well.findOne({
    location: new RegExp(`^${location.trim()}$`, "i"),
    organization: organization._id,
  });

  if (!well) {
    throw new Error(`Well not found for location "${location}" in organization "${organizationName}"`);
  }

  return { organization, well };
};

export const checkInstallationAndWellType = ({
  well,
  installation,
  wellType,
  wellNumber,
}) => {
  const result = {
    installationIndex: -1,
    wellTypeIndex: -1,
    wellNumberExists: false,
    errorMessage: null,
  };

  // Find installation
  result.installationIndex = well.installations?.findIndex(
    (inst) => inst.name?.toLowerCase() === installation.toLowerCase()
  );

  if (result.installationIndex === -1) {
    result.errorMessage = `Installation "${installation}" not found`;
    return result;
  }

  // Find well type
  result.wellTypeIndex = well.installations[result.installationIndex]?.wellTypes?.findIndex(
    (type) => type.wellType?.toLowerCase() === wellType.toLowerCase()
  );

  // Check if the well number exists
  if (
    result.wellTypeIndex !== -1 &&
    well.installations[result.installationIndex].wellTypes[result.wellTypeIndex].wells?.some(
      (w) => w.wellNumber === Number(wellNumber)
    )
  ) {
    result.errorMessage = `Well number "${wellNumber}" already exists for well type "${wellType}"`;
    result.wellNumberExists = true;
  }

  return result;
};

//api for getwelldetailsservice
export const getWellDetailsService = async ({
  location,
  installation,
  wellType,
  wellNumber,
  organizationName,
}) => {
  try {
    // Find organization
    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
    });

    if (!organization) {
      return {
        success: false,
        status: 404,
        message: `Organization "${organizationName}" not found.`,
      };
    }

    // Find well by location and organization
    const well = await Well.findOne({
      location: new RegExp(`^${location.trim()}$`, "i"),
      organization: organization._id,
    });

    if (!well) {
      return {
        success: false,
        status: 404,
        message: `Well not found for location "${location}" in the organization.`,
      };
    }

    // Find installation
    const installationObj = findCaseInsensitive(
      well.installations,
      "name",
      installation
    );

    if (!installationObj) {
      return {
        success: false,
        status: 404,
        message: `Installation "${installation}" not found.`,
        availableInstallations: well.installations.map((inst) => inst.name),
      };
    }

    // Find well type
    const wellTypeObj = findCaseInsensitive(
      installationObj.wellTypes,
      "wellType",
      wellType
    );

    if (!wellTypeObj) {
      return {
        success: false,
        status: 404,
        message: `Well type "${wellType}" not found.`,
        availableWellTypes: installationObj.wellTypes.map(
          (type) => type.wellType
        ),
      };
    }

    // Find well details
    const wellDetails = findCaseInsensitive(
      wellTypeObj.wells,
      "wellNumber",
      wellNumber
    );

    if (!wellDetails) {
      return {
        success: false,
        status: 404,
        message: `Well number "${wellNumber}" not found.`,
        availableWellNumbers: wellTypeObj.wells.map((well) => well.wellNumber),
      };
    }

    // Success response
    return {
      success: true,
      status: 200,
      message: "Well details fetched successfully.",
      data: {
        location: well.location,
        installation: installationObj.name,
        wellType: wellTypeObj.wellType,
        wellNumber: wellDetails.wellNumber,
        landmark: wellDetails.landmark,
        geolocation: wellDetails.geolocation,
        flowing: wellDetails.flowing,
        notFlowing: wellDetails.notFlowing,
        // Add more fields if required
      },
    };
  } catch (error) {
    console.error("Error in getWellDetailsService:", error);
    throw error; // Pass the error to the Controller
  }
};

//api for savewellconfigurationservice
export const saveWellConfigurationService = async (query, body) => {
  const {
    location,
    installation,
    wellType,
    wellNumber,
    organizationName,
  } = query;

  // Validate required query parameters
  if (!location || !installation || !wellType || !wellNumber || !organizationName) {
    throw { status: 400, message: "All query parameters are required." };
  }

  const organization = await Organization.findOne({
    organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
  });

  if (!organization) {
    throw { status: 404, message: "Organization not found." };
  }

  // Find the well document
  const well = await Well.findOne({
    location: new RegExp(`^${location.trim()}$`, "i"),
    organization: organization._id,
  });

  if (!well) {
    throw { status: 404, message: "Well not found." };
  }

  // Find installation, well type, and well indices
  const installationObj = well.installations.find(
    (inst) => inst.name.toLowerCase() === installation.toLowerCase()
  );
  if (!installationObj) {
    throw { status: 404, message: "Installation not found." };
  }

  const wellTypeObj = installationObj.wellTypes.find(
    (type) => type.wellType.toLowerCase() === wellType.toLowerCase()
  );
  if (!wellTypeObj) {
    throw { status: 404, message: "Well type not found." };
  }

  const wellObj = wellTypeObj.wells.find(
    (singleWell) => singleWell.wellNumber === wellNumber
  );
  if (!wellObj) {
    throw { status: 404, message: "Well number not found." };
  }

  // Validate and format the body parameters
  const { parameterData, errors } = validateWellConfiguration(body);

  if (errors.length > 0) {
    throw { status: 400, message: "Validation failed", errors };
  }

  // Check if the `process` already exists
  const isProcessExists = wellObj.wellParameter.some(
    (param) => param.ports.trim() === parameterData.ports
  );
  if (isProcessExists) {
    throw {
      status: 409,
      message: `Port number ${parameterData.ports} has already been chosen.`,
    };
  }

  // Add the new configuration
  wellObj.wellParameter.push(parameterData);

  // Save updated data to the database
  await well.save();

  return { wellNumber: wellObj.wellNumber, parameterData };
};

//api for getwellconfigservice
export const getWellConfigService = async ({
  location,
  installation,
  wellType,
  wellNumber,
  organizationName,
}) => {
  try {
    // Check if the organization exists
    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
    });

    if (!organization) {
      return { success: false, status: 404, message: "Organization not found." };
    }

    // Check if the well exists
    const well = await Well.findOne({
      location: new RegExp(`^${location.trim()}$`, "i"),
      organization: organization._id,
    });

    if (!well) {
      return { success: false, status: 404, message: "Well not found." };
    }

    // Use the helper to find the installation, well type, and well number
    const { installationIndex, wellTypeIndex, wellIndex, message } =
      findWellDetails(well, installation, wellType, wellNumber);

    if (message) {
      return { success: false, status: 404, message };
    }

    // Retrieve well parameters
    const wells = well.installations[installationIndex].wellTypes[wellTypeIndex].wells;
    const selectedWell = wells[wellIndex];

    if (selectedWell.wellParameter.length > 0) {
      return { success: true, parameter: selectedWell.wellParameter };
    } else {
      return { success: false, status: 404, message: "Parameter is empty." };
    }
  } catch (error) {
    throw new Error(error.message);
  }
};


//api for getavailablenodeid
export const getAvailableNodeIdsService = async () => {
  try {
    // Fetch all wells with their installations and well types
    const completeWells = await Well.find();

    // Flatten the nested structure to get all wells
    const allWells = completeWells.flatMap((location) =>
      location.installations.flatMap((installation) =>
        installation.wellTypes.flatMap((wellType) =>
          wellType.wells.map((well) => well)
        )
      )
    );

    // Get all used node IDs
    const allUsedNodeIds = allWells.map((well) => well.nodeId);

    // Generate all possible node IDs (0 to 1023)
    const allNodeIds = Array.from({ length: 1024 }, (_, index) => index);

    // Find available node IDs (those not in use)
    const availableNodeIds = allNodeIds.filter(
      (nodeId) => !allUsedNodeIds.includes(nodeId)
    );

    // Prepare response with available node IDs and their binary representations
    const availableNodes = availableNodeIds.map((nodeId) => ({
      decimalNodeId: nodeId,
      binaryNodeId: convertToBinary(nodeId),
    }));

    return { success: true, availableNodes };
  } catch (error) {
    console.error("Error in getAvailableNodeIdsService:", error);
    return { success: false, message: error.message };
  }
};

//api for savewelldeatilsservice
export const saveWellDetailsService = async (
  location,
  installation,
  wellType,
  wellNumber,
  organizationName,
  landmark,
  latitude,
  longitude,
  nodeId,
  dip
) => {
  try {
    // Validate required query parameters
    if (!location || !installation || !wellType || !wellNumber || !organizationName) {
      return { success: false, message: "All query parameters are required." };
    }

    if (!landmark || !latitude || !longitude || !nodeId || !dip) {
      return { success: false, message: "All required fields are required." };
    }

    // Validate nodeId and dip
    if (isNaN(Number(nodeId))) {
      return { success: false, message: "nodeId must be a number." };
    }

    if (!dip || dip === "undefined") {
      return { success: false, message: "DIP is required and must be a string." };
    }

    // Validate coordinates
    const { isValidLatitude, isValidLongitude } = validateCoordinates(latitude, longitude);
    if (!isValidLatitude || !isValidLongitude) {
      return { success: false, message: "Invalid coordinates." };
    }

    // Fetch organization
    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
    });

    if (!organization) {
      return { success: false, message: "Organization not found." };
    }

    // Find the well document
    const well = await Well.findOne({
      location: new RegExp(`^${location.trim()}$`, "i"),
      organization: organization._id,
    });

    if (!well) {
      return { success: false, message: "Well not found." };
    }

    // Find installation, wellType, and well
    const installationIndex = well.installations.findIndex(
      (inst) => inst.name.toLowerCase() === installation.toLowerCase()
    );
    if (installationIndex === -1) return { success: false, message: "Installation not found." };

    const wellTypeIndex = well.installations[installationIndex].wellTypes.findIndex(
      (type) => type.wellType.toLowerCase() === wellType.toLowerCase()
    );
    if (wellTypeIndex === -1) return { success: false, message: "Well type not found." };

    const wellIndex = well.installations[installationIndex].wellTypes[wellTypeIndex].wells.findIndex(
      (w) => w.wellNumber === wellNumber
    );
    if (wellIndex === -1) return { success: false, message: "Well number not found." };

    // Update well details
    const wells =
      well.installations[installationIndex].wellTypes[wellTypeIndex].wells;
    const updatedWell = wells[wellIndex];

    updatedWell.landmark = landmark || updatedWell.landmark;
    updatedWell.latitude = latitude || updatedWell.latitude;
    updatedWell.longitude = longitude || updatedWell.longitude;
    updatedWell.nodeId = nodeId || updatedWell.nodeId;
    updatedWell.dip = dip || updatedWell.dip;

    well.markModified(`installations.${installationIndex}.wellTypes.${wellTypeIndex}.wells`);

    // Save the updated well details
    await well.save();
    return { success: true, data: updatedWell };
  } catch (error) {
    console.error("Error in saveWellDetailsService:", error);
    return { success: false, message: error.message };
  }
};

export const saveFlowingConditionService = async (
  location,
  installation,
  wellType,
  wellNumber,
  organizationName,
  flowing
) => {
  try {
    // Validate required query parameters
    if (!location || !installation || !wellType || !wellNumber || !organizationName) {
      return { success: false, message: "All query parameters are required." };
    }

    if (!flowing || !flowing.pressures) {
      return { success: false, message: "Flowing condition is required with pressures." };
    }

    // Validate flowing pressures
    const { isValid, message } = validateFlowingCondition(flowing);
    if (!isValid) {
      return { success: false, message };
    }

    // Fetch organization
    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
    });

    if (!organization) {
      return { success: false, message: "Organization not found." };
    }

    // Find the well document
    const well = await Well.findOne({
      location: new RegExp(`^${location.trim()}$`, "i"),
      organization: organization._id,
    });

    if (!well) {
      return { success: false, message: "Well not found." };
    }

    // Find installation, wellType, and well
    const installationIndex = well.installations.findIndex(
      (inst) => inst.name.toLowerCase() === installation.toLowerCase()
    );
    if (installationIndex === -1) return { success: false, message: "Installation not found." };

    const wellTypeIndex = well.installations[installationIndex].wellTypes.findIndex(
      (type) => type.wellType.toLowerCase() === wellType.toLowerCase()
    );
    if (wellTypeIndex === -1) return { success: false, message: "Well type not found." };

    const wellIndex = well.installations[installationIndex].wellTypes[wellTypeIndex].wells.findIndex(
      (w) => w.wellNumber === wellNumber
    );
    if (wellIndex === -1) return { success: false, message: "Well number not found." };

    // Update flowing condition
    const wells =
      well.installations[installationIndex].wellTypes[wellTypeIndex].wells;
    wells[wellIndex].flowing = { pressures: flowing.pressures };

    well.markModified(`installations.${installationIndex}.wellTypes.${wellTypeIndex}.wells`);

    // Save the updated well details
    await well.save();
    return { success: true, data: wells[wellIndex] };
  } catch (error) {
    console.error("Error in saveFlowingConditionService:", error);
    return { success: false, message: error.message };
  }
};


export const saveNotFlowingConditionService = async (
  location,
  installation,
  wellType,
  wellNumber,
  organizationName,
  notFlowing
) => {
  try {
    // Validate required query parameters
    if (!location || !installation || !wellType || !wellNumber || !organizationName) {
      return { success: false, message: "All query parameters are required." };
    }

    if (!notFlowing || !notFlowing.pressures) {
      return { success: false, message: "Not flowing condition is required with pressures." };
    }

    // Validate not flowing pressures
    const { isValid, message } = validateNotFlowingCondition(notFlowing);
    if (!isValid) {
      return { success: false, message };
    }

    // Fetch organization
    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
    });

    if (!organization) {
      return { success: false, message: "Organization not found." };
    }

    // Find the well document
    const well = await Well.findOne({
      location: new RegExp(`^${location.trim()}$`, "i"),
      organization: organization._id,
    });

    if (!well) {
      return { success: false, message: "Well not found." };
    }

    // Find installation, wellType, and well
    const installationIndex = well.installations.findIndex(
      (inst) => inst.name.toLowerCase() === installation.toLowerCase()
    );
    if (installationIndex === -1) return { success: false, message: "Installation not found." };

    const wellTypeIndex = well.installations[installationIndex].wellTypes.findIndex(
      (type) => type.wellType.toLowerCase() === wellType.toLowerCase()
    );
    if (wellTypeIndex === -1) return { success: false, message: "Well type not found." };

    const wellIndex = well.installations[installationIndex].wellTypes[wellTypeIndex].wells.findIndex(
      (w) => w.wellNumber === wellNumber
    );
    if (wellIndex === -1) return { success: false, message: "Well number not found." };

    // Update not flowing condition
    const wells =
      well.installations[installationIndex].wellTypes[wellTypeIndex].wells;
    wells[wellIndex].notFlowing = { pressures: notFlowing.pressures };

    well.markModified(`installations.${installationIndex}.wellTypes.${wellTypeIndex}.wells`);

    // Save the updated well details
    await well.save();
    return { success: true, data: wells[wellIndex] };
  } catch (error) {
    console.error("Error in saveNotFlowingConditionService:", error);
    return { success: false, message: error.message };
  }
};


export const getWellLocationsService = async (organizationName, wellNumber) => {
  try {
    if (!organizationName) {
      return { success: false, message: "Organization name is required", statusCode: 400 };
    }

    // Find the organization
    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
    });

    if (!organization) {
      return { success: false, message: "Organization not found", statusCode: 404 };
    }

    // Find all wells for the organization
    const wells = await Well.find({ organization: organization._id });

    // Map the well locations using helper
    const wellLocationMap = mapWellLocations(wells);

    // If wellNumber is provided, return specific well location
    if (wellNumber) {
      const specificWell = wellLocationMap.get(wellNumber);
      if (!specificWell) {
        return {
          success: false,
          message: `Well number ${wellNumber} not found or has no coordinates`,
          statusCode: 404,
        };
      }
      return {
        success: true,
        data: {
          organizationName: organization.organizationName,
          well: specificWell,
        },
      };
    }

    // Convert map to array for all wells response
    const wellLocations = Array.from(wellLocationMap.values());

    if (wellLocations.length === 0) {
      return {
        success: false,
        message: "No wells with coordinates found for this organization",
        statusCode: 404,
      };
    }

    return {
      success: true,
      data: {
        organizationName: organization.organizationName,
        totalWells: wellLocations.length,
        wells: wellLocations,
      },
    };
  } catch (error) {
    console.error("Error in getWellLocationsService:", error);
    return { success: false, message: error.message, statusCode: 500 };
  }
};

//api for getwellparameterservice
export const getWellParameterService = async (wellParameter, organizationName) => {
  try {
    if (!wellParameter) {
      return { success: false, message: "No well parameter provided", statusCode: 400 };
    }

    if (!organizationName) {
      return { success: false, message: "No organization name provided", statusCode: 400 };
    }

    // Find the organization
    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
    });

    if (!organization) {
      return { success: false, message: "Organization not found", statusCode: 404 };
    }

    // Fetch all wells for the organization and apply mapping to get well parameters
    const completeWells = await Well.find();

    const matchedWells = mapWellParameters(completeWells, wellParameter);

    if (matchedWells.length === 0) {
      return {
        success: false,
        message: "No well found for the provided parameter",
        statusCode: 404,
      };
    }

    return {
      success: true,
      data: matchedWells,
    };
  } catch (error) {
    console.error("Error in getWellParameterService:", error);
    return { success: false, message: error.message, statusCode: 500 };
  }
};


export const updateNotFlowingConditionService = async (
  location,
  installation,
  wellType,
  wellNumber,
  organizationName,
  notFlowing
) => {
  try {
    // Validate required parameters
    if (!location || !installation || !wellType || !wellNumber || !organizationName) {
      return { success: false, message: "All query parameters are required", statusCode: 400 };
    }

    if (!notFlowing) {
      return { success: false, message: "Not Flowing condition is required in the request body", statusCode: 400 };
    }

    // Find the organization
    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
    });

    if (!organization) {
      return { success: false, message: "Organization not found", statusCode: 404 };
    }

    // Find the well document
    const well = await Well.findOne({
      location: new RegExp(`^${location.trim()}$`, "i"),
      organization: organization._id,
    });

    if (!well) {
      return { success: false, message: "Well not found", statusCode: 404 };
    }

    // Find the installation
    const installationIndex = well.installations.findIndex(
      (inst) => inst.name.toLowerCase() === installation.toLowerCase()
    );

    if (installationIndex === -1) {
      return { success: false, message: "Installation not found", statusCode: 404 };
    }

    // Find the well type
    const wellTypeIndex = well.installations[installationIndex].wellTypes.findIndex(
      (type) => type.wellType.toLowerCase() === wellType.toLowerCase()
    );

    if (wellTypeIndex === -1) {
      return { success: false, message: "Well type not found", statusCode: 404 };
    }

    // Find the specific well
    const wellIndex = well.installations[installationIndex].wellTypes[wellTypeIndex].wells.findIndex(
      (w) => w.wellNumber === wellNumber
    );

    if (wellIndex === -1) {
      return { success: false, message: "Well number not found", statusCode: 404 };
    }

    // Update the "notFlowing" condition
    well.installations[installationIndex].wellTypes[wellTypeIndex].wells[wellIndex].notFlowing = {
      pressures: notFlowing.pressures,
    };

    await well.save();

    return {
      success: true,
      message: "Not Flowing Condition Updated Successfully!",
      data: well.installations[installationIndex].wellTypes[wellTypeIndex].wells[wellIndex],
    };
  } catch (error) {
    console.error("Error in updateNotFlowingConditionService:", error);
    return { success: false, message: error.message, statusCode: 500 };
  }
};

//api for updateflowingconditionservice 
export const updateFlowingConditionService = async (
  location,
  installation,
  wellType,
  wellNumber,
  organizationName,
  flowing
) => {
  try {
    // Validate required parameters
    if (!location || !installation || !wellType || !wellNumber || !organizationName) {
      return { success: false, message: "All query parameters are required", statusCode: 400 };
    }

    if (!flowing) {
      return { success: false, message: "Flowing condition is required in the request body", statusCode: 400 };
    }

    // Find the organization
    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
    });

    if (!organization) {
      return { success: false, message: "Organization not found", statusCode: 404 };
    }

    // Find the well document
    const well = await Well.findOne({
      location: new RegExp(`^${location.trim()}$`, "i"),
      organization: organization._id,
    });

    if (!well) {
      return { success: false, message: "Well not found", statusCode: 404 };
    }

    // Find the installation index
    const installationIndex = well.installations.findIndex(
      (inst) => inst.name.toLowerCase() === installation.toLowerCase()
    );

    if (installationIndex === -1) {
      return { success: false, message: "Installation not found", statusCode: 404 };
    }

    // Find the well type index
    const wellTypeIndex = well.installations[installationIndex].wellTypes.findIndex(
      (type) => type.wellType.toLowerCase() === wellType.toLowerCase()
    );

    if (wellTypeIndex === -1) {
      return { success: false, message: "Well type not found", statusCode: 404 };
    }

    // Find the specific well index
    const wellIndex = well.installations[installationIndex].wellTypes[wellTypeIndex].wells.findIndex(
      (w) => w.wellNumber === wellNumber
    );

    if (wellIndex === -1) {
      return { success: false, message: "Well number not found", statusCode: 404 };
    }

    // Update the "flowing" condition
    well.installations[installationIndex].wellTypes[wellTypeIndex].wells[wellIndex].flowing = {
      pressures: flowing.pressures,
    };

    await well.save();

    return {
      success: true,
      message: "Flowing Condition Updated Successfully!",
      data: well.installations[installationIndex].wellTypes[wellTypeIndex].wells[wellIndex],
    };
  } catch (error) {
    console.error("Error in updateFlowingConditionService:", error);
    return { success: false, message: error.message, statusCode: 500 };
  }
};


export const updateWellConfigurationService = async ({ location, installation, wellType, wellNumber, organizationName, wellDetails }) => {
  try {
    // Find the organization
    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationName.trim()}$`, 'i')
    });

    if (!organization) {
      return { status: 404, message: { success: false, message: 'Organization not found.' } };
    }

    // Find the well
    const well = await Well.findOne({
      location: new RegExp(`^${location.trim()}$`, 'i'),
      organization: organization._id
    });

    if (!well) {
      return { status: 404, message: { success: false, message: 'Well not found.' } };
    }

    // Find installation index
    const installationIndex = well.installations.findIndex(inst => inst.name.toLowerCase() === installation.toLowerCase());

    if (installationIndex === -1) {
      return { status: 404, message: { success: false, message: 'Installation not found.' } };
    }

    // Find well type index
    const wellTypeIndex = well.installations[installationIndex].wellTypes.findIndex(type => type.wellType.toLowerCase() === wellType.toLowerCase());

    if (wellTypeIndex === -1) {
      return { status: 404, message: { success: false, message: 'Well type not found.' } };
    }

    // Find well index
    const wellIndex = well.installations[installationIndex].wellTypes[wellTypeIndex].wells.findIndex(w => w.wellNumber === wellNumber);

    if (wellIndex === -1) {
      return { status: 404, message: { success: false, message: 'Well number not found.' } };
    }

    const parameterData = { ...wellDetails }; // Assuming the validation for wellDetails is done in controller

    const wells = well.installations[installationIndex].wellTypes[wellTypeIndex].wells;

    let isUpdated = false; // Flag to check if the process is already updated

    wells.forEach(singleWell => {
      if (singleWell.wellNumber === wellNumber) {
        // Check if `processValue` already exists in `wellParameter`
        const isProcessExists = singleWell.wellParameter.some(parameter => parameter.ports.trim() === parameterData.ports);

        if (isProcessExists) {
          isUpdated = true;
          return; // Stop further execution for this well
        }

        // If not, add the new parameter
        singleWell.wellParameter.push(parameterData);
      }
    });

    if (isUpdated) {
      return { status: 404, message: { success: false, message: `Port no ${parameterData.ports} has already been chosen` } };
    }

    // Save the updated well document
    await well.save();

    return { status: 200, message: { success: true, message: 'Updated the well details' } };
  } catch (error) {
    throw new Error(error.message);
  }
};
