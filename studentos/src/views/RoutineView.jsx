import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Upload, 
  Clock, 
  MapPin, 
  User, 
  FileText, 
  Check, 
  Trash2, 
  Edit2, 
  X, 
  FlaskConical, 
  CalendarCheck2, 
  LayoutGrid, 
  List, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  AlertTriangle 
} from 'lucide-react';
import { apiRequest } from '../api';

const formatSemester = (val) => {
  if (!val) return '1st Semester';
  const clean = String(val).trim();
  if (/^\d+$/.test(clean)) {
    const num = parseInt(clean, 10);
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
    return `${num}${suffix} Semester`;
  }
  return clean;
};

const normalizeCode = (str) => (str || '').trim().toUpperCase().replace(/[\s\-_]/g, '');

const isLabSlot = (item) => {
  if (!item) return false;
  if (item.isLab === true) return true;
  const text = `${item.name || ''} ${item.code || ''} ${item.room || ''} ${item.labGroup || ''}`.toUpperCase();
  return text.includes('LAB') || (item.labGroup && String(item.labGroup).trim() !== '');
};

const daysOfWeek = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TIME_SLOTS = [
  { id: 't1', label: '8:30 - 10:00' },
  { id: 't2', label: '10:00 - 11:30' },
  { id: 't3', label: '11:30 - 1:00' },
  { id: 't4', label: '1:00 - 2:30' },
  { id: 't5', label: '2:30 - 4:00' },
  { id: 't6', label: '4:00 - 5:30' },
  { id: 't7', label: '5:30 - 7:00' }
];

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

const checkIntervalOverlap = (intervalA, intervalB) => {
  const [startStrA, endStrA] = (intervalA || '').split('-');
  const [startStrB, endStrB] = (intervalB || '').split('-');

  if (!startStrA || !endStrA || !startStrB || !endStrB) return false;

  const startA = parseTimeToMinutes(startStrA);
  const endA = parseTimeToMinutes(endStrA);
  const startB = parseTimeToMinutes(startStrB);
  const endB = parseTimeToMinutes(endStrB);

  return Math.max(startA, startB) < Math.min(endA, endB);
};

export default function RoutineView({ 
  courses = [], 
  setCourses, 
  routine = {}, 
  setRoutine, 
  userRole,
  user
}) {
  const [activeDay, setActiveDay] = useState('Monday');
  const [viewMode, setViewMode] = useState('weekly');
  
  // Google Calendar Sync Modal
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncTab, setSyncTab] = useState('live'); // 'upload' | 'live'
  const [copiedFeed, setCopiedFeed] = useState(false);

  // Section Auto-Filter Target
  const userSection = user?.section || 'F1';

  // Import Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [semesterInput, setSemesterInput] = useState('1');
  const [sectionFilter, setSectionFilter] = useState(userSection);
  const [labSectionFilter, setLabSectionFilter] = useState(userSection);
  const [batchFilter, setBatchFilter] = useState(user?.batch || '48');
  const [scrapedPreview, setScrapedPreview] = useState(null);

  // Manual Add / Edit Modal State
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [slotDay, setSlotDay] = useState('Monday');
  const [slotCode, setSlotCode] = useState('');
  const [slotName, setSlotName] = useState('');
  const [slotTime, setSlotTime] = useState('08:30 AM - 10:00 AM');
  const [slotRoom, setSlotRoom] = useState('');
  const [slotTeacher, setSlotTeacher] = useState('');
  const [slotIsLab, setSlotIsLab] = useState(false);

  // Routine normalization
  const routineObj = useMemo(() => {
    const base = {
      Saturday: [],
      Sunday: [],
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: []
    };

    if (Array.isArray(routine)) {
      routine.forEach((item) => {
        const d = item.day ? item.day.charAt(0).toUpperCase() + item.day.slice(1).toLowerCase() : 'Monday';
        if (base[d]) base[d].push(item);
      });
    } else if (routine && typeof routine === 'object') {
      Object.entries(routine).forEach(([d, arr]) => {
        const formattedDay = d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
        if (base[formattedDay]) {
          base[formattedDay] = Array.isArray(arr) ? arr : [];
        }
      });
    }
    return base;
  }, [routine]);

  // Timetable Conflict Detector
  const conflictsMap = useMemo(() => {
    const map = {};
    Object.entries(routineObj).forEach(([day, slots]) => {
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const a = slots[i];
          const b = slots[j];
          if (checkIntervalOverlap(a.time, b.time)) {
            if (!map[a.id]) map[a.id] = [];
            if (!map[b.id]) map[b.id] = [];
            map[a.id].push(b);
            map[b.id].push(a);
          }
        }
      }
    });
    return map;
  }, [routineObj]);

  const totalConflictsCount = Object.keys(conflictsMap).length / 2;

  const getClassForSlot = (day, slotPeriod) => {
    const list = routineObj[day] || [];
    const [periodStart] = slotPeriod.label.replace(/\s+/g, '').split('-');

    return list.find((item) => {
      if (!item.time) return false;
      const [classStart] = item.time.replace(/\s+/g, '').toUpperCase().split('-');
      const cleanClassStart = classStart.replace(/^0/, '').replace(/(AM|PM)/i, '');
      const cleanPeriodStart = periodStart.replace(/^0/, '').replace(/(AM|PM)/i, '');
      return cleanClassStart === cleanPeriodStart;
    });
  };

  const createGoogleCalendarUrl = (slot, dayName) => {
    const gcalUrl = new URL('https://calendar.google.com/calendar/render');
    gcalUrl.searchParams.append('action', 'TEMPLATE');
    gcalUrl.searchParams.append('text', `Class: ${slot.code} - ${slot.name || 'Lecture'}`);
    gcalUrl.searchParams.append('dates', `20260928T100000Z/20260928T113000Z`);
    gcalUrl.searchParams.append(
      'details',
      `Routine Lecture: ${slot.name || ''}\nRoom: ${slot.room || 'TBA'}\nTeacher: ${
        slot.teacher || 'Faculty'
      }\nDay: ${dayName}\nSection: ${userSection}\n\nSynced live with StudentOS.`
    );
    if (slot.room) gcalUrl.searchParams.append('location', slot.room);

    return gcalUrl.toString();
  };

  const openInGoogleCalendar = (slot, dayName) => {
    window.open(createGoogleCalendarUrl(slot, dayName), '_blank', 'noopener,noreferrer');
  };

  const handleSyncAllRoutine = () => {
    const all = Object.entries(routineObj).flatMap(([day, list]) => list.map((c) => ({ ...c, day })));
    if (all.length === 0) {
      alert('No routine classes to sync.');
      return;
    }
    if (all.length > 5 && !window.confirm(`Open ${all.length} Google Calendar event tabs?`)) return;

    all.forEach((c, idx) => {
      setTimeout(() => openInGoogleCalendar(c, c.day), idx * 400);
    });
  };

  const feedUrl = `${window.location.origin.replace('5173', '5001')}/api/calendar/feed.ics`;

  const handleCopyFeed = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopiedFeed(true);
    setTimeout(() => setCopiedFeed(false), 2500);
  };

  const handleOpenGoogleCalendarSettings = () => {
    window.open('https://calendar.google.com/calendar/u/0/r/settings/addbyurl', '_blank', 'noopener,noreferrer');
  };

  const handleOpenAddModal = () => {
    setEditingSlotId(null);
    setSlotDay(activeDay);
    setSlotCode('');
    setSlotName('');
    setSlotTime('08:30 AM - 10:00 AM');
    setSlotRoom('');
    setSlotTeacher('');
    setSlotIsLab(false);
    setShowClassModal(true);
  };

  const handleOpenEditModal = (day, slot) => {
    setEditingSlotId(slot.id);
    setSlotDay(day);
    setSlotCode(slot.code || slot.course || '');
    setSlotName(slot.name || '');
    setSlotTime(slot.time || '08:30 AM - 10:00 AM');
    setSlotRoom(slot.room || '');
    setSlotTeacher(slot.teacher || slot.faculty || '');
    setSlotIsLab(isLabSlot(slot));
    setShowClassModal(true);
  };

  const handleSaveClass = async (e) => {
    e.preventDefault();
    if (!slotCode) return;

    const isClassLab = slotIsLab || slotName.toUpperCase().includes('LAB') || slotCode.toUpperCase().includes('LAB');
    let next = { ...routineObj };

    const classData = {
      id: editingSlotId || 'r_' + Date.now(),
      code: slotCode.trim(),
      name: slotName.trim() || slotCode.trim(),
      time: slotTime.trim(),
      room: slotRoom.trim() || 'TBA',
      teacher: slotTeacher.trim() || 'TBA',
      isLab: isClassLab,
      type: isClassLab ? 'Lab' : 'Theory',
    };

    if (editingSlotId) {
      daysOfWeek.forEach((d) => {
        if (next[d]) next[d] = next[d].filter((s) => s.id !== editingSlotId);
      });
      if (!next[slotDay]) next[slotDay] = [];
      next[slotDay].push(classData);
    } else {
      next = {
        ...next,
        [slotDay]: [...(next[slotDay] || []), classData],
      };
    }

    setRoutine(next);
    localStorage.setItem('studentos_routine', JSON.stringify(next));

    // Auto-propagate into Courses state
    const cleanCode = normalizeCode(slotCode);
    const existingCourse = (courses || []).some(c => normalizeCode(c.code) === cleanCode);
    if (!existingCourse && typeof setCourses === 'function') {
      const newCourseObj = {
        id: 'c_' + Date.now(),
        code: slotCode.trim(),
        name: slotName.trim() || slotCode.trim(),
        teacher: slotTeacher.trim() || 'Faculty',
        room: slotRoom.trim() || 'TBA',
        credits: isClassLab ? 1.5 : 3.0,
        semester: '1st Semester',
        attendance: { present: 0, total: 0 }
      };
      setCourses(prev => [...prev, newCourseObj]);
    }

    try {
      await apiRequest('/routine', {
        method: 'POST',
        body: JSON.stringify(next),
      });
    } catch (err) {
      console.warn('Backend sync failed:', err);
    }

    setShowClassModal(false);
  };

  const handleDeleteSlot = async (day, id) => {
    if (!window.confirm('Delete this class from routine?')) return;
    const next = {
      ...routineObj,
      [day]: (routineObj[day] || []).filter((item) => item.id !== id),
    };
    setRoutine(next);
    localStorage.setItem('studentos_routine', JSON.stringify(next));

    try {
      await apiRequest('/routine', {
        method: 'POST',
        body: JSON.stringify(next),
      });
    } catch (err) {
      console.warn('Backend sync failed:', err);
    }
  };

  const handleUploadAndScrape = async () => {
    if (!selectedFile) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('section', sectionFilter || userSection);
      formData.append('batch', batchFilter || user?.batch || '48');
      formData.append('labSection', labSectionFilter || userSection);
      formData.append('semester', semesterInput || '1');

      const result = await apiRequest('/routine/parse-file', {
        method: 'POST',
        body: formData,
      });

      if (result.success && Array.isArray(result.data)) {
        setScrapedPreview(result.data);
      } else {
        alert(result.message || 'Could not extract classes from this file.');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error parsing file.');
    } finally {
      setUploading(false);
    }
  };

  const confirmAndApplyScrapedData = async () => {
    if (!scrapedPreview || scrapedPreview.length === 0) return;

    const formattedTargetSemester = formatSemester(semesterInput || user?.semester || '1st Semester');
    let currentCourses = Array.isArray(courses) ? [...courses] : [];

    const distinctScrapedCourses = [];
    scrapedPreview.forEach((item) => {
      const codeKey = normalizeCode(item.code);
      const isLab = Boolean(item.isLab);
      const uniqueKey = `${codeKey}_${isLab ? 'LAB' : 'THEORY'}`;
      if (!distinctScrapedCourses.some((c) => `${normalizeCode(c.code)}_${Boolean(c.isLab) ? 'LAB' : 'THEORY'}` === uniqueKey)) {
        distinctScrapedCourses.push({ ...item, isLab });
      }
    });

    distinctScrapedCourses.forEach((item) => {
      const codeKey = normalizeCode(item.code);
      const isLab = Boolean(item.isLab);
      let courseTitle = item.name && item.name !== item.code ? item.name.trim() : item.code.trim();

      const existingIdx = currentCourses.findIndex(
        (c) => normalizeCode(c.code) === codeKey && Boolean(c.isLab) === isLab
      );

      if (existingIdx !== -1) {
        currentCourses[existingIdx] = {
          ...currentCourses[existingIdx],
          name: courseTitle,
          teacher: item.teacher || currentCourses[existingIdx].teacher,
          room: item.room || currentCourses[existingIdx].room,
        };
      } else {
        currentCourses.push({
          id: 'c_' + Date.now() + Math.random().toString(36).substring(2, 6),
          code: item.code.trim(),
          name: courseTitle,
          teacher: item.teacher || 'TBA',
          credits: isLab ? 1.5 : 3,
          room: item.room || 'TBA',
          color: isLab ? '#059669' : '#3B82F6',
          semester: formattedTargetSemester,
          isLab: isLab,
          type: isLab ? 'Lab' : 'Theory',
          attendance: { present: 0, total: 0 },
        });
      }
    });

    if (typeof setCourses === 'function') setCourses(currentCourses);
    localStorage.setItem('studentos_courses', JSON.stringify(currentCourses));

    const freshRoutine = {
      Saturday: [],
      Sunday: [],
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
    };

    scrapedPreview.forEach((item) => {
      const rawDay = (item.day || 'Monday').trim();
      const day = rawDay.charAt(0).toUpperCase() + rawDay.slice(1).toLowerCase();
      const isLab = Boolean(item.isLab);

      if (freshRoutine[day]) {
        freshRoutine[day].push({
          id: 'r_' + Date.now() + Math.random().toString(36).substring(2, 6),
          day: day,
          code: item.code.trim(),
          name: item.name || item.code,
          time: item.time,
          room: item.room || 'TBA',
          teacher: item.teacher || 'TBA',
          isLab: isLab,
          type: isLab ? 'Lab' : 'Theory',
        });
      }
    });

    if (typeof setRoutine === 'function') setRoutine(freshRoutine);
    localStorage.setItem('studentos_routine', JSON.stringify(freshRoutine));

    try {
      await apiRequest('/routine', {
        method: 'POST',
        body: JSON.stringify(freshRoutine),
      });
    } catch (e) {
      console.warn('Backend sync error:', e);
    }

    setShowUploadModal(false);
    setScrapedPreview(null);
    setSelectedFile(null);
  };

  const daySchedule = routineObj[activeDay] || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Class Routine</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Weekly timetable automatically filtered for <span className="font-bold text-blue-600">Section {userSection}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Day / Weekly Matrix Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'single' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Day View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'weekly' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Weekly View</span>
            </button>
          </div>

          {/* Sync to Google Calendar Button */}
          <button
            type="button"
            onClick={() => setShowSyncModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
          >
            <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
            <span>Sync to Google Calendar</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Import Routine</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {/* Overlap Collision Alert */}
      {totalConflictsCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold block">Timetable Overlap Warning Detected</span>
              <p className="text-[11px] text-rose-700 mt-0.5">There are overlapping lecture hours in your schedule.</p>
            </div>
          </div>
          <span className="text-[10px] font-black px-2 py-1 rounded bg-rose-600 text-white shrink-0">
            {totalConflictsCount} Clash{totalConflictsCount > 1 ? 'es' : ''}
          </span>
        </div>
      )}

      {/* SINGLE DAY VIEW */}
      {viewMode === 'single' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {daysOfWeek.map((day) => {
              const count = (routineObj[day] || []).length;
              const isActive = activeDay === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setActiveDay(day)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                    isActive ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <span>{day}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Schedule for {activeDay} ({routineObj[activeDay]?.length || 0})
            </h3>

            {daySchedule.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No classes scheduled for {activeDay}. Enjoy your day off!
              </div>
            ) : (
              <div className="space-y-3">
                {daySchedule.map((c) => {
                  const isClassLab = isLabSlot(c);
                  return (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600">{c.time}</span>
                          {isClassLab && (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <FlaskConical className="w-3 h-3" />
                              LAB
                            </span>
                          )}
                        </div>
                        <div className="text-base font-bold text-slate-800 mt-1">{c.code || c.course}</div>
                        <div className="text-xs text-slate-500">{c.name}</div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                        {c.room && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {c.room}
                          </span>
                        )}
                        {(c.teacher || c.faculty) && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {c.teacher || c.faculty}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(activeDay, c)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(activeDay, c.id)}
                          className="p-1 text-slate-400 hover:text-red-500 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WEEKLY TIMETABLE MATRIX */}
      {viewMode === 'weekly' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400">
                Effective: <strong className="text-slate-800">26 September 2026</strong>
              </span>
              <span className="text-slate-200">|</span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                Section: {userSection}
              </span>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                Batch: {user?.batch || '48'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                Department of {user?.department || 'Software Engineering'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="p-3 font-bold text-slate-400 uppercase tracking-wider text-[11px] w-28 text-center border-r border-slate-200">
                      Time Slot
                    </th>
                    {daysOfWeek.map((day) => (
                      <th key={day} className="p-3 font-bold text-slate-700 text-center border-r border-slate-200 last:border-r-0">
                        <span>{day}</span>
                        <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">
                          {routineObj[day]?.length || 0} classes
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {TIME_SLOTS.map((slot) => (
                    <tr key={slot.id} className="hover:bg-slate-50/40 transition">
                      <td className="p-3 font-bold text-slate-600 bg-slate-50/60 border-r border-slate-200 text-center text-xs whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-blue-600" />
                          <span>{slot.label}</span>
                        </div>
                      </td>

                      {daysOfWeek.map((day) => {
                        const matchedClass = getClassForSlot(day, slot);
                        const isLab = isLabSlot(matchedClass);

                        return (
                          <td key={`${day}_${slot.id}`} className="p-2 border-r border-slate-200 last:border-r-0 h-24 align-top w-[130px]">
                            {matchedClass ? (
                              <div className={`p-2 rounded-xl border h-full flex flex-col justify-between transition-shadow hover:shadow-xs ${
                                isLab ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' : 'bg-blue-50/50 border-blue-200 text-blue-950'
                              }`}>
                                <div>
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                                      isLab ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {matchedClass.code || matchedClass.course}
                                    </span>
                                    {isLab && (
                                      <span className="text-[8px] font-black text-emerald-700 bg-white border border-emerald-300 px-1 py-0.2 rounded">
                                        LAB
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="font-bold text-slate-800 text-[11px] leading-tight line-clamp-2">
                                    {matchedClass.name}
                                  </h5>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold pt-1 border-t border-slate-200/40 mt-1">
                                  <span className="truncate">{matchedClass.teacher || matchedClass.faculty || 'TBA'}</span>
                                  <span className="px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-600 shrink-0">
                                    {matchedClass.room || 'TBA'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full rounded-xl border border-dashed border-slate-100 bg-slate-50/20 flex items-center justify-center text-slate-300 text-[10px] select-none">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED GOOGLE CALENDAR SYNC MODAL */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
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
                onClick={() => setShowSyncModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl mt-4 border border-slate-200">
              <button
                type="button"
                onClick={() => setSyncTab('upload')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer text-center ${
                  syncTab === 'upload' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Upload Category Items
              </button>
              <button
                type="button"
                onClick={() => setSyncTab('live')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  syncTab === 'live' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live Auto-Update (Removes Old)</span>
              </button>
            </div>

            {/* TAB 1: Instant Batch Upload */}
            {syncTab === 'upload' && (
              <div className="my-4 space-y-4 animate-in fade-in">
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 text-xs space-y-1.5">
                  <span className="font-bold block text-blue-900">Instant One-Click Routine Upload</span>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    This will batch-generate Google Calendar templates for every active class in your timetable across all days.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Instant Batch Upload</span>
                    <span className="text-[11px] text-slate-500">Upload all active classes to your Google Calendar.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncAllRoutine}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Sync All Classes</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Live Auto-Update / Subscription Feed */}
            {syncTab === 'live' && (
              <div className="my-4 space-y-4 animate-in fade-in">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                    <span>How Dynamic Replacement Works</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-800">
                    Subscribing your Google Calendar to this live feed guarantees that whenever a class routine changes or an exam is postponed/edited, Google Calendar automatically erases the previous schedule and applies the latest one.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Personal Auto-Sync Feed URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={feedUrl}
                      className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl select-all text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={handleCopyFeed}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedFeed ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenGoogleCalendarSettings}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Google Calendar "Add from URL" Page</span>
                </button>
                <p className="text-[10px] text-center text-slate-400">
                  Paste the copied feed URL into Google Calendar once, and you are done.
                </p>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL ADD / EDIT MODAL */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingSlotId ? 'Edit Routine Class' : 'Add Class to Routine'}
              </h3>
              <button
                type="button"
                onClick={() => setShowClassModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Day of Week</label>
                <select
                  value={slotDay}
                  onChange={(e) => setSlotDay(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {daysOfWeek.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SE 121 or BNS 101"
                  value={slotCode}
                  onChange={(e) => setSlotCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Name</label>
                <input
                  type="text"
                  placeholder="e.g. Structured Programming Language"
                  value={slotName}
                  onChange={(e) => setSlotName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 08:30 AM - 10:00 AM"
                  value={slotTime}
                  onChange={(e) => setSlotTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 802"
                    value={slotRoom}
                    onChange={(e) => setSlotRoom(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teacher</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Saiful"
                    value={slotTeacher}
                    onChange={(e) => setSlotTeacher(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={slotIsLab}
                    onChange={(e) => setSlotIsLab(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span>Mark as Practical / Lab Class</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  {editingSlotId ? 'Update Class' : 'Save Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OCR IMPORT MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Import University Routine</h3>
            <p className="text-xs text-slate-500 mt-1">
              Extract schedule & automatically sync courses to your chosen semester.
            </p>

            {!scrapedPreview ? (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Semester</label>
                    <input
                      type="text"
                      value={semesterInput}
                      onChange={(e) => setSemesterInput(e.target.value)}
                      placeholder="e.g. 1 or 2"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Lab Section</label>
                    <input
                      type="text"
                      value={labSectionFilter}
                      onChange={(e) => setLabSectionFilter(e.target.value)}
                      placeholder="e.g. F2"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Batch</label>
                    <input
                      type="text"
                      value={batchFilter}
                      onChange={(e) => setBatchFilter(e.target.value)}
                      placeholder="e.g. 48"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Theory Section</label>
                    <input
                      type="text"
                      value={sectionFilter}
                      onChange={(e) => setSectionFilter(e.target.value)}
                      placeholder="e.g. F"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,application/pdf,.xlsx,.xls"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <span className="text-xs font-semibold text-slate-700 block">
                      {selectedFile ? selectedFile.name : 'Click to select routine photo, PDF, or Excel'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Supports JPG, PNG, PDF, XLSX
                    </span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadAndScrape}
                    disabled={!selectedFile || uploading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 cursor-pointer"
                  >
                    {uploading ? 'Analyzing Document...' : 'Start Extraction'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                  <Check className="w-4 h-4" />
                  Extracted {scrapedPreview.length} slots for Section {sectionFilter || 'F'} ({labSectionFilter || 'All Labs'})
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl p-2">
                  {scrapedPreview.map((item, idx) => (
                    <div key={idx} className="py-2 text-xs flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{item.code}</span> — {item.day}
                          {item.isLab && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              LAB
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400 block">{item.name} ({item.time} | {item.room})</span>
                      </div>
                      <span className="text-slate-500 font-medium">{item.teacher}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setScrapedPreview(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={confirmAndApplyScrapedData}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Merge Into Website
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}