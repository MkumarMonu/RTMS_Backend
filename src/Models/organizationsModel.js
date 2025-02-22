// import mongoose from "mongoose";

// //Department update schema
// const departmentSchema = new mongoose.Schema({
//   departmentName: {
//     type: String,
//     required: [true, "Department name is required"],
//   },
//   positions: {
//     type: [String],
//   },
//   approvalChain: [{
//     action: {
//       type: String,
//     },
//     level1: {
//       type: String,
//     },
//     level2: {
//       type: String,
//     },
//   }],
// });

// //organization update schema
// const organizationSchema = new mongoose.Schema(
//   {
//     organizationName: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     username: {
//       type: String,
//       required: true,
//     },
//     organizationlogo: {
//       type: String,
//       required: [true, "Organization Logo is Required"],
//       default: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fdribbble.com%2Fshots%2F22963525-Mahajan-Logo-Design&psig=AOvVaw1vg_MLNNACVe7imTQPab3p&ust=1728365702726000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCICitZbG-4gDFQAAAAAdAAAAABAE",
//     },
//     subtitlename: {
//       type: String,
//       required: true,
//       unique: true,
//       default: "organization Subtitle",
//     },
//     address: {
//       type: String,
//       required: true,
//       default: "abc",
//     },
//     city: {
//       type: String,
//       required: true,
//       default: "abc",
//     },
//     state: {
//       type: String,
//       required: true,
//       default: "avd",
//     },
//     country: {
//       type: String,
//       required: true,
//       default: "sddcd",
//     },
//     pinCode: {
//       type: String,
//       required: true,
//       default: "201555",
//     },
//     phone: {
//       type: String,
//       required: true,
//       default: "+915545547854",
//     },
//     fax: {
//       type: String,
//     },
//     email: {
//       type: String,
//       required: [true, "Email is required"],
//       unique: true,
//       validate: {
//         validator: (v) => /^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i.test(v),
//         message: (props) => `${props.value} is not a valid email address!`,
//       },
//       default: "owner@gmail.com",
//     },
//     departments: [departmentSchema], // Updated with department schema
//   },

// { timestamps: true }
// );

// const Organization = mongoose.model("Organization", organizationSchema);

// export default Organization;



import mongoose from "mongoose";

export const APPROVAL_KEYS = {
  DELETE_DEPARTMENT: "DELETE_DEPARTMENT",
  UPDATE_DEPARTMENT: "UPDATE_DEPARTMENT",
  DELETE_POSITION: "DELETE_POSITION",
  UPDATE_POSITION: "UPDATE_POSITION"
}

export const APPROVAL_LIST = [
  {
    approvalName: "Delete Department",
    approvalKey: APPROVAL_KEYS.DELETE_DEPARTMENT,
  },
  {
    approvalName: "Update Department",
    approvalKey: APPROVAL_KEYS.UPDATE_DEPARTMENT,
  },
  {
    approvalName: "Delete Position",
    approvalKey: APPROVAL_KEYS.DELETE_POSITION,
  },
  {
    approvalName: "Update Position",
    approvalKey: APPROVAL_KEYS.UPDATE_POSITION,
  }
]

// Department schema
const departmentSchema = new mongoose.Schema({
  departmentName: {
    type: String,
    required: [true, "Department name is required"],

  },
  positions: {
    type: [String],
  },
});

const approvalChain = new mongoose.Schema({
  approvalName: { type: String, required: true },
  approvalKey: { type: String, required: true },
  approval1: { type: Object, required: true },
  approval2: { type: Object, required: false}
})

// {
//   approvalName: "Delete Department",
//   approvalKey: "DELETE_DEPARTMENT",
//   approval1:{
//     department:"Eng",
//     level: "employee"
//      approved: "Approved"/"Rejected"
//   },
//   approval2:{
//     department: "some",
//     level: "some"
//   }
// }


// Organization schema
const organizationSchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    organizationlogo: {
      type: String,
      required: [true, "Organization Logo is required"],
      default: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fdribbble.com%2Fshots%2F22963525-Mahajan-Logo-Design&psig=AOvVaw1vg_MLNNACVe7imTQPab3p&ust=1728365702726000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCICitZbG-4gDFQAAAAAdAAAAABAE",
    },
    subtitlename: {
      type: String,
      required: true,
      unique: true,
      default: "Organization Subtitle",
    },
    address: {
      type: String,
      required: true,
      default: "abc",
    },
    city: {
      type: String,
      required: true,
      default: "abc",
    },
    state: {
      type: String,
      required: true,
      default: "avd",
    },
    country: {
      type: String,
      required: true,
      default: "sddcd",
    },
    pinCode: {
      type: String,
      required: true,
      default: "201555",
    },
    phone: {
      type: String,
      required: true,
      default: "+915545547854",
    },
    fax: {
      type: String,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      validate: {
        validator: (v) =>
          /^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i.test(v),
        message: (props) =>
          `${props.value} is not a valid email address!`,
      },
      default: "owner@gmail.com",
    },
    departments: {
      type: [departmentSchema],
    },
    approvalChain:{
      type: [approvalChain]
    },
    wells: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Well",
      },
    ],
    organizationId: { type: Number, required: true }
  },
  { timestamps: true }
);


const Organization = mongoose.model("Organization", organizationSchema);

export default Organization;


