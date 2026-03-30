import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("socniti_token") || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Parse user from token instead of making API call
    try {
      const userData = JSON.parse(localStorage.getItem("socniti_user"));
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error("Failed to parse user data:", error);
      setToken("");
      setUser(null);
      localStorage.removeItem("socniti_token");
      localStorage.removeItem("socniti_user");
    }
    setLoading(false);
  }, [token]);

  const saveSession = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("socniti_token", nextToken);
    localStorage.setItem("socniti_user", JSON.stringify(nextUser));
    toast.success(`Welcome back, ${nextUser.fullName || nextUser.username}!`);
  };

  const logout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("socniti_token");
    localStorage.removeItem("socniti_user");
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, saveSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
