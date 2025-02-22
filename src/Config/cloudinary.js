import { v2 as cloudinary } from "cloudinary";

const connectCloudinary = async () => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_APIKEY,
      api_secret: process.env.CLOUDINARY_SECRETKEY,
    });
    console.log("Cloudinary Connected");
  } catch (error) {
    console.log("Cloudinary Not Connected");
    console.log(error);
  }
};
export default connectCloudinary;
