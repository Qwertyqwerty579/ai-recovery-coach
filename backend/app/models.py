from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    workouts = relationship("Workout", back_populates="owner")
    wellness_ratings = relationship("WellnessRating", back_populates="owner")

class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    type = Column(String, index=True)
    intensity = Column(Integer)
    duration = Column(Integer)
    equipment = Column(String, nullable=True)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="workouts")

class WellnessRating(Base):
    __tablename__ = "wellness_ratings"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    pain_level = Column(Integer)
    recovery_score = Column(Integer)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="wellness_ratings")

