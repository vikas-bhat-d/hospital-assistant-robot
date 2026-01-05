// import React, { useEffect, useRef, useState } from "react";
// import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
// import LottieView from "lottie-react-native";
// import LocalParticipantEvents from "../component/LocalParticipantEvent";
// import { Video } from "expo-av";

// import {
//   LiveKitRoom,
//   AudioSession,
//   registerGlobals,
//   useTracks,
//   useLocalParticipant,
// } from "@livekit/react-native";

// import { Track } from "livekit-client";
// import constants from "../constants";
// import RobotParticipantEvent from "../component/RobotParticipantEvent";

// registerGlobals();

// export default function ConversationScreen({ route, navigation }) {
//   const { user } = route.params || {};
//   const [token, setToken] = useState(null);
//   const [status, setStatus] = useState("initializing");
//   const [micReady, setMicReady] = useState(false);
//   const [botState, botStateUpdate] = useState("speaking");
//   const [videoSource, setVideoSource] = useState(
//   require("../assets/listening-720.mp4")
// );

//   const listeningRef = useRef(null);
//   const speakingRef = useRef(null);

//   const roomRef = useRef(null);

//   const [ready, setReady] = useState({ listening: false, speaking: false });

//   useEffect(() => {
//     const preload = async () => {
//       try {
//         await listeningRef.current?.loadAsync(
//           require("../assets/listening-720.mp4"),
//           { shouldPlay: false },
//           false
//         );

//         await speakingRef.current?.loadAsync(
//           require("../assets/speaking-720.mp4"),
//           { shouldPlay: false },
//           false
//         );

//         setReady({ listening: true, speaking: true });
//       } catch (e) {
//         console.log("Preload error:", e);
//       }
//     };

//     preload();
//   }, []);

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

//         console.log("fetching token: ", user);
//         const resp = await fetch(
//           `${constants.API_BASE}/token?id=${
//             user?.id || "mobile"
//           }&room=${constants.ROOM_NAME()}&userData=${encodeURIComponent(
//             JSON.stringify(user)
//           )}`
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

//   useEffect(() => {
//     console.log("State Updated: ", botState);
//     if (botState === "listening") {
//         setVideoSource(require("../assets/listening-720.mp4"));
//     } else {
//         setVideoSource(require("../assets/speaking-720.mp4"));
//     }
//   }, [botState]);

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

//   return (
//     <View style={styles.container}>
//       <View style={styles.videoWrapper} pointerEvents="none">
//         <Video
//           key={botState} // important: forces remount cleanly
//           source={videoSource}
//           style={styles.videoBg}
//           resizeMode="cover"
//           shouldPlay
//           isLooping
//         />
//       </View>

//       <TouchableOpacity style={styles.endSessionTop} onPress={endSession}>
//         <Text style={styles.endButtonText}>End Session</Text>
//       </TouchableOpacity>
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
//           <RobotParticipantEvent onStateUpdate={botStateUpdate} />
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
//   container: {
//     flex: 1,
//     backgroundColor: "#000", // removed flexDirection: "row"
//   },

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

//   /** FULLSCREEN VIDEO WRAPPER **/
//   videoWrapper: {
//     position: "absolute",
//     top: 0,
//     left: 0,
//     width: "100%",
//     height: "100%",
//   },

//   /** VIDEO ITSELF **/
//   videoBg: {
//     width: "100%",
//     height: "100%",
//   },

//   /** END SESSION BUTTON (TOP) **/
//   endSessionTop: {
//     position: "absolute",
//     top: 40,
//     right: 20,
//     backgroundColor: "rgba(255,0,0,0.8)",
//     paddingVertical: 8,
//     paddingHorizontal: 18,
//     borderRadius: 10,
//     zIndex: 20,
//   },
// });





import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import LottieView from "lottie-react-native";
import LocalParticipantEvents from "../component/LocalParticipantEvent";

import {
  LiveKitRoom,
  AudioSession,
  registerGlobals,
  useTracks,
} from "@livekit/react-native";

import { Track } from "livekit-client";
import {getSettings,ROOM_NAME} from "../constants";
import RobotParticipantEvent from "../component/RobotParticipantEvent";
const settings=getSettings();

// ★ expo-video imports
import { useVideoPlayer, VideoView } from "expo-video";

registerGlobals();

export default function ConversationScreen({ route, navigation }) {
  const { user } = route.params || {};
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState("initializing");
  const [micReady, setMicReady] = useState(false);
  const [botState, botStateUpdate] = useState("listening");

  const roomRef = useRef(null);

  // -------------------------
  // 🚀 Create Video Players
  // -------------------------
  const listeningPlayer = useVideoPlayer(
    require("../assets/listening-720.mp4"),
    (player) => {
      player.loop = true;
    }
  );

  const speakingPlayer = useVideoPlayer(
    require("../assets/speaking-720.mp4"),
    (player) => {
      player.loop = true;
    }
  );

  // Only play the active one
  useEffect(() => {
    if (botState === "listening") {
      speakingPlayer.pause();
      listeningPlayer.play();
    } else {
      listeningPlayer.pause();
      speakingPlayer.play();
    }
  }, [botState]);

  // ---------------------------------------------------------
  // Cleanup / End Session Handler
  // ---------------------------------------------------------
  const endSession = async () => {
    try {
      setStatus("disconnecting");
      if (roomRef.current) {
        await roomRef.current.disconnect();
      }
      await AudioSession.stopAudioSession();
      navigation.goBack();
    } catch (err) {
      console.log("End session error:", err);
    }
  };

  // ---------------------------------------------------------
  // Start Audio Session
  // ---------------------------------------------------------
  useEffect(() => {
    AudioSession.startAudioSession();
    return () => AudioSession.stopAudioSession();
  }, []);

  // ---------------------------------------------------------
  // Fetch Token
  // ---------------------------------------------------------
  useEffect(() => {
    const getToken = async () => {
      try {
        setStatus("fetching_token");

        const resp = await fetch(
          `${settings.API_BASE}/token?id=${
            user?.id || "mobile"
          }&room=${ROOM_NAME()}&userData=${encodeURIComponent(
            JSON.stringify(user)
          )}`
        );
        const data = await resp.json();
        console.log(data)

        setToken(data.token);
        setStatus("connecting");
      } catch (err) {
        console.log("Token fetch error:", err);
        setStatus("error");
      }
    };

    getToken();
  }, []);

  // ---------------------------------------------------------
  // Mic Activation Delay
  // ---------------------------------------------------------
  useEffect(() => {
    if (status === "connected") {
      const timer = setTimeout(() => {
        setMicReady(true);
        setStatus("listening");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <View style={styles.container}>
      {/* ----------------- VIDEO BACKGROUND ----------------- */}
      <View style={styles.videoWrapper} pointerEvents="none">

        {/* LISTENING VIDEO (always mounted) */}
        <VideoView
          player={listeningPlayer}
          style={[
            styles.videoBg,
            { opacity: botState === "speaking" ? 0 : 1 },
          ]}
          contentFit="cover"
          surfaceType="textureView"
          nativeControls={false}
        />

        {/* SPEAKING VIDEO (always mounted) */}
        <VideoView
          player={speakingPlayer}
          style={[
            styles.videoBg,
            { opacity: botState === "speaking" ? 1 : 0 },
          ]}
          contentFit="cover"
          surfaceType="textureView"
          nativeControls={false}
        />

      </View>
      {/* ----------------------------------------------------- */}

      {/* END SESSION BUTTON */}
      <TouchableOpacity style={styles.endSessionTop} onPress={endSession}>
        <Text style={styles.endButtonText}>End Session</Text>
      </TouchableOpacity>

      {/* LiveKit Room */}
      {token && (
        <LiveKitRoom
          serverUrl={settings.LIVEKIT_URL}
          token={token}
          connect={true}
          audio={true}
          video={false}
          ref={roomRef}
          options={{ adaptiveStream: { pixelDensity: "screen" } }}
          onConnected={() => setStatus("connected")}
          onError={() => setStatus("error")}
          onParticipantConnected={() => console.log("Assistant connected")}
          micEnabled={micReady}
        >
          <AudioReceiver />
          <RobotParticipantEvent onStateUpdate={botStateUpdate} />
        </LiveKitRoom>
      )}
    </View>
  );
}

// ---------------------------------------------------------
// Audio Receiver
// ---------------------------------------------------------
function AudioReceiver() {
  const tracks = useTracks([Track.Source.Microphone]);
  useEffect(() => {
    tracks.forEach((t) => t.track?.kind === "audio" && t.track.attach());
  }, [tracks]);
  return null;
}

// ---------------------------------------------------------
// Styles
// ---------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  videoWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },

  videoBg: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },

  endSessionTop: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(255,0,0,0.8)",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
    zIndex: 20,
  },

  endButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
