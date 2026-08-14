import axios from "axios";
import { env } from "../config/serverConfig.js";

class OrderClient {
  async getOrderById(orderId) {
    try {
      const response = await axios.get(
        `${env.ORDER_SERVICE_URL}/api/v1/orders/${orderId}`,
      );

      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("Order not found");
      }

      console.error(
        "Order Service Error:",
        error.response?.data || error.message,
      );

      throw new Error("Order Service is unavailable");
    }
  }
}

export default OrderClient;
