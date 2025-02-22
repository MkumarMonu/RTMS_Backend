import express from "express";
import { authorize } from "../Helpers/authGuard.js";
import { approvalRejectLevel2, approveRejectLevel1 } from "../Controllers/operationService.js";
const router = express.Router();

router.post('/approve-level-1', authorize(), approveRejectLevel1);
router.post('/approve-level-2', authorize(), approvalRejectLevel2);

export default router;