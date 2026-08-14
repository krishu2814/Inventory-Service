import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: process.env.PORT || 3000,
  MONGO_URL: process.env.MONGO_URL,
  SECRET_TOKEN: process.env.SECRET_TOKEN,
  PRODUCT_SERVICE_URL: process.env.PRODUCT_SERVICE_URL,
};
