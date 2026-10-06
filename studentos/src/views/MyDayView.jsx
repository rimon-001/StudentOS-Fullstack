import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sun, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  ArrowRight, 
  ExternalLink, 
  Flame, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle2,
  Circle,
  BookOpen,
  Check,
  X,
  Timer
} from 'lucide-react';

// Helper to convert time strings (e.g. "10:00 AM") into minutes from midnight
const parseTimeToMinutes = (tStr) => {
  if (!tStr) return 0;
  const match = tStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

export default function MyDayView({
  courses = [],
  setCourses,
  routine = [],
  tasks = [],
  setTasks,
  exams = [],
  onOpenWorkspace,
  onNavigate
}) {
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [selectedPlanItem, setSelectedPlanItem] = useState('CSE 101 Pointer Manipulation Drills');

  // Real-time Day resolution
  const now = new Date();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = daysOfWeek[now.getDay()];
  const todayStr = now.toISOString().split('T')[0];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Format timer MM:SS
  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer interval handling
  useEffect(() => {
    let timerId;
    if (isTimerRunning) {
      timerId = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [isTimerRunning]);

  // Scheduled sessions for today
  const todaysSchedule = useMemo(() => {
    if (Array.isArray(routine)) {
      const dayMatches = routine.filter((r) => r.day?.toLowerCase() === todayName.toLowerCase());
      if (dayMatches.length > 0) return dayMatches;
    } else if (routine && routine[todayName] && Array.isArray(routine[todayName])) {
      return routine[todayName];
    }
    return [
      { id: 's1', time: '10:00 AM – 11:30 AM', code: 'CSE 101', name: 'C Programming', room: 'Room 302', teacher: 'Dr. Rahman' },
      { id: 's2', time: '12:00 PM – 01:30 PM', code: 'MATH 101', name: 'Mathematics', room: 'Room 201', teacher: 'Prof. Karim' },
      { id: 's3', time: '02:30 PM – 04:00 PM', code: 'SE 101', name: 'Software Engineering', room: 'Room 305', teacher: 'Ms. Sultana' }
    ];
  }, [routine, todayName]);

  // Determine lecture timeline status (Completed, Now, Upcoming)
  const getSlotStatus = (timeStr) => {
    if (!timeStr) return 'Upcoming';
    const [startStr, endStr] = timeStr.split(/[-–]/);
    if (!startStr || !endStr) return 'Upcoming';

    const startMin = parseTimeToMinutes(startStr);
    const endMin = parseTimeToMinutes(endStr);

    if (currentMinutes >= startMin && currentMinutes <= endMin) return 'Now';
    if (currentMinutes > endMin) return 'Completed';
    return 'Upcoming';
  };

  // 1-Click Attendance check-in from daily agenda
  const handleQuickAttendance = (courseCode, status) => {
    const cleanCode = (courseCode || '').trim().toUpperCase();
    const updated = courses.map((c) => {
      if ((c.code || '').trim().toUpperCase() !== cleanCode) return c;

      let logs = Array.isArray(c.attendanceLogs) ? [...c.attendanceLogs] : [];
      const existingIdx = logs.findIndex((l) => l.date === todayStr);

      if (existingIdx !== -1) {
        if (logs[existingIdx].status === status) {
          logs.splice(existingIdx, 1);
        } else {
          logs[existingIdx] = { ...logs[existingIdx], status };
        }
      } else {
        logs.push({
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          date: todayStr,
          status
        });
      }

      logs.sort((a, b) => new Date(b.date) - new Date(a.date));
      const presentCount = logs.filter((l) => l.status === 'present').length;
      const totalCount = logs.length;

      return {
        ...c,
        attendanceLogs: logs,
        attendance: {
          present: presentCount,
          total: totalCount
        }
      };
    });

    if (typeof setCourses === 'function') {
      setCourses(updated);
    }
    localStorage.setItem('studentos_courses', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('studentos_courses_updated', { detail: updated }));
  };

  // Toggle task status directly from My Day
  const handleToggleTask = (taskId) => {
    const updated = tasks.map((t) => {
      if (t.id !== taskId) return t;
      const nextStatus = t.status === 'Completed' ? 'Pending' : 'Completed';
      const updatedSubs = (t.subtasks || []).map((st) => ({
        ...st,
        done: nextStatus === 'Completed'
      }));
      return { ...t, status: nextStatus, subtasks: updatedSubs };
    });

    if (typeof setTasks === 'function') {
      setTasks(updated);
    }
    localStorage.setItem('studentos_work_items', JSON.stringify(updated));
    localStorage.setItem('studentos_tasks', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('studentos_tasks_updated', { detail: updated }));
  };

  // Priorities and risks monitor
  const priorities = useMemo(() => {
    const list = [];

    // 1. Deliverables due today
    tasks.forEach((t) => {
      if (t.status !== 'Completed' && (t.deadline === todayStr || t.deadlineDate === todayStr)) {
        list.push({
          id: t.id,
          isTask: true,
          type: 'danger',
          title: t.title,
          subtitle: `Due today • ${t.deadlineTime || '11:59 PM'}`,
          action: () => onNavigate && onNavigate('tasks')
        });
      }
    });

    // 2. Attendance risks (<= 75%)
    courses.forEach((c) => {
      const logs = c.attendanceLogs || [];
      const total = logs.length > 0 ? logs.length : (c.attendance?.total || 0);
      const present = logs.length > 0 ? logs.filter((l) => l.status === 'present').length : (c.attendance?.present || 0);
      const pct = total > 0 ? (present / total) * 100 : 100;

      if (total > 0 && pct <= 75) {
        list.push({
          id: `att_${c.id}`,
          isTask: false,
          type: 'warning',
          title: `${c.code} Attendance Warning`,
          subtitle: `${Math.round(pct)}% — On the 75% margin, attend next class`,
          action: () => onNavigate && onNavigate('attendance')
        });
      }
    });

    // 3. Upcoming exams
    exams.forEach((ex) => {
      list.push({
        id: `exam_${ex.id}`,
        isTask: false,
        type: 'info',
        title: `${ex.courseCode || 'Assessment'}: ${ex.title}`,
        subtitle: `Assessment on ${ex.date} (${ex.time || '10:00 AM'})`,
        action: () => onNavigate && onNavigate('exams')
      });
    });

    return list;
  }, [tasks, courses, exams, todayStr, onNavigate]);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-blue-800">
        <div>
          <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Today's Focus Cockpit</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Good evening, Rimon 👋</h1>
          <p className="text-xs text-blue-200 mt-1">Operational snapshot for {todayName}, {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-right">
          <span className="text-[10px] text-blue-200 block uppercase font-bold tracking-wider">Today's Agenda</span>
          <span className="text-base font-black">{todaysSchedule.length} Classes • {priorities.length} Action Items</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scheduled Sessions Today with Attendance Check-in */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Scheduled Sessions Today
              </h3>
              <span className="text-[11px] font-bold text-slate-400">{todayName}</span>
            </div>

            <div className="space-y-3">
              {todaysSchedule.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  No classes scheduled for today. Take time to catch up on coursework or relax!
                </div>
              ) : (
                todaysSchedule.map((slot, idx) => {
                  const code = slot.code || slot.course?.split('–')[0]?.trim() || 'CSE 101';
                  const name = slot.name || slot.course?.split('–')[1]?.trim() || 'Class Session';
                  const slotStatus = getSlotStatus(slot.time);

                  // Check current attendance log for today
                  const matchedCourse = courses.find((c) => (c.code || '').trim().toUpperCase() === code.trim().toUpperCase());
                  const todayLog = matchedCourse?.attendanceLogs?.find((l) => l.date === todayStr);

                  return (
                    <div 
                      key={slot.id || idx}
                      className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-1.5 h-12 rounded-full ${
                          slotStatus === 'Now' ? 'bg-emerald-500 animate-pulse' : slotStatus === 'Completed' ? 'bg-slate-300' : 'bg-blue-600'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 font-mono">{slot.time}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                              slotStatus === 'Now'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : slotStatus === 'Completed'
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-blue-50 text-blue-600'
                            }`}>
                              {slotStatus}
                            </span>
                          </div>

                          <h4 className="text-sm font-black text-slate-900 mt-0.5">
                            {code} — {name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {slot.room}</span>
                            <span>•</span>
                            <span>{slot.teacher}</span>
                          </div>
                        </div>
                      </div>

                      {/* Check-in Buttons & Course Quick-Link */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleQuickAttendance(code, 'present')}
                            className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                              todayLog?.status === 'present'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title="Mark Present"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickAttendance(code, 'absent')}
                            className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                              todayLog?.status === 'absent'
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'text-slate-400 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                            title="Mark Absent"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenWorkspace && onOpenWorkspace(code)}
                          className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-500 text-xs font-bold text-slate-700 hover:text-blue-600 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <span>Workspace</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Required Today & Task Checkoffs */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Action Required Today
            </h3>

            <div className="space-y-2.5">
              {priorities.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">All clear! No urgent tasks or attendance risks today.</div>
              ) : (
                priorities.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition ${
                      item.type === 'danger'
                        ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-50'
                        : item.type === 'warning'
                        ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-50'
                        : 'bg-blue-50/70 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.isTask ? (
                        <button
                          type="button"
                          onClick={() => handleToggleTask(item.id)}
                          className="text-slate-400 hover:text-blue-600 transition cursor-pointer shrink-0"
                        >
                          <Circle className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          item.type === 'danger' ? 'bg-rose-500' : item.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                      )}

                      <div className="min-w-0 cursor-pointer" onClick={item.action}>
                        <h5 className="text-xs font-bold text-slate-900 truncate">{item.title}</h5>
                        <span className="text-[11px] text-slate-500 block truncate">{item.subtitle}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={item.action}
                      className="p-1 text-slate-400 hover:text-slate-800 transition cursor-pointer shrink-0"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Study Plan & Focus Pomodoro Timer */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              Daily Study Plan
            </h3>

            <div className="space-y-2 text-xs">
              {[
                { time: '03:00 PM – 04:00 PM', target: 'CSE 101 Pointer Manipulation Drills' },
                { time: '04:30 PM – 05:30 PM', target: 'MATH 101 Calculus Formulas & Limits' },
                { time: '08:00 PM – 09:30 PM', target: 'C Programming Assignment 01 Submission' }
              ].map((plan, i) => (
                <div 
                  key={i}
                  onClick={() => setSelectedPlanItem(plan.target)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition ${
                    selectedPlanItem === plan.target 
                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                      : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 block font-mono">{plan.time}</span>
                  <span>{plan.target}</span>
                </div>
              ))}
            </div>

            {/* Integrated Focus Mode */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-400">Current Focus</span>
                <span className="text-[10px] text-slate-400">Pomodoro 25m</span>
              </div>
              <p className="text-xs font-semibold truncate text-slate-200">{selectedPlanItem}</p>

              <div className="flex items-center justify-between pt-1">
                <span className="text-2xl font-black font-mono tracking-tight">
                  {formatTimer(timerSeconds)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    {isTimerRunning ? 'Pause' : 'Start'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsTimerRunning(false); setTimerSeconds(25 * 60); }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition cursor-pointer"
                    title="Reset"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}