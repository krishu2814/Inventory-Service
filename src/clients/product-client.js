import axios from "axios";
import { env } from "../config/serverConfig.js";

class ProductClient {
  async getProductById(productId, authorization) {
    try {
      if (!authorization) {
        throw new Error("Authorization header is missing or invalid");
      }

      const response = await axios.get(
        `${env.PRODUCT_SERVICE_URL}/api/v1/products/${productId}`,
        {
          headers: {
            Authorization: authorization,
          },
        },
      );

      return response.data.data;
    } catch (error) {
      console.error(
        "Product Service error:",
        error.response?.data || error.message,
      );

      if (error.response?.status === 404) {
        throw new Error("Product not found");
      }

      if (error.response?.status === 401) {
        throw new Error("Unauthorized request to Product Service");
      }

      throw new Error("Product Service is unavailable");
    }
  }
}

export default ProductClient;
