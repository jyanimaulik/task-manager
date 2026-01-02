from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, engine, SessionLocal
from schemas import TaskCreate, TaskUpdate, TaskOut, TaskPage
import crud

# Create DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Task API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://task-manager-seven-sable.vercel.app/",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
def health():
    return {"status": "ok"}


########################## GUI ##########################################




#########################################################################

@app.post("/tasks", response_model=TaskOut, status_code=201)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    return crud.create_task(db, task_in)

@app.get("/tasks", response_model=TaskPage)
def list_tasks(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    total = crud.count_tasks(db)
    items = crud.list_tasks_paged(db, skip=skip, limit=limit)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


# @app.get("/tasks/search", response_model=list[TaskOut])
# def search_tasks(
#     query: str,
#     skip: int = 0,
#     limit: int = 50,
#     db: Session = Depends(get_db),
# ):
#     return crud.search_tasks(db, query=query, skip=skip, limit=limit)

@app.get("/tasks/search", response_model=TaskPage)
def search_tasks(query: str, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    total = crud.count_search_tasks(db, query=query)
    items = crud.search_tasks_paged(db, query=query, skip=skip, limit=limit)
    return {"items": items, "total": total, "skip": skip, "limit": limit}



@app.get("/tasks/{task_id}", response_model=TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.put("/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: int, task_in: TaskUpdate, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return crud.update_task(db, task, task_in)

@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    crud.delete_task(db, task)
    return None


