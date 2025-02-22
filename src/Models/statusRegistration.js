const userSchema = new mongoose.Schema(
  {
    username: String,
    email: String,
    contactNumber: String,
    employeeID: String,
    organizationName: String,
    department: String,
    roleInRTMS: String,
    idCardPhoto: String,
    passportPhoto: String,

    managerApproval: {
      type: Boolean,
      default: false,
    },

    approvedAt: {
      type: Date,
    },

    ownerApproval: {
      type: Boolean,
      default: false,
    },

    approvedAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Approved by Manager",
        "Approved by Owner",
        "Registration Successful",
      ],
      default: "Pending",
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
