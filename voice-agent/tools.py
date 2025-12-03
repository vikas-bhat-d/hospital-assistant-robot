import logging
from typing import Optional
from livekit.agents import function_tool, RunContext
import httpx
import json

logging.basicConfig(level=logging.INFO)

API_BASE = "http://localhost:5000"

SESSION_USER={}



def set_user_details(data):
    global SESSION_USER
    SESSION_USER=data;
    

# -------------------- Navigation Tools --------------------

@function_tool()
async def navigate_to(context: RunContext, destination: str) -> str:
    return f"Navigating to {destination}"

@function_tool()
async def query(context:RunContext, question:str)->str:
    return f"Answered query {query}"


@function_tool()
async def deliver_from_to(
    context: RunContext, pickup_location: str, delivery_location: str, item: str
) -> str:
    return f"Delivering {item} from {pickup_location} to {delivery_location}"

# -------------------- Appointment Tool --------------------

@function_tool()
async def book_appointment(
    context: RunContext,
    doctor_name: str,
    date: str,
    time: str,
    patient_name: str,
    reason: Optional[str] = None,
) -> str:
    """Book an appointment with the hospital backend."""
    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "doctorName": doctor_name,
                "date": date,
                "time": time,
                "patientName": patient_name,
                "reason": reason,
            }
            response = await client.post(f"{API_BASE}/appointments", json=payload)

            if response.status_code == 200:
                result = response.json()
                logging.info(f"Appointment booked: {result}")
                return (
                    f"Booked appointment with Dr. {doctor_name} on {date} at {time} "
                    f"for {patient_name}"
                    + (f" regarding {reason}" if reason else "")
                )
            else:
                logging.error(f"API error: {response.text}")
                return f"Failed to book appointment with Dr. {doctor_name}."
    except Exception as e:
        logging.error(f"Error booking appointment: {e}")
        return f"Failed to book appointment with Dr. {doctor_name}."

# -------------------- Doctor Tools --------------------
@function_tool()
async def get_user_details(context:RunContext)->str:
    if(SESSION_USER):
        return (json.dumps(SESSION_USER));
    else:
        return({"user":"Sir or Mam"})

@function_tool()
async def list_doctors(context: RunContext) -> str:
    """Fetch the list of doctors from the backend."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{API_BASE}/doctors")
            if response.status_code == 200:
                doctors = response.json().get("doctors", [])
                if not doctors:
                    return "No doctors found."
                return "Available doctors: " + ", ".join(
                    [f"{d['name']} ({d['specialization']}, {d['timings']})" for d in doctors]
                )
            else:
                return "Failed to fetch doctors."
    except Exception as e:
        logging.error(f"Error fetching doctors: {e}")
        return "Error while fetching doctors."
