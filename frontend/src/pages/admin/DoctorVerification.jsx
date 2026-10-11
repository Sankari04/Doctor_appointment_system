import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { UserCheck, Award, ShieldAlert, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

const formatCurrencyINR = (amount) => {
  const value = Number(amount ?? 0);
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`;
};

const DoctorVerification = () => {
  const { api } = useContext(AuthContext);

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDoctorsList = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/admin/doctors');
      setDoctors(response.data);
    } catch (err) {
      console.error('Error fetching admin doctor list:', err);
      setError('Could not retrieve doctor accounts schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorsList();
  }, []);

  const handleVerify = async (doctorId) => {
    if (!window.confirm('Do you want to verify this doctor? Once verified, they can start creating availability slots.')) return;
    setError('');
    setSuccess('');
    try {
      await api.put(`/admin/doctors/${doctorId}/verify`);
      setSuccess('Doctor profile successfully verified.');
      fetchDoctorsList(); // Refresh list
    } catch (err) {
      console.error('Error verifying doctor:', err);
      setError(err.response?.data?.message || 'Failed to verify doctor.');
    }
  };

  const handleReject = async (doctorId) => {
    if (!window.confirm('Do you want to reject/suspend this doctor? This will hide them from patient searches.')) return;
    setError('');
    setSuccess('');
    try {
      await api.put(`/admin/doctors/${doctorId}/reject`);
      setSuccess('Doctor profile status updated to pending/rejected.');
      fetchDoctorsList(); // Refresh list
    } catch (err) {
      console.error('Error rejecting doctor:', err);
      setError(err.response?.data?.message || 'Failed to reject doctor.');
    }
  };

  const handleDelete = async (doctorId) => {
    if (!window.confirm('Are you sure you want to permanently delete this doctor profile and their user login account? This will also delete all their slots and appointment history.')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/admin/doctors/${doctorId}`);
      setSuccess('Doctor profile and user account permanently deleted.');
      fetchDoctorsList(); // Refresh list
    } catch (err) {
      console.error('Error deleting doctor:', err);
      setError(err.response?.data?.message || 'Failed to delete doctor.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Doctor Management</h1>
        <p className="text-sm text-slate-600 mt-1">Review credentials, verify accounts, or remove doctor profiles</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
          <CheckCircle size={18} className="flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-3xl">
          <p className="text-slate-600 text-sm">No registered doctors found on the platform.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-white/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
                  <th className="p-4">Doctor Details</th>
                  <th className="p-4">Specialization</th>
                  <th className="p-4">Experience</th>
                  <th className="p-4">Fee</th>
                  <th className="p-4">Verification Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-slate-50/10">
                {doctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-100/30 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900">{doc.name}</span>
                        <span className="text-xs text-slate-600 mt-0.5">Email: {doc.email}</span>
                        <span className="text-xs text-slate-500 mt-0.5">Phone: {doc.phone}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-block text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold">
                        {doc.specialization_name}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700">{doc.experience} Years</td>
                    <td className="p-4 text-emerald-600 font-semibold">{formatCurrencyINR(doc.consultation_fee)}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          doc.is_verified
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            : 'bg-amber-50 border border-amber-200 text-amber-700'
                        }`}
                      >
                        {doc.is_verified ? (
                          <>
                            <UserCheck size={12} /> Verified
                          </>
                        ) : (
                          <>
                            <ShieldAlert size={12} /> Pending Approval
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        {!doc.is_verified ? (
                          <button
                            type="button"
                            onClick={() => handleVerify(doc.id)}
                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-750 text-white rounded-lg text-xs font-bold transition-all duration-200 shadow-md shadow-violet-500/10"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReject(doc.id)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all duration-200 shadow-md shadow-amber-500/10"
                          >
                            Reject
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all duration-200 shadow-md shadow-rose-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorVerification;


