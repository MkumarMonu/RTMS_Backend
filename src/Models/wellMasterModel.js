import mongoose from "mongoose";


// Define Normal Alert Schema
const normalAlertSchema = new mongoose.Schema({
  normalalert: { type: String, default: "" },
  condition: { type: String, enum: ["High", "Low"], default: "Low" },
  description: { type: String, trim: true, default: "" },
  deadband:{type: String, trim: true, default: ""}, //check
});

// Define Critical Alert Schema
const criticalAlertSchema = new mongoose.Schema({
  criticalalert: { type: String, default: "" },
  condition: { type: String, enum: ["High", "Low"], default: "High" },
  description: { type: String, trim: true, default: "" },
  deadband:{type: String, trim: true, default: ""}, //check
});

// Parameter Schema
const parameterSchema = new mongoose.Schema({
  process:{
    type: String,
    enum: ["Temperature","Pressure","Level","Flow Rate","Speed","Solar Power", "Voltage", "Current","Frequency","Power","Battery Power"],
  },
  ports:{
    type:String,
    enum:["1","2","3","4","5","6"],
  },
  displayName:{
    type: String,
    trim: true,
  },
  description:{
    type: String,
    trim: true,
  },
  unit:{
    type: String,
    enum:["°C","Kg/cm²","%","meter","centimeter","m³/H","galon/H","rpm","Volt","ampere","hz","KWH","0-3V","0-100mV"], 
    // required:false,
    default:"",
  },
  sensorOutput:{
    type: String,
  },
  valueMinimum:{
    type:Number,
  },
  valueMaximum:{
    type: Number,
  },
  normalAlert:{
    type: normalAlertSchema,
    default: () => ({}),
  },
  criticalAlert:{
    type: criticalAlertSchema,
    default: () => ({}),
  },
})

// Updated Pressure Schema with two fields
const pressureSchema = new mongoose.Schema({
  pressure1: {
    type: String,
    enum: ["GIP", "THP", "CHP"], // Predefined values for parameters
    required: true,
  },
  valueLessThan1:{
   type:Number,
   required:false,
  },
  valueGreaterThan1:{
    type:Number,
    required:false,
  },
  comparison: {
    type: String,
    enum: ["&&", "OR"], // Predefined comparison operators
    required: true,
  },
  pressure2: {
    type: String,
    enum: ["GIP", "THP", "CHP"], // Predefined values for parameters
    required: true,
  },
  valueLessThan2:{
    type:Number,
    required:false,
  },
  valueGreaterThan2:{
    type:Number,
    required:false,
  }
  
});

// Define Alarm Settings Schema with Normal and Critical Alerts
// const alarmSettingsSchema = new mongoose.Schema({
//   gip: {
//     normalAlert: { type: normalAlertSchema, default: () => ({}) },
//     criticalAlert: { type: criticalAlertSchema, default: () => ({}) },
//   },
//   chp: {
//     normalAlert: { type: normalAlertSchema, default: () => ({}) },
//     criticalAlert: { type: criticalAlertSchema, default: () => ({}) },
//   },
//   thp: {
//     normalAlert: { type: normalAlertSchema, default: () => ({}) },
//     criticalAlert: { type: criticalAlertSchema, default: () => ({}) },
//   },
//   lowBattery: {
//     normalAlert: { type: normalAlertSchema, default: () => ({}) },
//     criticalAlert: { type: criticalAlertSchema, default: () => ({}) },
//   },
//   solarVoltage: {
//     normalAlert: { type: normalAlertSchema, default: () => ({}) },
//     criticalAlert: { type: criticalAlertSchema, default: () => ({}) },
//   },
// });

// Define Flowing and Not-Flowing Schemas
const flowingSchema = new mongoose.Schema({
  pressures: { type: [pressureSchema], default: [] }, // Multiple pressures for Flowing
});

const notFlowingSchema = new mongoose.Schema({
  pressures: { type: [pressureSchema], default: [] }, // Multiple pressures for Not Flowing
});

// Define Well Settings Schema
const wellSettingsSchema = new mongoose.Schema({
  wellNumber: { type: String, required: true },
  landmark: { type: String, trim: true },
  latitude: { type: Number, min: -90, max: 90 },
  longitude: { type: Number, min: -180, max: 180 },
  dip:{type: String, trim: true},
  wellParameter:{
    type: [parameterSchema],
  },
  nodeId: { type: Number},//made changes here
  // alarmSettings: { type: alarmSettingsSchema, default: () => ({}) },
  nodeData: {type:mongoose.Schema.Types.ObjectId, ref:'ExternalDevice'},
  flowing: { type: flowingSchema, default: () => ({ pressures: [] }) }, // Flowing settings
  notFlowing: { type: notFlowingSchema, default: () => ({ pressures: [] }) }, // Not-Flowing settings
});

// Define Well Type Schema
const wellTypeSchema = new mongoose.Schema({
  wellType: { type: String, required: true},
  wells: {
    type: [wellSettingsSchema],
    validate: {
      validator: function (v) {
        const wellNumbers = v.map((well) =>
          well.wellNumber.toString().trim().toLowerCase()
        );
        return wellNumbers.length === new Set(wellNumbers).size;
      },
      message: "Well numbers must be unique within each well type.",
    },
  },
});

// Define Installation Schema
const installationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  wellTypes: {
    type: [wellTypeSchema],
    validate: {
      validator: function (v) {
        const wellTypeNames = v.map((type) =>
          type.wellType.toString().trim().toLowerCase()
        );
        return wellTypeNames.length === new Set(wellTypeNames).size;
      },
      message: "Well types must be unique within each installation.",
    },
  },
});

// Main Well Schema
const wellSchema = new mongoose.Schema(
  {
    location: { type: String, required: true, unique: true, trim: true },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    installations: {
      type: [installationSchema],
      validate: {
        validator: function (v) {
          const installationNames = v.map((inst) =>
            inst.name.toString().trim().toLowerCase()
          );
          return installationNames.length === new Set(installationNames).size;
        },
        message: "Installation names must be unique.",
      },
    },
  },
  { timestamps: true }
);


// Create and export the Well model
const Well = mongoose.model("Well", wellSchema);

export default Well;