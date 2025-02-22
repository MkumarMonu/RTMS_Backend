import Users from "../Models/userModel.js";
import Notification from "../Models/notificationModel.js";
import Complaint from "../Models/complaintModel.js";
import { getUserDetail } from "./usersController.js";

//Well genreated notification approved by employee
export const approveNotificationByEmployee = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { description, employeeId } = req.body;

    // Validate inputs
    if (!description || description.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Description is required for employee approval.",
      });
    }
    if (!employeeId || employeeId.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required.",
      });
    }

    // Find the employee and verify association with the organization
    const employee = await Users.findOne({
      _id: employeeId,
      roleInRTMS: "employee",
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found or invalid role.",
      });
    }

    // Fetch the notification
    const notif = await Notification.findById(notificationId);

    if (!notif) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    // Ensure the employee belongs to the same organization
    if (notif.organizationName !== employee.organizationName) {
      return res.status(403).json({
        success: false,
        message: "Employee does not belong to this organization.",
      });
    }

    // Check if already approved by employee
    if (notif.isApprovedByEmployee) {
      return res.status(400).json({
        success: false,
        message: "Notification has already been approved by an employee.",
      });
    }

    // Update the notification with employee approval
    notif.isApprovedByEmployee = true;
    notif.employeeApprovalDescription = description;
    notif.notificationStatus = "Employee Approved";

    await notif.save();

    res.status(200).json({
      success: true,
      message: "Notification approved by employee.",
      notification: notif,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error in employee approval.",
    });
  }
};

//Well genreated notification approved by Manager
export const approveNotificationByManager = async (req, res) => {
  try {
    const { wellNumber, description } = req.body;

    if (!wellNumber) {
      return res.status(400).json({
        success: false,
        message: "Well Number is Required",
      });
    }

    // Validate inputs
    if (!description || description.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Description is required for manager approval.",
      });
    }

    // Fetch the notification
    const well = await Notification.findById(wellNumber);

    if (!well) {
      return res.status(404).json({
        success: false,
        message: "Well not found.",
      });
    }

    // Find the manager and verify association with the organization
    const manager = await Users.findOne({
      organizationName: well.organizationName,
      roleInRTMS: "manager",
    });

    if (!manager) {
      return res.status(404).json({
        success: false,
        message: "Manager not found or invalid role.",
      });
    }

    // Ensure the manager belongs to the same organization
    if (well.organizationName !== manager.organizationName) {
      return res.status(403).json({
        success: false,
        message: "Manager does not belong to this organization.",
      });
    }

    // Ensure employee has already approved
    if (!well.isApprovedByEmployee) {
      return res.status(400).json({
        success: false,
        message: "Employee approval is pending. Cannot approve by manager.",
      });
    }

    // Check if already approved by manager
    if (well.isApprovedByManager) {
      return res.status(400).json({
        success: false,
        message: "Notification has already been approved by a manager.",
      });
    }

    // Update the notification with manager approval
    well.isApprovedByEmployee = true;
    well.isApprovedByManager = true;
    well.managerApprovalDescription = description;
    well.notificationStatus = "Manager Approved";

    await well.save();

    res.status(200).json({
      success: true,
      message: `Well Notification approved by manager ${manager.name}.`,
      notification: well,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error in manager approval.",
    });
  }
};

//Well genreated notification approved by Owner
export const approveNotificationByOwner = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { description, ownerId } = req.body;

    // Validate inputs
    if (!description || description.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Description is required for owner approval.",
      });
    }
    if (!ownerId || ownerId.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Owner ID is required.",
      });
    }

    // Find the owner and verify association with the organization
    const owner = await Users.findOne({
      _id: ownerId,
      roleInRTMS: "owner",
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Owner not found or invalid role.",
      });
    }

    // Fetch the notification
    const notif = await Notification.findById(notificationId);

    if (!notif) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    // Ensure the owner belongs to the same organization
    if (notif.organizationName !== owner.organizationName) {
      return res.status(403).json({
        success: false,
        message: "Owner does not belong to this organization.",
      });
    }

    // Ensure manager has already approved
    if (!notif.isApprovedByManager) {
      return res.status(400).json({
        success: false,
        message: "Manager approval is pending. Cannot approve by owner.",
      });
    }

    // Check if already approved by owner
    if (notif.isApprovedByOwner) {
      return res.status(400).json({
        success: false,
        message: "Notification has already been approved by an owner.",
      });
    }

    // Update the notification with owner approval and close it
    notif.isApprovedByEmployee = true;
    notif.isApprovedByManager = true;
    notif.isApprovedByOwner = true;
    notif.ownerApprovalDescription = description;
    notif.notificationStatus = "Closed";

    await notif.save();

    res.status(200).json({
      success: true,
      message: `Notification approved by owner ${owner.name} and now closed.`,
      notification: notif,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error in owner approval.",
    });
  }
};


export const getNotifications = async (req, res) =>{
  const { notificationStatus, startDate, endDate, notificationNo, wellNumber } = req.query

  const query = {};
  if(notificationStatus && !notificationStatus == 'All'){
    query['notificationStatus'] = notificationStatus
  }
  if(wellNumber){
    query['wellNumber'] = wellNumber
  }
  if(notificationNo){
    query['notificationNo'] = notificationNo
  }
  const result = await Notification.find(query).sort({ createdAt: -1 }).lean();
  markViewed();
  res.json({ success: true, data: result });
  // return result; // need to add date filter;
  // const mapped = result.map((i)=> new Date(i.createdAt).getTime());
  // let filtered = mapped;
  // if(startDate){

  // }
  // if(endDate){
  //   const endDateTime = new Date()
  // }
}

const markViewed = async () =>{
  await Notification.updateMany({}, {  $set: { viewed: true }})
}

export const closeWithComment = async (req, res) =>{
  try{
    const user = req.user
    const { notificationId, message,  } = req.body;
  
    const result = await Notification.findOne({ _id: notificationId, notificationStatus: "Pending" });
    if(!result){
      res.status(400).json({ success: false, message: "Notification not found or Notification already closed." })
    }
    result.comment = {
      userId: user._id,
      message: message
    }
    await result.save();
    res.json({ message: "Message Saved", success: true })
  } catch(error){
    res.status(500).json({ success: false, message: "Error" })
  }
}

export const getComplaints = async (req, res) =>{
  try {
    const user = req.user
    const { complaintNumber, department, status, startDate, endDate } = req.query;
    const query = {};
    if(complaintNumber){
      query['complaintNumber'] = complaintNumber
    }
    if(department){
      query['department'] = department
    }
    if(status){
      query['status'] = status;
    }
    query['$or'] = [
      { receiverId: user._id },
      { senderId: user._id }
    ]
    const result = await Complaint.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: result })
  } catch(error){
    res.status(500).json({ success: false, message: "Error" })
  }
}

export const convertToComplaint = async (req, res) =>{
  try{
    const senderId = req.user._id;
    const payload = req.body;
    if(!payload.description || !payload.receiverId || !payload.notificationId ){
      res.status(400).json({ message: "Invalid payload. Required fields are receiverId,description, notificationId" })
    }
    const receiverDetail = await getUserDetail({ userId: payload.receiverId })
    const senderDetail = await getUserDetail({ userId: senderId })

    const complaints = await Complaint.find().countDocuments();

    const result = await Complaint.create({
      complaintNumber: complaints + 1,
      senderId: senderId, 
      senderName: senderDetail.username,
      senderDepartment: senderDetail.department,
      receiverId: payload.receiverId,
      receiverName: receiverDetail.username,
      receiverDepartment: receiverDetail.department,
      status: "Open Complaint",
      description: payload.description,
      notificationId: payload.notificationId
    })
    res.json({ success: true, message: "Complaint Generated", data: result });
  } catch(error){
    res.status(500).json({ success: false, message: "Error" })
  }
}

export const closeComplaint = async (req, res) =>{
  try{
    const { complaintId } = req.body;
    const user = req.user;

    const complaint = await Complaint.findOne({ _id: complaintId });
    if(!complaint){
      res.json({ success: false, message: "Complaint not found" })
    }
    complaint.closedBy = user._id;
    complaint.status = "Closed Complaint";
    complaint.closedDate = new Date();
    await complaint.save();
    res.json({ success: true, message: "Complaint closed successfully" })
  } catch(error){
    res.status(500).json({ success: false, message: "Error" })
  }
}