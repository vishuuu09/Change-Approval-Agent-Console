from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class PlanStep(BaseModel):
    order: int = Field(ge=1)
    action: str = Field(min_length=3, max_length=300)
    risk: Literal["low", "medium", "high"]


class Plan(BaseModel):
    summary: str = Field(min_length=3, max_length=500)
    steps: list[PlanStep] = Field(min_length=1, max_length=20)


class ChangeCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=10, max_length=2000)


class ReviewBody(BaseModel):
    comment: str = Field(default="", max_length=500)


class ChangeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str
    status: str
    plan: Plan | None
    created_by: str
    reviewed_by: str | None
    review_comment: str | None
    created_at: datetime


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    actor: str
    action: str
    detail: str
    ts: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    username: str
    role: str
