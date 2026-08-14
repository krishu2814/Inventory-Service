import express from "express";

import apiV1Routes from "./v1/index.js";
import reservationRoutes from "./v1/reservation-routes.js";

const router = express.Router();

router.use("/v1/inventory", apiV1Routes);
router.use("/v1/reservations", reservationRoutes);

export default router;
