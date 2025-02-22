import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      validate: {
        validator: (v) => /^[a-zA-Z0-9_]{3,30}$/.test(v),
        message:
          "Username must be 3-30 characters long and can only contain letters, numbers, and underscores.",
      },
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      validate: {
        validator: (v) => /^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i.test(v),
        message: (props) => `${props.value} is not a valid email address!`,
      },
    },
    contactNumber: {
      type: String,
      required: [true, "Contact number is required"],
      validate: {
        validator: (v) => /^\+91[0-9]{10}$/.test(v),
        message:
          "Contact number must be in the format '+91XXXXXXXXXX' and include the '+91' prefix Without any Space.",
      },
    },
    employeeID: {
      type: String,
      required: [true, "Employee ID is required"],
      unique: true,
      validate: {
        validator: (v) => /^[a-zA-Z0-9_]{3,20}$/.test(v),
        message:
          "Employee ID must be 5-20 characters long and can only contain letters, numbers, and underscores.",
      },
    },

    organizationName: {
      type: String,
      required: [true, "Asset name is required"],
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      default: "DEP1",
    },
    roleInRTMS: {
      type: String,
      required: [true, "Role in RTMS is required"],
      enum: {
        values: ["manager", "owner", "employee", "admin"],
        message:
          "Role must be either 'manager', 'owner', or 'employee', 'admin'.",
      },
      default: "employee",
    },
    idCardPhoto: {
      type: String,
      required: [true, "ID card photo is required"],
      default:
        "https://iconape.com/wp-content/files/cg/369857/svg/id-card-logo-icon-png-svg.png",
    },
    passportPhoto: {
      type: String,
      required: [true, "Passport photo is required"],
      default: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    },
    isApprovedByManager: {
      type: Boolean,
      default: false,
    },
    isApprovedByOwner: {
      type: Boolean,
      default: false,
    },
    position: { type: String, require: false },
    approvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Users = mongoose.model("Users", userSchema);

export default Users;

// import mongoose from "mongoose";
// const signupAttemptSchema = new mongoose.Schema({
//   email: {
//     type: String,
//     required: [true, "Email is required"],
//     trim: true,
//     lowercase: true,
//     validate: {
//       validator: (v) => /^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i.test(v),
//       message: (props) => `${props.value} is not a valid email address!`,
//     },
//   },
//   contactNumber: {
//     type: String,
//     required: [true, "Contact number is required"],
//     validate: {
//       validator: (v) => /^\+91[0-9]{10}$/.test(v),
//       message: "Contact number must be in the format '+91XXXXXXXXXX'.",
//     },
//   },
//   attempts: {
//     type: Number,
//     default: 1,
//     min: [1, "Minimum attempts is 1"],
//     max: [2, "Maximum of 2 attempts allowed per hour"],
//   },
//   lastAttemptTime: {
//     type: Date,
//     default: Date.now,
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'completed', 'blocked'],
//     default: 'pending',
//   }
// }, { timestamps: true });
// const userSchema = new mongoose.Schema({
//   username: {
//     type: String,
//     required: [true, "Username is required"],
//     unique: true,
//     trim: true,
//     validate: {
//       validator: (v) => /^[a-zA-Z0-9_]{3,30}$/.test(v),
//       message: "Username must be 3-30 characters long and can only contain letters, numbers, and underscores.",
//     },
//   },
//   password: {
//     type: String,
//     minlength: [6, "Password must be at least 6 characters long"],
//     select: false, // Prevents password from being returned in query results
//   },
//   email: {
//     type: String,
//     required: [true, "Email is required"],
//     unique: true,
//     trim: true,
//     lowercase: true,
//     validate: {
//       validator: (v) => /^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i.test(v),
//       message: (props) => `${props.value} is not a valid email address!`,
//     },
//   },
//   contactNumber: {
//     type: String,
//     required: [true, "Contact number is required"],
//     unique: true,
//     validate: {
//       validator: (v) => /^\+91[0-9]{10}$/.test(v),
//       message: "Contact number must be in the format '+91XXXXXXXXXX' and include the '+91' prefix Without any Space.",
//     },
//   },
//   employeeID: {
//     type: String,
//     required: [true, "Employee ID is required"],
//     unique: true,
//     validate: {
//       validator: (v) => /^[a-zA-Z0-9_]{3,20}$/.test(v),
//       message: "Employee ID must be 5-20 characters long and can only contain letters, numbers, and underscores.",
//     },
//   },
//   organizationName: {
//     type: String,
//     required: [true, "Organization name is required"],
//     trim: true,
//   },
//   department: {
//     type: String,
//     required: [true, "Department is required"],
//     default: "DEP1",
//     trim: true,
//   },
//   roleInRTMS: {
//     type: String,
//     required: [true, "Role in RTMS is required"],
//     enum: {
//       values: ["manager", "owner", "employee", "admin"],
//       message: "Role must be either 'manager', 'owner', 'employee', or 'admin'.",
//     },
//     default: "employee",
//   },
//   idCardPhoto: {
//     type: String,
//     required: [true, "ID card photo is required"],
//     default: "https://iconape.com/wp-content/files/cg/369857/svg/id-card-logo-icon-png-svg.png",
//   },
//   passportPhoto: {
//     type: String,
//     required: [true, "Passport photo is required"],
//     default: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
//   },
//   isApprovedByManager: {
//     type: Boolean,
//     default: false,
//   },
//   isApprovedByOwner: {
//     type: Boolean,
//     default: false,
//   },
//   approvedAt: {
//     type: Date,
//   },
//   // New fields for additional tracking and security
//   lastLogin: {
//     type: Date,
//   },
//   loginAttempts: {
//     type: Number,
//     default: 0,
//     max: [5, "Maximum login attempts exceeded"],
//   },
//   isLocked: {
//     type: Boolean,
//     default: false,
//   },
//   lockUntil: {
//     type: Date,
//   },
//   accountStatus: {
//     type: String,
//     enum: ['active', 'inactive', 'suspended'],
//     default: 'inactive',
//   }
// }, {
//   timestamps: true,
//   // Add a pre-save middleware to handle login attempts
//   methods: {
//     incrementLoginAttempts() {
//       // If we have a previous lock that has expired, restart at 1
//       if (this.lockUntil && this.lockUntil < Date.now()) {
//         this.loginAttempts = 1;
//         this.isLocked = false;
//         this.lockUntil = undefined;
//       }
//       // Increment and potentially lock the account
//       this.loginAttempts += 1;
//       if (this.loginAttempts >= 5) {
//         this.isLocked = true;
//         this.lockUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour lock
//       }
//       return this.save();
//     },
//     resetLoginAttempts() {
//       this.loginAttempts = 0;
//       this.isLocked = false;
//       this.lockUntil = undefined;
//       return this.save();
//     }
//   }
// });
// // Create models
// const Users = mongoose.model("Users", userSchema);
// const SignupAttempt = mongoose.model("SignupAttempt", signupAttemptSchema);
// export { Users, SignupAttempt };
// export default Users;