import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { HeartPulse, Calendar, ShieldCheck, Clock, UserCheck, Star } from 'lucide-react';

const Home = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-transparent">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="max-w-5xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold uppercase tracking-wider">
            <Star size={14} className="fill-violet-600" /> Simplify Your Health Journey
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Book Appointments with <br />
            <span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">
              Verified Doctors, Effortlessly
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
            DocBook connects you with certified specialists. Create your account, search by specialization, view available slots in real-time, and manage your health dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {user ? (
              <Link to={`/${user.role}/dashboard`} className="btn-primary w-full sm:w-auto">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary w-full sm:w-auto">
                  Get Started Today
                </Link>
                <Link to="/login" className="btn-secondary w-full sm:w-auto">
                  Access Portal
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white/80 border-t border-slate-200 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-slate-900 mb-12">
            Why Choose DocBook?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-6 flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-violet-100 text-violet-700 rounded-2xl border border-violet-200">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Verified Specialists</h3>
              <p className="text-sm text-slate-600">
                All doctors undergo manual verification by the admin before they can post slots or consult patients.
              </p>
            </div>

            <div className="glass-card p-6 flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-cyan-100 text-cyan-700 rounded-2xl border border-cyan-200">
                <Calendar size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Instant Booking</h3>
              <p className="text-sm text-slate-600">
                View real-time doctor availability calendars, select a date and time slot, and lock it instantly.
              </p>
            </div>

            <div className="glass-card p-6 flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl border border-slate-200">
                <Clock size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Schedule Control</h3>
              <p className="text-sm text-slate-600">
                Need to change? Reschedule or cancel appointments directly from your dashboard up to the hour.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Info Stats Footer */}
      <section className="py-12 border-t border-slate-200 px-4 text-center">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-slate-600 text-sm">
          <div>
            <span className="block text-2xl font-extrabold text-slate-900">100%</span>
            <span>Verified Doctors</span>
          </div>
          <div>
            <span className="block text-2xl font-extrabold text-slate-900">1k+</span>
            <span>Active Patients</span>
          </div>
          <div>
            <span className="block text-2xl font-extrabold text-slate-900">24/7</span>
            <span>Slot Booking</span>
          </div>
          <div>
            <span className="block text-2xl font-extrabold text-slate-900">0</span>
            <span>Booking Fees</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;


