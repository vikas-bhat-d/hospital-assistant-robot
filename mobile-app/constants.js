import AsyncStorage from "@react-native-async-storage/async-storage";


export function randomString(length = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const rand = Math.floor(Math.random() * chars.length);
    result += chars[rand];
  }

  return result;
}

const DEFAULTS = {
  MQTT_HOST: "192.168.1.5",
  MQTT_PORT: 9001,
  FACE_VERIFY_HOST: "192.168.1.5",
  LIVEKIT_URL: "wss://jarvis-tclen4x9.livekit.cloud",
  API_BASE: "http://192.168.1.5:8082"
};

let SETTINGS = { ...DEFAULTS };

export async function loadSettings() {
  try {
    const stored = await AsyncStorage.getItem("APP_SETTINGS");
    const jsonStored= JSON.parse(stored)
    jsonStored.MQTT_PORT= parseInt(jsonStored.MQTT_PORT)
    if (stored) {
      SETTINGS = { ...SETTINGS, ...jsonStored };
    }
  } catch (e) {
    console.log("Failed to load settings", e);
  }
}

export async function saveSettings(newSettings) {
  SETTINGS = { ...SETTINGS, ...newSettings };
  SETTINGS.MQTT_PORT=parseInt(SETTINGS.MQTT_PORT)
  await AsyncStorage.setItem("APP_SETTINGS", JSON.stringify(SETTINGS));
}

export function getSettings() {
  return SETTINGS;
}

export const ROOM_NAME = randomString;
