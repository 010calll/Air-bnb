import express from "express";
import bookingRoutes from "./routes/bookingRoutes.js";
import listingRoutes from "./routes/listingRoutes.js";

const app = express();

app.use(express.json());

app.use("/api/listings", listingRoutes);
app.use("/api/bookings", bookingRoutes);

app.get("/api", (req, res) => {
  res.status(200).json({
    message: "Bienvenue sur l'API MAISON",
  });
});

export default app;
