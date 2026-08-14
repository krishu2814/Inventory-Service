import axios from "axios";
import { env } from "../config/serverConfig.js";

class ProductClient {
  constructor() {
    this.client = axios.create({
      baseURL: env.PRODUCT_SERVICE_URL,
      timeout: 5000,
    });
  }

  async getProductById(productId) {
    try {
      const response = await this.client.get(`/api/v1/products/${productId}`);

      if (!response.data?.success) {
        throw new Error("Product not found");
      }

      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("Product not found");
      }

      if (error.code === "ECONNREFUSED") {
        throw new Error("Product Service is unavailable");
      }

      if (error.code === "ECONNABORTED") {
        throw new Error("Product Service request timed out");
      }

      throw new Error(
        error.response?.data?.message ||
          "Failed to communicate with Product Service",
      );
    }
  }
}

export default ProductClient;
