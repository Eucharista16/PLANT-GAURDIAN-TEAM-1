from fastapi import FastAPI, HTTPException
from google.cloud import firestore
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date, timedelta
import uuid

app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = firestore.Client.from_service_account_json("serviceAccountKey.json")

# Values that indicate someone submitted a form without real data
# (Swagger UI's default placeholder text, common junk values, etc.)
PLACEHOLDER_VALUES = {"string", "undefined", "null", "test", "n/a", "na", ""}
ALLOWED_SUNLIGHT = {"Direct", "Indirect", "Low Light"}


def reject_placeholder(value: str, field_name: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field_name} cannot be empty")
    if cleaned.lower() in PLACEHOLDER_VALUES:
        raise ValueError(f"{field_name} looks like placeholder text, not a real value")
    return cleaned


# ---- Data model (matches the project's frozen schema) ----
class Plant(BaseModel):
    name: str
    species: str
    location: str
    specific_spot: str = ""
    watering_frequency: int          # days
    last_watered: date
    sunlight: str
    water_amount_ml: int
    notes: Optional[str] = ""

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return reject_placeholder(v, "Plant name")

    @field_validator("species")
    @classmethod
    def validate_species(cls, v):
        return reject_placeholder(v, "Species")

    @field_validator("location")
    @classmethod
    def validate_location(cls, v):
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Location cannot be empty")
        return cleaned

    @field_validator("specific_spot", "notes")
    @classmethod
    def clean_optional_text(cls, v):
        return (v or "").strip()

    @field_validator("watering_frequency")
    @classmethod
    def validate_watering_frequency(cls, v):
        if v < 1 or v > 365:
            raise ValueError("Watering frequency must be between 1 and 365 days")
        return v

    @field_validator("water_amount_ml")
    @classmethod
    def validate_water_amount(cls, v):
        if v <= 0:
            raise ValueError("Water amount must be greater than 0")
        return v

    @field_validator("sunlight")
    @classmethod
    def validate_sunlight(cls, v):
        if v not in ALLOWED_SUNLIGHT:
            raise ValueError(f"Sunlight must be one of: {', '.join(sorted(ALLOWED_SUNLIGHT))}")
        return v


class PlantOut(Plant):
    id: str


# ---- Risk calculation helper ----
def calculate_risk(watering_frequency: int, last_watered: str) -> dict:
    last_watered_date = date.fromisoformat(last_watered)

    # Clamp to 0 so a future-dated "last watered" (clock skew, bad manual
    # entry) never produces a negative day count.
    days_since_raw = (date.today() - last_watered_date).days
    days_since = max(0, days_since_raw)

    if not watering_frequency or watering_frequency <= 0:
        # Legacy/malformed schedule data (e.g. frequency of 0) — never
        # divide by zero. Treat as maximum risk since no cadence exists.
        return {
            "risk_score": 100,
            "risk_level": "High Risk",
            "days_since_watered": days_since,
            "next_watering_date": last_watered_date.isoformat(),
            "days_until_next_watering": 0,
            "days_overdue": days_since,
        }

    risk = min(100, max(0, round((days_since / watering_frequency) * 100)))

    if risk < 40:
        level = "Healthy"
    elif risk < 70:
        level = "Needs Water Soon"
    else:
        level = "High Risk"

    next_watering_date = last_watered_date + timedelta(days=watering_frequency)
    days_overdue = max(0, days_since - watering_frequency)
    days_until_next_watering = max(0, watering_frequency - days_since)

    return {
        "risk_score": risk,
        "risk_level": level,
        "days_since_watered": days_since,
        "next_watering_date": next_watering_date.isoformat(),
        "days_until_next_watering": days_until_next_watering,
        "days_overdue": days_overdue,
    }


def is_valid_stored_plant(data: dict) -> bool:
    """Defensive filter for legacy/junk Firestore records created before
    validation existed (e.g. manually submitted via Swagger with default
    'string' values). New writes can no longer produce these."""
    name = str(data.get("name", "")).strip().lower()
    species = str(data.get("species", "")).strip().lower()
    location = str(data.get("location", "")).strip().lower()
    if name in PLACEHOLDER_VALUES or species in PLACEHOLDER_VALUES:
        return False
    if location in PLACEHOLDER_VALUES:
        return False
    required = ["watering_frequency", "last_watered", "sunlight", "water_amount_ml"]
    return all(data.get(f) not in (None, "") for f in required)


@app.get("/")
def read_root():
    return {"message": "Plant Guardian backend is alive"}


# ---- CREATE ----
@app.post("/plants", response_model=PlantOut)
def create_plant(plant: Plant):
    plant_id = str(uuid.uuid4())
    data = plant.model_dump()
    data["last_watered"] = data["last_watered"].isoformat()
    db.collection("plants").document(plant_id).set(data)
    return {**plant.model_dump(), "id": plant_id}


# ---- READ ALL (includes current risk so the dashboard needs one call) ----
@app.get("/plants")
def get_all_plants():
    docs = db.collection("plants").stream()
    results = []
    for doc in docs:
        data = doc.to_dict()
        if not is_valid_stored_plant(data):
            continue
        risk_info = calculate_risk(data["watering_frequency"], data["last_watered"])
        results.append({**data, "id": doc.id, **risk_info})
    return results


# ---- READ ONE ----
@app.get("/plants/{plant_id}")
def get_plant(plant_id: str):
    doc = db.collection("plants").document(plant_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Plant not found")
    data = doc.to_dict()
    risk_info = calculate_risk(data["watering_frequency"], data["last_watered"])
    return {**data, "id": doc.id, **risk_info}


# ---- UPDATE ----
@app.put("/plants/{plant_id}", response_model=PlantOut)
def update_plant(plant_id: str, plant: Plant):
    doc_ref = db.collection("plants").document(plant_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Plant not found")
    data = plant.model_dump()
    data["last_watered"] = data["last_watered"].isoformat()
    doc_ref.set(data)
    return {**plant.model_dump(), "id": plant_id}


# ---- DELETE ----
@app.delete("/plants/{plant_id}")
def delete_plant(plant_id: str):
    doc_ref = db.collection("plants").document(plant_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Plant not found")
    doc_ref.delete()
    return {"message": "Plant deleted"}


# ---- RISK SCORE ----
@app.get("/plants/{plant_id}/risk")
def get_plant_risk(plant_id: str):
    doc = db.collection("plants").document(plant_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Plant not found")
    data = doc.to_dict()
    risk_info = calculate_risk(data["watering_frequency"], data["last_watered"])
    return {"plant_id": plant_id, "name": data["name"], **risk_info}


# ---- JUST WATERED ----
@app.patch("/plants/{plant_id}/water")
def water_plant(plant_id: str):
    doc_ref = db.collection("plants").document(plant_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Plant not found")

    today_str = date.today().isoformat()
    doc_ref.update({"last_watered": today_str})

    updated = doc_ref.get().to_dict()
    risk_info = calculate_risk(updated["watering_frequency"], updated["last_watered"])
    return {"plant_id": plant_id, "name": updated["name"], "last_watered": today_str, **risk_info}


# ---- DEV-ONLY CLEANUP: remove legacy junk records (e.g. "string" test data) ----
@app.delete("/dev/cleanup-invalid-plants")
def cleanup_invalid_plants():
    """Development helper only — deletes Firestore plant docs that fail
    validation (leftover Swagger test entries). Not part of the team API
    contract; safe to remove before final submission if you want a
    smaller attack surface for the demo build."""
    docs = db.collection("plants").stream()
    deleted = []
    for doc in docs:
        if not is_valid_stored_plant(doc.to_dict()):
            db.collection("plants").document(doc.id).delete()
            deleted.append(doc.id)
    return {"deleted_count": len(deleted), "deleted_ids": deleted}
