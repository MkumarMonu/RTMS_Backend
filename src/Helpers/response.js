// helper/response.js
export const sendResponse = (res, success, message, data = null, statusCode = 200) => {
    return res.status(statusCode).json({ success, message, data });
  };
  
  export const handleError = (res, error, message = "An error occurred", statusCode = 500) => {
    console.error(error); // Ensure this is logged to a file in production
    return res.status(statusCode).json({ success: false, message, error: error.message });
  };
  


export const findCaseInsensitive = (array, key, value) => {
  if (!array || !Array.isArray(array)) return undefined;

  return array.find(
    (item) => item[key]?.toLowerCase() === value.trim().toLowerCase()
  );
};


// Helper: validationHelper.js
export const validateWellConfiguration = (body) => {
  const {
    process,
    ports,
    name,
    description,
    unit,
    sensorOutput,
    minVal,
    maxVal,
    normAlertValue,
    normalCondition,
    normalDescription,
    normalDeadband,
    criticalAlertValue,
    criticalCondition,
    criticalDescription,
    criticalDeadband,
  } = body;

  const errors = [];
  const parameterData = {};

  if (!process?.trim()) errors.push("Process is required.");
  if (!ports?.trim()) errors.push("Ports are required.");
  if (!name?.trim()) errors.push("Name is required.");
  if (!description?.trim()) errors.push("Description is required.");
  if (!unit?.trim()) errors.push("Unit is required.");
  if (!sensorOutput?.trim()) errors.push("Sensor output is required.");
  if (minVal == null || isNaN(Number(minVal)) || minVal < 0)
    errors.push("Minimum value must be a non-negative number.");
  if (maxVal == null || isNaN(Number(maxVal)) || maxVal <= minVal)
    errors.push("Maximum value must be greater than the minimum value.");
  if (
    normAlertValue == null ||
    isNaN(Number(normAlertValue)) ||
    normAlertValue < minVal ||
    normAlertValue > maxVal
  )
    errors.push("Normal alert value must be within valid range.");
  if (!normalCondition?.trim()) errors.push("Normal condition is required.");
  if (!normalDescription?.trim())
    errors.push("Normal description is required.");
  if (normalDeadband == null || isNaN(Number(normalDeadband)) || normalDeadband < 0)
    errors.push("Normal deadband must be a non-negative number.");
  if (
    criticalAlertValue == null ||
    isNaN(Number(criticalAlertValue)) ||
    criticalAlertValue < minVal ||
    criticalAlertValue > maxVal
  )
    errors.push("Critical alert value must be within valid range.");
  if (!criticalCondition?.trim())
    errors.push("Critical condition is required.");
  if (!criticalDescription?.trim())
    errors.push("Critical description is required.");
  if (criticalDeadband == null || isNaN(Number(criticalDeadband)) || criticalDeadband < 0)
    errors.push("Critical deadband must be a non-negative number.");

  if (errors.length === 0) {
    parameterData.process = process.trim();
    parameterData.ports = ports.trim();
    parameterData.displayName = name.trim();
    parameterData.description = description.trim();
    parameterData.unit = unit.trim();
    parameterData.sensorOutput = sensorOutput.trim();
    parameterData.valueMinimum = Number(minVal);
    parameterData.valueMaximum = Number(maxVal);
    parameterData.normalAlert = {
      normalalert: Number(normAlertValue),
      condition: normalCondition.trim(),
      description: normalDescription.trim(),
      deadband: Number(normalDeadband),
    };
    parameterData.criticalAlert = {
      criticalalert: Number(criticalAlertValue),
      condition: criticalCondition.trim(),
      description: criticalDescription.trim(),
      deadband: Number(criticalDeadband),
    };
  }

  return { parameterData, errors };
};

//api for findwelldetails 
export const findWellDetails = (well, installation, wellType, wellNumber) => {
  // Find installation index
  const installationIndex = well.installations.findIndex(
    (inst) => inst.name.toLowerCase() === installation.toLowerCase()
  );

  if (installationIndex === -1) {
    return { message: "Installation not found." };
  }

  // Find well type index
  const wellTypeIndex = well.installations[installationIndex].wellTypes.findIndex(
    (type) => type.wellType.toLowerCase() === wellType.toLowerCase()
  );

  if (wellTypeIndex === -1) {
    return { message: "Well type not found." };
  }

  // Find specific well index
  const wellIndex = well.installations[installationIndex].wellTypes[wellTypeIndex].wells.findIndex(
    (w) => w.wellNumber === wellNumber
  );

  if (wellIndex === -1) {
    return { message: "Well number not found." };
  }

  return { installationIndex, wellTypeIndex, wellIndex };
};


export const convertToBinary = (decimalValue) => {
  return decimalValue.toString(2).padStart(10, "0");
};

export const validateCoordinates = (latitude, longitude) => {
  const isValidLatitude = latitude >= -90 && latitude <= 90;
  const isValidLongitude = longitude >= -180 && longitude <= 180;
  return { isValidLatitude, isValidLongitude };
};

// Helper function to validate flowing condition
export const validateFlowingCondition = (flowing) => {
  if (!flowing || !flowing.pressures || !Array.isArray(flowing.pressures)) {
    return { isValid: false, message: "Flowing pressures must be provided as an array." };
  }

  // if (flowing.pressures.some(pressure => isNaN(pressure))) {
  //   return { isValid: false, message: "All pressures must be valid numbers." };
  // }

  return { isValid: true };
};


// Helper function to validate not flowing condition
export const validateNotFlowingCondition = (notFlowing) => {
  if (!notFlowing || !notFlowing.pressures || !Array.isArray(notFlowing.pressures)) {
    return { isValid: false, message: "Not flowing pressures must be provided as an array." };
  }

  // if (notFlowing.pressures.some(pressure => isNaN(pressure))) {
  //   return { isValid: false, message: "All pressures must be valid numbers." };
  // }

  // return { isValid: true };
};


// Helper function to map well locations
export const mapWellLocations = (wells) => {
  const wellLocationMap = new Map();

  wells.forEach((well) => {
    well.installations.forEach((installation) => {
      installation.wellTypes.forEach((wellType) => {
        wellType.wells.forEach((wellDetail) => {
          if (wellDetail.latitude && wellDetail.longitude) {
            // Create or update well location data
            wellLocationMap.set(wellDetail.wellNumber, {
              wellNumber: wellDetail.wellNumber,
              location: well.location,
              installation: installation.name,
              wellType: wellType.wellType,
              landmark: wellDetail.landmark || "",
              coordinates: {
                latitude: wellDetail.latitude,
                longitude: wellDetail.longitude,
              },
              nodeId: wellDetail.nodeId || "",
              flowing: wellDetail.flowing || null,
              notFlowing: wellDetail.notFlowing || null,
            });
          }
        });
      });
    });
  });

  return wellLocationMap;
};


// Helper function to map and filter wells by parameter
export const mapWellParameters = (completeWells, wellParameter) => {
  return completeWells.flatMap((location) =>
    location.installations.flatMap((singleInstallation) =>
      singleInstallation.wellTypes.flatMap((singleWellType) =>
        singleWellType.wells
          .filter((singleWell) =>
            singleWell.wellParameter.some((params) => params.process === wellParameter)
          )
          .map((singleWell) => {
            const matchedParameters = singleWell.wellParameter.filter(
              (params) => params.process === wellParameter
            );

            return matchedParameters.map((params) => ({
              wellNumber: singleWell.wellNumber,
              location: location.location,
              installation: singleInstallation.name,
              wellType: singleWellType.wellType,
              wellParameter: params,
              landmark: singleWell.landmark || "",
              coordinates: {
                latitude: singleWell.latitude,
                longitude: singleWell.longitude,
              },
              nodeId: singleWell.nodeId || "",
              flowing: singleWell.flowing || null,
              notFlowing: singleWell.notFlowing || null,
            }));
          })
      )
    )
  ).flat();
};


//validate configurationinput
export const validateWellConfigurationInput = ({
  process, ports, name, description, unit, sensorOutput, minVal, maxVal, normAlertValue, normalCondition, normalDescription, normalDeadband, criticalAlertValue, criticalCondition, criticalDescription, criticalDeadband
}) => {
  const errors = [];

  if (!process) errors.push('Process is required');
  if (!ports) errors.push('Ports is required');
  if (!name) errors.push('Name is required');
  if (!description) errors.push('Description is required');
  if (!unit) errors.push('Unit is required');
  if (!sensorOutput) errors.push('Sensor output is required');
  if (minVal <= 0) errors.push('Minimum value must be a non-negative number');
  if (maxVal < minVal) errors.push('Maximum value must be greater than or equal to the minimum value');
  if (normAlertValue < minVal) errors.push('Normal alert value must be greater than or equal to the minimum value');
  if (normAlertValue > maxVal) errors.push('Normal alert value must be less than or equal to the maximum value');
  if (criticalAlertValue < minVal) errors.push('Critical alert value must be greater than or equal to the minimum value');
  if (criticalAlertValue > maxVal) errors.push('Critical alert value must be less than or equal to the maximum value');
  if (normalDeadband < 0) errors.push('Normal deadband must be a non-negative number');
  if (criticalDeadband < 0) errors.push('Critical deadband must be a non-negative number');
  if (!normalDescription) errors.push('Normal Description Value is required');
  if (!normalCondition) errors.push('Normal Condition Value is required');
  if (!criticalCondition) errors.push('Critical Condition Value is required');
  if (!criticalDescription) errors.push('Critical Description Value is required');

  return errors;
};


