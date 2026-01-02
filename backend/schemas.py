from pydantic import BaseModel, Field
from typing import Optional, List

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    is_done: Optional[bool] = None

class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    is_done: bool

    class Config:
        from_attributes = True  # SQLAlchemy -> Pydantic

class TaskPage(BaseModel):
    items: List[TaskOut]
    total: int
    skip: int
    limit: int
