import ExternalDevice from "../Models/externalDevicesModel.js";
import Well from "../Models/wellMasterModel.js";
import Users from "../Models/userModel.js";
import Notification from "../Models/notificationModel.js";
import {
  sendWellAlertNotificationToManager,
  sendWellAllertNotificationToOwner,
} from "../Helpers/helper.js";
import { io } from "../../index.js";

//to data store using external device using post
export const externalDataCollect = async (req, res) => {
  try {
    const newData = new ExternalDevice({
      data: req.body,
    });

    await newData.save();

    io.emit("external-device-data", JSON.stringify(req.body));
    // Broadcast the saved data to all WebSocket clients
    // broadcast({
    //   status: true,
    //   message: "New data received",
    //   data: newData,
    // });

    // This code Start for notification genration of continous data
    const nodeId = req.body.NodeAdd;
    const wells = await Well.find({});
    let well;
    wells.forEach((i)=>{
      i.installations.forEach((a)=>{
        a.wellTypes.forEach((b)=>{
          b.wells.forEach((c)=>{
            if(c.nodeId === nodeId){
              well = c;
            }
          })
        })
      })
    })

    const wellNotifications = [];

    // Check parameter-based alerts
    for (const parameter of well.parameters) {
      const sensorKey = parameter.ports;

      
      const sensorValue = parseFloat(req.body[sensorKey]); // parseFloat if required according to payload

      console.log(`${sensorKey}  :  ${sensorValue}`);

      if (isNaN(sensorValue)) continue;

      const {
        normalAlert,
        criticalAlert,
        normalCondition,
        criticalCondition,
        normalDescription,
        criticalDescription,
      } = parameter;

      // Evaluate critical condition first (higher priority)
      if (
        (criticalCondition === "low" && sensorValue <= criticalAlert) ||
        (criticalCondition === "high" && sensorValue > criticalAlert)
      ) {
        wellNotifications.push({
          sensorKey,
          sensorValue,
          notificationStatus: "Critical",
          notificationDescription: criticalDescription,
        });
        continue;
      }

      // Evaluate normal condition
      if (
        (normalCondition === "low" && sensorValue >= normalAlert) ||
        (normalCondition === "high" && sensorValue > normalAlert)
      ) {
        wellNotifications.push({
          sensorKey,
          sensorValue,
          notificationStatus: "Normal",
          notificationDescription: normalDescription,
        });
      }
    }

    // Find the manager and owner of the organization
    const [owner, manager] = await Promise.all([
      Users.findOne({
        organizationName: well.organizationName,
        roleInRTMS: "owner",
      }),
      Users.findOne({
        organizationName: well.organizationName,
        roleInRTMS: "manager",
      }),
    ]);

    if (!owner || !manager) {
      return res.status(404).json({
        success: false,
        message: "No manager or owner found for this organization",
      });
    }

    // return res.json({wellNotifications})
    const oldNotifications = await Notification.find({ nodeID: nodeId }).sort({ createdAt: -1 }).limit();
    const notifications = await Notification.find({}).sort({ createdAt: -1 }).limit(1);
    // Save notification in the database
    const newNotification = new Notification({
      notificationNo: notifications.length ? notifications[0].notificationNo + 1 : 1,
      organizationName: well.organizationName,
      wellNumber: well.wellNumber,
      nodeID: well.nodeID,
      wellLocation: well.wellLocation,
      wellInstallation: well.wellInstallation,
      wellType: well.wellType,
      issues: wellNotifications,
      notificationStatus: "Pending",
    });

    if(oldNotifications.length === 0 || new Date().getTime() - new Date(oldNotifications[0].createdAt).getTime() > 60 * 60 * 1000 ){
      await newNotification.save();
    }

    // Send notifications
    await sendWellAllertNotificationToOwner(
      well,
      owner.email,
      wellNotifications
    );
    await sendWellAlertNotificationToManager(
      well,
      manager.email,
      wellNotifications
    );

    // This code END for notification genration of continous data

    res.status(201).json({
      status: true,
      message: "Data Saved and notification Generate successfully",
      data: newData,
      notificationData: newNotification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error saving data",
    });
  }
};

// to get all data using external decice and show
export const externalDataShow = async (req, res) => {
  try {
    const { organizationName } = req.query;

    if (!organizationName) {
      return res.status(400).json({
        success: false,
        message: "Organization name is required",
      });
    }

    // Step 1: Aggregate data to get unique NodeAdd
    const uniqueNodeData = await ExternalDevice.aggregate([
      { $match: { "data.OrgID": organizationName } },
      { $sort: { createAt: -1 } },
      {
        $group: {
          _id: "$data.NodeAdd",
          latestEntry: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$latestEntry" },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "NodeID Retrieved successfully",
      data: uniqueNodeData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving data",
    });
  }
};

// to get all data using external decice and show with well number and nodeID
export const getNodeAllDataByOrganization = async (req, res) => {
  try {
    const { organizationName } = req.query;

    if (!organizationName) {
      return res.status(400).json({
        success: false,
        message: "Organization Name is required",
      });
    }

    // Step 1: Find all wells for the specified organization
    const wells = await Well.find({ organizationName });

    if (!wells || wells.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No wells found for the organization '${organizationName}'`,
      });
    }

    // Step 2: Retrieve node IDs associated with the organization's wells
    const nodeIDs = wells.map((well) => well.nodeID).filter(Boolean);

    // Step 3: Retrieve the latest ExternalDevice entry for each unique NodeAdd
    const nodeDevices = await ExternalDevice.aggregate([
      { $match: { "data.OrgID": organizationName } },
      { $sort: { createAt: -1 } },
      {
        $group: {
          _id: "$data.NodeAdd",
          latestEntry: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$latestEntry" },
      },
    ]);

    // Step 4: Organize the data based on well numbers and associated node data
    const wellData = wells.map((well) => {
      // Find the device data associated with the well's nodeID
      const deviceData = nodeDevices.find(
        (device) => device.data.NodeAdd === well.nodeID
      );

      if (!deviceData) {
        console.log(
          `No device data found for well ${well.wellNumber} with nodeID ${well.nodeID}`
        );
      }

      return {
        wellNumber: well.wellNumber,
        wellDetails: well,
        nodeData: deviceData || null,
      };
    });

    // Step 5: Respond with the organized well and node data
    res.status(200).json({
      success: true,
      message: "Node data retrieved successfully",
      wellData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving node data",
    });
  }
};

// to get Single data using external decice and show with well number and nodeID
export const getSingleWellNodeDataByOrganization = async (req, res) => {
  try {
    const { organizationName, wellNumber } = req.query;

    if (!organizationName || !wellNumber) {
      return res.status(400).json({
        success: false,
        message: "Organization Name and Well Number are required",
      });
    }

    // Step 1: Find the specific well by organization and well number
    const well = await Well.findOne({ organizationName, wellNumber });

    if (!well) {
      return res.status(404).json({
        success: false,
        message: `No well found with well number '${wellNumber}' for the organization '${organizationName}'`,
      });
    }

    // Step 2: Retrieve the latest ExternalDevice entry for the well's nodeID
    const nodeDevice = await ExternalDevice.aggregate([
      {
        $match: { "data.OrgID": organizationName, "data.NodeAdd": well.nodeID },
      },
      { $sort: { createAt: -1 } },
      { $limit: 1 },
      {
        $replaceRoot: { newRoot: "$$ROOT" },
      },
    ]);

    const deviceData = nodeDevice.length > 0 ? nodeDevice[0] : null;

    // Step 3: Organize the well data and associated node data
    const wellData = {
      wellNumber: well.wellNumber,
      wellDetails: well,
      nodeData: deviceData || null,
    };

    // Step 4: Respond with the well and node data
    res.status(200).json({
      success: true,
      message: "Well data with node information retrieved successfully",
      wellData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving well and node data",
    });
  }
};

//without well number to check
export const getFilterWellNodeData = async (req, res) => {
  try {
    const { organizationName, wellLocation, wellInstallation, parameter } =
      req.query;

    // Validate required query parameters
    if (!organizationName || !wellLocation || !wellInstallation || !parameter) {
      return res.status(400).json({
        success: false,
        message:
          "Organization Name, Well Location, Installation, and Parameter are required.",
      });
    }

    // Step 1: Find wells based on organization, location, and installation
    const wellFilter = {
      organizationName,
      wellLocation,
      wellInstallation,
    };

    const wells = await Well.find(wellFilter);

    if (!wells || wells.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No wells found with the specified criteria.",
      });
    }

    // Step 2: Retrieve node IDs associated with the filtered wells
    const nodeIDs = wells.map((well) => well.nodeID).filter(Boolean);

    // Step 3: Retrieve the latest ExternalDevice entry for each unique NodeAdd
    const nodeDevices = await ExternalDevice.aggregate([
      { $match: { "data.OrgID": organizationName } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$data.NodeAdd",
          latestEntry: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$latestEntry" } },
    ]);

    // Step 4: Apply parameter-based filtering on the node data
    let filteredNodeData;
    switch (parameter) {
      case "Battery":
        filteredNodeData = nodeDevices.filter(
          (device) => parseFloat(device.data.Bat) < 20
        );
        break;
      case "Solar":
        filteredNodeData = nodeDevices.filter(
          (device) => parseFloat(device.data.Solar) < 15
        );
        break;
      case "Network Error":
        filteredNodeData = nodeDevices.filter((device) => !device.data);
        break;
      case "Flowing":
        filteredNodeData = wells
          .filter((well) => well.flowing === true)
          .map((well) =>
            nodeDevices.find((device) => device.data.NodeAdd === well.nodeID)
          );
        break;
      case "Not Flowing":
        filteredNodeData = wells
          .filter((well) => well.flowing === false)
          .map((well) =>
            nodeDevices.find((device) => device.data.NodeAdd === well.nodeID)
          );
        break;
      case "All":
      default:
        filteredNodeData = nodeDevices;
        break;
    }

    // Step 5: Map filtered node data to the wells
    const wellData = wells
      .map((well) => {
        const deviceData = filteredNodeData.find(
          (device) => device?.data?.NodeAdd === well.nodeID
        );
        return {
          wellNumber: well.wellNumber,
          wellDetails: well,
          nodeData: deviceData || null,
        };
      })
      .filter((entry) => entry.nodeData);

    // Step 6: Respond with the organized well and node data
    res.status(200).json({
      success: true,
      message: "Filtered node data retrieved successfully",
      wellData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving node data",
    });
  }
};

