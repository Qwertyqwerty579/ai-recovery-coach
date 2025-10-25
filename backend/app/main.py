import os
from datetime import date
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
from .models import Base, Workout, WellnessRating, User
from . import schemas
from . import auth
from .auth import get_current_user
from .database import engine, get_db, SessionLocal

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = None
if OPENAI_API_KEY:
    client = OpenAI(api_key=OPENAI_API_KEY)
else:
    print("WARNING: OPENAI_API_KEY is not set. AI features will be disabled.")

def create_db_and_tables():
    print("Creating database and tables...")
    Base.metadata.create_all(bind=engine)
    print("Database and tables created successfully.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan) 
app.include_router(auth.router, prefix="/api")
origins = [
    "https://ai-recovery-coach-frontend.onrender.com",
    "https://www.airecoverycoachs.asia",
    "https://airecoverycoachs.asia"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/")
def read_root():
    return {"message": "AI Recovery Coach API is running"}

@app.post("/api/workouts", response_model=schemas.WorkoutResponse) 
def create_workout(
    workout: schemas.WorkoutCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) 
):
    db_workout = Workout(**workout.dict(), owner_id=current_user.id) 
    db.add(db_workout)
    db.commit()
    db.refresh(db_workout)
    return db_workout

@app.get("/api/workouts", response_model=List[schemas.WorkoutResponse]) 
def read_workouts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) 
):
    workouts = db.query(Workout).filter(
        Workout.owner_id == current_user.id
    ).order_by(Workout.date.desc()).offset(skip).limit(limit).all()
    return workouts

@app.post("/api/ratings", response_model=schemas.WellnessRatingResponse) 
def create_or_update_wellness_rating(
    rating: schemas.WellnessRatingCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) 
):
    db_rating = db.query(WellnessRating).filter(
        WellnessRating.date == rating.date,
        WellnessRating.owner_id == current_user.id 
    ).first()

    if db_rating:
        db_rating.pain_level = rating.pain_level
        db_rating.recovery_score = rating.recovery_score
    else:
        db_rating = WellnessRating(**rating.dict(), owner_id=current_user.id) 
        db.add(db_rating)
    db.commit()
    db.refresh(db_blog)
    return db_rating

@app.get("/api/ratings", response_model=List[schemas.WellnessRatingResponse])
def read_wellness_ratings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) 
):
    ratings = db.query(WellnessRating).filter(
        WellnessRating.owner_id == current_user.id 
    ).order_by(WellnessRating.date).all()
    return ratings

@app.post("/api/generate-plan", response_model=schemas.PlanResponse)
async def generate_recovery_plan(
    workout: schemas.WorkoutCreate, 
    current_user: User = Depends(get_current_user) 
): 
    if not client:
        raise HTTPException(status_code=503, detail="OpenAI API key is not configured.")
    
    prompt = f"""
    You are an expert AI Recovery Coach. Generate a detailed and personalized recovery plan for an athlete based on the following workout details.

    Workout Details:
    - Type: {workout.type}
    - Duration: {workout.duration} minutes
    - Intensity (1-10): {workout.intensity}
    - Equipment Used: {workout.equipment if workout.equipment else "Not specified"}

    The recovery plan should be structured and actionable. It must include the following sections:
    1.  A concise, motivating title for the plan.
    2.  The total estimated duration of the active recovery session in minutes.
    3.  A list of 3-5 specific exercises (stretching, mobility, foam rolling). For each exercise, provide a brief, clear instruction (e.g., "Quad Stretch: Stand and pull your heel towards your glute, hold for 30 seconds per side.").
    4.  A short, general recommendation or note about the importance of consistency or listening to one's body.

    Your response MUST be in a strict JSON format, without any introductory text or explanations.

    Example JSON structure:
    {{
      "title": "Post-Workout Essential Cool-Down",
      "duration_minutes": 20,
      "exercises": [
        "Cat-Cow Stretch: On all fours, alternate between arching and rounding your back. 10 reps.",
        "Hamstring Stretch: Sit on the floor with one leg extended, gently lean forward. 30 seconds per side.",
        "Foam Roll Calves: Sit on the floor and place a foam roller under your calves. Roll slowly from ankle to knee. 60 seconds per leg.",
        "World's Greatest Stretch: From a lunge position, place one hand on the floor and rotate your torso, reaching the other arm to the sky. 5 reps per side."
      ],
      "notes": "Remember to hydrate well and listen to your body. Stop if you feel any sharp pain."
    }}
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo-1106",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are an AI Recovery Coach that responds in a structured JSON format."},
                {"role": "user", "content": prompt}
            ]
        )
        plan_data = response.choices[0].message.content
        return schemas.PlanResponse.parse_raw(plan_data)
    except Exception as e:
        print(f"Error calling OpenAI: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate plan from AI")

@app.post("/api/chat")
async def chat_with_coach(
    message: schemas.ChatMessage, 
    current_user: User = Depends(get_current_user)
): 
    if not client:
        raise HTTPException(status_code=503, detail="OpenAI API key is not configured.")

    prompt = f"A user is asking a question in the chat. You are a friendly and supportive AI Recovery Coach. Answer concisely and to the point. User's question: \"{message.user_message}\""
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an AI Recovery Coach. Keep your answers brief and helpful."},
                {"role": "user", "content": prompt}
            ]
        )
        coach_response = response.choices[0].message.content
        return {"coach_response": coach_response}
    except Exception as e:
        print(f"Error in chat with OpenAI: {e}")
        raise HTTPException(status_code=500, detail="AI chat service is unavailable")

