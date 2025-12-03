// import React, { useState, useEffect } from 'react';
// import { Image, View, Text, Dimensions } from 'react-native';
// import { Grid, Col, Row } from 'react-native-easy-grid';
// import { Magnetometer } from 'expo-sensors';

// const { height, width } = Dimensions.get('window');

// export default function App (){

//   const [subscription, setSubscription] = useState(null);
//   const [magnetometer, setMagnetometer] = useState(0);

//   useEffect(() => {
//     _toggle();
//     return () => {
//       _unsubscribe();
//     };
//   }, []);

//   const _toggle = () => {
//     if (subscription) {
//       _unsubscribe();
//     } else {
//       _subscribe();
//     }
//   };

//   const _subscribe = () => {
//     setSubscription(
//       Magnetometer.addListener((data) => {
//         setMagnetometer(_angle(data));
//       })
//     );
//   };

//   const _unsubscribe = () => {
//     subscription && subscription.remove();
//     setSubscription(null);
//   };

//   const _angle = (magnetometer) => {
//     let angle = 0;
//     if (magnetometer) {
//       let { x, y, z } = magnetometer;
//       if (Math.atan2(y, x) >= 0) {
//         angle = Math.atan2(y, x) * (180 / Math.PI);
//       } else {
//         angle = (Math.atan2(y, x) + 2 * Math.PI) * (180 / Math.PI);
//       }
//     }
//     return Math.round(angle);
//   };

//   const _direction = (degree) => {
//     if (degree >= 22.5 && degree < 67.5) {
//       return 'NE';
//     }
//     else if (degree >= 67.5 && degree < 112.5) {
//       return 'E';
//     }
//     else if (degree >= 112.5 && degree < 157.5) {
//       return 'SE';
//     }
//     else if (degree >= 157.5 && degree < 202.5) {
//       return 'S';
//     }
//     else if (degree >= 202.5 && degree < 247.5) {
//       return 'SW';
//     }
//     else if (degree >= 247.5 && degree < 292.5) {
//       return 'W';
//     }
//     else if (degree >= 292.5 && degree < 337.5) {
//       return 'NW';
//     }
//     else {
//       return 'N';
//     }
//   };

//   // Match the device top with pointer 0° degree. (By default 0° starts from the right of the device.)
//   const _degree = (magnetometer) => {
//     return magnetometer - 90 >= 0 ? magnetometer - 90 : magnetometer + 271;
//   };

//   return (

//     <Grid style={{ backgroundColor: 'black' }}>
//       <Row style={{ alignItems: 'center' }} size={.9}>
//         <Col style={{ alignItems: 'center' }}>
//           <Text
//             style={{
//               color: '#fff',
//               fontSize: height / 26,
//               fontWeight: 'bold'
//             }}>
//             {_direction(_degree(magnetometer))}
//           </Text>
//         </Col>
//       </Row>

//       <Row style={{ alignItems: 'center' }} size={.1}>
//         <Col style={{ alignItems: 'center' }}>
//           <View style={{ position: 'absolute', width: width, alignItems: 'center', top: 0 }}>
//             <Image source={require('./assets/compass_pointer.png')} style={{
//               height: height / 26,
//               resizeMode: 'contain'
//             }} />
//           </View>
//         </Col>
//       </Row>

//       <Row style={{ alignItems: 'center' }} size={2}>
//         <Text style={{
//           color: '#fff',
//           fontSize: height / 27,
//           width: width,
//           position: 'absolute',
//           textAlign: 'center'
//         }}>
//           {_degree(magnetometer)}°
//           </Text>

//         <Col style={{ alignItems: 'center' }}>

//           <Image source={require("./assets/compass_bg.png")} style={{
//             height: width - 80,
//             justifyContent: 'center',
//             alignItems: 'center',
//             resizeMode: 'contain',
//             transform: [{ rotate: 360 - magnetometer + 'deg' }]
//           }} />

//         </Col>
//       </Row>

//       <Row style={{ alignItems: 'center' }} size={1}>
//         <Col style={{ alignItems: 'center' }}>
//           <Text style={{ color: '#fff' }}>Copyright @RahulHaque</Text>
//         </Col>
//       </Row>

//     </Grid>

//   );
// }




// import React, { useState, useEffect } from 'react';
// import { Image, View, Text, Dimensions } from 'react-native';
// import { Grid, Col, Row } from 'react-native-easy-grid';
// import { Magnetometer } from 'expo-sensors';
// import { Client, Message } from 'paho-mqtt';

// const { height, width } = Dimensions.get('window');

// export default function App() {

//   const [subscription, setSubscription] = useState(null);
//   const [magnetometer, setMagnetometer] = useState(0);

//   // ----------------------------
//   // MQTT CLIENT (PAHO)
//   // ----------------------------
//   let mqttClient = null;

//   useEffect(() => {
//     // Create MQTT client
//     mqttClient = new Client(
//       "192.168.1.5",
//       9001,
//       "/mqtt",
//       "phone_compass_client_" + Math.floor(Math.random() * 9999)
//     );

//     mqttClient.onConnectionLost = () => console.log("MQTT lost");
//     mqttClient.onMessageArrived = (msg) => console.log("MQTT msg:", msg.payloadString);

//     mqttClient.connect({
//       onSuccess: () => console.log("MQTT Connected (Paho)")
//     });

//     _toggle();

//     return () => {
//       _unsubscribe();
//       mqttClient && mqttClient.disconnect();
//     };
//   }, []);

//   const _toggle = () => {
//     if (subscription) {
//       _unsubscribe();
//     } else {
//       _subscribe();
//     }
//   };

//   const _subscribe = () => {
//     Magnetometer.setUpdateInterval(200);
//     setSubscription(
//       Magnetometer.addListener((data) => {
//         const angle = _angle(data);   // angle from your logic
//         setMagnetometer(angle);

//         // ----------------------------
//         // PUBLISH ANGLE VIA MQTT
//         // ----------------------------
//         try {
//           const message = new Message(`${angle}`);
//           message.destinationName = "robot/yaw";
//           mqttClient.send(message);
//         } catch (e) {
//           console.log("MQTT send error", e);
//         }
//       })
//     );
//   };

//   const _unsubscribe = () => {
//     subscription && subscription.remove();
//     setSubscription(null);
//   };

//   // ----------------------------
//   // YOUR EXACT COMPASS LOGIC (unchanged)
//   // ----------------------------
//   const _angle = (magnetometer) => {
//     let angle = 0;
//     if (magnetometer) {
//       let { x, y, z } = magnetometer;
//       if (Math.atan2(y, x) >= 0) {
//         angle = Math.atan2(y, x) * (180 / Math.PI);
//       } else {
//         angle = (Math.atan2(y, x) + 2 * Math.PI) * (180 / Math.PI);
//       }
//     }
//     return Math.round(angle);
//   };

//   const _direction = (degree) => {
//     if (degree >= 22.5 && degree < 67.5) return 'NE';
//     else if (degree >= 67.5 && degree < 112.5) return 'E';
//     else if (degree >= 112.5 && degree < 157.5) return 'SE';
//     else if (degree >= 157.5 && degree < 202.5) return 'S';
//     else if (degree >= 202.5 && degree < 247.5) return 'SW';
//     else if (degree >= 247.5 && degree < 292.5) return 'W';
//     else if (degree >= 292.5 && degree < 337.5) return 'NW';
//     else return 'N';
//   };

//   const _degree = (magnetometer) => {
//     return magnetometer - 90 >= 0 ? magnetometer - 90 : magnetometer + 271;
//   };

//   // ----------------------------
//   // UI (unchanged)
//   // ----------------------------
//   return (
//     <Grid style={{ backgroundColor: 'black' }}>
//       <Row style={{ alignItems: 'center' }} size={.9}>
//         <Col style={{ alignItems: 'center' }}>
//           <Text
//             style={{
//               color: '#fff',
//               fontSize: height / 26,
//               fontWeight: 'bold'
//             }}>
//             {_direction(_degree(magnetometer))}
//           </Text>
//         </Col>
//       </Row>

//       <Row style={{ alignItems: 'center' }} size={.1}>
//         <Col style={{ alignItems: 'center' }}>
//           <View style={{ position: 'absolute', width: width, alignItems: 'center', top: 0 }}>
//             <Image source={require('./assets/compass_pointer.png')} style={{
//               height: height / 26,
//               resizeMode: 'contain'
//             }} />
//           </View>
//         </Col>
//       </Row>

//       <Row style={{ alignItems: 'center' }} size={2}>
//         <Text style={{
//           color: '#fff',
//           fontSize: height / 27,
//           width: width,
//           position: 'absolute',
//           textAlign: 'center'
//         }}>
//           {_degree(magnetometer)}°
//         </Text>

//         <Col style={{ alignItems: 'center' }}>
//           <Image source={require("./assets/compass_bg.png")} style={{
//             height: width - 80,
//             justifyContent: 'center',
//             alignItems: 'center',
//             resizeMode: 'contain',
//             transform: [{ rotate: 360 - magnetometer + 'deg' }]
//           }} />
//         </Col>
//       </Row>

//       <Row style={{ alignItems: 'center' }} size={1}>
//         <Col style={{ alignItems: 'center' }}>
//           <Text style={{ color: '#fff' }}>Copyright @RahulHaque</Text>
//         </Col>
//       </Row>

//     </Grid>
//   );
// }



import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "./screens/HomeScreen";
import CameraScreen from "./screens/CameraScreen";
import WaitingScreen from "./screens/WaitingScreen";
import AgentScreen from "./screens/AgentScreen";
import SettingsScreen from "./screens/SettingScreen";

import {SensorProvider} from "./context/SensorContext"

import { loadSettings } from "./constants";

const Stack = createNativeStackNavigator();

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadSettings();
      setReady(true);
    };
    init();
  }, []);

  // --- 🔥 Splash screen while loading settings ---
  if (!ready) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <ActivityIndicator size="large" color="#0af" />
        <Text style={{ color: "#fff", marginTop: 20, fontSize: 18 }}>
          Initializing...
        </Text>
      </View>
    );
  }

  return (
    <SensorProvider>
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Camera" component={CameraScreen} />
        <Stack.Screen name="Waiting" component={WaitingScreen} />
        <Stack.Screen name="Agent" component={AgentScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
    </SensorProvider>
  );
}
