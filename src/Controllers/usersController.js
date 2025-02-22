import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  sendApprovedNotifactionToManager,
  sendNotificationToManager,
  sendNotificationToOwner,
  sendOTPVerification,
  sendOTPVerificationLogin,
  sendPasswordResetEmail,
  sendPasswordToUser,
  uploadCloudinary,
} from "../Helpers/helper.js";
import Users from "../Models/userModel.js";
import otpGenerator from "otp-generator";
import OTP from "../Models/OTP-model.js";
import rateLimit from "express-rate-limit";
import moment from "moment";


//new
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  message: "Too many OTP requests from this IP. Please try again later.",
});

//new api
export const sendOTPRegister = [
  otpLimiter,
  async (req, res) => {
    try {
      const { email, contactNumber } = req.body;

      // Ensure both fields are provided
      if (!email || !contactNumber) {
        return res.status(400).json({
          success: false,
          message: "Email and contact number are required!",
        });
      }

      // Updated email regex (RFC 5322 compliant)
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      // Updated contact number regex to accept more formats
      const contactRegex = /^\+?[1-9]\d{1,14}$/; // E.164 international format

      // Validate email
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format!",
        });
      }

      // Validate contact number
      if (!contactRegex.test(contactNumber)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid contact number format! Ensure it is in international E.164 format.",
        });
      }

      // Check if user already exists
      const userExists = await Users.findOne({ email });
      if (userExists) {
        return res.status(400).json({
          success: false,
          message: "User already exists!",
        });
      }

      // Generate OTP
      const emailOtp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        specialChars: false,
      });

      // Hash OTP for security
      const hashedOtp = await bcrypt.hash(emailOtp, 10);

      // Store OTP with expiration
      await OTP.create({
        email,
        contactNumber,
        emailOtp: hashedOtp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Expires in 10 minutes
      });

      // Send OTP via email and/or SMS
      await sendOTPVerification({ email, mobile: contactNumber, emailOtp });

      // Success response
      return res.status(200).json({
        success: true,
        message: "OTP sent successfully! Please check your email and phone.",
      });
    } catch (error) {
      console.error("Error in sendOTPRegister:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again later.",
      });
    }
  },
];

//new api for register user
export const registerUser = async (req, res) => {
  try {
    const {
      username,
      email,
      contactNumber,
      employeeID,
      organizationName,
      department,
      roleInRTMS,
      emailOtp,
    } = req.body;

    const idCardPhoto = req.files?.idCardPhoto;
    const passportPhoto = req.files?.passportPhoto;

    if (
      !username ||
      !email ||
      !contactNumber ||
      !employeeID ||
      !organizationName ||
      !department ||
      !roleInRTMS ||
      !emailOtp ||
      !idCardPhoto ||
      !passportPhoto
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required!" });
    }

    // Check if user exists
    const existingUser = await Users.findOne({
      $or: [{ email }, { employeeID }, { contactNumber }],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already registered!" });
    }

    // Fetch and validate OTP
    const recentOtp = await OTP.findOne({ email }).sort({ createdAt: -1 });

    if (!recentOtp || new Date() > new Date(recentOtp.expiresAt)) {
      return res
        .status(400)
        .json({ success: false, message: "OTP expired or not found!" });
    }

    const isOtpValid = await bcrypt.compare(emailOtp, recentOtp.emailOtp);
    if (!isOtpValid) {
      return res.status(400).json({ success: false, message: "Invalid OTP!" });
    }

    // Delete OTP after validation
    await recentOtp.deleteOne();

    // Validate file types
    const validImageTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (
      !validImageTypes.includes(idCardPhoto.mimetype) ||
      !validImageTypes.includes(passportPhoto.mimetype)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type! Only JPEG, PNG, and JPG are allowed.",
      });
    }

    // Upload to Cloudinary
    const idCardPhotoRes = await uploadCloudinary(
      idCardPhoto,
      "rtms",
      1000,
      1000
    );
    const passportPhotoRes = await uploadCloudinary(
      passportPhoto,
      "rtms",
      1000,
      1000
    );

    // Create user
    const newUser = await Users.create({
      username,
      email,
      contactNumber,
      employeeID,
      organizationName,
      department,
      roleInRTMS,
      isApprovedByManager: roleInRTMS === "manager",
      idCardPhoto: idCardPhotoRes.secure_url,
      passportPhoto: passportPhotoRes.secure_url,
    });

    // Notify manager
    await sendNotificationToManager(
      newUser.username,
      newUser.employeeID,
      newUser.contactNumber,
      newUser.email,
      newUser.department,
      process.env.MANAGER_MAIL
    );

    return res.status(201).json({
      success: true,
      message: "User registered successfully! Awaiting manager approval.",
    });
  } catch (error) {
    console.error("Error in registerUser:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to register user." });
  }
};

//new api
export const approveUserByManager = async (req, res) => {
  try {
    const { employeeID } = req.body;

    // Validate employeeID
    if (typeof employeeID !== "string" || employeeID.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing employeeID",
      });
    }

    // Update user's approval status atomically
    const user = await Users.findOneAndUpdate(
      { employeeID, isApprovedByManager: false },
      { isApprovedByManager: true },
      { new: true } // Returns the updated document
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or already approved",
      });
    }

    // Ensure OWNER_MAIL exists
    if (!process.env.OWNER_MAIL) {
      return res.status(500).json({
        success: false,
        message: "Owner's email is not configured",
      });
    }

    // Send notifications to owner
    await sendNotificationToOwner(
      user.username,
      user.employeeID,
      user.contactNumber,
      user.email,
      user.department,
      process.env.OWNER_MAIL
    );

    console.log(`Manager approved user with employeeID: ${employeeID}`);

    res.status(200).json({
      success: true,
      message:
        "User successfully approved by the manager. Awaiting owner's approval.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to approve user by manager",
    });
  }
};


//new api
export const approveUserByOwner = async (req, res) => {
  try {
    const { employeeID } = req.body;

    // Validate employeeID
    if (typeof employeeID !== "string" || employeeID.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing employeeID",
      });
    }

    // Find user by employeeID
    const user = await Users.findOne({ employeeID });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already approved by Owner
    if (user.isApprovedByOwner) {
      return res.status(400).json({
        success: false,
        message: "User has already been approved by the Owner",
      });
    }

    //Approve user by Owner and Manager
    user.isApprovedByOwner = true;
    user.isApprovedByManager = true;
    await user.save();

    // Send notifications and password
    try {
      await sendPasswordToUser(user); // Send password to user
      await sendApprovedNotifactionToManager(
        user.employeeID,
        "kk2757910@gmail.com" // Replace with dynamic email if needed
      );
    } catch (notificationError) {
      console.error(
        "Error sending notifications or password:",
        notificationError
      );
      return res.status(500).json({
        success: false,
        message:
          "User approved, but there was an error sending notifications or password",
      });
    }

    // Send success response
    res.status(200).json({
      success: true,
      message:
        "User approved by Owner and Manager. Password sent successfully.",
    });
  } catch (error) {
    console.error("Error in approving user by Owner:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to approve user by Owner",
    });
  }
};


//new api for reject user by manager
export const rejectUserByManager = async (req, res) => {
  try {
    const { employeeID } = req.body;

    // Validate employeeID
    if (typeof employeeID !== "string" || employeeID.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing employeeID",
      });
    }

    // Check if user exists
    const user = await Users.findOne({ employeeID });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete the user
    await Users.deleteOne({ employeeID });

    // Send rejection notification to the Owner
    try {
      await sendNotificationToOwner(
        user.username,
        user.employeeID,
        user.contactNumber,
        user.email,
        user.department,
        process.env.OWNER_MAIL // Ensure the OWNER_MAIL environment variable is properly set
      );
    } catch (notificationError) {
      console.error(
        "Error sending rejection notification to Owner:",
        notificationError
      );
      return res.status(500).json({
        success: false,
        message: "User rejected, but failed to send notification to Owner",
      });
    }

    // Send success response
    res.status(200).json({
      success: true,
      message: "User rejected by Manager and notification sent to Owner",
    });
  } catch (error) {
    console.error("Error in rejecting user by Manager:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reject user by Manager",
    });
  }
};


//new api for reject user by owner
export const rejectUserByOwner = async (req, res) => {
  try {
    const { employeeID } = req.body;

    // Validate employeeID
    if (typeof employeeID !== "string" || employeeID.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing employeeID",
      });
    }

    // Check if the user exists
    const user = await Users.findOne({ employeeID });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete the user
    await Users.deleteOne({ employeeID });

    // Send success response
    res.status(200).json({
      success: true,
      message: "User rejected by Owner",
    });
  } catch (error) {
    console.error("Error in rejecting user by Owner:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reject user by Owner",
    });
  }
};

export const getUserListPartial = async ({ department, position, organizationName }) =>{
  const result = await Users.find({ department, position, organizationName }, { _id:1, username:1 });
  return result;
}

export const getUserDetail = async ({ userId }) =>{
  const user = await Users.findById(userId);
  return user
}

//new for the notapproval yet
export const getNotApprovalManagerUser = async (req, res) => {
  try {
    // Find users who have not been approved by the manager
    const unapprovedManagerUsers = await Users.find(
      { isApprovedByManager: false }, // Not approved by the manager
      { password: 0 } // Exclude sensitive fields like password from the response
    );

    // If no users are found
    if (unapprovedManagerUsers.length === 0) {
      return res.status(404).json({
        success: true,
        message: "No unapproved users found",
        unapprovedManagerUsers: [],
      });
    }

    // Return the list of unapproved users
    res.status(200).json({
      success: true,
      message: "Unapproved users fetched successfully",
      unapprovedManagerUsers,
    });
  } catch (error) {
    console.error("Error fetching unapproved users by manager:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching unapproved users by manager",
    });
  }
};


//new api for this one
export const getNotApprovalOwnerUser = async (req, res) => {
  try {
    // Find users not approved by the manager or the owner
    const unapprovedOwnerUsers = await Users.find(
      {
        $or: [
          { isApprovedByManager: false }, // Not approved by manager
          { isApprovedByOwner: false }, // Not approved by owner
        ],
      },
      { password: 0 } // Exclude sensitive fields like password from the response
    );

    // Check if no unapproved users are found
    if (unapprovedOwnerUsers.length === 0) {
      return res.status(404).json({
        success: true,
        message: "No unapproved users found",
        unapprovedOwnerUsers: [],
      });
    }

    // Return the list of unapproved users
    res.status(200).json({
      success: true,
      message: "Unapproved users fetched successfully",
      unapprovedOwnerUsers,
    });
  } catch (error) {
    console.error("Error fetching unapproved users by owner:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching unapproved users by owner",
    });
  }
};


//new api for the check the registration
export const RegistrationStatusUser = async (req, res) => {
  try {
    const { employeeID } = req.body;

    // Validate input
    if (!employeeID) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    // Find the user by employeeID
    const user = await Users.findOne({ employeeID });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Build the status message based on approval fields
    let statusMessage = "Registration Status: ";
    if (user.isApprovedByManager && user.isApprovedByOwner) {
      statusMessage +=
        "Registration Successful. Password sent to your email. Please login.";
    } else if (user.isApprovedByManager) {
      statusMessage += "Approved by Manager. Waiting for Owner approval.";
    } else {
      statusMessage += "Pending Manager approval.";
    }

    // Prepare response data
    const responseData = {
      employeeID: user.employeeID,
      username: user.username,
      email: user.email,
      contactNumber: user.contactNumber,
      organizationName: user.organizationName,
      department: user.department,
      roleInRTMS: user.roleInRTMS,
      idCardPhoto: user.idCardPhoto,
      passportPhoto: user.passportPhoto,
      isApprovedByManager: user.isApprovedByManager,
      isApprovedByOwner: user.isApprovedByOwner,
      status: statusMessage,
    };

    // Send success response
    res.status(200).json({
      success: true,
      message: "Data fetched successfully!",
      data: responseData,
    });
  } catch (error) {
    // Log the error and return failure response
    console.error("Error fetching registration status:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve user status",
    });
  }
};


//new api for sendOtplogin
export const sendOTPLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if username and password are provided
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required!",
      });
    }

    // Validate username according to the schema
    const usernamePattern = /^[a-zA-Z0-9_]{3,15}$/;
    if (!usernamePattern.test(username)) {
      return res.status(400).json({
        success: false,
        message:
          "Username must be 3-15 characters long and can only contain letters, numbers, and underscores(_).",
      });
    }

    // Find the user by username
    const user = await Users.findOne({ username });

    // Check if the user exists
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not present!",
      });
    }

    // Compare the provided password with the stored hash
    const passwordMatch = await bcrypt.compare(password, user.password);

    // Check if the password matches
    if (!passwordMatch) {
      return res.status(404).json({
        success: false,
        message: "Password doesn't match. Please enter the correct password.",
      });
    }

    // Generate a unique 6-digit OTP
    let emailOtp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    // Ensure the OTP is unique
    let emailResult = await OTP.findOne({ emailOtp });

    while (emailResult) {
      emailOtp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        specialChars: false,
        lowerCaseAlphabets: false,
      });
      emailResult = await OTP.findOne({ emailOtp });
    }

    // Create a new OTP record in the database
    const newOTP = await OTP.create({
      emailOtp,
      contactOtp: emailOtp,
      email: user.email,
      contactNumber: user.contactNumber,
    });

    // Send OTP to the user's email and phone
    await sendOTPVerificationLogin({
      email: user.email,
      mobile: user.contactNumber,
      emailOtp: emailOtp,
      contactOtp: emailOtp,
    });

    // Return success response
    return res.status(200).json({
      success: true,
      message: "OTP sent successfully! Check your email and phone.",
    });
  } catch (error) {
    console.error("Error in sending OTP:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error in sending OTP!",
    });
  }
};

// new api for user login
export const loginUser = async (req, res) => {
  try {
    const { username, password, otp } = req.body;

    // Check if username, password, and otp are provided
    if (!username || !password || !otp) {
      return res.status(400).json({
        success: false,
        message: "All fields are required!",
      });
    }

    // Find the user by username
    const user = await Users.findOne({ username });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User is not registered. Please Signup first!",
      });
    }

    // Check if the password matches the user's stored password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password. Please try again.",
      });
    }

    // Retrieve the most recent OTP for the user's email/phone
    const recentOtp = await OTP.findOne({ email: user.email }).sort({
      createdAt: -1,
    });

    if (!recentOtp) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please request a new OTP.",
      });
    }

    // Validate OTPs
    if (otp !== recentOtp.contactOtp || otp !== recentOtp.emailOtp) {
      return res.status(400).json({
        success: false,
        message: "Provided OTPs do not match the most recent OTPs.",
      });
    }

    // Delete the used OTP to prevent reuse
    await recentOtp.deleteOne();

    // Generate a JWT token for the user
    const token = jwt.sign(
      {
        _id: user._id,
        employeeID: user.employeeID,
        role: user.roleInRTMS,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return the response with the token and user data
    return res.json({
      success: true,
      message: "User logged in successfully",
      token,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        contact: user.contactNumber,
        employeeID: user.employeeID,
        organization: user.organizationName,
        department: user.department,
        role: user.roleInRTMS,
        idCard: user.idCardPhoto,
        passport: user.passportPhoto,
      },
    });
  } catch (error) {
    console.error("Error in Login Controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to login!",
    });
  }
};


//new api for password api
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email is provided
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if the user exists
    const user = await Users.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate a unique 6-digit OTP
    let emailOtp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    // Ensure OTP uniqueness
    let emailResult = await OTP.findOne({ emailOtp });

    // Regenerate OTP if the generated OTP already exists
    while (emailResult) {
      emailOtp = otpGenerator.generate(6, {
        upperCaseAlphabets: true,
        specialChars: false,
        lowerCaseAlphabets: false,
      });
      emailResult = await OTP.findOne({ emailOtp });
    }

    // Create a new OTP record in the database
    const newOTP = await OTP.create({
      emailOtp: emailOtp,
      contactOtp: emailOtp,
      email: user.email,
      contactNumber: user.contactNumber,
    });

    // Send OTP to the user's email
    await sendPasswordResetEmail(user.email, emailOtp);

    return res.status(200).json({
      success: true,
      message: "Password reset verification OTP sent to email.",
    });
  } catch (error) {
    console.error("Error in forgotPassword API:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send password reset email",
    });
  }
};

//new api for reset password api
const passwordComplexityRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

export const resetPassword = async (req, res) => {
  try {
    const { otp, newPassword, confirmPassword, email } = req.body;

    // Ensure all fields are provided
    if (!otp || !newPassword || !confirmPassword || !email) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Password and confirm password matching
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Enforce password complexity (length, letters, numbers, special characters)
    if (!passwordComplexityRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be between 8-20 characters, include uppercase, lowercase, a number, and a special character.",
      });
    }

    // Find the user by email
    const user = await Users.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Fetch the most recent OTP and check if it has expired (assuming OTP has a 10-minute expiry)
    const recentOtp = await OTP.findOne({ email }).sort({ createdAt: -1 });

    if (!recentOtp) {
      return res.status(400).json({
        success: false,
        message: "OTP not found",
      });
    }

    // Check if OTP has expired (example: 10 minutes expiry)
    const otpExpirationTime = moment(recentOtp.createdAt).add(10, "minutes");
    if (moment().isAfter(otpExpirationTime)) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Validate the OTP provided by the user
    if (otp !== recentOtp.contactOtp || otp !== recentOtp.emailOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // OTP is valid, delete the OTP record to prevent reuse
    await recentOtp.deleteOne();

    // Hash the new password before saving it
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    // Return success response
    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reset password",
    });
  }
};

// Api for getuserbyorganization
export const getUsersByOrganization = async (req, res) => {
  try {
    const { organizationName } = req.query; // Use req.query instead of req.params
    //console.log(organizationName)

    // Find users based on the organization name
    const users = await Users.find({ organizationName }).select(
      "username roleInRTMS department employeeID email contactNumber userStatus idCardPhoto passportPhoto createdAt accountStatus"
    );

    // Check if users exist for the given organization
    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No users found for organization: ${organizationName}`,
      });
    }

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching users.",
    });
  }
};

//api for getOwnerbyorganizaton
export const getOwnersByAdmin = async (req, res) => {
  try {
    // Find all owners
    const owners = await Users.find({
      roleInRTMS: "owner",
    }).select(
      "username roleInRTMS department employeeID email contactNumber userStatus organizationName createdAt"
    );

    if (!owners || owners.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No owners found in the system",
      });
    }

    // Group owners by organization
    const ownersByOrganization = owners.reduce((acc, owner) => {
      const orgName = owner.organizationName || "Unassigned";
      if (!acc[orgName]) {
        acc[orgName] = [];
      }
      acc[orgName].push(owner);
      return acc;
    }, {});

    // Get unique organization names
    const organizations = Object.keys(ownersByOrganization);

    res.status(200).json({
      success: true,
      data: {
        organizations: organizations,
        owners: owners,
        ownersByOrganization: ownersByOrganization,
        totalOwners: owners.length,
      },
    });
  } catch (error) {
    console.error("Error fetching owners:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching owners.",
      error: error.message,
    });
  }
};

export const updateUserDetails = async (req, res) => {
  try {
    const user = req.user;
    const body = req.body;

    const updateResult = await Users.updateOne(
      { _id: user._id },
      {
        $set: {
          position: body.position,
          department: body.department
        },
      }
    );
    console.log("UPDATE", updateResult);
    if (updateResult.modifiedCount == 1) {
      res.json({ message: "User updated successfully.", success: true });
    } else {
      res.status(400).json({ message: "Invalid Payload", success: false });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching owners.",
      error: error.message,
    });
  }
};
