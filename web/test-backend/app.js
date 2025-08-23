// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { configDotenv } from "dotenv";

configDotenv();

const app = express();
app.use(cors());
app.use(express.json());

// --------------------
// MongoDB Connection
// --------------------
mongoose.connect("mongodb://localhost:27017/hospital", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// --------------------
// Models
// --------------------
const appointmentSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  doctorName: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  reason: { type: String, required: false }, // Optional
});

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  timings: { type: String, required: true },
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
const Doctor = mongoose.model("Doctor", doctorSchema);

// --------------------
// Routes
// --------------------

// Create appointment
app.post("/appointments", async (req, res) => {
  try {
    const appt = new Appointment(req.body);
    await appt.save();
    res.json({ message: "Appointment booked successfully", appointment: appt });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all appointments
app.get("/appointments", async (req, res) => {
  const appointments = await Appointment.find();
  res.json({ appointments });
});

// Clear all appointments
app.delete("/appointments", async (req, res) => {
  await Appointment.deleteMany({});
  res.json({ message: "All appointments cleared" });
});

// Create doctor
app.post("/doctors", async (req, res) => {
  try {
    const doctor = new Doctor(req.body);
    await doctor.save();
    res.json({ message: "Doctor added successfully", doctor });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all doctors
app.get("/doctors", async (req, res) => {
  const doctors = await Doctor.find();
  res.json({ doctors });
});

// Clear all doctors
app.delete("/doctors", async (req, res) => {
  await Doctor.deleteMany({});
  res.json({ message: "All doctors cleared" });
});

// --------------------
// Start Server
// --------------------
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
