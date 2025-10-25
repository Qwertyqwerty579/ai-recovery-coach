# в schemas.py (НОВЫЙ ФАЙЛ)
from pydantic import BaseModel
from typing import Optional, List
from datetime import date

# --- СХЕМЫ ДЛЯ ТОКЕНОВ ---

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- СХЕМЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ---

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config:
        from_attributes = True

# --- ТВОИ СУЩЕСТВУЮЩИЕ СХЕМЫ ---

class WorkoutCreate(BaseModel):
    date: date
    type: str
    intensity: int
    duration: int
    equipment: Optional[str] = None

class WorkoutResponse(WorkoutCreate):
    id: int
    owner_id: int 
    class Config:
        from_attributes = True

class WellnessRatingCreate(BaseModel):
    date: date
    pain_level: int
    recovery_score: int

class WellnessRatingResponse(WellnessRatingCreate):
    id: int
    owner_id: int
    class Config:
        from_attributes = True

class PlanResponse(BaseModel):
    title: str
    duration_minutes: int
    exercises: list[str]
    notes: str
    
class ChatMessage(BaseModel):
    user_message: str