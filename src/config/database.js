import mongoose from "mongoose";
import { env } from "./serverConfig.js";

const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URL);
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

export default connectDB;
