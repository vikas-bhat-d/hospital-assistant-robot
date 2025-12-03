// import React, { useEffect, useRef, useState } from "react";
// import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
// import LottieView from "lottie-react-native";
// import LocalParticipantEvents from "../component/LocalParticipantEvent";

// import {
//   LiveKitRoom,
//   AudioSession,
//   registerGlobals,
//   useTracks,
//   useLocalParticipant
// } from "@livekit/react-native";

// import { Track } from "livekit-client";
// import constants from "../constants";

// registerGlobals();

// export default function ConversationScreen({ route, navigation }) {
//   const { user } = route.params || {};
//   const [token, setToken] = useState(null);
//   const [status, setStatus] = useState("initializing");
//   const [micReady, setMicReady] = useState(false);

//   const roomRef = useRef(null);

//   // ---------------------------------------------------------
//   // Cleanup / End Session Handler
//   // ---------------------------------------------------------
//   const endSession = async () => {
//     try {
//       setStatus("disconnecting");
//       // Disconnect LiveKit room
//       if (roomRef.current) {
//         await roomRef.current.disconnect();
//         console.log("Room disconnected");
//       }

//       // Stop audio session
//       await AudioSession.stopAudioSession();

//       navigation.goBack();
//     } catch (err) {
//       console.log("End session error:", err);
//     }
//   };

//   // ---------------------------------------------------------
//   // Start Audio Session
//   // ---------------------------------------------------------
//   useEffect(() => {
//     const initAudio = async () => {
//       await AudioSession.startAudioSession();
//     };

//     initAudio();

//     return () => {
//       AudioSession.stopAudioSession();
//     };
//   }, []);

//   // ---------------------------------------------------------
//   // Fetch Token From Your Backend
//   // ---------------------------------------------------------
//   useEffect(() => {
//     const getToken = async () => {
//       try {
//         setStatus("fetching_token");


//         console.log("fetching token: ",user)
//         const resp = await fetch(
//           `${constants.API_BASE}/token?id=${user?.id || "mobile"}&room=${constants.ROOM_NAME()}&userData=${encodeURIComponent(JSON.stringify(user))}`
//         );
//         const data = await resp.json();

//         setToken(data.token);
//         setStatus("connecting");
//       } catch (err) {
//         console.log("Token fetch error:", err);
//         setStatus("error");
//       }
//     };

//     getToken();
//   }, []);

//   // ---------------------------------------------------------
//   // Mic Activation Delay
//   // ---------------------------------------------------------
//   useEffect(() => {
//     if (status === "connected") {
//       const timer = setTimeout(() => {
//         setMicReady(true);
//         setStatus("listening");
//       }, 5000);
//       return () => clearTimeout(timer);
//     }
//   }, [status]);

//   // ---------------------------------------------------------
//   // UI
//   // ---------------------------------------------------------
//   return (
//     <View style={styles.container}>
//       {/* Left Panel - Animation */}
//       <View style={styles.leftPanel}>
//         <LottieView
//           source={require("../assets/wave.json")}
//           autoPlay
//           loop
//           style={styles.animation}
//         />
//       </View>

//       {/* Right Panel - Status + Button */}
//       <View style={styles.rightPanel}>
//         <Text style={styles.title}>🔊 Voice Session Active</Text>

//         <Text style={styles.subtitle}>
//           {status === "initializing" && "Initializing audio…"}
//           {status === "fetching_token" && "Contacting server…"}
//           {status === "connecting" && "Connecting to LiveKit…"}
//           {status === "connected" && "Preparing mic (5s)…"}
//           {status === "listening" && "You can speak now 🎤"}
//           {status === "disconnecting" && "Ending session…"}
//           {status === "error" && "Connection failed"}
//         </Text>

//         <Text style={styles.userText}>{user?.name ?? ""}</Text>

//         {/* END SESSION BUTTON */}
//         <TouchableOpacity style={styles.endButton} onPress={endSession}>
//           <Text style={styles.endButtonText}>End Session</Text>
//         </TouchableOpacity>
//       </View>

//       {/* LiveKit Room */}
//       {token && (
//         <LiveKitRoom
//           serverUrl={constants.LIVEKIT_URL}
//           token={token}
//           connect={true}
//           audio={true}
//           video={false}
//           ref={roomRef}
//           options={{
//             adaptiveStream: { pixelDensity: "screen" },
//           }}
//           onConnected={() => setStatus("connected")}
//           onError={() => setStatus("error")}
//           onParticipantConnected={() => console.log("Assistant connected")}
//           micEnabled={micReady}
//         >

//           <AudioReceiver />
//           <LocalParticipantEvents/>
//         </LiveKitRoom>
//       )}
//     </View>
//   );
// }

// // ---------------------------------------------------------
// // Audio Receiver
// // ---------------------------------------------------------
// function AudioReceiver() {
//   const tracks = useTracks([Track.Source.Microphone]);

//   useEffect(() => {
//     tracks.forEach((t) => {
//       if (t.track?.kind === "audio") {
//         t.track.attach();
//       }
//     });
//   }, [tracks]);

//   return null;
// }

// // ---------------------------------------------------------
// // Styles
// // ---------------------------------------------------------
// const styles = StyleSheet.create({
//   container: { flex: 1, flexDirection: "row", backgroundColor: "#000" },
//   leftPanel: { flex: 1, alignItems: "center", justifyContent: "center" },
//   rightPanel: { flex: 1, alignItems: "center", justifyContent: "center" },
//   animation: { width: 250, height: 250 },
//   title: { fontSize: 28, color: "#fff", fontWeight: "bold", marginBottom: 20 },
//   subtitle: { fontSize: 20, color: "#0af", marginBottom: 20 },
//   userText: { fontSize: 16, color: "#888", marginTop: 10 },

//   endButton: {
//     marginTop: 30,
//     paddingVertical: 12,
//     paddingHorizontal: 25,
//     backgroundColor: "#ff4444",
//     borderRadius: 10,
//   },
//   endButtonText: {
//     color: "#fff",
//     fontSize: 18,
//     fontWeight: "600",
//   },
// });


import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";
import { getSettings } from "../constants";
const settings = getSettings();

const SERVER = `http://${settings.FACE_VERIFY_HOST}:8080`;

export default function WaitingScreen({ route, navigation }) {
  const { image } = route.params || {};
  const [dots, setDots] = useState(".");
  const [statusText, setStatusText] = useState("Authenticating");

  // Loading dots "..."
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 5 ? "." : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const verify = async () => {
      try {
        setStatusText("Authenticating");

        const res = await fetch(`${SERVER}/verify-face`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image }),
        });

        const data = await res.json();
        console.log("SERVER:", data);

        if (!data) {
          setStatusText("Face not recognized");
          setTimeout(() => navigation.goBack(), 2000);
          return;
        }

        // 🎉 Navigate to Agent Screen
        navigation.replace("Agent", { user: data.profile });

      } catch (err) {
        console.log("Error verifying:", err);
        setStatusText("Verification failed");

        setTimeout(() => navigation.goBack(), 2000);
      }
    };

    verify();
  }, []);

  return (
    <View style={styles.container}>
      <LottieView
        source={require("../assets/wave.json")}
        autoPlay
        loop
        style={styles.loader}
      />

      <Text style={styles.title}>{statusText} {dots}</Text>
      <Text style={styles.subtitle}>Please wait while we verify your identity…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loader: { width: 250, height: 250 },
  title: { color: "#0af", fontSize: 28, marginTop: 20 },
  subtitle: { color: "#aaa", fontSize: 16, marginTop: 10, textAlign: "center" },
});
