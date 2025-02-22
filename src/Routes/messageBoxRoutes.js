import express from "express";
import { authorize } from "../Helpers/authGuard.js";
import { getMessageDetail, getMessages } from "../Controllers/messageBoxService.js";
const router = express.Router();

router.get('/get-message-list', authorize(), getMessages);
router.get('/get-message-detail', authorize(), getMessageDetail);

export default router