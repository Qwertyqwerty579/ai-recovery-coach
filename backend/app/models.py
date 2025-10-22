from sqlalchemy import Column, Integer, String, Date
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    type = Column(String, index=True)
    intensity = Column(Integer)
    duration = Column(Integer)
    equipment = Column(String, nullable=True)

class WellnessRating(Base):
    __tablename__ = "wellness_ratings"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, unique=True)
    pain_level = Column(Integer)
    recovery_score = Column(Integer)

