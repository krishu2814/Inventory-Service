import axios from "axios";
import { env } from "../config/serverConfig.js";

class ProductClient {
  async getProductById(productId, authorization = null) {
    try {
      const config = {
        timeout: 5000, // 5s timeout to prevent hanging connections
        headers: {},
      };

      // Forward JWT when request came from HTTP API
      if (authorization) {
        config.headers = {
          Authorization: authorization,
        };
      }

      const response = await axios.get(
        `${env.PRODUCT_SERVICE_URL}/api/v1/${productId}`,
        config
      );

      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("Product not found");
      }

      console.error(
        "Product Service Error:",
        error.response?.data || error.message,
      );

      throw new Error("Product Service is unavailable");
    }
  }
}

export default ProductClient;
