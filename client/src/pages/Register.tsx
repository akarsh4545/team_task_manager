import { useState } from "react";
import { Link } from "react-router-dom";
import { api, type UserPublic } from "../api";
import { useAuth } from "../AuthContext";

export default function Register() {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api<{ token: string; user: UserPublic }>("/api/auth/register", {
        method: "POST",
        json: { name, email, password, role },
      });
      login(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-brand">Team Task Manager</div>
        <h1 className="auth-title">Create account</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          Choose how you will use the app. You can still be promoted to <strong>team admin</strong> on
          individual projects later.
        </p>

        <form onSubmit={onSubmit}>
          <div className="form-stack">
            <div className="form-field">
              <span className="text-muted" style={{ fontWeight: 600 }}>
                Account type
              </span>
              <div className="role-grid">
                <label className="role-option">
                  <input
                    type="radio"
                    name="role"
                    value="ADMIN"
                    checked={role === "ADMIN"}
                    onChange={() => setRole("ADMIN")}
                  />
                  <span className="role-option-card">
                    <strong>Admin</strong>
                    <span>Create teams/projects and invite members by email.</span>
                  </span>
                </label>
                <label className="role-option">
                  <input
                    type="radio"
                    name="role"
                    value="MEMBER"
                    checked={role === "MEMBER"}
                    onChange={() => setRole("MEMBER")}
                  />
                  <span className="role-option-card">
                    <strong>Member</strong>
                    <span>Join teams when an admin adds your email. No new projects.</span>
                  </span>
                </label>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="reg-name">Name</label>
              <input
                id="reg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="form-field">
              <label htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-field">
              <label htmlFor="reg-password">Password (min 8 characters)</label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {error && <p className="error">{error}</p>}

            <button type="submit" className="btn" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
