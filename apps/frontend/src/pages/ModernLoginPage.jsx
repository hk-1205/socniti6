import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import toast from "react-hot-toast";
import { LogIn, User, Lock, Loader2 } from "lucide-react";

export default function ModernLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { saveSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/graphql", {
        query: `
          mutation Login($username: String!, $password: String!) {
            login(username: $username, password: $password) {
              token
              user {
                id
                username
                fullName
                email
                role
              }
            }
          }
        `,
        variables: { username, password }
      });

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      const { token, user } = response.data.data.login;
      saveSession(token, user);
      navigate(from, { replace: true });
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.response?.data?.errors?.[0]?.message || error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mist flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-ink rounded-2xl mb-4 shadow-soft">
            <span className="text-3xl font-bold text-white">S</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-ink">Welcome Back</h1>
          <p className="text-ink/70 mt-2">Sign in to continue to SOCNITI</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[2rem] shadow-soft p-8 border border-ink/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-ink mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-leaf" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-ink/15 rounded-2xl focus:ring-2 focus:ring-leaf focus:border-transparent transition-all"
                  placeholder="Enter your username"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-ink mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-leaf" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-ink/15 rounded-2xl focus:ring-2 focus:ring-leaf focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-clay text-white py-3 px-4 rounded-full hover:bg-clay/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-clay transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-soft hover:shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-ink/70">Don't have an account?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <Link
              to="/signup"
              className="text-leaf hover:text-leaf/80 font-semibold transition-colors"
            >
              Create an account →
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-ink/60 mt-8">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
