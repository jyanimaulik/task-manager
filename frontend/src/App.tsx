import { useEffect, useState } from "react";
import "./app.css";

type Task = {
  id: number;
  title: string;
  description?: string | null;
  is_done: boolean;
};

type TaskPage = {
  items: Task[];
  total: number;
  skip: number;
  limit: number;
};

const API_BASE = import.meta.env.VITE_API_BASE;

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // server-side pagination
  const [page, setPage] = useState(1);
  const pageSize = 6;

  // edit modal state
  const [editing, setEditing] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const doneCount = tasks.filter((t) => t.is_done).length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = tasks; // already paginated from backend

  function buildListPath(pageNum: number) {
    const skip = (pageNum - 1) * pageSize;
    const q = search.trim();

    if (q.length > 0) {
      return `/tasks/search?query=${encodeURIComponent(q)}&skip=${skip}&limit=${pageSize}`;
    }
    return `/tasks?skip=${skip}&limit=${pageSize}`;
  }

  async function loadTasks(pageNum: number = page) {
    setLoading(true);
    setError(null);
    try {
      const path = buildListPath(pageNum);
      const data = await api<TaskPage>(path);
      setTasks(data.items);
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When search changes, reset to page 1 and fetch
  useEffect(() => {
    setPage(1);
    loadTasks(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function createTask() {
    const t = title.trim();
    if (!t) return;

    setLoading(true);
    setError(null);
    try {
      await api<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: t,
          description: description.trim() ? description.trim() : null,
        }),
      });

      setTitle("");
      setDescription("");

      // new tasks appear at the top because backend orders by id desc
      setPage(1);
      await loadTasks(1);
    } catch (e: any) {
      setError(e.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  }

  async function markDone(task: Task) {
    setLoading(true);
    setError(null);
    try {
      await api<Task>(`/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_done: true }),
      });
      await loadTasks(page);
    } catch (e: any) {
      setError(e.message || "Failed to update task");
    } finally {
      setLoading(false);
    }
  }

  async function undoTask(task: Task) {
    setLoading(true);
    setError(null);
    try {
      await api<Task>(`/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_done: false }),
      });
      await loadTasks(page);
    } catch (e: any) {
      setError(e.message || "Failed to undo task");
    } finally {
      setLoading(false);
    }
  }

  async function deleteTask(task: Task) {
    setLoading(true);
    setError(null);
    try {
      await api<void>(`/tasks/${task.id}`, { method: "DELETE" });
      // If you delete the last item on the last page, adjust page safely
      const newTotal = Math.max(0, total - 1);
      const newTotalPages = Math.max(1, Math.ceil(newTotal / pageSize));
      const nextPage = Math.min(page, newTotalPages);

      setTotal(newTotal);
      setPage(nextPage);
      await loadTasks(nextPage);
    } catch (e: any) {
      setError(e.message || "Failed to delete task");
    } finally {
      setLoading(false);
    }
  }

  function openEdit(task: Task) {
    setEditing(task);
    setEditTitle(task.title);
    setEditDesc(task.description ?? "");
  }

  function closeEdit() {
    setEditing(null);
    setEditTitle("");
    setEditDesc("");
  }

  async function saveEdit() {
    if (!editing) return;
    const newTitle = editTitle.trim();
    if (!newTitle) return;

    setLoading(true);
    setError(null);
    try {
      await api<Task>(`/tasks/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: newTitle,
          description: editDesc.trim() ? editDesc.trim() : null,
        }),
      });
      closeEdit();
      await loadTasks(page);
    } catch (e: any) {
      setError(e.message || "Failed to save changes");
    } finally {
      setLoading(false);
    }
  }

  function goPrev() {
    const next = Math.max(1, page - 1);
    setPage(next);
    loadTasks(next);
  }

  function goNext() {
    const next = Math.min(totalPages, page + 1);
    setPage(next);
    loadTasks(next);
  }

  return (
    <div className="page">
      <div className="shell">
        <header className="header">
          <div className="titleBlock">
            <h1 className="title">Task Manager</h1>
            <p className="subtitle">
              React UI + FastAPI • {total} tasks • {doneCount} done (on this page)
            </p>
          </div>

          <div className="headerActions">
            <div className="searchWrap">
              <input
                className="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks…"
              />
            </div>

            <button className="btn btnSecondary" onClick={() => loadTasks(page)} disabled={loading}>
              Refresh
            </button>
          </div>
        </header>

        <main className="mainGrid">
          <section className="card createCard">
            <div className="cardHeader">
              <h2 className="h2">Create a new task</h2>
              <span className="hint">Stored in SQLite via FastAPI</span>
            </div>

            <div className="stack">
              <label className="label">Title</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task Name"
              />

              <label className="label">Description (optional)</label>
              <textarea
                className="textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details…"
              />
            </div>

            <div className="row">
              <button
                className="btn btnPrimary"
                onClick={createTask}
                disabled={loading || !title.trim()}
              >
                Add Task
              </button>
              <button
                className="btn btnSecondary"
                onClick={() => {
                  setTitle("");
                  setDescription("");
                }}
                disabled={loading}
              >
                Clear
              </button>
            </div>

            {error && <div className="alert">{error}</div>}

            <div className="smallNote">
              Developed by Maulik Jyani
            </div>
          </section>

          <section className="card listCard">
            <div className="listHeader">
              <h2 className="h2">Tasks</h2>

              <div className="pager">
                <button className="btn btnSecondary" onClick={goPrev} disabled={page === 1}>
                  Prev
                </button>
                <div className="pagerText">
                  Page <strong>{page}</strong> / {totalPages}
                </div>
                <button className="btn btnSecondary" onClick={goNext} disabled={page === totalPages}>
                  Next
                </button>
              </div>
            </div>

            {loading && tasks.length === 0 ? (
              <div className="muted">Loading…</div>
            ) : pageItems.length === 0 ? (
              <div className="muted">No tasks found.</div>
            ) : (
              <div className="grid">
                {pageItems.map((t) => (
                  <article className="taskCard" key={t.id}>
                    <div className="taskTop">
                      <span className="badge">#{t.id}</span>
                      <div className="taskText">
                        <div className={`taskTitle ${t.is_done ? "done" : ""}`}>{t.title}</div>
                        <div className="taskDesc">{t.description ? t.description : "No description"}</div>
                      </div>
                    </div>

                    <div className="taskActions">
                      <button
                        className="btn btnSecondary"
                        onClick={() => openEdit(t)}
                        disabled={loading}
                      >
                        Edit
                      </button>

                      {!t.is_done ? (
                        <button className="btn btnPrimary" onClick={() => markDone(t)} disabled={loading}>
                          Mark done
                        </button>
                      ) : (
                        <button className="btn btnSecondary" onClick={() => undoTask(t)} disabled={loading}>
                          Undo
                        </button>
                      )}

                      <button className="btn btnDanger" onClick={() => deleteTask(t)} disabled={loading}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>

        <footer className="footer">
          <span className="footerText">
            Server-side pagination + search • Edit via modal • Toggle done/undo
          </span>
        </footer>

        {/* Edit Modal */}
        {editing && (
          <div className="modalBackdrop" onClick={closeEdit}>
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="modalHeader">
                <h3 className="modalTitle">Edit Task #{editing.id}</h3>
                <button className="iconBtn" onClick={closeEdit} aria-label="Close">
                  ✕
                </button>
              </div>

              <div className="stack">
                <label className="label">Title</label>
                <input
                  className="input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />

                <label className="label">Description</label>
                <textarea
                  className="textarea"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>

              <div className="row modalRow">
                <button
                  className="btn btnPrimary"
                  onClick={saveEdit}
                  disabled={loading || !editTitle.trim()}
                >
                  Save
                </button>
                <button className="btn btnSecondary" onClick={closeEdit} disabled={loading}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
