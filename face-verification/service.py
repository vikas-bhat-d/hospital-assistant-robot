from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
import numpy as np
from PIL import Image
import base64
import pickle
import io
import os
import uuid
import requests  
from dotenv import load_dotenv

load_dotenv();

app = Flask(__name__)
CORS(app)

PICKLE_FILE = "face_encodings.pkl"
DATASET_DIR = "datasets"
TEMP_DIR = "temp_images"

os.makedirs(DATASET_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

def load_encodings():
    if not os.path.exists(PICKLE_FILE):
        return [], []
    with open(PICKLE_FILE, "rb") as f:
        return pickle.load(f)


def save_encodings(encodings, ids):
    with open(PICKLE_FILE, "wb") as f:
        pickle.dump((encodings, ids), f)


known_encodings, known_ids = load_encodings()
print("Loaded encodings:", len(known_encodings))

def save_and_flip_base64(base64_string):
    base64_string = base64_string.replace("\n", "").replace("\r", "").strip()

    # RAW save
    raw_name = f"raw_{uuid.uuid4().hex}.jpg"
    raw_path = os.path.join(TEMP_DIR, raw_name)

    img_bytes = base64.b64decode(base64_string)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    img.save(raw_path)

    # Load raw for flipping
    frame = face_recognition.load_image_file(raw_path)

    # Flip horizontally
    flipped = np.flip(frame, axis=1)

    # Save flipped
    flipped_name = f"flipped_{uuid.uuid4().hex}.jpg"
    flipped_path = os.path.join(TEMP_DIR, flipped_name)
    Image.fromarray(flipped).save(flipped_path)

    os.remove(raw_path)

    return flipped_path


# ==================================================
#  VERIFY FACE  —  /verify-face   (updated)
# ==================================================
# @app.route("/verify-face", methods=["POST"])
# def verify_face():
#     global known_encodings, known_ids
#     try:
#         req = request.get_json()
#         if not req or "image" not in req:
#             return jsonify({"status": "error", "detail": "Missing base64 image"})

#         # Get flipped image path
#         flipped_path = save_and_flip_base64(req["image"])
#         print("Flipped saved at:", flipped_path)

#         # Load flipped image for recognition
#         img = face_recognition.load_image_file(flipped_path)
#         encs = face_recognition.face_encodings(img)

#         print("Found encodings:", len(encs))
        

#         if len(encs) == 0:
#             return jsonify({"status": "no_face", "saved_flipped": flipped_path})

#         test_encoding = encs[0]
        
#         # Ensure encodings are up to date
#         known_encodings, known_ids = load_encodings()

#         # Matching
#         matches = face_recognition.compare_faces(known_encodings, test_encoding, tolerance=0.6)
#         distances = face_recognition.face_distance(known_encodings, test_encoding)
#         best_index = int(np.argmin(distances))

#         if not matches[best_index]:
#             return jsonify({"status": "no_match", "saved_flipped": flipped_path})

#         matched_id = known_ids[best_index]
#         print("MATCH:", matched_id)
#         os.remove(flipped_path)

#         # -------------------------------------------------
#         # 1️⃣ Fetch full user details from Node backend
#         # -------------------------------------------------
#         print("Calling Node backend to get user details...")

#         try:
#             profile_res = requests.get(
#                 f"{os.getenv('BACKEND_URL')}/api/robo/get-profile-robo",
#                 json={"userId": matched_id},
#                 timeout=5
#             )
#             profile_data = profile_res.json()
#             print("Profile received:", profile_data)

#             if not profile_data.get("success"):
#                 return jsonify({
#                     "status": "matched",
#                     "id": matched_id,
#                     "detail": "Profile fetch failed",
#                     "profile_error": profile_data
#                 })

#             user_details = profile_data.get("userData")

#         except Exception as err:
#             print("Profile fetch error:", err)
#             return jsonify({
#                 "status": "matched",
#                 "id": matched_id,
#                 "detail": "Profile API failed",
#                 "error": str(err)
#             })


#         return jsonify({
#             "status": "matched",
#             "id": matched_id,
#             "profile": user_details,
#             "robot": {},
#             "saved_flipped": flipped_path
#         })

#     except Exception as e:
#         print("ERR:", e)
#         return jsonify({"status": "error", "detail": str(e)})


@app.route("/verify-face", methods=["POST"])
def verify_face():
    global known_encodings, known_ids

    print("---- /verify-face REQUEST RECEIVED ----")

    try:
        req = request.get_json()
        print("Request received:", bool(req))

        if not req or "image" not in req:
            print("Missing image in request")
            return jsonify({"status": "error", "detail": "Missing base64 image"})

        # ===============================
        # Save + flip image
        # ===============================
        flipped_path = save_and_flip_base64(req["image"])
        print("Flipped saved at:", flipped_path)

        # ===============================
        # Extract face encodings
        # ===============================
        img = face_recognition.load_image_file(flipped_path)
        encs = face_recognition.face_encodings(img)

        print("Found encodings count:", len(encs))

        if len(encs) == 0:
            print("No face detected")
            return jsonify({"status": "no_face", "saved_flipped": flipped_path})

        # (Optional later: choose largest face)
        test_encoding = encs[0]
        print("Selected test encoding")

        # ===============================
        # Load known encodings
        # ===============================
        print("Loading known encodings...")
        known_encodings, known_ids = load_encodings()

        print("Loaded known encodings:", len(known_encodings))
        print("Loaded known ids:", len(known_ids))

        if not known_encodings or len(known_encodings) == 0:
            print("No known encodings in database")
            return jsonify({"status": "no_known_faces"})

        if len(known_encodings) != len(known_ids):
            print("Encoding / ID length mismatch!")
            return jsonify({"status": "encoding_mismatch"})

        # ===============================
        # Compare & compute distances
        # ===============================
        print("Running face comparison...")

        matches = face_recognition.compare_faces(
            known_encodings, test_encoding, tolerance=0.9
        )

        distances = face_recognition.face_distance(
            known_encodings, test_encoding
        )

        print("Distances:", distances.tolist())
        print("Matches:", matches)

        if len(distances) == 0:
            print("Distances empty, skipping match")
            return jsonify({"status": "no_known_faces"})

        best_index = int(np.argmin(distances))
        print("Best index:", best_index, "Distance:", distances[best_index])

        if not matches[best_index]:
            print("No match found — lowest distance did not pass tolerance")
            return jsonify({"status": "no_match", "saved_flipped": flipped_path})

        matched_id = known_ids[best_index]
        print("🎯 MATCH FOUND:", matched_id)

        # Remove flipped image (cleanup)
        try:
            os.remove(flipped_path)
            print("Deleted temp file:", flipped_path)
        except:
            print("Warning: failed to delete temp file")

        # ===============================
        # Fetch profile from Node backend
        # ===============================
        backend_url = os.getenv("BACKEND_URL")
        print("Calling backend:", backend_url)

        try:
            profile_res = requests.get(
                f"{backend_url}/api/robo/get-profile-robo",
                json={"userId": matched_id},
                timeout=5
            )

            print("Profile API status:", profile_res.status_code)
            profile_data = profile_res.json()
            print("Profile response:", profile_data)

            if not profile_data.get("success"):
                print("Profile fetch failed")
                return jsonify({
                    "status": "matched",
                    "id": matched_id,
                    "detail": "Profile fetch failed",
                    "profile_error": profile_data
                })

            user_details = profile_data.get("userData")

        except Exception as err:
            print("Profile fetch error:", err)
            return jsonify({
                "status": "matched",
                "id": matched_id,
                "detail": "Profile API failed",
                "error": str(err)
            })

        # ===============================
        # Final success response
        # ===============================
        print("Returning matched response")

        return jsonify({
            "status": "matched",
            "id": matched_id,
            "profile": user_details,
            "robot": {},
            "saved_flipped": flipped_path
        })

    except Exception as e:
        print("❌ FATAL ERROR in /verify-face:", e)
        return jsonify({"status": "error", "detail": str(e)})



# ==================================================
# Run Flask Server
# ==================================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)





# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import face_recognition
# import numpy as np
# from PIL import Image
# import base64
# import pickle
# import io
# import os
# import uuid

# app = Flask(__name__)
# CORS(app)

# PICKLE_FILE = "face_encodings.pkl"
# DATASET_DIR = "datasets"
# TEMP_DIR = "temp_images"

# os.makedirs(DATASET_DIR, exist_ok=True)
# os.makedirs(TEMP_DIR, exist_ok=True)


# # ==================================================
# #  Helper: Load and Save encodings
# # ==================================================
# def load_encodings():
#     if not os.path.exists(PICKLE_FILE):
#         return [], []
#     with open(PICKLE_FILE, "rb") as f:
#         return pickle.load(f)


# def save_encodings(encodings, ids):
#     with open(PICKLE_FILE, "wb") as f:
#         pickle.dump((encodings, ids), f)


# # Load encodings into memory
# known_encodings, known_ids = load_encodings()
# print("Loaded encodings:", len(known_encodings))


# # ==================================================
# #  Helper: Save Base64 → Flipped Image
# # ==================================================
# def save_and_flip_base64(base64_string):
#     base64_string = base64_string.replace("\n", "").replace("\r", "").strip()

#     # RAW save
#     raw_name = f"raw_{uuid.uuid4().hex}.jpg"
#     raw_path = os.path.join(TEMP_DIR, raw_name)

#     img_bytes = base64.b64decode(base64_string)
#     img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
#     img.save(raw_path)

#     # Load raw for flipping
#     frame = face_recognition.load_image_file(raw_path)

#     # Flip horizontally
#     flipped = np.flip(frame, axis=1)

#     # Save flipped
#     flipped_name = f"flipped_{uuid.uuid4().hex}.jpg"
#     flipped_path = os.path.join(TEMP_DIR, flipped_name)
#     Image.fromarray(flipped).save(flipped_path)

#     os.remove(raw_path)

#     return flipped_path


# # ==================================================
# # 1️⃣  ADD NEW ENCODING  —  /add-encoding
# # ==================================================
# @app.route("/add-encoding", methods=["POST"])
# def add_encoding():
#     global known_encodings, known_ids
#     try:
#         data = request.get_json()

#         if not data or "image" not in data or "userId" not in data:
#             return jsonify({"success": False, "message": "Missing image or userId"}), 400

#         base64_img = data["image"]
#         user_id = data["userId"]

#         # Clean base64
#         base64_img = base64_img.replace("\n", "").replace("\r", "").strip()

#         # Convert base64 → PIL image
#         img_bytes = base64.b64decode(base64_img)
#         img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

#         # Save in dataset folder
#         user_path = os.path.join(DATASET_DIR, f"{user_id}.jpg")
#         img.save(user_path)

#         # Get face encoding
#         np_img = face_recognition.load_image_file(user_path)
#         encs = face_recognition.face_encodings(np_img)

#         if len(encs) == 0:
#             return jsonify({"success": False, "message": "No face detected"}), 400

#         new_encoding = encs[0]

#         # Update pickle data
#         known_encodings, known_ids = load_encodings()

#         if user_id in known_ids:
#             idx = known_ids.index(user_id)
#             known_encodings[idx] = new_encoding
#             print(f"✔ Updated encoding for {user_id}")
#         else:
#             known_encodings.append(new_encoding)
#             known_ids.append(user_id)
#             print(f"✔ Added encoding for {user_id}")

#         save_encodings(known_encodings, known_ids)

#         return jsonify({
#             "success": True,
#             "message": "Encoding saved",
#             "userId": user_id,
#             "path": user_path
#         })

#     except Exception as e:
#         print("Error:", e)
#         return jsonify({"success": False, "message": str(e)}), 500


# # ==================================================
# # 2️⃣ VERIFY FACE  —  /verify-face
# # ==================================================
# @app.route("/verify-face", methods=["POST"])
# def verify_face():
#     global known_encodings, known_ids
#     try:
#         req = request.get_json()
#         if not req or "image" not in req:
#             return jsonify({"status": "error", "detail": "Missing base64 image"})

#         # Get flipped image path
#         flipped_path = save_and_flip_base64(req["image"])
#         print("Flipped saved at:", flipped_path)

#         # Load flipped image for recognition
#         img = face_recognition.load_image_file(flipped_path)
#         encs = face_recognition.face_encodings(img)

#         print("Found encodings:", len(encs))

#         if len(encs) == 0:
#             return jsonify({"status": "no_face", "saved_flipped": flipped_path})

#         test_encoding = encs[0]

#         # Ensure encodings are up to date
#         known_encodings, known_ids = load_encodings()

#         # Matching
#         matches = face_recognition.compare_faces(known_encodings, test_encoding, tolerance=0.6)
#         distances = face_recognition.face_distance(known_encodings, test_encoding)
#         best_index = int(np.argmin(distances))

#         if matches[best_index]:
#             matched_id = known_ids[best_index]
#             print("✔ MATCH:", matched_id)

#             return jsonify({
#                 "status": "matched",
#                 "id": matched_id,
#                 "index": best_index,
#                 "saved_flipped": flipped_path
#             })

#         return jsonify({"status": "no_match", "saved_flipped": flipped_path})

#     except Exception as e:
#         print("ERR:", e)
#         return jsonify({"status": "error", "detail": str(e)})


# # ==================================================
# # Run Flask Server
# # ==================================================
# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=8080, debug=True)
