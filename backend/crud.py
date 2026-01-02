from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Task
from schemas import TaskCreate, TaskUpdate

def create_task(db: Session, task_in: TaskCreate) -> Task:
    task = Task(title=task_in.title, description=task_in.description, is_done=False)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

def list_tasks(db: Session, skip: int = 0, limit: int = 50) -> list[Task]:
    return db.query(Task).offset(skip).limit(limit).all()

def get_task(db: Session, task_id: int) -> Task | None:
    return db.query(Task).filter(Task.id == task_id).first()

def update_task(db: Session, task: Task, task_in: TaskUpdate) -> Task:
    if task_in.title is not None:
        task.title = task_in.title
    if task_in.description is not None:
        task.description = task_in.description
    if task_in.is_done is not None:
        task.is_done = task_in.is_done

    db.add(task)
    db.commit()
    db.refresh(task)
    return task

def delete_task(db: Session, task: Task) -> None:
    db.delete(task)
    db.commit()

def search_tasks(db: Session, query: str, skip: int = 0, limit: int = 50):
    return (
        db.query(Task)
        .filter(Task.title.ilike(f"%{query}%"))
        .offset(skip)
        .limit(limit)
        .all()
    )

def count_tasks(db: Session) -> int:
    return db.query(func.count(Task.id)).scalar() or 0

def list_tasks_paged(db: Session, skip: int = 0, limit: int = 50) -> list[Task]:
    return db.query(Task).order_by(Task.id.desc()).offset(skip).limit(limit).all()

def count_search_tasks(db: Session, query: str) -> int:
    return (
        db.query(func.count(Task.id))
        .filter(Task.title.ilike(f"%{query}%"))
        .scalar()
        or 0
    )

def search_tasks_paged(db: Session, query: str, skip: int = 0, limit: int = 50) -> list[Task]:
    return (
        db.query(Task)
        .filter(Task.title.ilike(f"%{query}%"))
        .order_by(Task.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
