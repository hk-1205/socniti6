import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Home" },
  { to: "/events", label: "Events" },
  { to: "/donations", label: "Donations" },
  { to: "/contact", label: "Contact" }
];

export default function Shell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user
    ? user.fullName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-mist/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <NavLink to="/" className="font-display text-2xl font-bold text-ink">
            SOCNITI
          </NavLink>
          <nav className="hidden gap-6 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-sm font-semibold ${isActive ? "text-ink" : "text-ink/60"}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-3 rounded-full border border-ink/10 bg-white/80 py-2 pr-3 pl-2 text-sm font-semibold text-ink shadow-sm backdrop-blur transition hover:bg-white"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf text-sm font-semibold text-white">
                    {initials || "U"}
                  </span>
                  <span className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-sm font-semibold">{user.fullName}</span>
                    <span className="text-xs text-ink/60">{user.role}</span>
                  </span>
                </button>

                {menuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-soft z-20">
                      <button
                        type="button"
                        onClick={() => {
                          navigate("/profile");
                          setMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-mist transition-colors"
                      >
                        View Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigate("/dashboard");
                          setMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-mist transition-colors"
                      >
                        Dashboard
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigate("/settings");
                          setMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-mist transition-colors"
                      >
                        Settings
                      </button>
                      <div className="border-t border-ink/10" />
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-ember hover:bg-ember/10 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <NavLink
                to="/login"
                className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/90 transition-colors"
              >
                Login
              </NavLink>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
