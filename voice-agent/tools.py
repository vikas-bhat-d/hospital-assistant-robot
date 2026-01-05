import logging
from typing import Optional
from livekit.agents import function_tool, RunContext
import httpx
import json

logging.basicConfig(level=logging.INFO)

API_BASE = "http://localhost:4000/api/robo"


def get_session_user(context: RunContext):
    """
    Returns userdata written by IntakeAgent into the RunContext.
    """
    user = getattr(context, "userdata", None)

    if not user:
        logging.warning("No userdata found in RunContext")
        return None

    logging.info(f"User session data: {user}")
    return user

# -------------------- Navigation Tools --------------------
# @function_tool()
# async def navigate_to(context: RunContext, destination: str) -> str:
#     return f"Navigating to {destination}"

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
    doctor_id: str,
    slot_date: str,
    slot_time: str,
    reason: Optional[str] = None,
) -> str:
    """
    Book an appointment through the hospital backend.
    """

    try:
        user = get_session_user(context)
        logging.info(f"Booking appointment for user: {user}")
        if not user or not user.id:
            return "I could not find your account information. Please log in first."

        payload = {
            "userId": user.id,
            "docId": doctor_id,
            "slotDate": slot_date,
            "slotTime": slot_time,
        }

        logging.info(f"API URL: {API_BASE}/book-appointment")
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_BASE}/book-appointment",
                json=payload
            )
        logging.info(f"response: {API_BASE}")
        data = response.json()

        # Backend returned failure
        if not data.get("success"):
            msg = data.get("message", "Booking failed.")
            return f"Sorry, I could not book the appointment. {msg}"

        logging.info("Appointment booked successfully")

        reply = (
            f"Your appointment has been booked successfully "
            f"on {slot_date} at {slot_time}."
        )

        if reason:
            reply += f" Reason noted: {reason}."

        return reply

    except Exception as e:
        logging.error(f"Error booking appointment: {e}")
        return "Something went wrong while booking your appointment."



@function_tool()
async def list_doctors(context: RunContext) -> str:
    """Fetch the list of doctors with id, availability, specialization and fees."""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{API_BASE}/all-doctors")

        if response.status_code != 200:
            return "Sorry, I could not fetch the doctor list right now."

        doctors = response.json().get("doctors", [])

        if not doctors:
            return "No doctors are currently available."

        # Build structured list for downstream logic
        enriched_doctors = []

        for d in doctors:
            enriched_doctors.append({
                "id": d.get("_id"),
                "name": d.get("name"),
                "specialization": d.get("specialization", d.get("speciality", "General")),
                "available": bool(d.get("available", False)),
                "fees": d.get("fees"),
                "experience": d.get("experience"),
                "degree": d.get("degree"),
                "image": d.get("image"),
                "slots_booked": d.get("slots_booked", {}),
            })

        # Return JSON string so LLM can reason & match doctor
        return json.dumps({
            "success": True,
            "count": len(enriched_doctors),
            "doctors": enriched_doctors
        })

    except Exception as e:
        logging.error(f"Error fetching doctors: {e}")
        return "Something went wrong while fetching the doctor list."
    
    
@function_tool()
async def get_user_details(context: RunContext) -> str:
    """
    Returns the currently stored user profile from the session.
    Intended for confirming identity before actions like booking.
    """

    user = get_session_user(context)

    if not user:
        return json.dumps({
            "success": False,
            "message": "No user session found"
        })

    # Build a clean structured response
    user_info = {
        "id": getattr(user, "id", None),
        "name": getattr(user, "name", None) or getattr(user, "user_name", None),
    }

    logging.info(f"Returning user info: {user_info}")

    return json.dumps({
        "success": True,
        "user": user_info
    })
    
    
@function_tool()
async def get_navigation_pins(context: RunContext) -> str:
    """
    Fetch all available navigation pins (named locations with coordinates).
    """

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{API_BASE}/pins", timeout=10)

        if response.status_code != 200:
            return "Sorry, I was unable to fetch the navigation locations."

        data = response.json()

        if not data.get("success"):
            return "The navigation service returned an invalid response."

        pins = data.get("pins", [])

        if not pins:
            return "No navigation points are currently configured."

        # Return structured JSON for reasoning
        return json.dumps({
            "success": True,
            "count": len(pins),
            "pins": pins
        })

    except Exception as e:
        logging.error(f"Error fetching navigation pins: {e}")
        return "Something went wrong while fetching navigation locations."
    
@function_tool()
async def navigate_to(
    context: RunContext,
    x: float,
    y: float,
) -> str:
    """
    Send a navigation request to the backend using a target coordinate.
    The backend will compute waypoints and publish them to the robot.
    """

    try:
        payload = { "x": x, "y": y }

        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{API_BASE}/plan-to-goal",
                json=payload,
                timeout=10
            )

        data = res.json()

        # backend failed to plan
        if not data.get("success"):
            msg = data.get("message", "No valid path was found.")
            return f"I attempted to plan a route, but {msg.lower()}"

        waypoints = data.get("waypoints", [])

        logging.info(f"Navigation path planned — {len(waypoints)} waypoints")

        return (
            "The navigation route has been planned and the robot "
            "is proceeding along the path."
        )

    except Exception as e:
        logging.error(f"Navigation error: {e}")
        return "Something went wrong while planning the navigation path."