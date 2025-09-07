from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import (
    noise_cancellation,
    silero,
    google
)
# from livekit.plugins.turn_detector.multilingual import MultilingualModel

from livekit.plugins.openai import STT,TTS



load_dotenv(".env")



class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions="You are a helpful voice AI assistant.")


async def entrypoint(ctx: agents.JobContext):
    session = AgentSession(
        stt=STT.with_faster_whisper(model="Systran/faster-distil-whisper-small.en", base_url="http://localhost:8000/v1/",api_key="ex"),   
        llm=google.LLM(model="gemini-1.5-flash"),  
        tts=TTS.create_kokoro_client(model="speaches-ai/Kokoro-82M-v1.0-ONNX", voice="am_michael", base_url="http://localhost:8000/v1"),  
        vad=silero.VAD.load(),
        # turn_detection=MultilingualModel(),
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    await session.generate_reply(
        instructions="Greet the user and offer your assistance."
    )


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
