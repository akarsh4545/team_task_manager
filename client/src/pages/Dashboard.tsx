import { useEffect, useState } from "react";
import { api } from "../api";
import TopNav from "../components/TopNav";

type DashboardData = {
  totalTasks: number;
  byStatus: { TODO: number; IN_PROGRESS: number; DONE: number };
  overdueCount: number;
  overdueTasks: {
    id: string;
    title: string;
    dueDate: string;
    projectName: string;
  }[];
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api<DashboardData>("/api/dashboard");
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="layout">
      <TopNav />
      <h1 className="page-title">Dashboard</h1>
      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="text-muted">Loading summary…</p>}
      {data && (
        <>
          <div className="stat-grid">
            <div className="card stat-card">
              <h2>Total tasks</h2>
              <p className="stat-value">{data.totalTasks}</p>
            </div>
            <div className="card stat-card">
              <h2>To do</h2>
              <p className="stat-value">{data.byStatus.TODO}</p>
            </div>
            <div className="card stat-card">
              <h2>In progress</h2>
              <p className="stat-value">{data.byStatus.IN_PROGRESS}</p>
            </div>
            <div className="card stat-card">
              <h2>Done</h2>
              <p className="stat-value">{data.byStatus.DONE}</p>
            </div>
            <div className="card stat-card stat-card-danger">
              <h2>Overdue</h2>
              <p className="stat-value">{data.overdueCount}</p>
            </div>
          </div>
          <div className="card">
            <h2>Overdue tasks (open)</h2>
            {data.overdueTasks.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>
                None — nice work.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {data.overdueTasks.map((t) => (
                  <li key={t.id} style={{ marginBottom: "0.35rem" }}>
                    <strong>{t.title}</strong> — {t.projectName}{" "}
                    <span className="text-muted">(due {new Date(t.dueDate).toLocaleString()})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
