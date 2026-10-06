import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  ChevronRight, 
  ClipboardList, 
  GraduationCap, 
  BookOpen, 
  Plus, 
  Timer, 
  CalendarDays, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  MapPin, 
  User as UserIcon, 
  Flame,
  BarChart2
} from 'lucide-react';

export default function DashboardView({
  user,
  courses = [],
  tasks = [],
  routine = {},
  onNavigate,
  onOpenAddTask,
  onOpenTimer,
}) {
  // Sync state fallback from localStorage
  const [localCourses, setLocalCourses] = useState(() => {
    try {
      const saved = localStorage.getItem('studentos_courses');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return courses;
  });

  const [localTasks, setLocalTasks] = useState(() => {
    try {
      const savedWork = localStorage.getItem('studentos_work_items');
      if (savedWork) return JSON.parse(savedWork);
      const savedTasks = localStorage.getItem('studentos_tasks');
      if (savedTasks) return JSON.parse(savedTasks);
    } catch (e) {
      console.warn(e);
    }
    return tasks;
  });

  const [localRoutine, setLocalRoutine] = useState(() => {
    try {
      const saved = localStorage.getItem('studentos_routine');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return routine;
  });

  // Focus study session logs state
  const [studyLogs, setStudyLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('studentos_study_logs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Re-sync on storage or custom events
  useEffect(() => {
    const handleSync = () => {
      try {
        const c = localStorage.getItem('studentos_courses');
        if (c) setLocalCourses(JSON.parse(c));
        const t = localStorage.getItem('studentos_work_items') || localStorage.getItem('studentos_tasks');
        if (t) setLocalTasks(JSON.parse(t));
        const r = localStorage.getItem('studentos_routine');
        if (r) setLocalRoutine(JSON.parse(r));
        const s = localStorage.getItem('studentos_study_logs');
        if (s) setStudyLogs(JSON.parse(s));
      } catch (err) {
        console.error(err);
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('studentos_courses_updated', handleSync);
    window.addEventListener('studentos_tasks_updated', handleSync);
    window.addEventListener('studentos_routine_updated', handleSync);
    window.addEventListener('studentos_study_hours_updated', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('studentos_courses_updated', handleSync);
      window.removeEventListener('studentos_tasks_updated', handleSync);
      window.removeEventListener('studentos_routine_updated', handleSync);
      window.removeEventListener('studentos_study_hours_updated', handleSync);
    };
  }, []);

  useEffect(() => {
    if (courses && courses.length > 0) setLocalCourses(courses);
  }, [courses]);

  useEffect(() => {
    if (tasks && tasks.length > 0) setLocalTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    if (routine && Object.keys(routine).length > 0) setLocalRoutine(routine);
  }, [routine]);

  // Attendance metrics
  const { totalClasses, presentClasses, overallAttendance } = useMemo(() => {
    let held = 0;
    let present = 0;
    localCourses.forEach((c) => {
      const logs = c.attendanceLogs || [];
      if (logs.length > 0) {
        held += logs.length;
        present += logs.filter((l) => l.status === 'present').length;
      } else if (c.attendance && c.attendance.total > 0) {
        held += c.attendance.total;
        present += c.attendance.present || 0;
      }
    });

    const finalHeld = held > 0 ? held : 26;
    const finalPresent = held > 0 ? present : 22;
    const percentage = Math.round((finalPresent / finalHeld) * 100);

    return { totalClasses: finalHeld, presentClasses: finalPresent, overallAttendance: percentage };
  }, [localCourses]);

  // Focus & Study Hours Visualizer Calculations
  const studyAnalytics = useMemo(() => {
    const totalMinutes = studyLogs.reduce((acc, log) => acc + (log.minutes || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    const courseBreakdown = {};
    studyLogs.forEach((log) => {
      const code = log.courseCode || 'General';
      courseBreakdown[code] = (courseBreakdown[code] || 0) + (log.minutes || 0);
    });

    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const past7Days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = daysMap[d.getDay()];

      const dayMins = studyLogs
        .filter((l) => l.date === dateStr)
        .reduce((sum, l) => sum + (l.minutes || 0), 0);

      past7Days.push({
        day: dayLabel,
        date: dateStr,
        hours: +(dayMins / 60).toFixed(1),
        minutes: dayMins
      });
    }

    const maxDayMins = Math.max(...past7Days.map((d) => d.minutes), 60);

    return { totalHours, courseBreakdown, past7Days, maxDayMins };
  }, [studyLogs]);

  // Pending tasks
  const pendingTasksList = useMemo(() => {
    return localTasks.filter((t) => t.status !== 'Completed');
  }, [localTasks]);

  // Today's Routine resolution
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = daysOfWeek[new Date().getDay()];

  const todaysClasses = useMemo(() => {
    let classes = [];
    if (localRoutine && typeof localRoutine === 'object') {
      if (Array.isArray(localRoutine[todayDayName]) && localRoutine[todayDayName].length > 0) {
        classes = localRoutine[todayDayName];
      } else {
        const firstAvailableDay = Object.keys(localRoutine).find(
          (d) => Array.isArray(localRoutine[d]) && localRoutine[d].length > 0
        );
        if (firstAvailableDay) {
          classes = localRoutine[firstAvailableDay];
        }
      }
    }

    if (classes.length === 0) {
      return [
        {
          id: 'def_1',
          time: '8:30 - 10:00',
          code: 'PHY101',
          name: 'Physics I',
          room: '914',
          teacher: 'KI'
        },
        {
          id: 'def_2',
          time: '11:30 - 1:00',
          code: 'SE212',
          name: 'Software Requirement Specification',
          room: '701A',
          teacher: 'KBB'
        }
      ];
    }
    return classes;
  }, [localRoutine, todayDayName]);

  const handleMarkAllTodayPresent = () => {
    const todayDate = new Date().toISOString().split('T')[0];
    const updated = localCourses.map((c) => {
      const logs = Array.isArray(c.attendanceLogs) ? [...c.attendanceLogs] : [];
      const idx = logs.findIndex((l) => l.date === todayDate);
      if (idx !== -1) {
        logs[idx] = { ...logs[idx], status: 'present' };
      } else {
        logs.push({
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          date: todayDate,
          status: 'present'
        });
      }
      return {
        ...c,
        attendanceLogs: logs,
        attendance: {
          present: logs.filter((l) => l.status === 'present').length,
          total: logs.length
        }
      };
    });

    setLocalCourses(updated);
    localStorage.setItem('studentos_courses', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('studentos_courses_updated', { detail: updated }));
  };

  const handleToggleTask = (taskId) => {
    const updated = localTasks.map((t) => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        status: t.status === 'Completed' ? 'Pending' : 'Completed'
      };
    });
    setLocalTasks(updated);
    localStorage.setItem('studentos_work_items', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('studentos_tasks_updated', { detail: updated }));
  };

  const nextWorkItem = useMemo(() => {
    return pendingTasksList[0] || {
      title: 'operation',
      courseCode: 'C Programming',
      deadlineDate: '2026-09-30'
    };
  }, [pendingTasksList]);

  const displayName = useMemo(() => {
    if (!user?.name) return 'Student';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    if (/^(md\.?|mohammed|muhammad|mst\.?)$/i.test(parts[0])) {
      return `${parts[0]} ${parts[1] || ''}`.trim();
    }
    return parts[0];
  }, [user?.name]);

  return (
    <div className="space-y-6">
      {/* 1. Header Greeting & Date Pill */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Good evening, {displayName} <span className="animate-pulse">👋</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Here's what's happening with your studies today.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>

          <div className="text-xs text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 font-semibold shadow-2xs">
            Semester: <strong className="text-slate-900">{user?.semester || '1st Semester'}</strong> • Session: <strong className="text-slate-900">{user?.academicSession || user?.session || 'Fall 2026'}</strong>
          </div>
        </div>
      </div>

      {/* 2. Top Metric KPI Cards (5 Cards in 1 Row) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Attendance Card */}
        <div 
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base border border-emerald-100">
              <span>%</span>
            </div>
            <div>
              <div className="text-lg font-black text-slate-900">{overallAttendance}%</div>
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                Attendance <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </p>
              <span className="text-[10px] text-slate-400 font-medium">{presentClasses}/{totalClasses} classes</span>
            </div>
          </div>
        </div>

        {/* 2. Pending Tasks Card */}
        <div 
          onClick={() => onNavigate('tasks')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-900">{pendingTasksList.length || 6}</div>
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                Pending Tasks <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </p>
              <span className="text-[10px] text-slate-400 font-medium">{pendingTasksList.length || 6} remaining</span>
            </div>
          </div>
        </div>

        {/* 3. Focus Time Card */}
        <div 
          onClick={onOpenTimer}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <Flame className="w-4 h-4 fill-rose-500" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-900">{studyAnalytics.totalHours}h</div>
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                Focus Time <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </p>
              <span className="text-[10px] text-slate-400 font-medium">Logged Study Blocks</span>
            </div>
          </div>
        </div>

        {/* 4. CGPA Card */}
        <div 
          onClick={() => onNavigate('gpa')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-900">3.62</div>
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                CGPA <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </p>
              <span className="text-[10px] text-slate-400 font-medium">Target: 3.80</span>
            </div>
          </div>
        </div>

        {/* 5. Courses Card */}
        <div 
          onClick={() => onNavigate('courses')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-900">{localCourses.length || 27}</div>
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                Courses <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </p>
              <span className="text-[10px] text-slate-400 font-medium">{localCourses.length || 27} enrolled</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Focus Hours & Subject Distribution Row (Matching Photo 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Study Focus Hours Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Study Focus Hours (Past 7 Days)</h3>
            </div>
            <button 
              type="button"
              onClick={onOpenTimer}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer flex items-center gap-1"
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Launch Focus Session</span>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-3 items-end h-36">
            {studyAnalytics.past7Days.map((d, idx) => {
              const heightPct = Math.max(14, Math.round((d.minutes / studyAnalytics.maxDayMins) * 100));
              const isToday = idx === 6;

              return (
                <div key={d.date} className="flex flex-col items-center h-full justify-end group">
                  <span className="text-[10px] font-bold text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition">
                    {d.hours}h
                  </span>
                  <div className="w-full max-w-[34px] bg-slate-100 rounded-t-lg overflow-hidden flex items-end h-full">
                    <div 
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isToday ? 'bg-blue-600' : d.hours > 0 ? 'bg-blue-400' : 'bg-slate-200'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-bold mt-2 ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Subject Distribution (Matching Photo 2) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Subject Distribution</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {studyAnalytics.totalHours}H TOTAL
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {Object.keys(studyAnalytics.courseBreakdown).length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Timer className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                <span>No focus sessions recorded yet. Start a session with the Study Timer!</span>
              </div>
            ) : (
              Object.entries(studyAnalytics.courseBreakdown).map(([code, mins]) => {
                const totalMins = Math.max(1, studyLogs.reduce((acc, l) => acc + (l.minutes || 0), 0));
                const pct = Math.round((mins / totalMins) * 100);
                const hrs = (mins / 60).toFixed(1);

                return (
                  <div key={code}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-800">{code}</span>
                      <span className="text-slate-500 font-semibold">{hrs}h ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. Main Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                Today's Schedule ({todayDayName})
              </h3>
              <button 
                type="button"
                onClick={() => onNavigate('routine')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
              >
                View Full Routine
              </button>
            </div>

            <div className="space-y-3">
              {todaysClasses.map((item, idx) => (
                <div 
                  key={item.id || idx}
                  className="p-3.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/60 flex items-center justify-between transition border-l-4 border-l-blue-600 shadow-2xs"
                >
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400">{item.time}</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      {item.code || item.course} — {item.name || ''}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>Room {item.room || 'TBA'}</span> • <span>{item.teacher || 'Faculty TBA'}</span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg ${
                    idx === 0 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {idx === 0 ? 'Upcoming' : 'Later'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Assignments Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-purple-600" />
                Upcoming Assignments
              </h3>
              <button 
                type="button"
                onClick={() => onNavigate('tasks')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                { id: 't_ex1', title: 'operation', course: 'C Programming', due: '2026-09-30', priority: 'Medium', done: false },
                { id: 't_ex2', title: 'Linear Algebra Problem Set 3', course: 'MATH 101', due: '2026-10-05', priority: 'Medium', done: false },
                { id: 't_ex3', title: 'Data Structures Assignment 01', course: 'CSE 101', due: '2026-10-02', priority: 'High', done: false }
              ].map((task) => (
                <div 
                  key={task.id}
                  className="p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/60 flex items-center justify-between transition border-l-4 border-l-amber-500 shadow-2xs"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{task.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {task.course} • Due: {task.due}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      task.priority === 'High'
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {task.priority}
                    </span>

                    <button 
                      type="button"
                      onClick={() => handleToggleTask(task.id)}
                      className="text-slate-300 hover:text-blue-600 transition cursor-pointer"
                    >
                      <Circle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions Grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3.5">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button 
                type="button"
                onClick={onOpenAddTask}
                className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-blue-50/50 hover:border-blue-200 transition text-center group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700">Add Task</span>
              </button>

              <button 
                type="button"
                onClick={() => onNavigate('routine')}
                className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-amber-50/50 hover:border-amber-200 transition text-center group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700">View Routine</span>
              </button>

              <button 
                type="button"
                onClick={() => onNavigate('gpa')}
                className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-emerald-50/50 hover:border-emerald-200 transition text-center group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700">Calculate GPA</span>
              </button>

              <button 
                type="button"
                onClick={onOpenTimer}
                className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-rose-50/50 hover:border-rose-200 transition text-center group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Timer className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700">Study Timer</span>
              </button>
            </div>
          </div>

          {/* Weekly Attendance Bars Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Weekly Attendance</h3>
              <button 
                type="button"
                onClick={() => onNavigate('attendance')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
              >
                View Details
              </button>
            </div>
            
            <div className="space-y-3">
              {[
                { name: 'Mathematics', pct: 85, color: 'bg-emerald-500' },
                { name: 'Software Engineering', pct: 100, color: 'bg-emerald-500' },
                { name: 'Physics I', pct: 100, color: 'bg-emerald-500' },
                { name: 'Software Requirement Specification', pct: 100, color: 'bg-emerald-500' },
                { name: 'Structured Programming', pct: 100, color: 'bg-emerald-500' }
              ].map((course) => (
                <div key={course.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 truncate pr-2">{course.name}</span>
                    <span className="font-bold text-slate-900 shrink-0">{course.pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${course.color}`}
                      style={{ width: `${course.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleMarkAllTodayPresent}
                className="w-full py-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200/80 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>+ Mark Today's Attendance Present</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom "What's Next?" Recommendation Banner */}
      <div className="bg-[#1e293b] text-white p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
              WHAT'S NEXT?
            </span>
            <div className="text-xs font-semibold text-slate-200 mt-0.5">
              {nextWorkItem?.courseCode || 'C Programming'} "{nextWorkItem?.title || 'operation'}" is your nearest deadline.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('tasks')}
          className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
        >
          <span>Work on this</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}