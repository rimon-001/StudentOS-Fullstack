import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Clock,
  Check,
  X,
  AlertCircle,
  ShieldCheck,
  AlertTriangle,
  History,
  Trash2,
  TrendingUp,
  Sliders,
  Calendar as CalendarIcon,
  FileText,
  UserCheck,
  Send,
  BookOpen,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus
} from 'lucide-react';

const extractSemesterNumber = (str) => {
  if (!str) return 999;
  const match = String(str).match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
};

const normalizeCode = (str) => (str || '').trim().toUpperCase().replace(/[\s\-_]/g, '');

const matchesCourse = (course, target) => {
  if (!course || !target) return false;
  if (course.id === target || course.code === target) return true;
  const normTarget = normalizeCode(String(target));
  if (course.id && normalizeCode(String(course.id)) === normTarget) return true;
  if (course.code && normalizeCode(String(course.code)) === normTarget) return true;
  return false;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AttendanceView({
  courses = [],
  setCourses,
  routine = {},
  onMarkAttendance,
  isDemoMode = false,
  onRestrictedAction
}) {
  const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'calendar' | 'forecast' | 'leave'
  const [statusCardFilter, setStatusCardFilter] = useState('ALL'); // 'ALL' | 'SAFE' | 'AT_RISK'
  const [selectedSemester, setSelectedSemester] = useState('All');
  
  // Date State
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Calendar Navigation State
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  // Modals & Card Interactive states
  const [historyCourse, setHistoryCourse] = useState(null);
  const [showRollCallModal, setShowRollCallModal] = useState(false);
  const [expandedSimCourseId, setExpandedSimCourseId] = useState(null);
  const [cardSimValues, setCardSimValues] = useState({});

  const isInternalUpdate = useRef(false);

  useEffect(() => {
    const handleStorageChange = () => {
      if (isInternalUpdate.current) return;
      try {
        const saved = localStorage.getItem('studentos_courses');
        if (saved && typeof setCourses === 'function') {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCourses(parsed);
          }
        }
      } catch (err) {
        console.error('Failed to sync courses from storage:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setCourses]);

  // Forecasting simulation state
  const [forecastCourseId, setForecastCourseId] = useState('');
  const [requiredThreshold, setRequiredThreshold] = useState(75);
  const [simMissClasses, setSimMissClasses] = useState(0);
  const [simAttendClasses, setSimAttendClasses] = useState(0);

  // Leave portal state
  const [leaveCourseId, setLeaveCourseId] = useState('');
  const [leaveDate, setLeaveDate] = useState(selectedDate);
  const [leaveReason, setLeaveReason] = useState("Medical Certificate (Doctor's Note)");
  const [leaveNotes, setLeaveNotes] = useState('');
  const [leaveApplications, setLeaveApplications] = useState([
    {
      id: 'leave_1',
      date: '2026-09-18',
      courseName: 'MATH 101 — Mathematics',
      reason: 'Medical Certificate',
      status: 'Approved'
    }
  ]);

  // Roll-call batch roster state
  const [rollCallCourseId, setRollCallCourseId] = useState('');
  const [studentsRoster, setStudentsRoster] = useState([
    { id: 'st_1', name: 'Md Rafiul Islam (Me)', roll: '2026-SE-041', status: 'present' },
    { id: 'st_2', name: 'Tanvir Ahmed', roll: '2026-SE-042', status: 'present' },
    { id: 'st_3', name: 'Nusrat Jahan', roll: '2026-SE-043', status: 'absent' },
    { id: 'st_4', name: 'Sakib Al Mahmud', roll: '2026-SE-044', status: 'present' }
  ]);

  const semesters = useMemo(() => {
    const raw = Array.from(
      new Set(
        (courses || [])
          .map((c) => (c.semester ? c.semester.trim() : '1st Semester'))
          .filter(Boolean)
      )
    ).sort((a, b) => extractSemesterNumber(a) - extractSemesterNumber(b));
    return ['All', ...raw];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    if (selectedSemester === 'All') return courses || [];
    return (courses || []).filter(
      (c) => (c.semester ? c.semester.trim() : '1st Semester') === selectedSemester.trim()
    );
  }, [courses, selectedSemester]);

  const overallStats = useMemo(() => {
    let totalPresent = 0;
    let totalHeld = 0;
    let atRiskCount = 0;
    let safeCount = 0;

    filteredCourses.forEach((c) => {
      const logs = c.attendanceLogs || [];
      const held = logs.length > 0 ? logs.length : (c.attendance?.total || 0);
      const present = logs.length > 0 ? logs.filter((l) => l.status === 'present').length : (c.attendance?.present || 0);

      totalHeld += held;
      totalPresent += present;

      const pct = held > 0 ? (present / held) * 100 : 100;
      if (pct < 75 && held > 0) atRiskCount++;
      else safeCount++;
    });

    const percentage = totalHeld > 0 ? Math.round((totalPresent / totalHeld) * 100) : 0;
    return { totalPresent, totalHeld, percentage, atRiskCount, safeCount };
  }, [filteredCourses]);

  const displayedCourses = useMemo(() => {
    return filteredCourses.filter((course) => {
      const logs = course.attendanceLogs || [];
      const held = logs.length > 0 ? logs.length : (course.attendance?.total || 0);
      const present = logs.length > 0 ? logs.filter((l) => l.status === 'present').length : (course.attendance?.present || 0);
      const pct = held > 0 ? (present / held) * 100 : 100;

      if (statusCardFilter === 'SAFE') return pct >= 75 || held === 0;
      if (statusCardFilter === 'AT_RISK') return pct < 75 && held > 0;
      return true;
    });
  }, [filteredCourses, statusCardFilter]);

  const dateOverview = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let unmarkedCount = 0;

    filteredCourses.forEach((c) => {
      const log = (c.attendanceLogs || []).find((l) => l.date === selectedDate);
      if (log) {
        if (log.status === 'present') presentCount++;
        else if (log.status === 'absent') absentCount++;
      } else {
        unmarkedCount++;
      }
    });

    const parsedDate = new Date(`${selectedDate}T00:00:00`);
    const dayName = isNaN(parsedDate.getTime())
      ? ''
      : parsedDate.toLocaleDateString('en-US', { weekday: 'long' });

    return { presentCount, absentCount, unmarkedCount, dayName };
  }, [filteredCourses, selectedDate]);

  const getAttendanceStatus = (present, total, threshold = 75) => {
    if (total === 0) {
      return { 
        text: 'No sessions held yet', 
        badge: 'New Course', 
        safe: true, 
        type: 'neutral', 
        canMiss: 0, 
        need: 0 
      };
    }

    const pct = (present / total) * 100;
    const T = threshold / 100;

    if (pct >= threshold) {
      const canMiss = Math.floor((present - T * total) / T);
      return {
        text: canMiss > 0 
          ? `Safe to miss ${canMiss} upcoming ${canMiss === 1 ? 'class' : 'classes'}` 
          : 'Exact 75% boundary: Cannot skip next session!',
        badge: pct >= 80 ? 'Exam Eligible' : 'Warning Margin (75%-79%)',
        safe: true,
        type: pct >= 80 ? 'safe' : 'margin',
        canMiss: Math.max(0, canMiss),
        need: 0
      };
    } else {
      const need = Math.ceil((T * total - present) / (1 - T));
      return {
        text: `Debarred Risk: Must attend next ${need} consecutive ${need === 1 ? 'class' : 'classes'}`,
        badge: 'Debarred Risk (<75%)',
        safe: false,
        type: 'danger',
        canMiss: 0,
        need: Math.max(1, need)
      };
    }
  };

  const handleMarkAttendance = async (targetCourseId, newStatus) => {
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;
    
    isInternalUpdate.current = true;
    const dateToLog = selectedDate || new Date().toISOString().split('T')[0];
    const token = localStorage.getItem('studentos_token');

    let removedLogId = null;
    let targetCourseToUpdate = null;

    const updated = (courses || []).map((c) => {
      if (!matchesCourse(c, targetCourseId)) return c;

      let logs = Array.isArray(c.attendanceLogs) ? [...c.attendanceLogs] : [];
      const existingIdx = logs.findIndex((l) => l.date === dateToLog);

      if (existingIdx !== -1) {
        if (logs[existingIdx].status === newStatus) {
          removedLogId = logs[existingIdx].id;
          logs.splice(existingIdx, 1);
        } else {
          logs[existingIdx] = {
            ...logs[existingIdx],
            status: newStatus
          };
        }
      } else {
        logs.push({
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          date: dateToLog,
          status: newStatus
        });
      }

      logs.sort((a, b) => new Date(b.date) - new Date(a.date));
      const presentCount = logs.filter((l) => l.status === 'present').length;
      const totalCount = logs.length;

      const courseUpdated = {
        ...c,
        attendanceLogs: logs,
        attendance: {
          present: presentCount,
          total: totalCount
        }
      };

      targetCourseToUpdate = courseUpdated;
      return courseUpdated;
    });

    if (typeof setCourses === 'function') {
      setCourses(updated);
    }
    localStorage.setItem('studentos_courses', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('studentos_courses_updated', { detail: updated }));

    if (onMarkAttendance) {
      onMarkAttendance({ courseId: targetCourseId, isPresent: newStatus === 'present', date: dateToLog });
    }

    if (historyCourse && matchesCourse(historyCourse, targetCourseId)) {
      setHistoryCourse(updated.find((c) => matchesCourse(c, targetCourseId)));
    }

    if (token && targetCourseToUpdate) {
      try {
        if (removedLogId) {
          await fetch(`http://localhost:5001/api/attendance/${removedLogId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
        } else {
          await fetch('http://localhost:5001/api/attendance', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              courseId: targetCourseToUpdate.id,
              courseCode: targetCourseToUpdate.code,
              date: dateToLog,
              status: newStatus === 'present' ? 'Present' : 'Absent'
            })
          });
        }

        await fetch(`http://localhost:5001/api/courses/${targetCourseToUpdate.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(targetCourseToUpdate)
        });
      } catch (err) {
        console.warn('Backend attendance sync error:', err);
      }
    }

    setTimeout(() => {
      isInternalUpdate.current = false;
    }, 50);
  };

  const handleQuickAdjust = async (targetCourseId, deltaPresent, deltaHeld) => {
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;
    isInternalUpdate.current = true;
    const token = localStorage.getItem('studentos_token');

    let updatedCoursePayload = null;

    const updated = (courses || []).map((c) => {
      if (!matchesCourse(c, targetCourseId)) return c;
      const logs = c.attendanceLogs || [];
      const prevPresent = logs.length > 0 ? logs.filter(l => l.status === 'present').length : (c.attendance?.present || 0);
      const prevTotal = logs.length > 0 ? logs.length : (c.attendance?.total || 0);

      const nextPresent = Math.max(0, prevPresent + deltaPresent);
      const nextTotal = Math.max(nextPresent, prevTotal + deltaHeld);

      const updatedC = {
        ...c,
        attendance: {
          present: nextPresent,
          total: nextTotal
        }
      };
      updatedCoursePayload = updatedC;
      return updatedC;
    });

    if (typeof setCourses === 'function') {
      setCourses(updated);
    }
    localStorage.setItem('studentos_courses', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('studentos_courses_updated', { detail: updated }));

    if (token && updatedCoursePayload) {
      try {
        await fetch(`http://localhost:5001/api/courses/${updatedCoursePayload.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(updatedCoursePayload)
        });
      } catch (err) {
        console.warn('Failed to sync quick adjust:', err);
      }
    }

    setTimeout(() => {
      isInternalUpdate.current = false;
    }, 50);
  };

  const handleDeleteLog = async (targetCourseId, logId) => {
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;
    isInternalUpdate.current = true;
    const token = localStorage.getItem('studentos_token');

    let updatedCoursePayload = null;

    const updated = (courses || []).map((c) => {
      if (!matchesCourse(c, targetCourseId)) return c;
      const logs = (c.attendanceLogs || []).filter((l) => l.id !== logId);
      const presentCount = logs.filter((l) => l.status === 'present').length;
      const totalCount = logs.length;

      const updatedC = {
        ...c,
        attendanceLogs: logs,
        attendance: {
          present: presentCount,
          total: totalCount
        }
      };
      updatedCoursePayload = updatedC;
      return updatedC;
    });

    if (typeof setCourses === 'function') {
      setCourses(updated);
    }
    localStorage.setItem('studentos_courses', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('studentos_courses_updated', { detail: updated }));

    if (historyCourse && matchesCourse(historyCourse, targetCourseId)) {
      setHistoryCourse(updated.find((c) => matchesCourse(c, targetCourseId)));
    }

    if (token) {
      try {
        await fetch(`http://localhost:5001/api/attendance/${logId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (updatedCoursePayload) {
          await fetch(`http://localhost:5001/api/courses/${updatedCoursePayload.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(updatedCoursePayload)
          });
        }
      } catch (err) {
        console.warn('Failed to delete log from server:', err);
      }
    }

    setTimeout(() => {
      isInternalUpdate.current = false;
    }, 50);
  };

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

    const days = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const pDay = daysInPrevMonth - i;
      const prevM = calMonth === 0 ? 11 : calMonth - 1;
      const prevY = calMonth === 0 ? calYear - 1 : calYear;
      const mStr = String(prevM + 1).padStart(2, '0');
      const dStr = String(pDay).padStart(2, '0');
      days.push({
        dayNum: pDay,
        dateStr: `${prevY}-${mStr}-${dStr}`,
        isCurrentMonth: false
      });
    }

    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const mStr = String(calMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push({
        dayNum: d,
        dateStr: `${calYear}-${mStr}-${dStr}`,
        isCurrentMonth: true
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      const nextM = calMonth === 11 ? 0 : calMonth + 1;
      const nextY = calMonth === 11 ? calYear + 1 : calYear;
      const mStr = String(nextM + 1).padStart(2, '0');
      const dStr = String(n).padStart(2, '0');
      days.push({
        dayNum: n,
        dateStr: `${nextY}-${mStr}-${dStr}`,
        isCurrentMonth: false
      });
    }

    return days;
  }, [calYear, calMonth]);

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  useEffect(() => {
    if (!forecastCourseId && filteredCourses.length > 0) {
      setForecastCourseId(filteredCourses[0].id || filteredCourses[0].code);
    }
    if (!leaveCourseId && filteredCourses.length > 0) {
      setLeaveCourseId(filteredCourses[0].id || filteredCourses[0].code);
    }
    if (!rollCallCourseId && filteredCourses.length > 0) {
      setRollCallCourseId(filteredCourses[0].id || filteredCourses[0].code);
    }
  }, [filteredCourses, forecastCourseId, leaveCourseId, rollCallCourseId]);

  const simCourse = useMemo(() => {
    return courses.find((c) => matchesCourse(c, forecastCourseId)) || courses[0] || null;
  }, [courses, forecastCourseId]);

  const simulationStats = useMemo(() => {
    if (!simCourse) return null;
    const logs = simCourse.attendanceLogs || [];
    const P = logs.length > 0 ? logs.filter(l => l.status === 'present').length : (simCourse.attendance?.present || 0);
    const N = logs.length > 0 ? logs.length : (simCourse.attendance?.total || 0);
    const T = Number(requiredThreshold) || 75;

    const baseStatus = getAttendanceStatus(P, N, T);
    const projectedP = P + Number(simAttendClasses);
    const projectedN = N + Number(simAttendClasses) + Number(simMissClasses);
    const projectedPct = projectedN > 0 ? Math.round((projectedP / projectedN) * 100) : 100;

    return { P, N, T, baseStatus, projectedP, projectedN, projectedPct };
  }, [simCourse, requiredThreshold, simAttendClasses, simMissClasses]);

  const handleLeaveSubmit = (e) => {
    e.preventDefault();
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;
    const courseObj = courses.find((c) => matchesCourse(c, leaveCourseId));
    const newLeave = {
      id: `leave_${Date.now()}`,
      date: leaveDate,
      courseName: courseObj ? `${courseObj.code} — ${courseObj.name}` : 'General',
      reason: leaveReason,
      status: 'Pending'
    };
    setLeaveApplications([newLeave, ...leaveApplications]);
    setLeaveNotes('');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Attendance Tracker</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time compliance monitor with 75% exam-eligibility safeguards & safe bunk forecasting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                const d = new Date(`${e.target.value}T00:00:00`);
                if (!isNaN(d.getTime())) {
                  setCalYear(d.getFullYear());
                  setCalMonth(d.getMonth());
                }
              }}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-xs font-medium text-slate-400">Semester:</span>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {semesters.map((sem) => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="text-right">
              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">OVERALL</span>
              <span className={`text-sm font-black ${
                overallStats.percentage >= 85 
                  ? 'text-emerald-600' 
                  : overallStats.percentage >= 75 
                  ? 'text-amber-600' 
                  : 'text-rose-600'
              }`}>
                {overallStats.percentage}%
              </span>
            </div>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
              overallStats.percentage >= 75 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => {
            setActiveTab('cards');
            setStatusCardFilter('ALL');
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs flex items-center justify-between hover:scale-[1.01] ${
            statusCardFilter === 'ALL' && activeTab === 'cards'
              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ELIGIBILITY</span>
            <div className="text-base font-black text-slate-900 mt-0.5">
              {overallStats.atRiskCount === 0 ? 'Fully Eligible' : `${overallStats.atRiskCount} Subject Shortage`}
            </div>
            <span className="text-[10px] text-blue-600 font-bold block mt-0.5">Show All Courses</span>
          </div>
          <div className={`p-2 rounded-xl ${overallStats.atRiskCount === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div 
          onClick={() => {
            setActiveTab('cards');
            setStatusCardFilter('SAFE');
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs flex items-center justify-between hover:scale-[1.01] ${
            statusCardFilter === 'SAFE' && activeTab === 'cards'
              ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SAFE COURSES</span>
            <div className="text-base font-black text-emerald-600 mt-0.5">
              {overallStats.safeCount} of {filteredCourses.length}
            </div>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Filter Safe (≥75%)</span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <Check className="w-4 h-4" />
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('forecast')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs flex items-center justify-between hover:scale-[1.01] ${
            activeTab === 'forecast'
              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CLASSES ATTENDED</span>
            <div className="text-base font-black text-slate-900 mt-0.5">
              {overallStats.totalPresent} / {overallStats.totalHeld}
            </div>
            <span className="text-[10px] text-blue-600 font-bold block mt-0.5">Open Simulator →</span>
          </div>
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div 
          onClick={() => {
            setActiveTab('cards');
            setStatusCardFilter('AT_RISK');
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs flex items-center justify-between hover:scale-[1.01] ${
            statusCardFilter === 'AT_RISK' && activeTab === 'cards'
              ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AT-RISK COURSES</span>
            <div className={`text-base font-black mt-0.5 ${overallStats.atRiskCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              {overallStats.atRiskCount}
            </div>
            <span className="text-[10px] text-rose-600 font-bold block mt-0.5">Filter Risk (&lt;75%)</span>
          </div>
          <div className={`p-2 rounded-xl ${overallStats.atRiskCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'cards', label: `Course Cards (${displayedCourses.length})`, icon: BookOpen },
          { id: 'calendar', label: 'Academic Calendar', icon: CalendarIcon },
          { id: 'forecast', label: '"Can I Bunk?" Simulator', icon: Sliders },
          { id: 'leave', label: 'Leave Applications', icon: FileText },
          { id: 'rollcall', label: 'Faculty Roll-Call Mode', icon: UserCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === 'rollcall') {
                  setShowRollCallModal(true);
                } else {
                  setActiveTab(tab.id);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Daily Status Log Banner */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white border border-blue-100/90 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/20 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              Daily Attendance Log for {selectedDate} {dateOverview.dayName ? `(${dateOverview.dayName})` : ''}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Quick session status for enrolled coursework</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>{dateOverview.presentCount} Present</span>
          </span>

          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shadow-2xs">
            <X className="w-3.5 h-3.5 text-rose-600" />
            <span>{dateOverview.absentCount} Absent</span>
          </span>

          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-semibold shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>{dateOverview.unmarkedCount} Unmarked</span>
          </span>
        </div>
      </div>

      {/* 5. TAB: Course Cards Grid */}
      {activeTab === 'cards' && (
        displayedCourses.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">No matching courses</h3>
            <p className="text-xs text-slate-400 mt-1">
              {statusCardFilter !== 'ALL' ? 'No courses match this filter status.' : 'Select another semester or add a course.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedCourses.map((course) => {
              const targetIdentifier = course.id || course.code;
              const logs = Array.isArray(course.attendanceLogs) ? course.attendanceLogs : [];
              const held = logs.length > 0 ? logs.length : (course.attendance?.total || 0);
              const present = logs.length > 0 ? logs.filter((l) => l.status === 'present').length : (course.attendance?.present || 0);
              const absent = Math.max(0, held - present);
              const percentage = held > 0 ? Math.round((present / held) * 100) : 0;
              const status = getAttendanceStatus(present, held, 75);

              const currentLog = logs.find((l) => l.date === selectedDate);
              const isSimOpen = expandedSimCourseId === targetIdentifier;
              const simValues = cardSimValues[targetIdentifier] || { skip: 0, attend: 0 };

              const simProjectedP = present + simValues.attend;
              const simProjectedN = held + simValues.attend + simValues.skip;
              const simProjectedPct = simProjectedN > 0 ? Math.round((simProjectedP / simProjectedN) * 100) : 0;

              return (
                <div
                  key={targetIdentifier}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: course.color || '#3b82f6' }}
                          />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">
                            {course.code}
                          </span>
                        </div>
                        <h3 className="text-xs font-black text-slate-900 truncate" title={course.name}>
                          {course.name}
                        </h3>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-base font-black block leading-none ${
                          percentage >= 80 
                            ? 'text-emerald-600' 
                            : percentage >= 75 
                            ? 'text-amber-600' 
                            : (held === 0 ? 'text-slate-400' : 'text-rose-600')
                        }`}>
                          {held === 0 ? '0%' : `${percentage}%`}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">
                          ATTENDANCE
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2.5">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${held === 0 ? 0 : Math.min(100, percentage)}%`,
                          backgroundColor: percentage >= 80 ? '#10B981' : percentage >= 75 ? '#F59E0B' : '#EF4444'
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-center py-2 bg-slate-50/80 rounded-xl border border-slate-100 mb-2.5">
                      <div>
                        <span className="text-slate-400 block text-[9px] font-bold uppercase">HELD</span>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(targetIdentifier, 0, -1)}
                            className="p-0.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 cursor-pointer"
                            title="Decrement held"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <strong className="text-slate-800 text-xs font-black">{held}</strong>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(targetIdentifier, 0, 1)}
                            className="p-0.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 cursor-pointer"
                            title="Increment held"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      <div className="border-x border-slate-200/60">
                        <span className="text-emerald-500 block text-[9px] font-bold uppercase">PRESENT</span>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(targetIdentifier, -1, -1)}
                            className="p-0.5 text-slate-400 hover:text-emerald-700 rounded hover:bg-slate-200 cursor-pointer"
                            title="Decrement present"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <strong className="text-emerald-600 text-xs font-black">{present}</strong>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(targetIdentifier, 1, 1)}
                            className="p-0.5 text-slate-400 hover:text-emerald-700 rounded hover:bg-slate-200 cursor-pointer"
                            title="Increment present"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-rose-500 block text-[9px] font-bold uppercase">ABSENT</span>
                        <strong className="text-rose-600 text-xs font-black block mt-0.5">{absent}</strong>
                      </div>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold mb-2 ${
                      status.type === 'safe'
                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                        : status.type === 'margin'
                        ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                        : status.type === 'danger'
                        ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <div className="flex items-center gap-2 truncate">
                        {status.type === 'safe' ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : status.type === 'margin' ? (
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        ) : status.type === 'danger' ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : (
                          <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate text-[11px] font-bold">{status.text}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => setHistoryCourse(course)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                          title="Attendance Dates History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedSimCourseId(isSimOpen ? null : targetIdentifier)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition flex items-center gap-0.5 text-[10px] font-bold cursor-pointer"
                          title="What-if Quick Simulator"
                        >
                          <Sliders className="w-3 h-3 text-blue-600" />
                          {isSimOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="mb-2.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                        <span>Recorded Dates ({logs.length})</span>
                        <span className="text-[9px] lowercase font-normal">click history for all</span>
                      </div>

                      {logs.length === 0 ? (
                        <div className="text-[11px] text-slate-400 italic bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                          No dates recorded yet. Mark present/absent below.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-1 bg-slate-50/60 rounded-xl border border-slate-100">
                          {logs.slice(0, 8).map((l) => (
                            <span
                              key={l.id || l.date}
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                                l.status === 'present'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              <span>{l.date.slice(5)}:</span>
                              <span className="uppercase">{l.status === 'present' ? 'P' : 'A'}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {isSimOpen && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 mb-2.5 space-y-2 animate-in fade-in duration-100">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            What-If Future Simulation
                          </span>
                          <span className={`text-xs font-black ${
                            simProjectedPct >= 80 ? 'text-emerald-600' : simProjectedPct >= 75 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            Projected: {simProjectedPct}%
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[10px]">
                          <div className="flex items-center justify-between text-slate-600 font-semibold">
                            <span>Skip next {simValues.skip} classes:</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setCardSimValues({
                                  ...cardSimValues,
                                  [targetIdentifier]: { ...simValues, skip: Math.max(0, simValues.skip - 1) }
                                })}
                                className="w-4 h-4 bg-white border border-slate-200 rounded flex items-center justify-center font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-4 text-center font-black text-rose-600">{simValues.skip}</span>
                              <button
                                type="button"
                                onClick={() => setCardSimValues({
                                  ...cardSimValues,
                                  [targetIdentifier]: { ...simValues, skip: Math.min(10, simValues.skip + 1) }
                                })}
                                className="w-4 h-4 bg-white border border-slate-200 rounded flex items-center justify-center font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-slate-600 font-semibold">
                            <span>Attend next {simValues.attend} classes:</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setCardSimValues({
                                  ...cardSimValues,
                                  [targetIdentifier]: { ...simValues, attend: Math.max(0, simValues.attend - 1) }
                                })}
                                className="w-4 h-4 bg-white border border-slate-200 rounded flex items-center justify-center font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-4 text-center font-black text-emerald-600">{simValues.attend}</span>
                              <button
                                type="button"
                                onClick={() => setCardSimValues({
                                  ...cardSimValues,
                                  [targetIdentifier]: { ...simValues, attend: Math.min(10, simValues.attend + 1) }
                                })}
                                className="w-4 h-4 bg-white border border-slate-200 rounded flex items-center justify-center font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[10px] text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>Date: <strong className="text-slate-700">{selectedDate}</strong></span>
                      {currentLog && (
                        <span className={`font-black px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${
                          currentLog.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          Logged {currentLog.status}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleMarkAttendance(targetIdentifier, 'present')}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                          currentLog?.status === 'present'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200/80'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{currentLog?.status === 'present' ? 'Present (Active)' : 'Mark Present'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMarkAttendance(targetIdentifier, 'absent')}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                          currentLog?.status === 'absent'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200/80'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{currentLog?.status === 'absent' ? 'Absent (Active)' : 'Mark Absent'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* 6. TAB: Interactive Calendar */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 hover:bg-white rounded-lg transition text-slate-700 cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 hover:bg-white rounded-lg transition text-slate-700 cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <select
                  value={calMonth}
                  onChange={(e) => setCalMonth(Number(e.target.value))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>

                <select
                  value={calYear}
                  onChange={(e) => setCalYear(Number(e.target.value))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCalYear(now.getFullYear());
                    setCalMonth(now.getMonth());
                    setSelectedDate(now.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition cursor-pointer"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Present Logged</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Absent Logged</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-xs font-black text-slate-400 uppercase py-1">
                  {d}
                </div>
              ))}

              {calendarDays.map((item, idx) => {
                const isSelected = selectedDate === item.dateStr;

                let presentCount = 0;
                let absentCount = 0;

                courses.forEach((c) => {
                  (c.attendanceLogs || []).forEach((l) => {
                    if (l.date === item.dateStr) {
                      if (l.status === 'present') presentCount++;
                      if (l.status === 'absent') absentCount++;
                    }
                  });
                });

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDate(item.dateStr)}
                    className={`min-h-[70px] p-2 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/30'
                        : item.isCurrentMonth
                        ? 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                        : 'bg-slate-50/40 border-slate-100 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black ${
                        isSelected 
                          ? 'text-blue-600' 
                          : item.isCurrentMonth 
                          ? 'text-slate-800' 
                          : 'text-slate-400'
                      }`}>
                        {item.dayNum}
                      </span>

                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {presentCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                          <Check className="w-2.5 h-2.5" />
                          <span>{presentCount}P</span>
                        </span>
                      )}
                      {absentCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-rose-700 bg-rose-100 px-1 rounded">
                          <X className="w-2.5 h-2.5" />
                          <span>{absentCount}A</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Attendance for {selectedDate}</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  {dateOverview.dayName} • Record session attendance across enrolled courses
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  {dateOverview.presentCount} Present
                </span>
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                  {dateOverview.absentCount} Absent
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {filteredCourses.map((c) => {
                const targetIdentifier = c.id || c.code;
                const logs = c.attendanceLogs || [];
                const log = logs.find((l) => l.date === selectedDate);
                const isPresent = log?.status === 'present';
                const isAbsent = log?.status === 'absent';

                return (
                  <div
                    key={targetIdentifier}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-900 block truncate">{c.code}</span>
                      <span className="text-[11px] text-slate-500 truncate block">{c.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMarkAttendance(targetIdentifier, 'present')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                          isPresent
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>P</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMarkAttendance(targetIdentifier, 'absent')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                          isAbsent
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                      >
                        <X className="w-3 h-3" />
                        <span>A</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB: Forecast & Recovery Simulator */}
      {activeTab === 'forecast' && simulationStats && (
        <div className="space-y-6">
          <div className="bg-[#0f172a] text-white p-6 rounded-2xl border border-slate-800 flex items-center justify-between shadow-xs">
            <div>
              <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                Intelligent Forecasting Engine
              </span>
              <h3 className="text-xl font-bold mt-2">"Can I Bunk a Class?" & Recovery Calculator</h3>
              <p className="text-xs text-slate-400 mt-1">
                Simulate missed classes or calculate consecutive classes needed to return above the 75% threshold.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('cards')}
              className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition shadow-sm cursor-pointer"
            >
              Return to Grid
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                Course Simulation
              </h4>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Course</label>
                <select
                  value={forecastCourseId}
                  onChange={(e) => setForecastCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {filteredCourses.map((c) => (
                    <option key={c.id || c.code} value={c.id || c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Required Policy Minimum</span>
                  <span className="text-blue-600 font-extrabold">{requiredThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="90"
                  step="5"
                  value={requiredThreshold}
                  onChange={(e) => setRequiredThreshold(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Simulate Bunking Classes:</span>
                    <span className="text-rose-600 font-extrabold">{simMissClasses} classes</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={simMissClasses}
                    onChange={(e) => setSimMissClasses(Number(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Simulate Attending Classes:</span>
                    <span className="text-emerald-600 font-extrabold">{simAttendClasses} classes</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={simAttendClasses}
                    onChange={(e) => setSimAttendClasses(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-semibold text-slate-400">Current Course Standing</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">
                      {simCourse?.code} ({simulationStats.P} present of {simulationStats.N} held)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-400">Projected Attendance</div>
                    <div className={`text-2xl font-black ${
                      simulationStats.projectedPct >= 80 
                        ? 'text-emerald-600' 
                        : simulationStats.projectedPct >= simulationStats.T 
                        ? 'text-amber-600' 
                        : 'text-rose-600'
                    }`}>
                      {simulationStats.projectedPct}%
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-4 rounded-xl border bg-slate-50 border-slate-200 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    simulationStats.projectedPct >= simulationStats.T ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {simulationStats.projectedPct >= simulationStats.T ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {simulationStats.projectedPct >= simulationStats.T
                        ? 'Safe Status Maintained'
                        : 'High Risk / Exam Ineligibility'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {simulationStats.projectedPct >= simulationStats.T
                        ? `You can safely bunk up to ${simulationStats.baseStatus.canMiss} upcoming classes without dropping below ${simulationStats.T}%.`
                        : `You must attend the next ${simulationStats.baseStatus.need} consecutive classes to recover above ${simulationStats.T}%.`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Projected Trajectory for Upcoming Sessions
                </span>
                <div className="grid grid-cols-5 gap-2 text-center">
                  {[1, 2, 3, 4, 5].map((step) => {
                    const attendP = simulationStats.P + step;
                    const attendN = simulationStats.N + step;
                    const attendPct = Math.round((attendP / attendN) * 100);

                    const missN = simulationStats.N + step;
                    const missPct = Math.round((simulationStats.P / missN) * 100);

                    return (
                      <div key={step} className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                        <span className="font-extrabold text-slate-700 block text-[10px] mb-1">+{step} Class</span>
                        <span className="text-emerald-600 font-bold block">If Present: {attendPct}%</span>
                        <span className="text-rose-500 font-bold block text-[10px]">If Absent: {missPct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. TAB: Leave Management Portal */}
      {activeTab === 'leave' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Submit Excuse / Leave
            </h4>

            <form onSubmit={handleLeaveSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Course</label>
                <select
                  value={leaveCourseId}
                  onChange={(e) => setLeaveCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {filteredCourses.map((c) => (
                    <option key={c.id || c.code} value={c.id || c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason</label>
                <select
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option>Medical Certificate (Doctor's Note)</option>
                  <option>University Official Representation</option>
                  <option>Family Emergency / Personal Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={leaveNotes}
                  onChange={(e) => setLeaveNotes(e.target.value)}
                  placeholder="Provide additional details..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Leave Application</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Leave Applications Status
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              <div className="grid grid-cols-5 p-3 text-[10px] font-bold text-slate-400 uppercase bg-slate-50">
                <span>Date</span>
                <span className="col-span-2">Course</span>
                <span>Reason</span>
                <span className="text-right">Status</span>
              </div>
              {leaveApplications.map((app) => (
                <div key={app.id} className="grid grid-cols-5 p-3 text-xs font-semibold items-center hover:bg-slate-50/60 transition">
                  <span className="text-slate-800 font-bold">{app.date}</span>
                  <span className="col-span-2 text-slate-700 truncate">{app.courseName}</span>
                  <span className="text-slate-500">{app.reason}</span>
                  <span className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      app.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {app.status}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 9. Course Date History Log Modal */}
      {historyCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Attendance Log: {historyCourse.code}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{historyCourse.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryCourse(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-3 max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {(!historyCourse.attendanceLogs || historyCourse.attendanceLogs.length === 0) ? (
                <div className="p-6 text-center text-xs text-slate-400 font-medium">
                  No attendance records logged for this course yet.
                </div>
              ) : (
                historyCourse.attendanceLogs.map((log) => {
                  const isPresent = log.status === 'present';
                  const logDate = new Date(`${log.date}T00:00:00`);
                  const weekday = isNaN(logDate.getTime())
                    ? ''
                    : logDate.toLocaleDateString('en-US', { weekday: 'long' });

                  return (
                    <div key={log.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">{log.date}</span>
                          <span className="text-[10px] text-slate-400">{weekday}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                            isPresent
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {isPresent ? 'PRESENT' : 'MISSED (ABSENT)'}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteLog(historyCourse.id || historyCourse.code, log.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">
                Total Classes Held:{' '}
                <strong className="text-slate-900 font-black">
                  {(historyCourse.attendanceLogs || []).length}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setHistoryCourse(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Roll-Call Modal */}
      {showRollCallModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Faculty Rapid Roll-Call</h3>
                  <p className="text-[10px] text-slate-500">Simulate professor marking batch student roster</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRollCallModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <select
                value={rollCallCourseId}
                onChange={(e) => setRollCallCourseId(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
              >
                {filteredCourses.map((c) => (
                  <option key={c.id || c.code} value={c.id || c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setStudentsRoster(studentsRoster.map((s) => ({ ...s, status: 'present' })))}
                  className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition cursor-pointer"
                >
                  All Present
                </button>
                <button
                  type="button"
                  onClick={() => setStudentsRoster(studentsRoster.map((s) => ({ ...s, status: 'absent' })))}
                  className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold hover:bg-rose-100 transition cursor-pointer"
                >
                  All Absent
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl max-h-56 overflow-y-auto">
              {studentsRoster.map((st) => (
                <div key={st.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50/80 transition">
                  <div>
                    <span className="font-bold text-slate-800 block">{st.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{st.roll}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setStudentsRoster(
                          studentsRoster.map((s) => (s.id === st.id ? { ...s, status: 'present' } : s))
                        )
                      }
                      className={`w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center transition cursor-pointer ${
                        st.status === 'present'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      P
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setStudentsRoster(
                          studentsRoster.map((s) => (s.id === st.id ? { ...s, status: 'absent' } : s))
                        )
                      }
                      className={`w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center transition cursor-pointer ${
                        st.status === 'absent'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      A
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRollCallModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const myRecord = studentsRoster.find((s) => s.id === 'st_1');
                  if (myRecord && rollCallCourseId) {
                    handleMarkAttendance(rollCallCourseId, myRecord.status);
                  }
                  setShowRollCallModal(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
              >
                Apply Attendance
              </button>
            </div>
          </div>
        </div>
      )}    
    </div>
  );
}