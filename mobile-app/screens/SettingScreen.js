import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { getSettings, saveSettings } from "../constants";

export default function SettingsScreen({ navigation }) {

  const [form, setForm] = useState({
    MQTT_HOST: "",
    MQTT_PORT: "",
    FACE_VERIFY_HOST: "",
    LIVEKIT_URL: "",
    API_BASE: "",
  });
 
  useEffect(() => {
    const settings = getSettings();
    setForm(settings);
  }, []);      

  const updateField = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const save = async () => {
    await saveSettings(form);
    alert("Settings saved!");
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {Object.keys(form).map((key) => (
        <View key={key} style={styles.fieldContainer}>
          <Text style={styles.label}>{key}</Text>
          <TextInput
            value={form[key].toString()}
            onChangeText={(t) => updateField(key, t)}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>
      ))}

      <TouchableOpacity style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#000" },
  title: { fontSize: 28, color: "#fff", marginBottom: 20, fontWeight: "bold" },

  fieldContainer: { marginBottom: 18 },
  label: { color: "#0af", marginBottom: 6 },
  input: {
    backgroundColor: "#111",
    borderColor: "#333",
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    color: "#fff",
  },

  saveBtn: {
    backgroundColor: "#1E90FF",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
