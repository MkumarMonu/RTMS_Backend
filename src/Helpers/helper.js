import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import twilio from "twilio";
import { v2 as cloudinary } from "cloudinary";

// Create a transporter using your email service provider
const transporter = nodemailer.createTransport({
  service: "gmail", // or another email service provider
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_EMAIL_PASSWORD,
  },
});

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Send OTP Verification code for register
export const sendOTPVerification = async ({
  email,
  mobile,
  emailOtp,
  contactOtp,
}) => {
  try {
    // Mail options
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Verify Your Email and Mobile",
      html: `<p>Enter <b>${emailOtp}</b> in the app to verify email address and mobile number and complete the signup process.</p><p>This code <b>expires in 15 Minutes </b>.</p>`,
    };

    // Send email OTP
    await transporter.sendMail(mailOptions);

    // Send OTP to mobile as well
    const smsOptions = {
      body: `Your OTP is ${contactOtp}.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobile,
    };

    const smsResponse = await twilioClient.messages.create(smsOptions);
    console.log("SMS sent successfully:", smsResponse.sid);
  } catch (error) {
    console.log("OTP not sent. Issue:", error.message || error);
  }
};

// Send OTP Verification code for Login
export const sendOTPVerificationLogin = async ({
  email,
  mobile,
  emailOtp,
  contactOtp,
}) => {
  try {
    // Mail options
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Verify Your Email and Mobile",
      html: `<p>Enter <b>${emailOtp}</b> in the app to verify email address and mobile number and complete the Login process.</p><p>This code <b>expires in 15 minutes </b>.</p>`,
    };

    // Send email OTP
    await transporter.sendMail(mailOptions);

    // Send OTP to mobile as well
    const smsOptions = {
      body: `Your OTP is ${contactOtp}.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobile,
    };

    const smsResponse = await twilioClient.messages.create(smsOptions);
    console.log("SMS sent successfully:", smsResponse.sid);
  } catch (error) {
    console.log("OTP not sent. Issue:", error.message || error);
  }
};

// Email helper function
export const sendPasswordResetEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: email,
    subject: "Password Reset Request",
    html: `<p>Verification Code: ${otp}</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
};

// Notify the manager
export const sendNotificationToManager = async (
  username,
  employeeID,
  contactNumber,
  email,
  department,
  managerEmail
) => {
  try {
    const managerMailOptions = {
      from: process.env.AUTH_EMAIL,
      to: managerEmail,
      subject: "New User Registration Awaiting Approval",
      html: `<p>A new user has been registered and has want to approval. User details:</p>
           <ul>
             <li>Username: ${username}</li>
             <li>Email: ${email}</li>
             <li>Contact Number: ${contactNumber}</li>
             <li>Employee ID: ${employeeID}</li>
             <li>Department: ${department}</li>
           </ul>
           <p>Please review and approve the request.</p>`,
    };

    await transporter.sendMail(managerMailOptions);
  } catch (err) {
    console.log("Mail not send to manager");
  }
};

// Notify the Owner
export const sendNotificationToOwner = async (
  username,
  employeeID,
  contactNumber,
  email,
  department,
  ownerEmail
) => {
  try {
    const OwnerMailOptions = {
      from: process.env.AUTH_EMAIL,
      to: ownerEmail,
      subject:
        "New User Registration Awaiting Approval and it is already approve by Manager",
      html: `<p>A new user has been registered and has been approved by the Manager. User details:</p>
           <ul>
             <li>Username: ${username}</li>
             <li>Email: ${email}</li>
             <li>Contact Number: ${contactNumber}</li>
             <li>Employee ID: ${employeeID}</li>
             <li>Department: ${department}</li>
           </ul>
           <p>Please review and approve the request.</p>`,
    };

    await transporter.sendMail(OwnerMailOptions);
  } catch (err) {
    console.log("Mail not send to Owner");
  }
};

//send password to user
export const sendPasswordToUser = async (user) => {
  const newPassword = generatePassword();

  // Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  // Update user's password
  user.password = hashedPassword;
  await user.save();

  // Email options
  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: user.email,
    subject: "Your Account Password",
    html: `<p>Your account has been approved. Your new password is <b>${newPassword}</b>. Please use this to log in.</p>`,
  };

  // SMS options
  const smsOptions = {
    body: `Your account has been approved. Your new password is ${newPassword}. Please use this to log in.`,
    to: user.contactNumber,
    from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number
  };

  try {
    // Send email
    await transporter.sendMail(mailOptions);

    // Send SMS
    // await twilioClient.messages.create(smsOptions);
  } catch (error) {
    console.error("Error sending password:", error);
    throw new Error("Failed to send password");
  }
};

//approved owner mail to manager and user
export const sendApprovedNotifactionToManager = async (
  employeeID,
  managerEmail
) => {
  // Email options
  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: managerEmail,
    subject: "Your Account Password",
    html: `<p>This Employee id approved by Owner ${employeeID}`,
  };

  try {
    // Send email
    await transporter.sendMail(mailOptions);

    // Send SMS
  } catch (error) {
    console.error("Error sending password:", error);
    throw new Error("Failed to send password");
  }
};

//upload a image
export const uploadCloudinary = async (file, folder, height, quality) => {
  const options = { folder };

  if (height) {
    options.height = height;
  }
  if (quality) {
    options.quality = quality;
  }

  options.resource_type = "auto";

  return await cloudinary.uploader.upload(file.tempFilePath, options);
};

// to Generated password
const generatePassword = () => {
  return Math.random().toString(36).slice(-8);
};

// Add Well Function to send the email with dynamic content
export const sendWellNotificationToOwner = async (
  ownerToEmail,
  subject,
  htmlContent
) => {
  try {
    const ownerWellSendOption = {
      from: process.env.AUTH_EMAIL,
      to: ownerToEmail,
      subject: subject, // Dynamic subject
      html: htmlContent, // Dynamic HTML content
    };

    await transporter.sendMail(ownerWellSendOption);
    // console.log("Mail sent successfully to Owner");
  } catch (error) {
    console.log("Mail not sent to Owner", error);
  }
};

//AMIN PAGE HELPER FUNCTION

//Send Org SETUP To User
export const sendNewCreateOrganization = async (
  username,
  organizationName,
  contactNumber,
  email,
  password,
) => {
  try {
    const OrgOwnerMailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: email,
      subject: "New Organization Created! detail Given",
      html: `<p>A new Organization has been Created. :Organization details:</p>
           <ul>
             <li>Username: ${username}</li>
             <li>Email: ${email}</li>
             <li>Contact Number: ${contactNumber}</li>
             <li>Organization Name: ${organizationName}</li>
             <li>Password: ${password}</li>
           </ul>
           <p>Please review.</p>`,
    };

    await transporter.sendMail(OrgOwnerMailOptions);
  } catch (err) {
    console.log("Mail not send to Org Owner",err);
  }
};

//notification for well alert
// For Well and Node Notification page (Owner)
export const sendWellAllertNotificationToOwner = async (
  wellDetails,
  ownerEmail,
  consolidatedNotifications
) => {
  try {
    const subject = `Alerts for Well ${wellDetails.wellNumber}`;

    // Generate the list of consolidated issues
    const consolidatedIssues = consolidatedNotifications
      .map(
        (n) =>
          `<ul>
            <li><strong>Sensor:</strong> ${n.sensorKey}</li>
            <li><strong>Value:</strong> ${n.sensorValue}</li>
            <li><strong>Status:</strong> ${n.notificationStatus}</li>
            <li><strong>Description:</strong> ${n.notificationDescription}</li>
          </ul>`
      )
      .join("");

    // Complete email content
    const htmlContent = `
      <p>Dear Owner,</p>
      <p>The following alerts were generated for Well ${wellDetails.wellNumber}:</p>
      <ul>
        <li><strong>Well Number:</strong> ${wellDetails.wellNumber}</li>
        <li><strong>Well Type:</strong> ${wellDetails.wellType}</li>
        <li><strong>Location:</strong> ${wellDetails.wellLocation}</li>
        <li><strong>Installation:</strong> ${wellDetails.wellInstallation}</li>
        <li><strong>Node ID:</strong> ${wellDetails.nodeID}</li>
      </ul>
      <p><strong>Node Sensor Status:</strong></p>
      ${consolidatedIssues}
      <p>Please take the necessary actions.</p>
    `;

    const emailOptions = {
      from: process.env.AUTH_EMAIL,
      to: ownerEmail,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(emailOptions);
    // console.log("Mail sent successfully to Owner");
  } catch (error) {
    console.log("Mail not sent to Owner", error);
  }
};

// For Well and Node Notification page (Manager)
export const sendWellAlertNotificationToManager = async (
  wellDetails,
  managerEmail,
  consolidatedNotifications
) => {
  try {
    const subject = `Alerts for Well ${wellDetails.wellNumber}`;

    // Generate the list of consolidated issues
    const consolidatedIssues = consolidatedNotifications
      .map(
        (n) =>
          `<ul>
            <li><strong>Sensor:</strong> ${n.sensorKey}</li>
            <li><strong>Value:</strong> ${n.sensorValue}</li>
            <li><strong>Status:</strong> ${n.notificationStatus}</li>
            <li><strong>Description:</strong> ${n.notificationDescription}</li>
          </ul>`
      )
      .join("");

    // Complete email content
    const htmlContent = `
      <p>Dear Manager,</p>
      <p>The following alerts were generated for Well ${wellDetails.wellNumber}:</p>
      <ul>
        <li><strong>Well Number:</strong> ${wellDetails.wellNumber}</li>
        <li><strong>Well Type:</strong> ${wellDetails.wellType}</li>
        <li><strong>Location:</strong> ${wellDetails.wellLocation}</li>
        <li><strong>Installation:</strong> ${wellDetails.wellInstallation}</li>
        <li><strong>Node ID:</strong> ${wellDetails.nodeID}</li>
      </ul>
      <p><strong>Node Sensor Status:</strong></p>
      ${consolidatedIssues}
      <p>Please take the necessary actions.</p>
    `;

    const emailOptions = {
      from: process.env.AUTH_EMAIL,
      to: managerEmail,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(emailOptions);
    // console.log("Mail sent successfully to Manager");
  } catch (error) {
    console.log("Mail not sent to Manager", error);
  }
};
