import express from "express";
import {
  approveNotificationByEmployee,
  approveNotificationByManager,
  approveNotificationByOwner,
  closeComplaint,
  closeWithComment,
  convertToComplaint,
  getComplaints,
  getNotifications,
} from "../Controllers/notificationController.js";
import {
  isManager,
  isOwner,
  protectRoute,
} from "../Middleware/protectedRoutes.js";
import { authorize } from "../Helpers/authGuard.js";

const notificationRouter = express.Router();

//routes to call api of notification
notificationRouter.post(
  "/approve-notification-by-employee",
  approveNotificationByEmployee
);
notificationRouter.post(
  "/approve-notification-by-manager",
  protectRoute,
  isOwner,
  approveNotificationByManager
);
notificationRouter.post(
  "/approve-notification-by-owner",
  protectRoute,
  isManager,
  approveNotificationByOwner
);

notificationRouter.get('/get-notifications', authorize(), getNotifications);
notificationRouter.post('/close-with-comment-notification', authorize(), closeWithComment);
notificationRouter.post('/convert-to-complaint', authorize(), convertToComplaint);

notificationRouter.get('/get-complaints', authorize(), getComplaints);
notificationRouter.post("/close-complaint",authorize(), closeComplaint);

export default notificationRouter;
