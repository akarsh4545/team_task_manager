import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import TopNav from "../components/TopNav";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  _count: { tasks: number; members: number };
};

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const isGlobalAdmin = user?.role === "ADMIN";

  async function load() {
    try {
      const list = await api<ProjectRow[]>("/api/projects");
      setProjects(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api("/api/projects", {
        method: "POST",
        json: { name: name.trim(), description: description.trim() || undefined },
      });
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="layout">
      <TopNav />
      <h1 className="page-title">Projects</h1>
      {error && <p className="error">{error}</p>}

      {isGlobalAdmin ? (
        <div className="card card-accent-top">
          <h2>New project</h2>
          <p className="text-muted" style={{ marginTop: 0 }}>
            You have an <strong>Admin account</strong>, so you can create teams. You become{" "}
            <strong>team admin</strong> on each project you create and can add co-admins inside the team.
          </p>
          <form onSubmit={createProject} className="form-stack" style={{ marginTop: "1rem" }}>
            <div className="form-field">
              <label htmlFor="proj-name">Project name</label>
              <input
                id="proj-name"
                placeholder="e.g. Mobile launch"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="proj-desc">Description (optional)</label>
              <textarea
                id="proj-desc"
                placeholder="What is this team working on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <button type="submit" className="btn" disabled={busy} style={{ alignSelf: "flex-start" }}>
              {busy ? "Creating…" : "Create project"}
            </button>
          </form>
        </div>
      ) : (
        <div className="card">
          <h2>Member account</h2>
          <p className="text-muted" style={{ marginTop: 0 }}>
            You registered as a <strong>Member</strong>, so you cannot create new projects here. Ask an{" "}
            <strong>Admin</strong> user to add your email to their team; then the project will show in{" "}
            <strong>Your projects</strong> below.
          </p>
        </div>
      )}

      <div className="card">
        <h2>Your projects</h2>
        {projects.length === 0 ? (
          <p className="text-muted" style={{ margin: 0 }}>
            No projects yet.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Members</th>
                <th>Tasks</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/projects/${p.id}`}>{p.name}</Link>
                    {p.description && <div className="text-muted" style={{ marginTop: 4 }}>{p.description}</div>}
                  </td>
                  <td>{p._count.members}</td>
                  <td>{p._count.tasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
