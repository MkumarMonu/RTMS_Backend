import mongoose from "mongoose";
const connectToMongodb = async () => {
  try {
    await mongoose.connect(process.env.MONGODBURL).then(() =>
      // console.log("Database is connected and URI is:", process.env.MONGODBURL)
    // console.log(MONGODBURL,"ddd"),
    //console
      console.log("Database is connected")
    );
  } catch (error) {
    console.log(
      "Connecting to MongoDB Failed with URI:",
      process.env.MONGODBURL,
      "Error is:",
      error.message
    );
  }
};
export default connectToMongodb;