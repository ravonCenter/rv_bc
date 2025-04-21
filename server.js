const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const newsRoutes = require("./routes/handlesNewsRoute");
const tripsRoute = require("./routes/handleTripsRoute");
const studentsRoute = require("./routes/handleStudentsRoute");
const radioRoute = require("./routes/handleRadioRoute");
const deleteRequestStudent=require("./controllers/handleStudentsController")

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cors());

app.use("/news", newsRoutes);
app.use("/trips", tripsRoute);
app.use("/students", studentsRoute);
app.use("/radio", radioRoute);

app.all("*", (req, res) => {
  res.status(404).send(`Unknown route: ${req.url}`);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
