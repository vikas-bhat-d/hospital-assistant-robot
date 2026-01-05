from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions, AutoSubscribe
from livekit.plugins import noise_cancellation, google
from prompts import AGENT_INSTRUCTION, SESSION_INSTRUCTION
from tools import navigate_to, deliver_from_to, query, book_appointment, list_doctors, get_user_details ,get_navigation_pins

from dataclasses import dataclass
import logging
import os
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
print(os.getenv("GOOGLE_API_KEY"))

@dataclass
class UserSessionData:
    id: str | None = None
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    gender: str | None = None
    dob: str | None = None
    address: dict | None = None
    token: str | None = None


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=f"{AGENT_INSTRUCTION}",
            llm=google.realtime.RealtimeModel(
                model="gemini-2.5-flash-native-audio-preview-09-2025",
                # model="gemini-2.0-flash-live-001",
                voice="Aoede",
                temperature=0.8,
            ),
            tools=[
                navigate_to,
                deliver_from_to,
                query,
                book_appointment,
                list_doctors,
                get_user_details,
                get_navigation_pins
            ],
        )



async def entrypoint(ctx: agents.JobContext):
    import json


    await ctx.connect( )

    participant = await ctx.wait_for_participant()

    user_meta = {}
    if participant.metadata:
        logger.info(f"Participant metadata raw: {participant.metadata}")
        try:
            user_meta = json.loads(participant.metadata)
        except Exception as e:
            logger.error(f"Failed to parse participant metadata: {e}")


    session = AgentSession[UserSessionData](
        userdata=UserSessionData(
            id=user_meta.get("_id"),
            name=user_meta.get("name"),
            email=user_meta.get("email"),
            phone=user_meta.get("phone"),
            gender=user_meta.get("gender"),
            dob=user_meta.get("dob"),
            address=user_meta.get("address"),
            token=user_meta.get("token"),
        )
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_input_options=RoomInputOptions(
            video_enabled=True,
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    await session.generate_reply(
        instructions=f"{SESSION_INSTRUCTION}"
    )


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
