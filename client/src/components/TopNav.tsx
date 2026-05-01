import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function TopNav() {
  const { user, logout } = useAuth();
  return (
    <header className="top-nav">
      <nav className="top-nav-links">
        <Link to="/">Dashboard</Link>
        <Link to="/projects">Projects</Link>
      </nav>
      <div className="top-nav-user">
        <span className="top-nav-name">{user?.name}</span>
        <span
          className={`account-badge ${user?.role === "ADMIN" ? "account-badge-admin" : "account-badge-member"}`}
          title="Chosen at sign-up. Team roles on each project are separate."
        >
          {user?.role === "ADMIN" ? "Admin account" : "Member account"}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
          Sign out
        </button>
      </div>
    </header>
  );
}
