import MessageBox from "../Models/messageBoxSchema.js";
import Operation from "../Models/operationModel.js";
import { getUserDetail } from "./usersController.js";
import { getApprovalChainByKey } from "./organizationController.js"

export const sendMessage = async ({
  userId,
  heading,
  subject,
  content,
  action,
  actionData,
}) => {
  try {
    await MessageBox.create({
      userId,
      heading,
      subject,
      content,
      action,
      actionData,
      createdAt: new Date()
    });
    return { success: true, message: "Message Sent" };
  } catch (error) {
    return { success: false, error: error, message: "Message not sent" };
  }
};

export const getMessages = async (req, res) => {
  const user = req.user;
  const result = await MessageBox.find({ userId: user._id }, { sentBy: 1, subject: 1, createdAt: 1 });
  res.json(result);
};

export const getMessageDetail = async (req, res) =>{
  const user = req.user;
  const messageId = req.query.messageId;

  const result = await MessageBox.findOne({ _id: messageId, userId: user._id });
  if(result) {
    const operationInfo = await Operation.findOne({ _id: result.actionData.operationId }).lean();
    if(operationInfo) {
      const approvalChainInfo = await getApprovalChainByKey(operationInfo.approvalChainKey,
        operationInfo.organizationName);
      operationInfo.requiredVerificationLevel2 = 2
      operationInfo.hideAcceptReject = false;

      if(operationInfo.approval1 && operationInfo.approval1.userId &&   operationInfo.approval1.status === APPROVAL_STATUS.Approved){
        operationInfo.requiredVerificationLevel2 = 2;
        const userInfo = await getUserDetail({ userId: user._id });
        if(userInfo.department == approvalChainInfo.approval1.department && userInfo.position == approvalChainInfo.approval1.level){
          operationInfo.hideAcceptReject = true
        }
      }
      if(  operationInfo.approval1.status === APPROVAL_STATUS.Approved){
        operationInfo.hideAcceptReject = true
      }
      result.actionData = { operationId: operationInfo._id,  operationInfo}
    }
    res.json(result)
  }
  else res.status(400).json({success: false, message: "Message not found"})
}