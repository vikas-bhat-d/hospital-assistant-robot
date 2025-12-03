import React, { useRef } from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

export default function HomeScreen({ navigation }) {

  return (
    <View style={{ flex: 1 }}>

      {/* Settings Button */}
      <TouchableOpacity
        style={styles.settingsBtn}
        onPress={() => navigation.navigate("Settings")}
      >
        <Ionicons name="settings-outline" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Existing full-screen video */}
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => navigation.navigate("Camera")}
        activeOpacity={1}
      >
        <Video
          source={require("../assets/robo_eyes.mp4")}
          style={styles.bg}
          resizeMode="cover"
          shouldPlay
          isLooping
          isMuted
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
    settingsBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 50,
  }
});
