import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// Patient pages
import PatientDashboard from './pages/patient/PatientDashboard';
import DoctorSearch from './pages/patient/DoctorSearch';
import DoctorProfile from './pages/patient/DoctorProfile';
import SlotSelection from './pages/patient/SlotSelection';
import BookingConfirmation from './pages/patient/BookingConfirmation';
import MyAppointments from './pages/patient/MyAppointments';
import PatientQueue from './pages/patient/PatientQueue';
import MedicationManager from './pages/patient/MedicationManager';
import MedicationTracker from './pages/patient/MedicationTracker';

// Doctor pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import ManageSlots from './pages/doctor/ManageSlots';
import DoctorAppointments from './pages/doctor/DoctorAppointments';
import DoctorProfileView from './pages/doctor/DoctorProfileView';
import DoctorQueue from './pages/doctor/DoctorQueue';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import DoctorVerification from './pages/admin/DoctorVerification';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
          <Navbar />
          <main className="flex-grow bg-transparent">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Patient Routes */}
              <Route path="/patient/dashboard" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <PatientDashboard />
                </ProtectedRoute>
              } />
              <Route path="/patient/search" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <DoctorSearch />
                </ProtectedRoute>
              } />
              <Route path="/patient/doctor/:id" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <DoctorProfile />
                </ProtectedRoute>
              } />
              <Route path="/patient/doctor/:id/slots" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <SlotSelection />
                </ProtectedRoute>
              } />
              <Route path="/patient/booking-confirmation" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <BookingConfirmation />
                </ProtectedRoute>
              } />
              <Route path="/patient/appointments" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <MyAppointments />
                </ProtectedRoute>
              } />
              <Route path="/patient/queue" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <PatientQueue />
                </ProtectedRoute>
              } />
              <Route path="/patient/medications" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <MedicationManager />
                </ProtectedRoute>
              } />
              <Route path="/patient/tracker" element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <MedicationTracker />
                </ProtectedRoute>
              } />

              {/* Doctor Routes */}
              <Route path="/doctor/dashboard" element={
                <ProtectedRoute allowedRoles={['doctor']}>
                  <DoctorDashboard />
                </ProtectedRoute>
              } />
              <Route path="/doctor/slots" element={
                <ProtectedRoute allowedRoles={['doctor']}>
                  <ManageSlots />
                </ProtectedRoute>
              } />
              <Route path="/doctor/appointments" element={
                <ProtectedRoute allowedRoles={['doctor']}>
                  <DoctorAppointments />
                </ProtectedRoute>
              } />
              <Route path="/doctor/queue" element={
                <ProtectedRoute allowedRoles={['doctor']}>
                  <DoctorQueue />
                </ProtectedRoute>
              } />
              <Route path="/doctor/profile" element={
                <ProtectedRoute allowedRoles={['doctor']}>
                  <DoctorProfileView />
                </ProtectedRoute>
              } />

              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/verify" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DoctorVerification />
                </ProtectedRoute>
              } />

              {/* Fallback Route */}
              <Route path="*" element={
                <div className="py-20 text-center space-y-4 bg-white">
                  <h2 className="text-3xl font-extrabold text-slate-900">404 - Page Not Found</h2>
                  <p className="text-slate-600">The screen you are looking for does not exist.</p>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;


