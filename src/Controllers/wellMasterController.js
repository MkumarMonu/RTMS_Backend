import Well from "../Models/wellMasterModel.js";
import {
  findOrganizationByName, findWellByLocation, addNewWell, getInstallationsByLocationService, validateSaveWellTypeInputs,
  findOrganizationAndWell,
  checkInstallationAndWellType, getWellDetailsService, saveWellConfigurationService, getWellConfigService, getAvailableNodeIdsService, saveWellDetailsService, saveFlowingConditionService, saveNotFlowingConditionService, getWellLocationsService, getWellParameterService, updateNotFlowingConditionService, updateFlowingConditionService, updateWellConfigurationService
} from "../Services/wellService.js";

import { sendResponse, handleError, validateWellConfigurationInput } from "../Helpers/response.js";
import Organization from "../Models/organizationsModel.js";

export const addLocation = async (req, res) => {
  try {
    const { location, organizationName } = req.body;

    // Validate inputs
    if (!location || !organizationName) {
      return sendResponse(res, false, "Location and organization name are required.", null, 400);
    }

    // Fetch organization
    const organization = await findOrganizationByName(organizationName);
    if (!organization) {
      return sendResponse(res, false, "Organization not found.", null, 404);
    }

    // Check for existing well
    const existingWell = await findWellByLocation(location, organization._id);
    if (existingWell) {
      return sendResponse(res, false, "Location already exists for this organization.", null, 400);
    }

    // Add new well
    const newWell = await addNewWell(location, organization._id);
    return sendResponse(res, true, "Well location added successfully.", newWell, 201);

  } catch (error) {
    return handleError(res, error, "Failed to add location.");
  }
};

export const getLocations = async (req, res) => {
  try {
    const { organizationName } = req.query;

    // Validate inputs
    if (!organizationName) {
      return sendResponse(res, false, "Organization name is required.", null, 400);
    }

    // Fetch organization
    const organization = await findOrganizationByName(organizationName);
    if (!organization) {
      return sendResponse(res, false, "Organization not found.", null, 404);
    }

    // Fetch wells
    const wells = await Well.find({ organization: organization._id }).select("location -_id");
    const locations = wells.map((well) => well.location);

    return sendResponse(res, true, "Well locations fetched successfully.", locations);
  } catch (error) {
    return handleError(res, error, "Failed to fetch well locations.");
  }
};

export const addInstallationToLocation = async (req, res) => {
  try {
    const { location, installation, organizationName } = req.body;

    if (!location || !installation || !organizationName) {
      return sendResponse(
        res,
        false,
        "Location, installation, and organization name are required.",
        null,
        400
      );
    }

    const organization = await findOrganizationByName(organizationName);
    if (!organization) {
      return sendResponse(res, false, "Organization not found.", null, 404);
    }

    const well = await findWellByLocation(location, organization._id);
    if (!well) {
      return sendResponse(res, false, "Well not found for the provided location and organization.", null, 404);
    }

    const existingInstallation = well.installations.find(
      (inst) => inst.name.toLowerCase() === installation.toLowerCase()
    );
    if (existingInstallation) {
      return sendResponse(res, false, "This installation already exists for the selected location.", null, 400);
    }

    well.installations.push({ name: installation });
    await well.save();

    return sendResponse(res, true, "Installation added successfully.", well);
  } catch (error) {
    return handleError(res, error, "Failed to add installation.");
  }
};

//api for getinstallationsbylocation 
export const getInstallationsByLocation = async (req, res) => {
  try {
    const { location, organizationName } = req.query;

    // Validate inputs
    if (!location || !organizationName) {
      return sendResponse(res, false, "Location and organization name are required.", null, 400);
    }

    // Fetch installations using service
    const installations = await getInstallationsByLocationService(location, organizationName);

    return sendResponse(res, true, "Installations fetched successfully.", installations, 200);
  } catch (error) {
    console.error("Error fetching installations by location:", error);
    res.status(500).json({
      message: "An error occurred while fetching installations.",
      error: error.message,
    });
  }
};

export const saveWellTypeForInstallation = async (req, res) => {
  try {
    const { location, installation, wellType, wellNumber, organizationName } =
      req.body;

    // Validate request inputs
    const validationErrors = validateSaveWellTypeInputs({
      location,
      installation,
      wellType,
      wellNumber,
      organizationName,
    });

    if (validationErrors.length > 0) {
      return sendResponse(res, false, "Validation failed", validationErrors, 400);
    }

    // Validate well type against predefined options
    const predefinedWellTypes = ["self-flowing", "pugger-well"];
    if (!predefinedWellTypes.includes(wellTypeValue.toLowerCase())) {
      return res.status(400).json({
        message: "Invalid wellType",
        allowedTypes: predefinedWellTypes,
      });
    }

    // Find organization with error handling
    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationValue}$`, "i"),
    });

    if (!organization) {
      return res.status(404).json({
        message: `Organization "${organizationValue}" not found`,
      });
    }

    // Find well with error handling
    const well = await Well.findOne({
      location: new RegExp(`^${locationValue}$`, "i"),
      organization: organization._id,
    });

    if (!well) {
      return res.status(404).json({
        message: `Well not found for location "${locationValue}" in organization "${organizationValue}"`,
      });
    }

    // Find installation with null check
    const installationIndex = well.installations?.findIndex(
      (inst) => inst?.name?.toLowerCase() === installationValue.toLowerCase()
    );

    if (installationIndex === -1) {
      return res.status(404).json({
        message: `Installation "${installationValue}" not found in well "${locationValue}"`,
      });
    }

    // Find well type with null check
    let wellTypeIndex = well.installations[
      installationIndex
    ]?.wellTypes?.findIndex(
      (type) => type?.wellType?.toLowerCase() === wellTypeValue.toLowerCase()
    );

    if (
      well.installations[installationIndex].wellTypes &&
      well.installations[installationIndex].wellTypes.length > 0
    ) {
      // Check all wellTypes in the installation
      let wellNumberExists = false;

      for (
        let i = 0;
        i < well.installations[installationIndex].wellTypes.length;
        i++
      ) {
        const wellType = well.installations[installationIndex].wellTypes[i];

        // Check if wellType has wells and if the wellNumber already exists in the wells array
        const wellNumberInThisWellType = wellType.wells.find(
          (inst) => inst.wellNumber === wellNumber
        );

        if (wellNumberInThisWellType) {
          wellNumberExists = true;
          break; // Exit the loop if the wellNumber is found
        }
      }

      if (wellNumberExists) {
        return res.status(404).json({
          success: false,
          message: `${wellNumber} is already installed or configured`,
        });
      }
    }

    const newWellSettings = {
      wellNumber: Number(wellNumber),
      landmark: "",
      latitude: null,
      longitude: null,
      dip: null,
      wellParameters: {
        process: "",
        ports: "",
        displayName: "",
        description: "",
        unit: "",
        sensorOutput: "",
        valueMinimum: "",
        valueMaximum: "",
        normalAlert: {
          normalalert: "",
          condition: "",
          description: "",
          deadband: "",
        },
        criticalAlert: {
          criticalalert: "",
          condition: "",
          description: "",
          deadband: "",
        },
      },
      flowing: { pressures: [] },
      notFlowing: { pressures: [] },
    };

    // Add new well type or append to an existing one
    if (wellTypeIndex === -1) {
      if (!well.installations[installationIndex].wellTypes) {
        well.installations[installationIndex].wellTypes = [];
      }
      well.installations[installationIndex].wellTypes.push({
        wellType,
        wells: [newWellSettings],
      });
    } else {
      well.installations[installationIndex].wellTypes[wellTypeIndex].wells.push(
        newWellSettings
      );
    }

    well.markModified("installations");
    await well.save();

    return sendResponse(
      res,
      true,
      "Well type and number saved successfully",
      well,
      200
    );
  } catch (error) {
    return handleError(res, error, "An error occurred while saving the well type");
  }
};



//get All Well Number
export const getAllWellNumbers = async (req, res) => {
  try {
    const result = await Well.aggregate([
      { $unwind: "$installations" },
      { $unwind: "$installations.wellTypes" },
      { $unwind: "$installations.wellTypes.wells" },
      {
        $group: {
          _id: null,
          wellNumbers: {
            $addToSet: "$installations.wellTypes.wells.wellNumber",
          },
        },
      },
      { $project: { _id: 0, wellNumbers: 1 } },
    ]);
    const wellNumbers = result[0]?.wellNumbers || [];
    wellNumbers.sort((a, b) => a - b);
    return res.status(200).json({
      message: "Successfully retrieved all well numbers",
      wellNumbers,
    });
  } catch (error) {
    console.error("Error retrieving well numbers:", error);
    return res.status(500).json({
      message: "An error occurred while retrieving well numbers",
      error: error.message,
    });
  }
};


//api for allinstallations 
export const allInstallations = async (req, res) => {
  try {
    const { organizationName } = req.query;

   // console.log("Organization Name:", organizationName);

    // Validate the required query parameter
    if (!organizationName || typeof organizationName !== 'string' || organizationName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Organization name is required and must be a valid string.",
      });
    }

    // Find the organization by name (case-insensitive match)
    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationName.trim()}$`, "i"), // Regex for case-insensitive matching
    });

    // If no organization is found, return a 404 error
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: `Organization "${organizationName}" not found.`,
      });
    }

    // Aggregation pipeline to fetch installations for the given organization
    const pipeline = [
      { $match: { organization: organization._id } }, // Match organization by its ID
      { $unwind: "$installations" }, // Unwind installations array
      {
        $project: {
          _id: 0, // Exclude the main document ID
          location: 1,
          "installations.name": 1,
          "installations.description": 1,
          "installations.wellTypes": 1,
        },
      },
    ];

    // Execute the aggregation pipeline
    const installations = await Well.aggregate(pipeline);

    // If no installations are found, return a 404 error
    if (!installations || installations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No installations found for the provided organization.",
      });
    }

    // Return the installations data
    res.status(200).json({
      success: true,
      message: "Installations fetched successfully.",
      data: installations,
    });
  } catch (error) {
    console.error("Error fetching installations by organization:", error);

    // Handle unexpected errors
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching installations.",
      error: error.message,
    });
  }
};



//api for getwell details
export const getWellDetails = async (req, res) => {
  try {
    const { location, installation, wellType, wellNumber, organizationName } =
      req.query;

    // Validate required query parameters
    if (
      !location ||
      !installation ||
      !wellType ||
      !wellNumber ||
      !organizationName
    ) {
      return res.status(400).json({
        success: false,
        message: "All query parameters are required.",
        required: [
          "location",
          "installation",
          "wellType",
          "wellNumber",
          "organizationName",
        ],
        received: req.query,
      });
    }

    // Delegate the logic to the Service layer
    const response = await getWellDetailsService({
      location,
      installation,
      wellType,
      wellNumber,
      organizationName,
    });

    return res.status(response.status).json(response);
  } catch (error) {
    console.error("Error in getWellDetails controller:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching well details.",
      error: error.message,
    });
  }
};

// Save Well Configuration
export const saveWellConfiguration = async (req, res) => {
  try {
    const result = await saveWellConfigurationService(req.query, req.body);
    return res.status(200).json({
      success: true,
      message: "Well configuration updated successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Error saving well configuration:", error.message);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "An internal server error occurred.",
    });
  }
};

//api for getwellconfiguration
export const getWellConfiguration = async (req, res) => {
  try {
    const { location, installation, wellType, wellNumber, organizationName } =
      req.query;

    // Validate required query parameters
    if (
      !location ||
      !installation ||
      !wellType ||
      !wellNumber ||
      !organizationName
    ) {
      return res.status(400).json({
        message: "All query parameters are required.",
      });
    }

    // Call service to fetch well configuration
    const result = await getWellConfigService({
      location,
      installation,
      wellType,
      wellNumber,
      organizationName,
    });

    if (result.success) {
      return res.status(200).json({ success: true, parameter: result.parameter });
    } else {
      return res.status(result.status).json({ success: false, message: result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//api for getwellsnodeid
export const getWellNodeId = async (req, res) => {
  try {
    // Call service to get available node IDs
    const result = await getAvailableNodeIdsService();

    if (result.success) {
      return res.status(200).json({
        success: true,
        availableNodes: result.availableNodes,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Error while fetching available node IDs",
        error: result.message,
      });
    }
  } catch (error) {
    console.error("Error in getWellNodeId:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


//api for savewelldetails 
export const saveWellDetails = async (req, res) => {
  try {
    const { location, installation, wellType, wellNumber, organizationName } =
      req.query;
    const { landmark, latitude, longitude, nodeId, dip } = req.body;

    // Validate required query parameters
    if (
      !location ||
      !installation ||
      !wellType ||
      !wellNumber ||
      !organizationName
    ) {
      return res.status(400).json({
        message: "All query parameters are required.",
      });
    }

    if (
      !landmark ||
      !latitude ||
      !longitude ||
      !nodeId ||
      !dip) {
      return res.status(400).json({
        message: "All required fields are required.",
      });
    }

    // Validate nodeId is provided and is a number
    if (!nodeId || isNaN(Number(nodeId))) {
      return res.status(400).json({
        message: "nodeId is required in the request body and must be a number.",
      });
    }

    // Validate DIP is provided and is a string
    if (!dip || dip === "undefined") {
      return res.status(400).json({
        message: "DIP is required in the request body and must be a string.",
      });
    }

    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found." });
    }

    // Find the well document
    const well = await Well.findOne({
      location: new RegExp(`^${location.trim()}$`, "i"),
      organization: organization._id,
    });

    // For Node Id Duplicate Check
    const nodeSet = new Set();
    well.installations.forEach((installation) => {
      installation.wellTypes.forEach((wellType) => {
        wellType.wells.forEach((well) => {
          nodeSet.add(String(well.nodeId))
        })
      })
    })
    if ([...nodeSet].includes(String(nodeId))) {
      res.status(400).json({ success: false, message: "Node id already exists" });
    }

    if (!well) {
      return res.status(404).json({ message: "Well not found." });
    }

    // Find installation index
    const installationIndex = well.installations.findIndex(
      (inst) => inst.name.toLowerCase() === installation.toLowerCase()
    );

    if (installationIndex === -1) {
      return res.status(404).json({ message: "Installation not found." });
    }

    // Validate well type against predefined options
    const predefinedWellTypes = ["self-flowing", "pugger-well"];
    if (!predefinedWellTypes.includes(wellType.toLowerCase())) {
      return res.status(400).json({
        message: "Invalid wellType",
        allowedTypes: predefinedWellTypes,
      });
    }

    // Find well type index
    const wellTypeIndex = well.installations[
      installationIndex
    ].wellTypes.findIndex(
      (type) => type.wellType.toLowerCase() === wellType.toLowerCase()
    );

    if (wellTypeIndex === -1) {
      return res.status(404).json({ message: "Well type not found." });
    }

    // Find specific well index
    const wellIndex = well.installations[installationIndex].wellTypes[
      wellTypeIndex
    ].wells.findIndex((w) => w.wellNumber === wellNumber);

    if (wellIndex === -1) {
      return res.status(404).json({ message: "Well number not found." });
    }

    // Validate coordinates if provided
    if (latitude && (latitude < -90 || latitude > 90)) {
      return res.status(400).json({ message: "Invalid latitude value." });
    }
    if (longitude && (longitude < -180 || longitude > 180)) {
      return res.status(400).json({ message: "Invalid longitude value." });
    }

    // Important: Get a reference to the wells array
    const wells =
      well.installations[installationIndex].wellTypes[wellTypeIndex].wells;

    // Update other fields for the specific well
    if (landmark) wells[wellIndex].landmark = landmark;
    if (latitude) wells[wellIndex].latitude = latitude;
    if (longitude) wells[wellIndex].longitude = longitude;
    if (nodeId) {
      wells[wellIndex].nodeId = nodeId;
    }
    if (dip) {
      wells[wellIndex].dip = dip;
    }
    well.markModified(
      `installations.${installationIndex}.wellTypes.${wellTypeIndex}.wells`
    );

    try {
      await well.save();
      res.status(200).json({
        message: "Well details saved successfully.",
        data: result.data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: result.message,
        errors: result.errors,
      });
    }
  } catch (error) {
    console.error("Error in saveWellDetails:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const saveFlowingCondition = async (req, res) => {
  try {
    const { location, installation, wellType, wellNumber, organizationName } = req.query;
    const { flowing } = req.body;

    // Call service to save flowing condition
    const result = await saveFlowingConditionService(
      location,
      installation,
      wellType,
      wellNumber,
      organizationName,
      flowing
    );
    console.log("object saved", flowing);

    // Validate service call result
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Failed to save flowing condition.",
        errors: result.errors || [],
      });
    }

    // Find specific indices (assuming these are retrieved correctly from the result)
    const { well, installationIndex, wellTypeIndex } = result;

    if (wellTypeIndex === -1) {
      return res.status(404).json({ message: "Well type not found." });
    }

    const wellIndex = well.installations[installationIndex].wellTypes[wellTypeIndex].wells.findIndex(
      (w) => w.wellNumber === wellNumber
    );

    if (wellIndex === -1) {
      return res.status(404).json({ message: "Well number not found." });
    }

    // Update flowing condition
    const wells = well.installations[installationIndex].wellTypes[wellTypeIndex].wells;
    if (flowing && flowing.pressures) {
      wells[wellIndex].flowing = { pressures: flowing.pressures };
    }
console.log(" before saving...",flowing)
    // Save well details
    await well.save();

    res.status(200).json({
      success: true,
      message: "Well details saved successfully.",
      data: wells[wellIndex],
    });
  } catch (error) {
    // Catch internal errors
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const saveNotFlowingCondition = async (req, res) => {
  try {
    const { location, installation, wellType, wellNumber, organizationName } = req.query;
    const { notFlowing } = req.body;

    // Call service to save not-flowing condition
    const result = await saveNotFlowingConditionService(
      location,
      installation,
      wellType,
      wellNumber,
      organizationName,
      notFlowing
    );

    // Validate service result
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Failed to save not-flowing condition.",
        errors: result.errors || [],
      });
    }

    // Extract required data from service result
    const { well, installationIndex, wellTypeIndex } = result;

    if (wellTypeIndex === -1) {
      return res.status(404).json({ message: "Well type not found." });
    }

    // Find the well index
    const wellIndex = well.installations[installationIndex].wellTypes[wellTypeIndex].wells.findIndex(
      (w) => w.wellNumber === wellNumber
    );

    if (wellIndex === -1) {
      return res.status(404).json({ message: "Well number not found." });
    }

    // Update the notFlowing condition
    const wells = well.installations[installationIndex].wellTypes[wellTypeIndex].wells;
    if (notFlowing && notFlowing.pressures) {
      wells[wellIndex].notFlowing = { pressures: notFlowing.pressures };
    }

    // Save updated well details
    await well.save();

    return res.status(200).json({
      success: true,
      message: "Well details saved successfully.",
      data: wells[wellIndex],
    });
  } catch (error) {
    // Handle internal server errors
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};




//Api for the get countallflowingconditionfororganization
export const countAllFlowingConditionsForOrganization = async (req, res) => {
  try {
    const { organizationName } = req.query;

    // Validate required query parameter
    if (!organizationName) {
      return res.status(400).json({
        message: 'The "organizationName" query parameter is required.',
      });
    }

    // Find the organization by name (case-insensitive)
    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
    });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found.",
      });
    }

    // Aggregate to count total flowing conditions for the organization
    const result = await Well.aggregate([
      {
        $match: {
          organization: organization._id,
        },
      },
      {
        $unwind: "$installations",
      },
      {
        $unwind: "$installations.wellTypes",
      },
      {
        $unwind: "$installations.wellTypes.wells",
      },
      {
        $match: {
          "installations.wellTypes.wells.flowing": { $exists: true, $ne: null },
          "installations.wellTypes.wells.flowing.pressures": {
            $exists: true,
            $not: { $size: 0 },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalFlowingConditions: {
            $sum: { $size: "$installations.wellTypes.wells.flowing.pressures" },
          },
        },
      },
    ]);

    // Check if any flowing conditions were found
    if (!result.length) {
      return res.status(404).json({
        message: `No saved flowing conditions found for organization: ${organizationName}.`,
        totalFlowingConditions: 0,
      });
    }

    // Send response with total flowing conditions
    res.status(200).json({
      success: true,
      message: "Total flowing conditions count retrieved successfully.",
      totalFlowingConditions: result[0].totalFlowingConditions,
    });
  } catch (error) {
    console.error("Error in countAllFlowingConditionsForOrganization:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while counting saved flowing conditions.",
      error: error.message,
    });
  }
};

//Api for countallnot-flowing condition
export const countAllNotFlowingConditionsForOrganization = async (req, res) => {
  try {
    const { organizationName } = req.query;

    // Validate required query parameter
    if (!organizationName) {
      return res.status(400).json({
        message: 'The "organizationName" query parameter is required.',
      });
    }

    // Find the organization by name (case-insensitive)
    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
    });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found.",
      });
    }

    // Aggregate to count total not flowing conditions for the organization
    const result = await Well.aggregate([
      {
        $match: {
          organization: organization._id,
        },
      },
      {
        $unwind: "$installations",
      },
      {
        $unwind: "$installations.wellTypes",
      },
      {
        $unwind: "$installations.wellTypes.wells",
      },
      {
        $match: {
          "installations.wellTypes.wells.notFlowing": {
            $exists: true,
            $ne: null,
          },
          "installations.wellTypes.wells.notFlowing.pressures": {
            $exists: true,
            $not: { $size: 0 },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalNotFlowingConditions: {
            $sum: {
              $size: "$installations.wellTypes.wells.notFlowing.pressures",
            },
          },
        },
      },
    ]);

    // Check if any not flowing conditions were found
    if (!result.length) {
      return res.status(404).json({
        message: `No saved not flowing conditions found for organization: ${organizationName}.`,
        totalNotFlowingConditions: 0,
      });
    }

    // Send response with total not flowing conditions
    res.status(200).json({
      success: true,
      message: "Total Non-flowing conditions count retrieved successfully",
      // organization: organizationName,
      totalNotFlowingConditions: result[0].totalNotFlowingConditions,
    });
  } catch (error) {
    console.error(
      "Error in countAllNotFlowingConditionsForOrganization:",
      error
    );
    res.status(500).json({
      success: false,
      message: "An error occurred while counting saved not flowing conditions.",
      error: error.message,
    });
  }
};




// api for get welllocation
export const getWellLocations = async (req, res) => {
  try {
    const { organizationName, wellNumber } = req.query;

    // Call the service to get well locations
    const result = await getWellLocationsService(organizationName, wellNumber);

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: result.data,
      });
    } else {
      return res.status(result.statusCode || 400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("Error in getWellLocations:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching well locations",
      error: error.message,
    });
  }
};



//Get well Parameter
export const getWellParameter = async (req, res) => {
  try {
    const { wellParameter, organizationName } = req.query;

    // Call the service to get the well parameter data
    const result = await getWellParameterService(wellParameter, organizationName);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.data,
      });
    } else {
      return res.status(result.statusCode || 400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("Error in getWellParameter:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching well parameters",
      error: error.message,
    });
  }
};
//Get well Parameter
// export const getWellParameter = async (req, res) => {
//   try {
//     const { wellParameter, organizationName } = req.query;

//     //Validate the well Parameter and Organization Name fields
//     if (!wellParameter) {
//       res.status(404).json({ message: "No well parameter" });
//     }
//     if (!organizationName) {
//       res.status(404).json({ message: "No organization name" });
//     }

//     // Fetching from db and checking whether present or not
//     const organization = await Organization.findOne({
//       organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
//     });

//     if (!organization) {
//       return res.status(404).json({ message: "Organization not found." });
//     }

//     // Fetch all wells with their installations and well types
//     const completeWells = await Well.find();

//     const allWell = completeWells.flatMap((location) =>
//       location.installations.flatMap((singleInstallation) =>
//         singleInstallation.wellTypes.flatMap((singleWellType) =>
//           singleWellType.wells
//             .filter((singleWell) =>
//               singleWell.wellParameter.some((params) => params.process === wellParameter)
//             )
//             .map((singleWell) => {
//               const matchedParameters = singleWell.wellParameter.filter(
//                 (params) => params.process === wellParameter
//               );

//               return matchedParameters.map((params) => ({
//                 wellNumber: singleWell.wellNumber,
//                 location: location.location,
//                 installation: singleInstallation.name,
//                 wellType: singleWellType.wellType,
//                 wellParameter: params,
//                 landmark: singleWell.landmark || "",
//                 coordinates: {
//                   latitude: singleWell.latitude,
//                   longitude: singleWell.longitude,
//                 },
//                 nodeId: singleWell.nodeId || "",
//                 flowing: singleWell.flowing || null,
//                 notFlowing: singleWell.notFlowing || null,
//               }));
//             })
//         )
//       )
//     ).flat();

//     if (allWell.length === 0) {
//       res.status(404).json({ success: false, message: "No Well Found for following Parameter" });
//     }
//     else {
//       res.status(200).json({ success: true, message: allWell });
//     }
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// }


//Api for UpdateNotFlowingCondition
export const updateNotFlowingCondition = async (req, res) => {
  try {
    const { location, installation, wellType, wellNumber, organizationName } = req.query;
    const { notFlowing } = req.body;

    // Call the service to update the "notFlowing" condition
    const result = await updateNotFlowingConditionService(
      location,
      installation,
      wellType,
      wellNumber,
      organizationName,
      notFlowing
    );

    // Validate service response
    if (!result.success) {
      return res.status(result.statusCode || 400).json({
        success: false,
        message: result.message || "Failed to update not-flowing condition.",
      });
    }

    // Extract relevant data from the service result
    const { well, installationIndex, wellTypeIndex, wellIndex } = result;

    if (wellIndex === -1) {
      return res.status(404).json({ success: false, message: "Well number not found." });
    }

    // Get reference to the wells array
    const wells = well.installations[installationIndex].wellTypes[wellTypeIndex].wells;

    // Update the "notFlowing" condition
    if (notFlowing && notFlowing.pressures) {
      wells[wellIndex].notFlowing = { pressures: notFlowing.pressures };
    }

    // Save the updated well details
    await well.save();

    return res.status(200).json({
      success: true,
      message: "Not Flowing condition updated successfully.",
      data: wells[wellIndex],
    });
  } catch (error) {
    console.error("Error in updateNotFlowingCondition:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating Not Flowing Condition Details.",
      error: error.message,
    });
  }
};



//Update Flowing Condition
export const updateFlowingCondition = async (req, res) => {
  try {
    const { location, installation, wellType, wellNumber, organizationName } = req.query;
    const { flowing } = req.body;

    // Call the service to update the "flowing" condition
    const result = await updateFlowingConditionService(
      location,
      installation,
      wellType,
      wellNumber,
      organizationName,
      flowing
    );

    // Validate service response
    if (!result.success) {
      return res.status(result.statusCode || 400).json({
        success: false,
        message: result.message || "Failed to update flowing condition.",
      });
    }

    // Extract relevant data from the service result
    const { well, installationIndex, wellTypeIndex, wellIndex } = result;

    if (wellIndex === -1) {
      return res.status(404).json({ success: false, message: "Well number not found." });
    }

    // Get a reference to the wells array
    const wells = well.installations[installationIndex].wellTypes[wellTypeIndex].wells;

    // Update the flowing condition
    if (flowing && flowing.pressures) {
      wells[wellIndex].flowing = { pressures: flowing.pressures };
    }

    // Save the updated well details
    await well.save();

    return res.status(200).json({
      success: true,
      message: "Flowing condition updated successfully.",
      data: wells[wellIndex],
    });
  } catch (error) {
    console.error("Error in updateFlowingCondition:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the Flowing Condition.",
      error: error.message,
    });
  }
};


//Update well Configuration
export const updateWellConfiguration = async (req, res) => {
  try {
    const { location, installation, wellType, wellNumber, organizationName } = req.query;
    const { process, ports, name, description, unit, sensorOutput, minVal, maxVal, normAlertValue, normalCondition, normalDescription, normalDeadband, criticalAlertValue, criticalCondition, criticalDescription, criticalDeadband } = req.body;

    // Validate input parameters
    const validationErrors = validateWellConfigurationInput({ process, ports, name, description, unit, sensorOutput, minVal, maxVal, normAlertValue, normalCondition, normalDescription, normalDeadband, criticalAlertValue, criticalCondition, criticalDescription, criticalDeadband });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    const result = await updateWellConfigurationService({ location, installation, wellType, wellNumber, organizationName, wellDetails: req.body });

    return res.status(result.status).json(result.message);
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

export const deleteFlowingCondition = async (req, res) => {
  try {
    const { location, installation, wellType, wellNumber, organizationName } = req.query;

    // Validate required query parameters
    if (
      !location ||
      !installation ||
      !wellType ||
      !wellNumber ||
      !organizationName
    ) {
      return res.status(400).json({
        message: "All query parameters are required.",
      });
    }

    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found." });
    }

    // Find the well document
    const well = await Well.findOne({
      location: new RegExp(`^${location.trim()}$`, "i"),
      organization: organization._id,
    });

    if (!well) {
      return res.status(404).json({ message: "Well not found." });
    }

    // Find installation index
    const installationIndex = well.installations.findIndex(
      (inst) => inst.name.toLowerCase() === installation.toLowerCase()
    );

    if (installationIndex === -1) {
      return res.status(404).json({ message: "Installation not found." });
    }

    // Find well type index
    const wellTypeIndex = well.installations[
      installationIndex
    ].wellTypes.findIndex(
      (type) => type.wellType.toLowerCase() === wellType.toLowerCase()
    );

    if (wellTypeIndex === -1) {
      return res.status(404).json({ message: "Well type not found." });
    }

    // Find specific well index
    const wellIndex = well.installations[installationIndex].wellTypes[
      wellTypeIndex
    ].wells.findIndex((w) => w.wellNumber === wellNumber);

    if (wellIndex === -1) {
      return res.status(404).json({ message: "Well number not found." });
    }


    // Important: Get a reference to the wells array
    const wells =
      well.installations[installationIndex].wellTypes[wellTypeIndex].wells;

    try {
      wells[wellIndex].flowing = { pressures: [] };
      await well.save();
      res.status(200).json({
        success: true,
        message: "Flowing Condition Updated Successfully!.",
        data: wells[wellIndex],
      });
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: "Validation error occurred",
        errors: Object.values(validationError.errors).map((err) => err.message),
      });
    }
  }
  catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export const deleteNotFlowingCondition = async (req, res) => {

  try {
    const { location, installation, wellType, wellNumber, organizationName } = req.query;

    // Validate required query parameters
    if (
      !location ||
      !installation ||
      !wellType ||
      !wellNumber ||
      !organizationName
    ) {
      return res.status(400).json({
        message: "All query parameters are required.",
      });
    }

    const organization = await Organization.findOne({
      organizationName: new RegExp(`^${organizationName.trim()}$`, "i"),
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found." });
    }

    // Find the well document
    const well = await Well.findOne({
      location: new RegExp(`^${location.trim()}$`, "i"),
      organization: organization._id,
    });

    if (!well) {
      return res.status(404).json({ message: "Well not found." });
    }

    // Find installation index
    const installationIndex = well.installations.findIndex(
      (inst) => inst.name.toLowerCase() === installation.toLowerCase()
    );

    if (installationIndex === -1) {
      return res.status(404).json({ message: "Installation not found." });
    }

    // Find well type index
    const wellTypeIndex = well.installations[
      installationIndex
    ].wellTypes.findIndex(
      (type) => type.wellType.toLowerCase() === wellType.toLowerCase()
    );

    if (wellTypeIndex === -1) {
      return res.status(404).json({ message: "Well type not found." });
    }

    // Find specific well index
    const wellIndex = well.installations[installationIndex].wellTypes[
      wellTypeIndex
    ].wells.findIndex((w) => w.wellNumber === wellNumber);

    if (wellIndex === -1) {
      return res.status(404).json({ message: "Well number not found." });
    }


    // Important: Get a reference to the wells array
    const wells =
      well.installations[installationIndex].wellTypes[wellTypeIndex].wells;

    try {
      wells[wellIndex].notFlowing = { pressures: [] };
      await well.save();
      res.status(200).json({
        success: true,
        message: "Flowing Condition Updated Successfully!.",
        data: wells[wellIndex],
      });
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: "Validation error occurred",
        errors: Object.values(validationError.errors).map((err) => err.message),
      });
    }
  }
  catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

//counttotalwellnumber
export const countTotalWellNumbers = async (req, res) => {
  try {
    // Destructure optional query parameters for filtering
    const { location, installationName, wellType, organizationName } =
      req.query;

    // Build the aggregation pipeline
    const pipeline = [
      // Match stage to filter by organization if provided
      ...(organizationName
        ? [
          {
            $lookup: {
              from: "organizations",
              localField: "organization",
              foreignField: "_id",
              as: "orgDetails",
            },
          },
          {
            $match: {
              "orgDetails.organizationName": new RegExp(
                `^${organizationName}$`,
                "i"
              ),
            },
          },
        ]
        : []),

      // Match stage for location if provided
      ...(location
        ? [
          {
            $match: {
              location: new RegExp(`^${location}$`, "i"),
            },
          },
        ]
        : []),

      // Unwind installations
      { $unwind: "$installations" },

      // Optional installation name filter

      ...(installationName
        ? [
          {
            $match: {
              "installations.name": new RegExp(`^${installationName}$`, "i"),
            },
          },
        ]
        : []),

      // Unwind wellTypes
      { $unwind: "$installations.wellTypes" },

      // Optional wellType filter
      ...(wellType
        ? [
          {
            $match: {
              "installations.wellTypes.wellType": new RegExp(
                `^${wellType}$`,
                "i"
              ),
            },
          },
        ]
        : []),

      // Unwind wells
      { $unwind: "$installations.wellTypes.wells" },

      // Group to calculate total well number count
      {
        $group: {
          _id: null,
          totalWellNumberCount: { $sum: 1 },
        },
      },
    ];

    // Execute the aggregation
    const result = await Well.aggregate(pipeline);

    // Extract the total well number count from the result
    const totalWellNumberCount =
      result.length > 0 ? result[0].totalWellNumberCount : 0;

    // Return the total count
    return res.status(200).json({
      success: true,
      totalWellNumberCount,
    });
  } catch (error) {
    console.error("Error counting well numbers:", error);
    return res.status(500).json({
      message: "An error occurred while counting well numbers",
      error: error.message,
    });
  }
};




export const deleteInstallationToLocation = async (req, res) => {
  try {
    const { location, installation, organizationName } = req.query;

    if (!location || !installation || !organizationName) {
      return res.status(400).json({
        message: "Location, installation, and organization name are required.",
      });
    }

    const organization = await Organization.findOne({ organizationName });
    if (!organization) {
      return res.status(404).json({
        message: "Organization not found.",
      });
    }

    const well = await Well.findOne({
      location: new RegExp(`^${location.trim()}$`, "i"),
      organization: organization._id,
    });

    if (!well) {
      return res.status(404).json({
        message: "Well not found for the provided location and organization.",
      });
    }

    const existingInstallation = well.installations.find(
      (inst) => inst.name === installation
    );
    if (!existingInstallation) {
      return res.status(400).json({
        success: false,
        message: "This installation already does not exists for the selected location.",
      });
    }

    well.installations = well.installations.filter(
      (installation) => installation.name !== installation
    );

    await well.save();

    res.status(200).json({
      message: "Installation Deleted successfully",
      data: well,
    });
  } catch (error) {
    // console.error("Error adding installation to location:", error);
    res.status(500).json({
      message: "An error occurred while deleting installation.",
      error: error.message,
    });
  }
};

export const deleteLocation = async (req, res) => {
  try {
    const { location, organizationName } = req.query;

    // Validate request body
    if (!location || !organizationName) {
      return res.status(400).json({
        message: "Location and organization name are required.",
      });
    }

    // Find the organization by its name
    const organization = await Organization.findOne({
      organizationName,
    }).select("_id");
    if (!organization) {
      return res.status(404).json({
        message: "Organization not found.",
      });
    }

    // Check if the well location already exists for this organization
    const existingWell = await Well.findOneAndDelete({
      location,
      organization: organization._id,
    });

    if (!existingWell) {
      return res.status(400).json({
        message: "Location does not exists for this organization.",
      });
    }

    res.status(201).json({
      success: true,
      message: "Well location deleted successfully",
      data: existingWell,
    });
  } catch (error) {
    // console.error("Error adding well location:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the well location.",
      error: error.message,
    });
  }
};

// pranav for well monitor
export const getWellAndNodeDetailsList = async (req, res) => {
  try {
    const { location, installation, wellNumber, limit, skip, organizationId } =
      req.query;

    if (!organizationId) {
      res
        .status(400)
        .json({ success: false, message: "'organizationId' is required" });
      return;
    }

    const org = await Organization.findOne({
      organizationId: Number(organizationId),
    });
    if (!org) {
      res
        .status(400)
        .json({ success: false, message: "Organization not found" });
      return;
    }

    const locationData = await Well.find({
      location: { $regex: location || "" },
      organization: org._id,
    });

    const wellsObj = {};
    locationData.forEach((location) => {
      location.installations
        .filter((i) => (installation ? i.name.includes(installation) : true))
        .forEach((wellTypes) => {
          wellTypes.wellTypes.forEach((wells) => {
            if (wellNumber) {
              wells.wells.forEach((well) => {
                if (well.wellNumber == wellNumber) wellsObj[wellNumber] = well;
              });
            } else {
              wells.wells.forEach((well) => {
                wellsObj[well.wellNumber] = well;
              });
            }
          });
        });
    });

    const nodeIds = [];
    Object.values(wellsObj).forEach((i) => nodeIds.push(i.nodeId))

    const nodeData = [];
    for (let x in nodeIds) {
      // const result = await ExternalDevice.find({ data }).sort({ createdAt: -1 }).limit(1)
    }

    res.json({ success: true, data: Object.values(wellsObj) });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching details.",
      error: error.message,
    });
  }
};
