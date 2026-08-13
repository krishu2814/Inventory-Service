import express from "express";
import { env } from "./config/serverConfig.js";
import connectDB from "./config/database.js";
import apiRoutes from "./routes/index.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/api", apiRoutes);

const setUpAndStartServer = () => {
  connectDB();

  app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
  });
};

setUpAndStartServer();
