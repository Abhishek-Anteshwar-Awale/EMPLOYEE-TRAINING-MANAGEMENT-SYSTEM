import { useState } from "react";
import { supabase } from "../lib/supabase";

// ── Provider icons ────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087C16.6582 14.2618 17.64 11.9546 17.64 9.2045z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.3446 0-4.3282-1.5836-5.036-3.7109H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71C3.7845 10.17 3.6818 9.5945 3.6818 9s.1027-1.17.2822-1.71V4.9582H.9574C.3477 6.1732 0 7.5477 0 9c0 1.4523.3477 2.8268.9574 4.0418L3.964 10.71z" fill="#FBBC05"/>
      <path d="M9 3.5791c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4627.8918 11.4255 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6718 5.1627 6.6554 3.5791 9 3.5791z" fill="#EA4335"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022"/>
      <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00"/>
      <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF"/>
      <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900"/>
    </svg>
  );
}

function TrainovaLogo() {
  return (
    <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
        <path d="M15 3L3 11v16h7V18h10v9h7V11L15 3z" fill="white" fillOpacity="0.15"/>
        <path d="M2.5 11h25M15 3v24" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        <rect x="9" y="11" width="12" height="2.5" rx="1.25" fill="white"/>
      </svg>
    </div>
  );
}

type Mode = "signin" | "signup";

export default function Login() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("admin@trainova.com");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "microsoft" | null>(null);

  function switchMode(m: Mode) {
    setMode(m);
    setError("");
    setInfo("");
    setPassword("");
    setConfirmPassword("");
    if (m === "signup") setEmail("");
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Email and password are required."); return; }
    setLoading(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError(authError.message);
    setLoading(false);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email) { setError("Email is required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    setError("");
    setInfo("");

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name.trim(), role: "HR Admin" },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // If session is immediately returned, auth is working (email confirm disabled)
    if (data.session) {
      // App will react to the session automatically via onAuthStateChange
      return;
    }

    // Email confirmation required
    setInfo("Account created! Check your email inbox for a confirmation link, then sign in.");
    setMode("signin");
    setLoading(false);
  }

  async function handleSocial(provider: "google" | "azure") {
    const label = provider === "google" ? "google" : "microsoft";
    setSocialLoading(label as "google" | "microsoft");
    setError("");
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
        queryParams: provider === "azure" ? { prompt: "select_account" } : undefined,
      },
    });
    if (authError) {
      setError(authError.message);
      setSocialLoading(null);
    }
    // On success, browser redirects — no need to reset state
  }

  const anyLoading = loading || !!socialLoading;

  return (
    <div className="min-h-full flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <TrainovaLogo />
          <h1 className="font-display text-2xl font-bold text-slate-900 mt-4 tracking-tight">Trainova</h1>
          <p className="text-slate-500 text-sm mt-1">Employee Training Hub</p>
        </div>

        {/* Mode tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
          <button
            onClick={() => switchMode("signin")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === "signin"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => switchMode("signup")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === "signup"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Create Account
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-7">
          {/* Error / info banners */}
          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}
          {info && (
            <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5 flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0">✓</span>
              <span>{info}</span>
            </div>
          )}

          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  placeholder="you@trainova.com"
                  autoFocus
                  disabled={anyLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  placeholder="Enter your password"
                  disabled={anyLoading}
                />
              </div>
              <button
                type="submit"
                disabled={anyLoading}
                className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  placeholder="Your name"
                  autoFocus
                  disabled={anyLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  placeholder="admin@trainova.com"
                  disabled={anyLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  placeholder="Min. 8 characters"
                  disabled={anyLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  placeholder="Re-enter password"
                  disabled={anyLoading}
                />
              </div>
              <button
                type="submit"
                disabled={anyLoading}
                className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account…
                  </span>
                ) : "Create Account"}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400 font-medium">or</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Social login */}
          <div className="space-y-2.5">
            <button
              onClick={() => handleSocial("google")}
              disabled={anyLoading}
              className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-200 rounded-lg py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {socialLoading === "google" ? (
                <span className="w-4 h-4 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
              ) : <GoogleIcon />}
              Continue with Google
            </button>

            <button
              onClick={() => handleSocial("azure")}
              disabled={anyLoading}
              className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-200 rounded-lg py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {socialLoading === "microsoft" ? (
                <span className="w-4 h-4 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
              ) : <MicrosoftIcon />}
              Continue with Microsoft
            </button>
          </div>

          {mode === "signin" && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center leading-relaxed">
                First time? Use the <strong className="text-slate-500">Create Account</strong> tab above<br />
                or try: <span className="font-mono-data text-slate-500">admin@trainova.com</span>
                {" / "}
                <span className="font-mono-data text-slate-500">Training@2026</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
