import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import TopNav from "../components/TopNav";

type TeamRole = "TEAM_ADMIN" | "TEAM_MEMBER";

type Member = {
  id: string;
  teamRole: TeamRole;
  user: { id: string; email: string; name: string; role: string };
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  dueDate: string | null;
  assignee: { id: string; email: string; name: string } | null;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  members: Member[];
  tasks: Task[];
  viewerTeamRole: TeamRole | null;
};

function statusClass(s: Task["status"]) {
  if (s === "TODO") return "badge-todo";
  if (s === "IN_PROGRESS") return "badge-progress";
  return "badge-done";
}

function teamRoleLabel(r: TeamRole) {
  return r === "TEAM_ADMIN" ? "Team admin" : "Team member";
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [busy, setBusy] = useState(false);

  const members = project?.members ?? [];
  const isTeamAdmin = project?.viewerTeamRole === "TEAM_ADMIN";

  const assigneeOptions = useMemo(() => {
    return members.map((m) => m.user);
  }, [members]);

  async function load() {
    if (!id) return;
    try {
      const p = await api<Project>(`/api/projects/${id}`);
      setProject(p);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project");
      setProject(null);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function setMemberTeamRole(memberUserId: string, teamRole: TeamRole) {
    if (!id) return;
    setBusy(true);
    try {
      await api(`/api/projects/${id}/members/${memberUserId}`, {
        method: "PATCH",
        json: { teamRole },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update role");
    } finally {
      setBusy(false);
    }
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !memberEmail.trim()) return;
    setBusy(true);
    try {
      await api(`/api/projects/${id}/members`, {
        method: "POST",
        json: { email: memberEmail.trim() },
      });
      setMemberEmail("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add member");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(userId: string) {
    if (!id) return;
    if (!confirm("Remove this member from the project?")) return;
    try {
      await api(`/api/projects/${id}/members/${userId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove member");
    }
  }

  async function deleteProject() {
    if (!id) return;
    if (!confirm("Delete this project and all its tasks?")) return;
    try {
      await api(`/api/projects/${id}`, { method: "DELETE" });
      navigate("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    }
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !title.trim()) return;
    setBusy(true);
    const json: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || undefined,
    };
    if (due) json.dueDate = new Date(due).toISOString();
    if (assigneeId) json.assigneeId = assigneeId;
    try {
      await api(`/api/projects/${id}/tasks`, { method: "POST", json });
      setTitle("");
      setDescription("");
      setDue("");
      setAssigneeId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task");
    } finally {
      setBusy(false);
    }
  }

  async function updateTask(task: Task, patch: Record<string, unknown>) {
    try {
      await api(`/api/tasks/${task.id}`, { method: "PATCH", json: patch });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  if (!id) return null;

  return (
    <div className="layout">
      <TopNav />
      {error && <p className="error">{error}</p>}
      {!project && !error && <p className="text-muted">Loading…</p>}
      {project && (
        <>
          <p className="text-muted" style={{ marginTop: 0 }}>
            You are <strong style={{ color: "var(--text)" }}>{teamRoleLabel(project.viewerTeamRole ?? "TEAM_MEMBER")}</strong> on this
            project. <strong style={{ color: "var(--text)" }}>Team admin</strong> is per project; your{" "}
            <strong style={{ color: "var(--text)" }}>Admin / Member account</strong> (from sign-up) only controls whether you can create new projects.
          </p>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 className="page-title" style={{ fontSize: "1.5rem", marginBottom: "0.35rem" }}>
                {project.name}
              </h1>
              {project.description && <p className="text-muted" style={{ fontSize: "1rem" }}>{project.description}</p>}
            </div>
            {isTeamAdmin && (
              <button type="button" className="btn btn-danger" onClick={deleteProject}>
                Delete project
              </button>
            )}
          </div>

          <div className="card">
            <h2>Team</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1rem" }}>
              {members.map((m) => (
                <li key={m.id} className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                  <span>
                    {m.user.name} ({m.user.email}){" "}
                    <span className={`badge ${m.teamRole === "TEAM_ADMIN" ? "badge-admin" : "badge-member"}`}>
                      {teamRoleLabel(m.teamRole)}
                    </span>
                  </span>
                  <span className="row">
                    {isTeamAdmin && (
                      <select
                        value={m.teamRole}
                        disabled={busy}
                        onChange={(e) =>
                          void setMemberTeamRole(m.user.id, e.target.value as TeamRole)
                        }
                        aria-label={`Role for ${m.user.name}`}
                      >
                        <option value="TEAM_ADMIN">Team admin</option>
                        <option value="TEAM_MEMBER">Team member</option>
                      </select>
                    )}
                    {isTeamAdmin && (
                      <button type="button" className="btn btn-ghost" onClick={() => removeMember(m.user.id)}>
                        Remove
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {isTeamAdmin && (
              <form onSubmit={addMember} className="row">
                <input
                  type="email"
                  placeholder="Add member by email (must already have an account)"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  style={{ flex: 1, minWidth: 200 }}
                />
                <button type="submit" className="btn" disabled={busy}>
                  Add
                </button>
              </form>
            )}
          </div>

          <div className="card">
            <h2>New task</h2>
            <form onSubmit={createTask} className="row" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
              <label>
                Due
                <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
              </label>
              <label>
                Assignee
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {assigneeOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn" disabled={busy} style={{ alignSelf: "flex-start" }}>
                {busy ? "Saving…" : "Create task"}
              </button>
            </form>
          </div>

          <div className="card">
            <h2>Tasks</h2>
            {project.tasks.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>No tasks yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Assignee</th>
                    <th>Status</th>
                    <th>Due</th>
                    {isTeamAdmin && <th />}
                  </tr>
                </thead>
                <tbody>
                  {project.tasks.map((t) => {
                    const canEditStatus = isTeamAdmin || t.assignee?.id === user?.id;
                    return (
                      <tr key={t.id}>
                        <td>
                          <strong>{t.title}</strong>
                          {t.description && (
                            <div className="text-muted" style={{ fontSize: "0.85rem" }}>{t.description}</div>
                          )}
                        </td>
                        <td>{t.assignee?.name ?? "—"}</td>
                        <td>
                          {canEditStatus ? (
                            <select
                              value={t.status}
                              onChange={(e) =>
                                void updateTask(t, { status: e.target.value as Task["status"] })
                              }
                            >
                              <option value="TODO">To do</option>
                              <option value="IN_PROGRESS">In progress</option>
                              <option value="DONE">Done</option>
                            </select>
                          ) : (
                            <span className={`badge ${statusClass(t.status)}`}>{t.status}</span>
                          )}
                        </td>
                        <td>{t.dueDate ? new Date(t.dueDate).toLocaleString() : "—"}</td>
                        {isTeamAdmin && (
                          <td>
                            <button
                              type="button"
                              className="btn btn-danger"
                              style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
                              onClick={async () => {
                                if (!confirm("Delete this task?")) return;
                                try {
                                  await api(`/api/tasks/${t.id}`, { method: "DELETE" });
                                  await load();
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : "Delete failed");
                                }
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
