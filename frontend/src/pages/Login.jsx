import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate(`/${user.role}/dashboard`);
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    const result = await login(email, password);
    setSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 glass-card p-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-slate-900">
            Access Portal
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Sign in to manage appointments, slots, or verify doctors
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="email-address" className="text-xs font-semibold text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail size={16} />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="custom-input w-full pl-10"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="custom-input w-full pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={18} /> Sign In
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-slate-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-violet-600 hover:text-violet-500 font-semibold transition-colors">
            Register as Patient/Doctor
          </Link>
        </div>

        {/* Collapsible Demo Login Helper */}
        <details className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500 cursor-pointer">
          <summary className="text-center font-semibold hover:text-slate-800 transition-colors select-none">
            Toggle Demo Credentials
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-2 p-3 bg-slate-50 rounded-xl cursor-default">
            <div className="flex justify-between items-center">
              <span>Patient: <code className="bg-slate-200 px-1 py-0.5 rounded">patient@app.com</code></span>
              <button 
                type="button" 
                onClick={() => { setEmail('patient@app.com'); setPassword('patient123'); }}
                className="text-[10px] text-violet-600 hover:underline font-bold"
              >
                Auto-fill
              </button>
            </div>
            <div className="flex justify-between items-center">
              <span>Doctor: <code className="bg-slate-200 px-1 py-0.5 rounded">doctor1@app.com</code></span>
              <button 
                type="button" 
                onClick={() => { setEmail('doctor1@app.com'); setPassword('doctor123'); }}
                className="text-[10px] text-violet-600 hover:underline font-bold"
              >
                Auto-fill
              </button>
            </div>
            <div className="flex justify-between items-center">
              <span>Admin: <code className="bg-slate-200 px-1 py-0.5 rounded">admin@app.com</code></span>
              <button 
                type="button" 
                onClick={() => { setEmail('admin@app.com'); setPassword('admin123'); }}
                className="text-[10px] text-violet-600 hover:underline font-bold"
              >
                Auto-fill
              </button>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default Login;


