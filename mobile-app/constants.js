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
export const ROOM_NAME = randomString;



const DEFAULTS = {
  MQTT_HOST: "10.114.216.160",
  MQTT_PORT: 9001,
  FACE_VERIFY_HOST: "10.114.216.160",
  LIVEKIT_URL: "wss://jarvis-tclen4x9.livekit.cloud",
  API_BASE: "http://10.114.216.160:8082"
};

let SETTINGS = null;

export async function loadSettings() {
  try {
    const stored = await AsyncStorage.getItem("APP_SETTINGS");
    const jsonStored= JSON.parse(stored)
    console.log("Loaded settings from storage:", stored);
    jsonStored.MQTT_PORT= Number(jsonStored.MQTT_PORT)
    if (stored) {
      SETTINGS = { ...DEFAULTS, ...jsonStored };
    }
    return SETTINGS;
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
  if (!SETTINGS) {
    console.log("GET SETTINGS: returning DEFAULTS");
    return DEFAULTS
  }
  console.log("GET SETTINGS CALLED. SETTINGS:",SETTINGS);
  return SETTINGS;
}

