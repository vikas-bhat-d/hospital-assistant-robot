import { useParticipants } from "@livekit/react-native";
import { useEffect } from "react";

export default function RobotParticipantEvent({ onStateUpdate }) {
  const participants = useParticipants();

  useEffect(() => {
    if (!participants || participants.length < 2) return;

    const robot = participants.find((p) => p.identity !== "mobile");
    
    if (!robot) return;

    const state = robot?.attributes["lk.agent.state"];
    if (state) {
      console.log("Robot State:", state);
      onStateUpdate(state);
    }
  }, [participants]);

  return null;
}
