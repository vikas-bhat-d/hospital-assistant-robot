import React, { createContext, useEffect, useState, useRef } from "react";
import { Magnetometer } from "expo-sensors";
import { Client, Message } from "paho-mqtt";
import {getSettings, loadSettings} from "../constants";

console.log("Loading settings in SensorContext...");

const settings=getSettings();
console.log("SensorContext settings:",settings);
export const SensorContext = createContext();

export const SensorProvider = ({ children }) => {
  const [magnetometer, setMagnetometer] = useState(0);

  const subscriptionRef = useRef(null);
  const mqttClientRef = useRef(null);

  useEffect(() => {
    // ------------------------------------
    // MQTT SETUP
    // ------------------------------------
    console.log("MQTT Connecting to:", settings.MQTT_HOST, settings.MQTT_PORT);
    mqttClientRef.current = new Client(
      settings.MQTT_HOST,
      settings.MQTT_PORT,
      "/mqtt",
      "phone_compass_client_" + Math.floor(Math.random() * 9999)
    );

    mqttClientRef.current.connect({
      onSuccess: () => console.log("MQTT Connected"),
    });

    // ------------------------------------
    // SUPER FAST SENSOR UPDATE
    // ------------------------------------
    Magnetometer.setUpdateInterval(10); // 10ms = 100 Hz (very fast)

    const sub = Magnetometer.addListener((data) => {
      const angle = calculateAngle(data);
      setMagnetometer(angle);

      try {
        const msg = new Message(String(angle));
        msg.destinationName = "robot/yaw";
        mqttClientRef.current?.send(msg);
      } catch (e) {
        console.log("MQTT send error:", e);
      }
    });

    subscriptionRef.current = sub;

    return () => {
      subscriptionRef.current && subscriptionRef.current.remove();
      mqttClientRef.current && mqttClientRef.current.disconnect();
    };
  }, []);

  // ------------------------------------
  // EXACT YOUR LOGIC (UNCHANGED)
  // ------------------------------------
  const calculateAngle = (mag) => {
    let angle = 0;
    if (mag) {
      let { x, y } = mag;
      if (Math.atan2(y, x) >= 0) {
        angle = Math.atan2(y, x) * (180 / Math.PI);
      } else {
        angle = (Math.atan2(y, x) + 2 * Math.PI) * (180 / Math.PI);
      }
    }
    return Math.round(angle);
  };

  return (
    <SensorContext.Provider value={{ magnetometer }}>
      {children}
    </SensorContext.Provider>
  );
};
