import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, GraduationCap, BellRing, Plus, Trash2, ShieldAlert, CheckCircle, Ban, Loader2 } from 'lucide-react';

export default function AdminView() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalFaculty: 42,
    activeUsers: 0
  });

  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [notices] = useState([
    { id: 1, title: 'Mid-term Exam Routine Published', date: '2026-09-24', priority: 'High' },
    { id: 2, title: 'Campus IT Network Maintenance this Weekend', date: '2026-09-22', priority: 'Medium' },
  ]);

  const fetchAdminData = async () => {
    const token = localStorage.getItem('studentos_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('http://localhost:5001/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5001/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (statsRes.status === 403 || usersRes.status === 403) {
        setAccessDenied(true);
        setIsLoading(false);
        return;
      }

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();

      if (statsData.success) {
        setStats(statsData.data);
      }
      if (usersData.success && Array.isArray(usersData.data)) {
        setStudents(usersData.data);
      }
    } catch (err) {
      console.warn('Admin fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleAddStudent = async () => {
    const name = prompt('Student Full Name:');
    if (!name || !name.trim()) return;

    const email = prompt('Student University Email (e.g. name@student.os):', `${name.toLowerCase().replace(/\s+/g, '')}@student.os`);
    if (!email || !email.trim()) return;

    const dept = prompt('Department:', 'Software Engineering');
    const studentId = prompt('Student ID:', '262-35-' + Math.floor(100 + Math.random() * 900));

    const token = localStorage.getItem('studentos_token');
    try {
      const res = await fetch('http://localhost:5001/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, department: dept, studentId })
      });
      const data = await res.json();
      if (data.success) {
        fetchAdminData();
      } else {
        alert(data.message || 'Failed to add student');
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleToggleStatus = async (id) => {
    const token = localStorage.getItem('studentos_token');
    try {
      const res = await fetch(`http://localhost:5001/api/admin/users/${id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStudents((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: data.data.status } : s))
        );
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleRemoveStudent = async (id) => {
    if (!window.confirm('Are you sure you want to remove this student account?')) return;

    const token = localStorage.getItem('studentos_token');
    try {
      const res = await fetch(`http://localhost:5001/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStudents((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.warn(err);
    }
  };

  if (accessDenied) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-800 space-y-2">
        <ShieldAlert className="w-10 h-10 mx-auto text-rose-600" />
        <h3 className="font-bold text-sm">Administrative Privileges Required</h3>
        <p className="text-xs">Your current account role does not have authorization to view institutional telemetry.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        <span>Loading institutional telemetry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            University Admin Console
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage students, faculties, notices, and academic permissions.</p>
        </div>
      </div>

      {/* Admin Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block uppercase">Total Students</span>
            <div className="text-2xl font-bold text-slate-900">{students.length || stats.totalStudents}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block uppercase">Active Teachers</span>
            <div className="text-2xl font-bold text-slate-900">{stats.totalFaculty || 42}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block uppercase">Live Notices</span>
            <div className="text-2xl font-bold text-slate-900">{notices.length}</div>
          </div>
        </div>
      </div>

      {/* Student Registry Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Enrolled Students</h3>
            <span className="text-xs text-slate-400">{students.length} accounts in persistent database</span>
          </div>
          <button
            type="button"
            onClick={handleAddStudent}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Student ID</th>
                <th className="pb-3">Name</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 font-semibold text-slate-900 font-mono">{s.studentId || s.id}</td>
                  <td className="py-3 font-bold text-slate-800">
                    <div>{s.name}</div>
                    <span className="text-[10px] text-slate-400 font-normal">{s.email}</span>
                  </td>
                  <td className="py-3 text-slate-500">{s.department || s.dept || 'Software Engineering'}</td>
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(s.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                        s.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      }`}
                      title="Click to toggle status"
                    >
                      {s.status || 'Active'}
                    </button>
                  </td>
                  <td className="py-3 text-right space-x-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveStudent(s.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Student"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}