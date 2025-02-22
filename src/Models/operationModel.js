import mongoose from "mongoose";

export const ENTITY = {
  department: "Department",
  position: "Position",
};

export const OPERATION_TYPE = {
  delete: "delete",
  update: "update",
};

export const APPROVAL_STATUS = {
  Approved: "Approved",
  Rejected: "Rejected"
}

const operationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  organizationName: { type: String, required: true},
  operationType: { type: String, required: true }, // UPDATE, DELETE 
  entityName: { type: String, required: true}, // department or position, etc
  filterCondition: { type: Object, required: true }, // data to filter
  approvalChainKey: { type: String, required: true }, // approval chain key
  approval1: { type: Object, required: false},
  approval2: { type: Object, required: false }, //approved: "Approved"/"Rejected"
  data:{ type: Object, required: false },
  createdAt: { type: Date, required: true }
});

export const Operation = mongoose.model("Operation", operationSchema);

export default Operation;

// approval1 - will contain userId status, timestamp