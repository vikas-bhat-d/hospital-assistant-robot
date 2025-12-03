// import { useLocalParticipant } from "@livekit/react-native";
// import {useEffect} from "react";
// export default function LocalParticipantEvents() {
//   const { localParticipant } = useLocalParticipant();

//   useEffect(() => {
//     if (!localParticipant) return;

//     const lp = localParticipant;

//     lp.on("isSpeakingChanged", () => {
//       console.log("LOCAL USER speaking changed:", lp.isSpeaking);
//     });

//     lp.on("trackPublished", () => {
//       console.log("LOCAL user published track");
//     });

//     lp.on("trackMuted", () => {
//       console.log("LOCAL user muted track");
//     });

//     return () => {
//       lp.removeAllListeners();
//     };
//   }, [localParticipant]);

//   return null; // no UI
// }


import { useParticipants } from "@livekit/react-native";
import { ParticipantEvent } from "livekit-client";
import { useEffect } from "react";

export default function LocalParticipantEvents() {
  const participants = useParticipants(); // includes local + remote

  useEffect(() => {
    if (!participants || participants.length === 0) return;

    
    // Find the robot participant by identity or metadata
    const robot = participants.find(
        (p) => p.identity != "mobile" 
    );
    console.log("Robot: ",robot.attributes);
    // participants.map((p)=>console.log("identity: ",p.identity))
    
    if (!robot) return;

    // robot.on(ParticipantEvent.IsSpeakingChanged, () => {
    //   console.log("🤖 ROBOT SPEAKING:", robot.isSpeaking);
    // });

    // robot.on(ParticipantEvent.TrackSubscribed, (_, publication) => {
    //   if (publication.kind === "audio") {
    //     console.log("🤖 Robot audio track subscribed!");
    //   }
    // });

    return () => robot.removeAllListeners();
  }, [participants]);

  return null;
}


// import { useParticipants } from "@livekit/react-native";
// import { useEffect } from "react";

// export default function RobotParticipantEvents() {
//   const participants = useParticipants();

//   useEffect(() => {
//     if (!participants || participants.length === 0) return;

//     // robot = any participant that is NOT the local mobile user
//     const robot = participants.find(p => p.identity !== "mobile");

//     if (!robot) return;

//     // 💡 Extract LiveKit Agent state
//     const state = robot.attributes["lk.agent.state"];

//     console.log("🤖 Robot agent state:", state);

//     return () => robot.removeAllListeners();
//   }, [participants]);

//   return null;
// }