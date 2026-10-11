import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { HeartPulse, LogOut, Menu, X, User, Calendar, Search, ShieldAlert, Award, Users, Clock, Pill, Bell, Check, CheckCheck, Trash2 } from 'lucide-react';

const Navbar = () => {
  const { user, logout, api } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching navbar notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    if (user) {
      const interval = setInterval(() => {
        fetchNotifications();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(current => current.filter(notification => notification.id !== notificationId));
      fetchNotifications();
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const linkClass = (path) => {
    return `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive(path)
        ? 'text-violet-700 bg-violet-50 border border-violet-200'
        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
    }`;
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-slate-900 font-extrabold text-xl tracking-tight">
              <HeartPulse className="h-7 w-7 text-violet-600 animate-pulse" />
              <span>Doc<span className="text-violet-600">Book</span></span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            {/* Common Public Link */}
            <Link to="/" className={linkClass('/')}>Home</Link>

            {/* Role-Based Links */}
            {user?.role === 'patient' && (
              <>
                <Link to="/patient/dashboard" className={linkClass('/patient/dashboard')}>Dashboard</Link>
                <Link to="/patient/search" className={linkClass('/patient/search')}>
                  <Search size={16} /> Search Doctors
                </Link>
                <Link to="/patient/appointments" className={linkClass('/patient/appointments')}>
                  <Calendar size={16} /> Appointments
                </Link>
                <Link to="/patient/medications" className={linkClass('/patient/medications')}>
                  <Pill size={16} /> Medications
                </Link>
                <Link to="/patient/tracker" className={linkClass('/patient/tracker')}>
                  <Clock size={16} /> Daily Tracker
                </Link>
                <Link to="/patient/queue" className={linkClass('/patient/queue')}>
                  <Users size={16} /> Live Queue
                </Link>
              </>
            )}

            {user?.role === 'doctor' && (
              <>
                <Link to="/doctor/dashboard" className={linkClass('/doctor/dashboard')}>Dashboard</Link>
                <Link to="/doctor/slots" className={linkClass('/doctor/slots')}>Manage Slots</Link>
                <Link to="/doctor/appointments" className={linkClass('/doctor/appointments')}>
                  <Calendar size={16} /> Appointments
                </Link>
                <Link to="/doctor/queue" className={linkClass('/doctor/queue')}>
                  <Users size={16} /> Live Queue
                </Link>
                <Link to="/doctor/profile" className={linkClass('/doctor/profile')}>Profile</Link>
              </>
            )}

            {user?.role === 'admin' && (
              <>
                <Link to="/admin/dashboard" className={linkClass('/admin/dashboard')}>Dashboard</Link>
                <Link to="/admin/verify" className={linkClass('/admin/verify')}>
                  <ShieldAlert size={16} /> Doctor Verification
                </Link>
              </>
            )}
          </div>

          {/* Auth Controls */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:text-violet-600 hover:bg-violet-50 transition-all relative"
                    title="Notifications"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 z-50 text-xs">
                      <div className="flex justify-between items-center px-4 pb-2 border-b border-slate-100">
                        <div>
                          <span className="font-extrabold text-slate-900 text-sm">Notifications</span>
                          <p className="text-[10px] text-slate-500">Auto-delete after 30 days</p>
                        </div>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="text-violet-600 font-bold hover:underline">
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-slate-500">No notifications yet.</div>
                        ) : (
                          notifications.map((n) => (
                            <NotificationItem
                              key={n.id}
                              notification={n}
                              onDelete={handleDeleteNotification}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                    {user.name}
                    {user.role === 'doctor' && user.isVerified && (
                      <Award size={14} className="text-emerald-500" />
                    )}
                  </span>
                  <span className="text-xs text-slate-600 capitalize">{user.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all duration-200"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all duration-200 shadow-md shadow-violet-500/20"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 focus:outline-none"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-2">
          <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">Home</Link>
          {user?.role === 'patient' && <>
            <Link to="/patient/dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">Patient Dashboard</Link>
            <Link to="/patient/search" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">Search Doctors</Link>
            <Link to="/patient/appointments" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">My Appointments</Link>
            <Link to="/patient/medications" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">Medications</Link>
            <Link to="/patient/tracker" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">Daily Tracker</Link>
            <Link to="/patient/queue" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">Live Queue</Link>
          </>}
          {user?.role === 'doctor' && <>
            <Link to="/doctor/dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">Doctor Dashboard</Link>
            <Link to="/doctor/slots" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">Manage Slots</Link>
            <Link to="/doctor/appointments" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">Appointments</Link>
            <Link to="/doctor/queue" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">Live Queue</Link>
            <Link to="/doctor/profile" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">Profile</Link>
          </>}
          {user?.role === 'admin' && <>
            <Link to="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">Admin Dashboard</Link>
            <Link to="/admin/verify" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">Doctor Verification</Link>
          </>}
          {user ? (
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="px-3 py-1 flex flex-col"><span className="text-sm font-semibold text-slate-900">{user.name}</span><span className="text-xs text-slate-600 capitalize">{user.role}</span></div>
              <button onClick={handleLogout} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium text-rose-600 hover:bg-rose-50"><LogOut size={16} /> Logout</button>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block text-center px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">Sign In</Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block text-center px-3 py-2 rounded-lg text-base font-medium text-white bg-violet-600 hover:bg-violet-500">Register</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

const NotificationItem = ({ notification, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`p-3 space-y-1 transition-colors ${notification.is_read ? 'bg-white' : 'bg-violet-50/40 font-semibold'}`}>
      <div className="flex justify-between items-start gap-2">
        <span className="font-bold text-slate-900">{notification.title}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-400">
            {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={() => onDelete(notification.id)}
            className="p-1 text-slate-400 hover:text-rose-600"
            title="Delete notification"
            aria-label="Delete notification"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <p className={`text-slate-600 leading-relaxed text-[11px] ${expanded ? 'whitespace-pre-line' : 'line-clamp-2'}`}>
        {notification.message}
      </p>
      {notification.message.length > 100 && (
        <button
          onClick={() => setExpanded(value => !value)}
          className="text-violet-600 text-[10px] font-bold hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};

export default Navbar;
