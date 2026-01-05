const express = require("express");
const cors = require("cors");
require("dotenv/config");
const connectDB = require("./config/mongodb.js");
const connectCloudinary = require("./config/cloudinary.js");
const userRouter = require("./routes/userRoute.js");
const doctorRouter = require("./routes/doctorRoute.js");
const adminRouter = require("./routes/adminRoute.js");

const { rrtPlan, getFilteredWaypoints,inflatePoly } = require("./utils/pos.util.js");


const mqtt = require("mqtt");
const fs=require("fs")


const MQTT_BROKER = "mqtt://10.114.216.160:1883";

const client = mqtt.connect(MQTT_BROKER);


client.on("connect", () => {
  console.log("Backend MQTT Connected");

  // subscribe for live robot pose
  client.subscribe("robot/pose");
});

let robotPose = { x: 0, y: 0, theta: 0 };

client.on("message", (topic, msg) => {

  if (topic === "robot/pose") {

    const payload = msg.toString();
    // console.log("Received robot pose:", payload);
    const kv = Object.fromEntries(
      payload.split(",").map(s => s.split("="))
    );

    robotPose = {
      x: parseFloat(kv.x),
      y: parseFloat(kv.y),
      theta: parseFloat(kv.theta)
    };
    // console.log("Robot pose:", robotPose);
  }
});


// app config
const app = express()
const port = process.env.PORT || 4000
connectDB()
connectCloudinary()

// middlewares
app.use(express.json())
app.use(cors())

// api endpoints
app.use("/api/user", userRouter)
app.use("/api/admin", adminRouter)
app.use("/api/doctor", doctorRouter)
app.use("/api/robo", require("./routes/roboRoute.js"))

app.get("/", (req, res) => {
  res.send("API Working")
});

let OBSTACLE_MAP = [];
// ==========================
let PINS = [
  {
    name: "reception",
    x: 0.75,
    y: 0.0
  }
];

app.post("/api/robo/set-obstacles", (req, res) => {
  OBSTACLE_MAP = req.body.obstacles || [];
  console.log("Obstacle map updated");
  res.json({ success: true });
});


app.post("/api/robo/plan-to-goal", async (req, res) => {
  try {
    const { x, y, obstacles = OBSTACLE_MAP } = req.body;

    if (typeof x !== "number" || typeof y !== "number")
      return res.json({ success: false, message: "Invalid goal" });

    const start = { x: robotPose.x, y: robotPose.y };
    const goal = { x, y };

    console.log("Planning from", start, "to", goal);

    const inflated = obstacles.map(inflatePoly);

    const path = rrtPlan(start, goal, inflated);

    if (!path)
      return res.json({ success: false, message: "No valid path found" });

    const waypoints = getFilteredWaypoints(path);

    const payload = waypoints
      .map(p => `${p.x.toFixed(3)},${p.y.toFixed(3)}`)
      .join(";");
    // const payload = "0.75,0"

    client.publish("robot/goals", payload);
    console.log("Publishing autonomy");
    client.publish("robot/autonomy", "1");

    console.log("Published obstacle-safe waypoints:", payload);

    res.json({
      success: true,
      waypoints,
      start,
      goal,
      samples: path.length
    });

  } catch (err) {
    console.log(err);
    res.json({ success: false, message: err.message });
  }
});


app.post("/api/robo/set-pin", (req, res) => {
  try {
    const { pins } = req.body;

    PINS = Array.isArray(pins) ? pins : [];

    console.log("📍 Pins updated:", PINS.length);

    res.json({
      success: true,
      pinCount: PINS.length,
      pins: PINS
    });

  } catch (err) {
    console.log(err);
    res.json({ success: false, message: err.message });
  }
});

// ==================================================
// GET PINS ONLY (optional but useful)
// ==================================================
app.get("/api/robo/pins", (req, res) => {
  console.log("📍 Sending pins:", PINS);
  res.json({
    success: true,
    pins: PINS
  });
});

app.listen(port, () => console.log(`Server started on PORT:${port}`))