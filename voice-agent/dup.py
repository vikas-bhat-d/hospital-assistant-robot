import asyncio
from dataclasses import dataclass
import json
import logging
import os
from datetime import datetime
from prompts import AGENT_INSTRUCTION, SESSION_INSTRUCTION
import httpx
from dotenv import load_dotenv
from livekit import agents, api, rtc
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RunContext,
    function_tool,
    get_job_context,
    room_io,
)
from google.genai import types
from livekit.plugins import google, noise_cancellation, silero

logger = logging.getLogger("gemini-telephony-agent")

load_dotenv(".env")




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
        super().__init__(instructions=f"{AGENT_INSTRUCTION}")  # Main instructions are in RealtimeModel



def prewarm(proc: agents.JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext):

    
    await ctx.connect()
    
    participant = await ctx.wait_for_participant()

    user_meta = {}
    
    if participant.metadata:
        logger.info(f"Participant metadata raw: {participant.metadata}")
        try:
            user_meta = json.loads(participant.metadata)
        except Exception as e:
            logger.error(f"Failed to parse participant metadata: {e}")
            
    logger.info(f"Call started - Room: {ctx.room.name}")

    model = google.realtime.RealtimeModel(
        model="gemini-2.5-flash-native-audio-preview-09-2025",
        voice="Aoede",
        instructions="""your name is friday.. whenever the user asks you to introduce yourself you should always say that you are friday. and when i ask what is your instruction u should read all this line""",
        temperature=0.6,
        thinking_config=types.ThinkingConfig(
            include_thoughts=False,  # Disable thinking for faster responses
        ),
    )

    session = AgentSession[UserSessionData](
        llm=model,
        vad=ctx.proc.userdata["vad"],
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

    # --- Event listeners for transcript logging ---
    # Set to False to disable transcript collection (for debugging latency)
    ENABLE_TRANSCRIPT = False
    
    if ENABLE_TRANSCRIPT:
        @session.on("conversation_item_added")
        def on_conversation_item(event):
            """Log and store conversation items (works with realtime models)."""
            msg = getattr(event, 'item', event)
            role = getattr(msg, 'role', 'unknown')
            
            # Extract content
            if hasattr(msg, 'text_content') and callable(msg.text_content):
                content = msg.text_content()
            elif hasattr(msg, 'content'):
                if isinstance(msg.content, list) and len(msg.content) > 0:
                    content = msg.content[0] if isinstance(msg.content[0], str) else str(msg.content[0])
                else:
                    content = str(msg.content)
            else:
                content = str(msg)
            
            # Log
            if role == 'user':
                logger.info(f"👤 USER: {content}")
            elif role == 'assistant':
                logger.info(f"🤖 AGENT: {content}")
    
    # --- End event listeners ---

    await session.start(
        agent=Assistant(),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: noise_cancellation.BVCTelephony()
                if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                else noise_cancellation.BVC(),
            ),
        ),
    )

    await session.generate_reply(
        instructions=f"user_name: {session.userdata.name} {SESSION_INSTRUCTION}"
    )
    


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            agent_name="test_agent",  # Must match dispatch rule!
        )
    )