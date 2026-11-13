import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password);
      navigate("/lookup");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-2xl sm:text-3xl font-serif text-ink tracking-tight">
          Advocate Registration
        </h1>
        <p className="text-xs font-mono uppercase tracking-wider text-muted mt-0.5">
          Chamber Enrollment for Public Docket Access
        </p>
        <div className="rule-double max-w-[200px] mx-auto mt-3"></div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-6 border border-rule rounded-[4px] sm:px-10 space-y-6">
          <div className="p-3 bg-paper border border-rule text-muted text-xs rounded-[3px]">
            <strong className="text-ink">Court Policy Notice:</strong> Self-registration provisions accounts with the{" "}
            <span className="font-mono text-ink">LAWYER</span> role for read-only docket inspection. Judicial and Clerk credentials are administered by the registry.
          </div>

          {error && (
            <div className="p-3 bg-oxblood-light border border-oxblood/30 text-oxblood text-xs rounded-[3px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-caps text-[11px] text-muted mb-1">
                Full Name &amp; Title
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Adv. Ananya Deshmukh"
                className="block w-full px-3 py-2 bg-paper border border-rule rounded-[3px] text-xs font-sans text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block font-caps text-[11px] text-muted mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ananya.lawyer@barcouncil.org"
                className="block w-full px-3 py-2 bg-paper border border-rule rounded-[3px] text-xs font-sans text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block font-caps text-[11px] text-muted mb-1">
                Password (min. 8 characters)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3 py-2 bg-paper border border-rule rounded-[3px] text-xs font-sans text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 rounded-[3px] text-xs font-medium text-surface bg-accent hover:bg-accent-hover transition disabled:opacity-50"
            >
              {loading ? "Enrolling advocate..." : "Complete registration"}
            </button>
          </form>

          <div className="text-center text-xs text-muted pt-2 border-t border-rule">
            Already registered?{" "}
            <Link to="/login" className="font-mono text-accent hover:underline">
              Sign in &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}