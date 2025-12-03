from flask import Flask, request, jsonify
from livekit import api
import json
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

@app.get("/token")
def generate_token():
    user_id = request.args.get("id", "mobile-user")
    room_name = request.args.get("room", "my-room")
    
    user_data_raw = request.args.get("userData", "{}")
    try:
        user_data = json.loads(user_data_raw)
    except:
        user_data = {}

    # Create token
    token = (
        api.AccessToken(
            os.getenv("LIVEKIT_API_KEY"),
            os.getenv("LIVEKIT_API_SECRET")
        )
        .with_identity(user_id)
        .with_name(user_data.get("name", "Expo User"))
        .with_metadata(json.dumps(user_data))  
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
            )
        )
        .to_jwt()
    )

    return jsonify({"token": token})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8082)

