import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  X, 
  AlertCircle, 
  Clock, 
  Calendar, 
  User as UserIcon, 
  LogOut, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Timer,
  Settings as SettingsIcon,
  Sparkles
} from 'lucide-react';

export default function Header({ 
  user, 
  userRole, 
  setUserRole, 
  onOpenSearch, 
  onOpenProfile,
  onLogout,
  onNavigate,
  onOpenTimer,
  tasks = [],
  routine = {},
  exams = [],
  courses = []
}) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState([]);
  
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute Live Dynamic Alerts from Tasks, Exams, and Attendance
  const liveAlerts = useMemo(() => {
    const alerts = [];
    const today = new Date();

    // 1. Scan Tasks due soon or pending
    (tasks || [])
      .filter((t) => t.status !== 'Completed')
      .slice(0, 3)
      .forEach((t) => {
        alerts.push({
          id: `task_${t.id}`,
          title: 'Deliverable Pending',
          desc: `${t.title} (${t.courseCode || t.course || 'Course'}) due ${t.deadline || t.deadlineDate || 'soon'}.`,
          type: 'urgent',
          time: t.deadline || 'Pending',
          icon: Clock,
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          targetTab: 'tasks'
        });
      });

    // 2. Scan Upcoming Exams
    (exams || []).forEach((ex) => {
      if (ex.date) {
        const diffDays = Math.ceil((new Date(ex.date) - today) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 14) {
          alerts.push({
            id: `exam_${ex.id}`,
            title: 'Upcoming Assessment',
            desc: `${ex.courseCode || 'Course'} ${ex.title} in ${diffDays === 0 ? 'Today' : `${diffDays} days`} (${ex.room || 'Room TBA'}).`,
            type: 'info',
            time: diffDays === 0 ? 'Today' : `in ${diffDays}d`,
            icon: Calendar,
            color: 'text-rose-600 bg-rose-50 border-rose-200',
            targetTab: 'exams'
          });
        }
      }
    });

    // 3. Scan Attendance Shortages (< 75%)
    (courses || []).forEach((c) => {
      const logs = c.attendanceLogs || [];
      const held = logs.length > 0 ? logs.length : (c.attendance?.total || 0);
      const present = logs.length > 0 ? logs.filter((l) => l.status === 'present').length : (c.attendance?.present || 0);
      const pct = held > 0 ? Math.round((present / held) * 100) : 100;

      if (pct < 75 && held > 0) {
        alerts.push({
          id: `att_${c.id || c.code}`,
          title: 'Attendance Shortage Risk',
          desc: `${c.code} is currently at ${pct}% (${present}/${held} attended). Attend next session!`,
          type: 'warning',
          time: `${pct}%`,
          icon: AlertCircle,
          color: 'text-rose-600 bg-rose-50 border-rose-200',
          targetTab: 'attendance'
        });
      }
    });

    return alerts.filter((a) => !dismissedIds.includes(a.id));
  }, [tasks, exams, courses, dismissedIds]);

  const handleAlertClick = (targetTab) => {
    setIsNotifOpen(false);
    if (typeof onNavigate === 'function' && targetTab) {
      onNavigate(targetTab);
    }
  };

  const handleDismiss = (e, id) => {
    e.stopPropagation();
    setDismissedIds((prev) => [...prev, id]);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 select-none shadow-2xs">
      {/* Global Search Bar Trigger */}
      <div className="flex-1 max-w-lg flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex-1 flex items-center justify-between px-3.5 py-2 text-xs sm:text-sm text-slate-400 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400" />
            <span className="truncate">Search courses, notes, assignments...</span>
          </div>
          <kbd className="hidden sm:inline-block text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs text-slate-400">
            ⌘ K
          </kbd>
        </button>

        {/* Quick Launch Focus Timer */}
        {onOpenTimer && (
          <button
            type="button"
            onClick={onOpenTimer}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Open Focus Timer"
          >
            <Timer className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Semester & Session Indicator Pill */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-bold px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-700">{user?.semester || '4th Semester'}</span>
          <span className="text-slate-400">• {user?.academicSession || user?.session || 'Fall 2026'}</span>
        </div>

        {/* Notification Bell Dropdown with Live Dynamic Alerts */}
        <div className="relative" ref={notifRef}>
          <button 
            type="button"
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {liveAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse shadow-xs">
                {liveAlerts.length}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900">Academic Alerts</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200">
                    {liveAlerts.length} Active
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotifOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto my-1">
                {liveAlerts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    <span>All caught up! No imminent deadlines or attendance risks.</span>
                  </div>
                ) : (
                  liveAlerts.map((n) => {
                    const Icon = n.icon;
                    return (
                      <div 
                        key={n.id} 
                        onClick={() => handleAlertClick(n.targetTab)}
                        className="py-2.5 px-2 hover:bg-slate-50 rounded-xl transition flex gap-3 items-start cursor-pointer group"
                      >
                        <div className={`p-2 rounded-lg shrink-0 border ${n.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition truncate">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.desc}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDismiss(e, n.id)}
                          className="p-1 text-slate-300 hover:text-slate-500 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition"
                          title="Dismiss"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Close alerts
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Identity & Profile Dropdown */}
        <div className="relative border-l border-slate-200 pl-2" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1.5 hover:bg-slate-50 rounded-xl transition-colors text-left cursor-pointer"
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-xl object-cover ring-2 ring-blue-500/20"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs uppercase shadow-2xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}

            <div className="hidden md:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.name || 'Student User'}
                </span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                  userRole === 'ADMIN' 
                    ? 'bg-purple-100 text-purple-700' 
                    : userRole === 'TEACHER' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {userRole || 'STUDENT'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5 truncate max-w-[160px]">
                {user?.department || 'Software Engineering'} • {user?.semester || '4th Semester'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Profile Actions Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <span className="text-xs font-bold text-slate-900 block truncate">{user?.name || 'Student User'}</span>
                <span className="text-[10px] text-slate-400 font-mono block">ID: {user?.studentId || '262-35-658'}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  if (onOpenProfile) onOpenProfile();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-blue-600" />
                <span>My Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  if (onNavigate) onNavigate('settings');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
              >
                <SettingsIcon className="w-4 h-4 text-slate-500" />
                <span>Workspace Settings</span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  if (onLogout) onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}