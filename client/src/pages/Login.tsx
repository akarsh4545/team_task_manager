import { useState } from "react";
import { Link } from "react-router-dom";
import { api, type UserPublic } from "../api";
import { useAuth } from "../AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api<{ token: string; user: UserPublic }>("/api/auth/login", {
        method: "POST",
        json: { email, password },
      });
      login(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-brand">Team Task Manager</div>
        <h1 className="auth-title">Sign in</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          Welcome back. Admin vs member is the account type you picked at registration.
        </p>

        <form onSubmit={onSubmit}>
          <div className="form-stack">
            <div className="form-field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>

        <p className="auth-footer">
          No account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
