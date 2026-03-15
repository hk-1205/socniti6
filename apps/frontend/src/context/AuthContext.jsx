import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("socniti_token") || "");
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    api
      .post(
        "/graphql",
        {
          query: `
            query Me {
              me {
                id
                fullName
                email
                role
              }
            }
          `
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      .then((response) => {
        if (response.data.data && response.data.data.me) {
          setUser(response.data.data.me);
        } else {
          throw new Error("No user found");
        }
      })
      .catch(() => {
        setToken("");
        localStorage.removeItem("socniti_token");
      });
  }, [token]);

  const saveSession = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("socniti_token", nextToken);
  };

  const logout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("socniti_token");
  };

  return (
    <AuthContext.Provider value={{ token, user, saveSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
