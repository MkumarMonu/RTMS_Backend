import {
  sendNotificationToOwner,
  sendWellNotificationToOwner,
} from "../Helpers/helper.js";
import Device from "../Models/deviceManagerModel.js";
import Well from "../Models/wellMasterModel.js";

// POST /generate-publish-security-code
export const generatePublishSecurityCode = async (req, res) => {
  try {
    const publishCode = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
    res.json({
      success: true,
      message: "Generated Publish Code successfully",
      data: publishCode,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error ",
    });
  }
};

// POST /generate-subscribe-security-code
export const generateSubscribeSecurityCode = async (req, res) => {
  try {
    const subscribeCode = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
    res.json({
      success: true,
      message: "Generated Subscribe Code successfully",
      data: subscribeCode,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error generating Subscribe Code",
    });
  }
};

// GET /all-devices
export const allDevice = async (req, res) => {
  try {
    const devices = await Device.find({
      $and: [
        { isApprovedByManager: true }, // Not approval by Manager
        { isApprovedByOwner: true }, //Not Approval by Owner
      ],
    });
    res.status(200).json({
      success: true,
      message: "All devices retrieved successfully",
      data: devices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching devices",
    });
  }
};

// GET /device/:id
export const getOneDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await Device.findById(id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Device retrieved successfully",
      data: device,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching device",
    });
  }
};

// POST /submit-well-settings
export const submitDeviceData = async (req, res) => {
  try {
    const {
      MACAddress,
      selectWell,
      publishSecurityCode,
      subscribeSecurityCode,
      parameter,
    } = req.body;

    const wells = await Well.findById(selectWell._id);

    // console.log("Sssss", wells);
    if (!wells) {
      return res.json({
        success: false,
        message: "Wells Data Not Found",
      });
    }

    const existingDevice = await Device.findOne({ MACAddress });

    if (existingDevice) {
      return res.json({
        success: false,
        message: "Device already present!",
      });
    }

    const device = await Device.create({
      MACAddress,
      selectWell,
      publishSecurityCode,
      subscribeSecurityCode,
      parameter,
    });
    res.json({
      success: true,
      message: "Well settings submitted successfully Now wait for approval",
      device,
    });

    //notification send to Owner
    await sendWellNotificationToOwner(
      process.env.OWNER_MAIL,
      "Device Submit and Now wait for approval ",
      `<p>Device Submit And Now Wait For Approval and well number ${newWell.wellNumber}</p>`
    );

    //notification send to Manager
    await sendWellNotificationToOwner(
      process.env.MANAGER_MAIL,
      "Device Submit and Now wait for approval",
      `<pDevice Submit And Now Wait For Approval and well number ${newWell.wellNumber}</p>`
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error submitting well settings",
    });
  }
};

//device Manager is Approval By Manager
export const deviceApprovalByManager = async (req, res) => {
  try {
    const { id } = req.params;
    const deviceApprovalManager = await Device.findById(id);

    if (!deviceApprovalManager) {
      return res.status(404).json({
        success: false,
        message: "Device Not Found",
      });
    }
    if (deviceApprovalManager.isApprovedByManager) {
      return res.json({
        success: false,
        message: "This Device is Already Approved By Manager",
      });
    }
    deviceApprovalManager.isApprovedByManager = true;
    await deviceApprovalManager.save();
    res.status(200).json({
      success: true,
      message: "Device Approved By Manager Now Wait for Owner Approval",
    });

    //Notigication send to Owner
    await sendWellNotificationToOwner(
      process.env.OWNER_MAIL,
      "Wait For Approval",
      `<p>Now Wait For Approval And Device Number ${deviceApprovalManager.wellNumber}</p>`
    );

    //Notification Send to Manager
    await sendWellNotificationToOwner(
      process.env.MANAGER_MAIL,
      "Wait For Approval",
      `<p>Now Wait For Approval And Well Number ${deviceApprovalManager.wellNumber}</p>`
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error Device Approval By Manager  ",
    });
  }
};

//device Manager is Approval By Owner
export const deviceApprovalByOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const deviceApprovalOwner = await Device.findById(id);

    if (!deviceApprovalOwner) {
      return res.status(404).json({
        success: false,
        message: "Device Not Found",
      });
    }
    if (!deviceApprovalOwner.isApprovedByOwner) {
      return res.json({
        success: false,
        message: "This Device is Already Approved By Owner",
      });
    }

    deviceApprovalOwner.isApprovedByOwner = true;

    if (!deviceApprovalOwner.isApprovedByManager) {
      deviceApprovalOwner.isApprovedByManager = true;
      await deviceApprovalOwner.save();
      res.status(200).json({
        success: true,
        message:
          "This Device Directly Approved By Owner No Need To Manager Approval",
      });
    }

    await deviceApprovalOwner.save();

    res.status(200).json({
      success: true,
      message: "Device Approved By Owner",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error Device Approval By Owner",
    });
  }
};

// update the device /PUT
export const updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const updateDevice = await Device.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updateDevice) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    updateDevice.isApprovedByOwner = false;
    updateDevice.isApprovedByManager = false;
    updateDevice.save();

    res.status(200).json({
      success: true,
      message: "Device Updated Successfully Now Wait For Approval",
      data: updateDevice,
    });

    //Notification Send to Owner
    await sendNotificationToOwner(
      process.env.OWNER_MAIL,
      "Update Device Now wait for approval ",
      `<p>Update device And Now Wait For Approval and well number ${updatedWell.wellNumber}</p>`
    );

    //Notification send to Manager
    await sendNotificationToOwner(
      process.env.MANAGER_MAIL,
      "Update Device Now wait for approval",
      `<p>Update Device And Now Wait For Approval and well number ${updatedWell.wellNumber}</p>`
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error To UPDATE Device",
    });
  }
};

//Device approval Data Show
export const getNotApprovalDevices = async (req, res) => {
  try {
    //Find device where either manager or owner has not aapproved
    const approvalDevices = await Device.find({
      $or: [
        { isApprovedByManager: false }, //Not Approval by Manager
        { isApprovedByOwner: false }, //not approval by owner
      ],
    });

    res.status(200).json({
      success: true,
      message: "Unapproved Devices Fetehed Successfully",
      approvalDevices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error Fetching Unapproved Devices",
    });
  }
};

// Delete the device /DELETE
export const deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteDevice = await Device.findByIdAndDelete(id);
    if (!deleteDevice) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Device Updated Successfully",
      data: deleteDevice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error To UPDATE Device",
    });
  }
};
