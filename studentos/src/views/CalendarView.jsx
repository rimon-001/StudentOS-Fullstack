import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Award, 
  CheckSquare, 
  RotateCcw,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Plus,
  X,
  ExternalLink,
  BookOpen,
  MapPin,
  Sparkles,
  Check,
  Share2,
  CalendarCheck2,
  RefreshCw,
  Layers,
  Copy
} from 'lucide-react';
import { apiRequest } from '../api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function CalendarView({ 
  courses = [], 
  routine = {}, 
  tasks = [], 
  setTasks,
  exams = [],
  setExams,
  materials = [],
  setMaterials,
  attendance = []
}) {
  // Live dynamic system dates
  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth(); // 0-indexed
  const todayDate = today.getDate();

  const [currentYear, setCurrentYear] = useState(todayYear);
  const [currentMonth, setCurrentMonth] = useState(todayMonth);
  const [selectedDay, setSelectedDay] = useState(todayDate);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [entryType, setEntryType] = useState('daily_task');

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [activeSyncTab, setActiveSyncTab] = useState('categories');
  const [copiedFeed, setCopiedFeed] = useState(false);

  // Form Fields
  const [targetCourse, setTargetCourse] = useState('General');
  const [title, setTitle] = useState('');
  const [customDate, setCustomDate] = useState(() => {
    const m = String(todayMonth + 1).padStart(2, '0');
    const d = String(todayDate).padStart(2, '0');
    return `${todayYear}-${m}-${d}`;
  });
  const [time, setTime] = useState('09:00 AM');
  const [isAllDay, setIsAllDay] = useState(false);
  const [room, setRoom] = useState('Room 302');
  const [extraField, setExtraField] = useState('');

  // Calendar Math
  const { daysInMonth, startDayOffset } = useMemo(() => {
    const days = new Date(currentYear, currentMonth + 1, 0).getDate();
    const offset = new Date(currentYear, currentMonth, 1).getDay();
    return { daysInMonth: days, startDayOffset: offset };
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
    setSelectedDay(1);
  };

  // Jump to Current Real-world Today
  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDay(now.getDate());
  };

  const handleOpenAddModal = () => {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(selectedDay).padStart(2, '0');
    setCustomDate(`${currentYear}-${monthStr}-${dayStr}`);
    setTitle('');
    setExtraField('');
    setIsAllDay(false);
    setIsAddModalOpen(true);
  };

  // Google Calendar URL Generator
  const createGoogleCalendarUrl = ({ title, details, location, date, time }) => {
    const cleanDate = (date || `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDate).padStart(2, '0')}`).replace(/-/g, '');
    let startDateTime = `${cleanDate}`;
    let endDateTime = `${cleanDate}`;

    if (time && time.toLowerCase() !== 'all day') {
      const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2];
        const modifier = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;

        const padHours = String(hours).padStart(2, '0');
        const endHours = String((hours + 1) % 24).padStart(2, '0');

        startDateTime = `${cleanDate}T${padHours}${minutes}00`;
        endDateTime = `${cleanDate}T${endHours}${minutes}00`;
      }
    }

    const gcalUrl = new URL('https://calendar.google.com/calendar/render');
    gcalUrl.searchParams.append('action', 'TEMPLATE');
    gcalUrl.searchParams.append('text', title);
    gcalUrl.searchParams.append('dates', `${startDateTime}/${endDateTime}`);
    gcalUrl.searchParams.append('details', `${details || ''}\n\nSynced live with StudentOS Academic System.`);
    if (location) gcalUrl.searchParams.append('location', location);

    return gcalUrl.toString();
  };

  const openInGoogleCalendar = (eventData) => {
    const url = createGoogleCalendarUrl(eventData);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const routineList = useMemo(() => {
    if (Array.isArray(routine)) return routine;
    return Object.entries(routine || {}).flatMap(([day, classes]) =>
      Array.isArray(classes) ? classes.map((c) => ({ ...c, day })) : []
    );
  }, [routine]);

  // Syncable items categorized
  const syncableData = useMemo(() => {
    const defaultDateStr = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDate).padStart(2, '0')}`;

    const routineItems = routineList.map((r, idx) => ({
      id: 'routine_' + idx,
      category: 'Routine Class',
      title: `${r.code || r.course}: ${r.name || 'Lecture'}`,
      date: defaultDateStr,
      time: r.time || '10:00 AM',
      location: r.room || 'Room 302',
      details: `Scheduled routine lecture in ${r.room || 'Room TBA'}\nDay: ${r.day || 'Weekly'}`,
      color: 'text-blue-700 bg-blue-50 border-blue-200'
    }));

    const examItems = (exams || []).map((e) => ({
      id: e.id,
      category: 'Exam / Quiz',
      title: `${e.courseCode || 'Exam'}: ${e.title}`,
      date: e.date || defaultDateStr,
      time: e.time || '10:00 AM',
      location: e.room || 'Room TBA',
      details: `Room: ${e.room || 'TBA'}\nSyllabus: ${Array.isArray(e.syllabus) ? e.syllabus.join(', ') : 'All chapters'}`,
      color: 'text-rose-700 bg-rose-50 border-rose-200'
    }));

    const assignmentItems = (tasks || []).filter((t) => !t.isDailyTask).map((t) => ({
      id: t.id,
      category: 'Assignment',
      title: t.title,
      date: t.deadline || t.deadlineDate || defaultDateStr,
      time: t.deadlineTime || '11:59 PM',
      location: 'StudentOS Portal',
      details: `Course: ${t.courseCode || t.course || 'Academic'}\nStatus: ${t.status || 'Pending'}`,
      color: 'text-amber-700 bg-amber-50 border-amber-200'
    }));

    const dailyTaskItems = (tasks || []).filter((t) => t.isDailyTask).map((t) => ({
      id: t.id,
      category: 'Daily Task',
      title: t.title,
      date: t.deadline || t.deadlineDate || defaultDateStr,
      time: t.deadlineTime || 'All Day',
      location: 'Personal',
      details: `Category: ${t.course || 'Personal'}\nNotes: ${t.notes || ''}`,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    }));

    return {
      routine: routineItems,
      exams: examItems,
      assignments: assignmentItems,
      dailyTasks: dailyTaskItems
    };
  }, [routineList, exams, tasks, todayYear, todayMonth, todayDate]);

  const handleBatchSyncCategory = (categoryKey) => {
    const items = syncableData[categoryKey] || [];
    if (items.length === 0) {
      alert('No items in this category to sync.');
      return;
    }

    if (items.length > 5) {
      if (!window.confirm(`Open ${items.length} Google Calendar event tabs to add them all?`)) return;
    }

    items.forEach((item, index) => {
      setTimeout(() => {
        openInGoogleCalendar(item);
      }, index * 400);
    });
  };

  const feedUrl = `${window.location.origin.replace('5173', '5001')}/api/calendar/feed.ics`;

  const handleCopyFeedUrl = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopiedFeed(true);
    setTimeout(() => setCopiedFeed(false), 2500);
  };

  const handleOpenGoogleSubscribe = () => {
    window.open('https://calendar.google.com/calendar/u/0/r/settings/addbyurl', '_blank', 'noopener,noreferrer');
  };

  // Form Submission Handler
  const handleSubmitEntry = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      if (entryType === 'daily_task' || entryType === 'task') {
        const newTask = {
          id: 't_' + Date.now(),
          title: title.trim(),
          courseCode: targetCourse === 'General' ? '' : targetCourse,
          course: targetCourse,
          deadline: customDate,
          deadlineDate: customDate,
          deadlineTime: isAllDay ? 'All Day' : time,
          priority: 'Medium',
          status: 'Pending',
          isDailyTask: entryType === 'daily_task',
          notes: extraField.trim()
        };

        if (typeof setTasks === 'function') {
          setTasks((prev) => [...(Array.isArray(prev) ? prev : []), newTask]);
        }

        try {
          await apiRequest('/tasks', {
            method: 'POST',
            body: JSON.stringify(newTask)
          });
        } catch (apiErr) {
          console.warn('Backend task sync warning:', apiErr.message);
        }
      } else if (entryType === 'exam') {
        const newExam = {
          id: 'ex_' + Date.now(),
          title: title.trim(),
          courseCode: targetCourse,
          date: customDate,
          time: isAllDay ? '10:00 AM' : time,
          room: room.trim() || 'Room TBA',
          syllabus: extraField ? extraField.split(',').map(s => s.trim()) : ['Module 1'],
          prepPercentage: 0
        };

        if (typeof setExams === 'function') {
          setExams((prev) => [...(Array.isArray(prev) ? prev : []), newExam]);
        }

        try {
          await apiRequest('/exams', {
            method: 'POST',
            body: JSON.stringify(newExam)
          });
        } catch (apiErr) {
          console.warn('Backend exam sync warning:', apiErr.message);
        }
      } else if (entryType === 'material') {
        const newMaterial = {
          id: 'm_' + Date.now(),
          title: title.trim(),
          courseCode: targetCourse,
          uploadDate: customDate,
          date: customDate,
          link: extraField.trim(),
          type: 'Drive Link'
        };

        if (typeof setMaterials === 'function') {
          setMaterials((prev) => [...(Array.isArray(prev) ? prev : []), newMaterial]);
        }

        try {
          await apiRequest('/materials', {
            method: 'POST',
            body: JSON.stringify(newMaterial)
          });
        } catch (apiErr) {
          console.warn('Backend material sync warning:', apiErr.message);
        }
      }

      window.dispatchEvent(new Event('studentos_calendar_updated'));
      setIsAddModalOpen(false);
      setTitle('');
      setExtraField('');
    } catch (err) {
      console.error('Error submitting calendar entry:', err);
      alert(err.message || 'Failed to add calendar entry');
    }
  };

  // Day Agenda Data Aggregator
  const getEventsForDay = (day) => {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateFormatted = `${currentYear}-${monthStr}-${dayStr}`;

    const dayOfWeekIndex = new Date(currentYear, currentMonth, day).getDay();
    const dayName = DAY_NAMES[dayOfWeekIndex];

    const dayExams = (exams || []).filter((e) => e.date === dateFormatted);
    const dayAllTasks = (tasks || []).filter((t) => {
      const d = t.deadline || t.deadlineDate || t.dueDate;
      return d === dateFormatted;
    });

    const dayDailyTasks = dayAllTasks.filter((t) => t.isDailyTask);
    const dayAssignments = dayAllTasks.filter((t) => !t.isDailyTask);

    let dayClasses = [];
    if (Array.isArray(routine)) {
      dayClasses = routine.filter((r) => r.day?.toLowerCase() === dayName?.toLowerCase());
    } else if (routine && typeof routine === 'object') {
      dayClasses = routine[dayName] || [];
    }

    const dayAttendance = (attendance || []).filter((a) => a.date === dateFormatted);
    const dayMaterials = (materials || []).filter((m) => m.uploadDate === dateFormatted || m.date === dateFormatted);

    return { 
      dayExams, 
      dayAllTasks,
      dayDailyTasks,
      dayAssignments,
      dayClasses, 
      dayAttendance,
      dayMaterials,
      dayName, 
      dateFormatted 
    };
  };

  const selectedEvents = getEventsForDay(Math.min(selectedDay, daysInMonth));
  const totalItemsCount = 
    selectedEvents.dayExams.length + 
    selectedEvents.dayAllTasks.length + 
    selectedEvents.dayClasses.length +
    selectedEvents.dayMaterials.length;

  const formattedTodayLabel = useMemo(() => {
    const shortMonth = MONTH_NAMES[todayMonth].slice(0, 3);
    return `${shortMonth} ${todayDate}, ${todayYear}`;
  }, [todayMonth, todayDate, todayYear]);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            Unified Academic Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full system synchronization: Classes, Tasks, Daily To-Dos, Exams, Materials & Notes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSyncModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
          >
            <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
            <span>Sync to Google Calendar</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event / Task</span>
          </button>

          <button
            type="button"
            onClick={handleJumpToToday}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            <span>Today ({formattedTodayLabel})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-0.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <select
                  value={currentMonth}
                  onChange={(e) => {
                    setCurrentMonth(parseInt(e.target.value, 10));
                    setSelectedDay(1);
                  }}
                  className="px-2.5 py-1 text-xs font-black text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>{name}</option>
                  ))}
                </select>

                <select
                  value={currentYear}
                  onChange={(e) => {
                    setCurrentYear(parseInt(e.target.value, 10));
                    setSelectedDay(1);
                  }}
                  className="px-2 py-1 text-xs font-black text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Routine</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Tasks</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Exams</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Materials</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 pb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: startDayOffset }).map((_, i) => (
              <div key={`offset_${i}`} className="h-20 bg-slate-50/40 rounded-xl" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = selectedDay === day;
              const isToday = (currentYear === todayYear && currentMonth === todayMonth && day === todayDate);
              const { dayExams, dayAllTasks, dayClasses, dayMaterials } = getEventsForDay(day);

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`h-20 p-2 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between relative ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/30 shadow-2xs'
                      : isToday
                      ? 'border-blue-300 bg-blue-50/20'
                      : 'border-slate-100 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-black ${
                        isSelected
                          ? 'text-blue-600'
                          : isToday
                          ? 'text-blue-600'
                          : dayClasses.length > 0 || dayAllTasks.length > 0 || dayExams.length > 0 || dayMaterials.length > 0
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {day}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" title="Today" />
                    )}
                  </div>

                  <div className="space-y-1 w-full">
                    {dayClasses.length > 0 && <div className="h-1.5 w-full bg-blue-500 rounded-full" title={`${dayClasses.length} class(es)`} />}
                    {dayAllTasks.length > 0 && <div className="h-1.5 w-full bg-amber-500 rounded-full" title={`${dayAllTasks.length} task(s)`} />}
                    {dayExams.length > 0 && <div className="h-1.5 w-full bg-rose-500 rounded-full" title={`${dayExams.length} exam(s)`} />}
                    {dayMaterials.length > 0 && <div className="h-1.5 w-full bg-emerald-500 rounded-full" title={`${dayMaterials.length} material(s)`} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DAY AGENDA</span>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                {selectedEvents.dayName}, {MONTH_NAMES[currentMonth].slice(0, 3)} {Math.min(selectedDay, daysInMonth)}, {currentYear}
              </h3>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
              {totalItemsCount} Total Records
            </span>
          </div>

          <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
            {/* Scheduled Routine Classes */}
            {selectedEvents.dayClasses.map((c, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Scheduled Routine Class
                  </span>
                  <button
                    type="button"
                    onClick={() => openInGoogleCalendar({
                      title: `Class: ${c.code || c.course} - ${c.name || ''}`,
                      details: `Lecture Session in ${c.room || 'Room TBA'}\nDay: ${selectedEvents.dayName}`,
                      location: c.room || '',
                      date: selectedEvents.dateFormatted,
                      time: c.time
                    })}
                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-100/60 rounded-md transition cursor-pointer"
                    title="Send this class to Google Calendar"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4 className="text-xs font-black text-slate-900">{c.code || c.course}: {c.name || 'Regular Lecture'}</h4>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>{c.time || '10:00 - 11:30'}</span>
                  <span className="font-bold text-slate-700">{c.room || 'Room TBA'}</span>
                </div>
              </div>
            ))}

            {/* Scheduled Exams */}
            {selectedEvents.dayExams.map((e) => (
              <div key={e.id} className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-rose-700 uppercase flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> Examination / Assessment
                  </span>
                  <button
                    type="button"
                    onClick={() => openInGoogleCalendar({
                      title: `${e.courseCode || 'Exam'}: ${e.title}`,
                      details: `Assessment for ${e.courseCode}\nRoom: ${e.room || 'TBA'}\nSyllabus: ${Array.isArray(e.syllabus) ? e.syllabus.join(', ') : ''}`,
                      location: e.room || '',
                      date: selectedEvents.dateFormatted,
                      time: e.time
                    })}
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-md transition cursor-pointer"
                    title="Send exam to Google Calendar"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4 className="text-xs font-black text-slate-900">{e.courseCode || e.course}: {e.title}</h4>
                <div className="text-[11px] text-slate-600 flex items-center justify-between">
                  <span>{e.time || '10:00 AM'} • {e.room || 'Room TBA'}</span>
                  <span className="text-rose-600 font-bold">{e.prepPercentage || 50}% Prepared</span>
                </div>
              </div>
            ))}

            {/* Assignments */}
            {selectedEvents.dayAssignments.map((t) => (
              <div key={t.id} className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-700 uppercase flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5" /> Assignment Deadline
                  </span>
                  <button
                    type="button"
                    onClick={() => openInGoogleCalendar({
                      title: `Due: ${t.title} (${t.courseCode || t.course || ''})`,
                      details: `Submission deadline for ${t.courseCode || t.course || 'course'}`,
                      date: selectedEvents.dateFormatted,
                      time: t.deadlineTime
                    })}
                    className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-md transition cursor-pointer"
                    title="Send deadline to Google Calendar"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4 className="text-xs font-black text-slate-900">{t.title}</h4>
                <div className="text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Due by {t.deadlineTime || '11:59 PM'}</span>
                  <span className="font-bold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded">{t.courseCode || t.course || 'Academic'}</span>
                </div>
              </div>
            ))}

            {/* Daily Tasks */}
            {selectedEvents.dayDailyTasks.map((dt) => (
              <div key={dt.id} className="p-3 rounded-xl border border-blue-200 bg-white shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{dt.title}</span>
                  <span className="text-[10px] text-slate-400">{dt.deadlineTime || 'All Day'} • {dt.course || 'Personal'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => openInGoogleCalendar({
                    title: dt.title,
                    details: `Category: ${dt.course || 'Personal'}\nNotes: ${dt.notes || ''}`,
                    date: selectedEvents.dateFormatted,
                    time: dt.deadlineTime
                  })}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {totalItemsCount === 0 && (
              <div className="py-16 text-center text-xs text-slate-400">
                No scheduled activities for this date.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GOOGLE CALENDAR SYNC MODAL */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Google Calendar Synchronization</h3>
                  <p className="text-[11px] text-slate-500">Sync all category items or enable dynamic auto-updating.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl my-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveSyncTab('categories')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
                  activeSyncTab === 'categories' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Upload Category Items
              </button>
              <button
                type="button"
                onClick={() => setActiveSyncTab('auto_sync')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeSyncTab === 'auto_sync' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live Auto-Update (Removes Old)</span>
              </button>
            </div>

            {activeSyncTab === 'categories' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Select any section to upload all of its scheduled events directly to your Google Calendar:
                </p>

                <div className="space-y-2">
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Class Routine & Timetable</span>
                      <span className="text-[11px] text-slate-500">{syncableData.routine.length} Weekly Lectures</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBatchSyncCategory('routine')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Sync All Routine</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Upcoming Exams & Quizzes</span>
                      <span className="text-[11px] text-slate-500">{syncableData.exams.length} Assessments</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBatchSyncCategory('exams')}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Sync All Exams</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Course Assignment Deadlines</span>
                      <span className="text-[11px] text-slate-500">{syncableData.assignments.length} Deliverables</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBatchSyncCategory('assignments')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Sync All Tasks</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Daily Personal Tasks</span>
                      <span className="text-[11px] text-slate-500">{syncableData.dailyTasks.length} To-Dos</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBatchSyncCategory('dailyTasks')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Sync All To-Dos</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSyncTab === 'auto_sync' && (
              <div className="space-y-3.5">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs leading-relaxed">
                  <strong className="block font-bold mb-1 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                    How Dynamic Replacement Works
                  </strong>
                  Subscribing your Google Calendar to this live feed guarantees that <strong>whenever a class routine changes or an exam is postponed/edited</strong>, Google Calendar automatically <strong>erases the previous schedule and applies the latest one</strong>.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Personal Auto-Sync Feed URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={feedUrl}
                      className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyFeedUrl}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedFeed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedFeed ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleOpenGoogleSubscribe}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Google Calendar "Add from URL" Page</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1.5">
                    Paste the copied feed URL into Google Calendar once, and you are done.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Add Academic Entry</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEntry} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Where do you want to add this?</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {[
                    { id: 'daily_task', label: 'Daily Task' },
                    { id: 'task', label: 'Assignment' },
                    { id: 'exam', label: 'Exam' },
                    { id: 'material', label: 'Resource' },
                    { id: 'scratchpad', label: 'Notes' }
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setEntryType(t.id)}
                      className={`py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer text-center ${
                        entryType === t.id
                          ? 'bg-white text-blue-600 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {entryType === 'daily_task' ? 'Category / Course' : 'Target Course'}
                  </label>
                  <select
                    value={targetCourse}
                    onChange={(e) => setTargetCourse(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="General">General / Personal</option>
                    {(courses || []).map((c) => (
                      <option key={c.id || c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Calendar Date</label>
                  <input
                    type="date"
                    required
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {entryType === 'daily_task' ? 'Task Description / Remind me to...' : entryType === 'task' ? 'Assignment Title' : entryType === 'exam' ? 'Exam / Quiz Title' : entryType === 'material' ? 'Document / Slide Title' : 'Note Title'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    entryType === 'daily_task'
                      ? 'e.g. Solve 5 LeetCode problems or buy notebook'
                      : entryType === 'task'
                      ? 'e.g. Lab Report 02'
                      : entryType === 'exam'
                      ? 'e.g. Midterm Assessment'
                      : 'e.g. Chapter 4 Slides or Formula Note'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {(entryType === 'daily_task' || entryType === 'task' || entryType === 'exam') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">Time</label>
                      {entryType === 'daily_task' && (
                        <label className="text-[11px] text-slate-500 flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAllDay}
                            onChange={(e) => setIsAllDay(e.target.checked)}
                            className="rounded text-blue-600"
                          />
                          <span>All day</span>
                        </label>
                      )}
                    </div>
                    <input
                      type="text"
                      disabled={isAllDay}
                      placeholder="e.g. 10:00 AM or 11:59 PM"
                      value={isAllDay ? 'All Day' : time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {entryType === 'exam' ? 'Room' : 'Location (Optional)'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Room 302, Library, or Desk"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {entryType === 'exam' ? 'Syllabus Topics (Comma-separated)' : entryType === 'material' ? 'Google Drive / Attachment URL' : 'Additional Notes / Reminders'}
                </label>
                <input
                  type="text"
                  placeholder={entryType === 'exam' ? 'Topic 1, Topic 2, Formulas' : entryType === 'material' ? 'https://drive.google.com/...' : 'Optional details or checklist items'}
                  value={extraField}
                  onChange={(e) => setExtraField(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  Add to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}