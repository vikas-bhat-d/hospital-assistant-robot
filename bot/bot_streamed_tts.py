import math
import re
from datetime import datetime
import sys
import os
import json
import google.generativeai as genai
import pyttsx3
import threading

# ============== CONFIG ==============
API_KEY = ""   # <--- paste your Gemini API key here
MODEL_NAME = "gemini-2.0-flash"
SYSTEM_PROMPT = (
"""You are KASU a hospital assistant robot.  
Your job is to understand user commands, identify the intended task, extract key entities, and provide both a natural response (for speech) and a structured JSON output (for robot actions).  

### Tasks you can identify:
1. navigate_to → Entities: { destination }  
2. deliver_from_to → Entities: { pickup_location, delivery_location, item }  
3. query → Entities: { question }  

### Output format (always follow this order):
1. Response: <natural sentence to say to the user>  
2. JSON:
{
  "task": "<task_name>",
  "entities": { ... }
}
"""
)

# ============== UTIL: FAST PATHS (LOCAL, ZERO LATENCY) ==============
TIME_REGEX = re.compile(r"^(what('?| i)s)?\s*(the )?\s*time(\s*now)?\??$", re.IGNORECASE)
DATE_REGEX = re.compile(r"^(what('?| i)s)?\s*(the )?\s*date(\s*today)?\??$", re.IGNORECASE)

MATH_ALLOWED = {
    "sin": math.sin, "cos": math.cos, "tan": math.tan, "sqrt": math.sqrt,
    "log": math.log, "log10": math.log10, "exp": math.exp, "pi": math.pi, "e": math.e,
    "floor": math.floor, "ceil": math.ceil, "pow": pow, "abs": abs, "round": round
}
MATH_PATTERN = re.compile(r"^[\d\.\s\+\-\*\/\(\),eipa-z]+$", re.IGNORECASE)

def try_fast_paths(user_input: str):
    text = user_input.strip()
    if TIME_REGEX.match(text):
        return f"⏱️ {datetime.now().strftime('%H:%M:%S')}"
    if DATE_REGEX.match(text):
        return f"📅 {datetime.now().strftime('%Y-%m-%d (%a)')}"
    if looks_like_math(text):
        try:
            return f"🧮 {safe_math_eval(text)}"
        except Exception:
            pass
    return None

def looks_like_math(expr: str) -> bool:
    if not any(c.isdigit() for c in expr) and not any(c in "+-*/()" for c in expr):
        return False
    return bool(MATH_PATTERN.match(expr))

def safe_math_eval(expr: str):
    return eval(expr, {"__builtins__": {}}, MATH_ALLOWED)

# ============== GEMINI CLIENT (STREAMING) ==============
def configure_chat():
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel(
        MODEL_NAME,
        system_instruction=SYSTEM_PROMPT
    )
    return model.start_chat(history=[])

def warmup(chat):
    try:
        _ = chat.send_message("hi", generation_config={"max_output_tokens": 1})
    except Exception:
        pass

# Initialize pyttsx3 engine globally (faster reuse)
def _speak_worker(text):
    engine = pyttsx3.init(driverName="sapi5")
    engine.say(text)
    engine.runAndWait()
    engine.stop()

def speak(text: str):
    threading.Thread(target=_speak_worker, args=(text,)).start()



def stream_answer(chat, prompt: str):
    response = chat.send_message(
        prompt,
        generation_config={
            "temperature": 0.7,
            "top_p": 0.9,
            "max_output_tokens": 512,
        },
        stream=True,
    )

    full_text = ""
    for chunk in response:
        if chunk.candidates and chunk.candidates[0].content.parts:
            part = chunk.candidates[0].content.parts[0].text
            sys.stdout.write(part)
            sys.stdout.flush()
            full_text += part

    print("\n")  # newline after streaming

    # --- Clean up any code fences like ```json ... ```
    cleaned = full_text.replace("```json", "").replace("```", "").strip()

    # Separate Response and JSON
    response_line, json_block = None, None
    if "Response:" in cleaned and "JSON:" in cleaned:
        try:
            resp_split = cleaned.split("Response:", 1)[1].strip()
            if "JSON:" in resp_split:
                response_line, json_block = resp_split.split("JSON:", 1)
                response_line = response_line.strip().rstrip("\n")
                json_block = json_block.strip()
        except Exception as e:
            print(f"⚠️ Parsing error: {e}")

    if response_line:
        # Speak response
        print(f"🗣️ Speaking: {response_line}")
        try:
            speak(response_line)
        except Exception as e:
            print(f"⚠️ TTS failed: {e}")

    if json_block:
        try:
            parsed = json.loads(json_block)
            print("\n--- Parsed JSON ---")
            print(json.dumps(parsed, indent=2))
        except Exception as e:
            print(f"⚠️ JSON parsing error: {e}")
            print(json_block)

# ============== MAIN LOOP ==============
def main():
    chat = configure_chat()
    warmup(chat)

    print("⚡ Hospital Assistant CLI (Gemini + pyttsx3) — type 'exit' to quit.")
    while True:
        try:
            user_input = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break

        if not user_input:
            continue
        if user_input.lower() in {"exit", "quit"}:
            print("Bye!")
            break

        fast = try_fast_paths(user_input)
        if fast:
            print(fast)
            speak(fast)  # also speak instant responses
            continue

        try:
            print("AI: ", end="", flush=True)
            stream_answer(chat, user_input)
        except Exception as e:
            print(f"\n⚠️ Error: {e}")

if __name__ == "__main__":
    main()
