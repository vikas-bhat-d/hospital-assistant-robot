import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import {
  CameraView,
  CameraType,
  useCameraPermissions,
} from "expo-camera";

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [facing] = useState("front"); // always use front camera

  // ---- Permissions ----
  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>
          Camera access is required to verify your identity.
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permissionBtn}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---- Capture + Upload ----
  const captureAndSend = async () => {
    if (!cameraRef) return;

    try {
      setUploading(true);

      const photo = await cameraRef.takePictureAsync({
        quality: 0.5,
        base64: true,
      });

      // send to backend
      // const res = await fetch(`${SERVER}/verify-face`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ image: photo.base64 }),
      // });
      
      // const data = await res.json();
      // console.log("SERVER:", data);
      
      navigation.navigate("Waiting",{image:photo.base64});
      

    } catch (err) {
      console.log("Error uploading:", err);
      alert("Capture failed. Please try again.");
    }

    setUploading(false);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        ref={(ref) => setCameraRef(ref)}
      />

      <View style={styles.captureContainer}>
        {uploading ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <TouchableOpacity style={styles.captureButton} onPress={captureAndSend}>
            <Text style={styles.captureText}>Capture</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  camera: { flex: 1 },

  captureContainer: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
  },

  captureButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 14,
  },

  captureText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    padding: 20,
  },

  permissionText: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },

  permissionBtn: {
    backgroundColor: "#1E90FF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },

  permissionBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
