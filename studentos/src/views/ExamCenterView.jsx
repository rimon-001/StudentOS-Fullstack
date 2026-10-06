import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  UploadCloud, 
  Edit3, 
  Trash2, 
  X, 
  Loader2, 
  Sparkles,
  CalendarCheck2,
  ExternalLink,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Armchair,
  ChevronDown,
  ChevronUp,
  Flame,
  Timer
} from 'lucide-react';

export default function ExamCenterView({ exams = [], setExams, courses = [], isDemoMode = false, onRestrictedAction }) {
  // Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [expandedSeatPlanId, setExpandedSeatPlanId] = useState(null);

  // Live Clock Ticker
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial exams from backend
  useEffect(() => {
    const token = localStorage.getItem('studentos_token');
    if (!token && !isDemoMode) return;

    fetch('http://localhost:5001/api/exams', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data)) {
          if (typeof setExams === 'function') setExams(result.data);
          localStorage.setItem('studentos_exams', JSON.stringify(result.data));
        }
      })
      .catch((err) => console.warn('Using local exams fallback:', err));
  }, [setExams, isDemoMode]);

  // Persistent Interactive Checklist State
  const [completedTopics, setCompletedTopics] = useState(() => {
    try {
      const saved = localStorage.getItem('studentos_exam_topics');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('studentos_exam_topics', JSON.stringify(completedTopics));
  }, [completedTopics]);

  // Form Fields
  const [courseCode, setCourseCode] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [room, setRoom] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [admitStatus, setAdmitStatus] = useState('Cleared & Verified');
  const [prepPercentage, setPrepPercentage] = useState(50);
  const [syllabusInput, setSyllabusInput] = useState('');

  // Import State
  const [uploadFile, setUploadFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const parseExamDateTime = (dateStr, timeStr) => {
    if (!dateStr) return new Date();
    const d = new Date(dateStr);
    if (timeStr && timeStr.toLowerCase() !== 'all day') {
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const period = match[3]?.toUpperCase();
        if (period === 'PM' && h < 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        d.setHours(h, m, 0, 0);
        return d;
      }
    }
    d.setHours(10, 0, 0, 0);
    return d;
  };

  const getCountdown = (examDateStr, examTimeStr) => {
    const target = parseExamDateTime(examDateStr, examTimeStr);
    const diff = target - now;

    if (diff <= 0) {
      return { isPast: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return { isPast: false, days, hours, minutes, seconds };
  };

  const nearestExam = useMemo(() => {
    if (!exams || exams.length === 0) return null;
    const sorted = [...exams].sort((a, b) => {
      const dateA = parseExamDateTime(a.date, a.time);
      const dateB = parseExamDateTime(b.date, b.time);
      return dateA - dateB;
    });
    return sorted.find((e) => parseExamDateTime(e.date, e.time) >= now) || sorted[0];
  }, [exams, now]);

  const nearestCountdown = useMemo(() => {
    if (!nearestExam) return null;
    return getCountdown(nearestExam.date, nearestExam.time);
  }, [nearestExam, now]);

  const handleToggleTopic = (examId, topic) => {
    setCompletedTopics((prev) => {
      const examSet = new Set(prev[examId] || []);
      if (examSet.has(topic)) {
        examSet.delete(topic);
      } else {
        examSet.add(topic);
      }
      return { ...prev, [examId]: Array.from(examSet) };
    });
  };

  const createGoogleCalendarUrl = (exam) => {
    const cleanDate = (exam.date || '2026-10-04').replace(/-/g, '');
    let startDateTime = `${cleanDate}`;
    let endDateTime = `${cleanDate}`;

    if (exam.time && exam.time.toLowerCase() !== 'all day') {
      const match = exam.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const mins = match[2];
        if (match[3]?.toUpperCase() === 'PM' && h < 12) h += 12;
        if (match[3]?.toUpperCase() === 'AM' && h === 12) h = 0;
        const padH = String(h).padStart(2, '0');
        const endH = String((h + 2) % 24).padStart(2, '0');
        startDateTime = `${cleanDate}T${padH}${mins}00`;
        endDateTime = `${cleanDate}T${endH}${mins}00`;
      }
    }

    const gcalUrl = new URL('https://calendar.google.com/calendar/render');
    gcalUrl.searchParams.append('action', 'TEMPLATE');
    gcalUrl.searchParams.append('text', `${exam.courseCode || 'Exam'}: ${exam.title}`);
    gcalUrl.searchParams.append('dates', `${startDateTime}/${endDateTime}`);
    gcalUrl.searchParams.append(
      'details',
      `Assessment: ${exam.title}\nCourse: ${exam.courseCode || ''}\nRoom: ${exam.room || 'TBA'}\nSeat: ${
        exam.seatNumber || 'Bench TBA'
      }\nSyllabus: ${
        Array.isArray(exam.syllabus) ? exam.syllabus.join(', ') : exam.syllabus || ''
      }\n\nSynced live with StudentOS.`
    );
    if (exam.room) gcalUrl.searchParams.append('location', exam.room);

    return gcalUrl.toString();
  };

  const openInGoogleCalendar = (exam) => {
    window.open(createGoogleCalendarUrl(exam), '_blank', 'noopener,noreferrer');
  };

  const handleSyncAllExams = () => {
    if (exams.length === 0) {
      alert('No exams to sync.');
      return;
    }
    if (exams.length > 4 && !window.confirm(`Open ${exams.length} Google Calendar event tabs?`)) return;

    exams.forEach((ex, idx) => {
      setTimeout(() => openInGoogleCalendar(ex), idx * 400);
    });
  };

  const feedUrl = `${window.location.origin.replace('5173', '5001')}/api/calendar/feed.ics`;

  const handleCopyFeed = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopiedFeed(true);
    setTimeout(() => setCopiedFeed(false), 2500);
  };

  const handleOpenAdd = () => {
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;
    setEditingExam(null);
    setCourseCode(courses[0]?.code || 'CSE 101');
    setTitle('');
    setDate('2026-10-15');
    setTime('10:00 AM');
    setRoom('Room 302');
    setSeatNumber('Bench 12 - Column B');
    setAdmitStatus('Cleared & Verified');
    setPrepPercentage(50);
    setSyllabusInput('Chapter 1, Chapter 2, Key Formulas');
    setShowEditModal(true);
  };

  const handleOpenEdit = (exam) => {
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;
    setEditingExam(exam);
    setCourseCode(exam.courseCode || exam.course || '');
    setTitle(exam.title || '');
    setDate(exam.date || '');
    setTime(exam.time || '');
    setRoom(exam.room || '');
    setSeatNumber(exam.seatNumber || 'Bench TBA');
    setAdmitStatus(exam.admitStatus || 'Cleared & Verified');
    setPrepPercentage(exam.prepPercentage ?? 50);
    setSyllabusInput(Array.isArray(exam.syllabus) ? exam.syllabus.join(', ') : exam.syllabus || '');
    setShowEditModal(true);
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!title.trim() || !courseCode.trim()) return;
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;

    const parsedSyllabus = syllabusInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const token = localStorage.getItem('studentos_token');
    let updatedList = [...exams];

    if (editingExam) {
      const updated = {
        ...editingExam,
        courseCode: courseCode.trim().toUpperCase(),
        title: title.trim(),
        date: date.trim(),
        time: time.trim(),
        room: room.trim(),
        seatNumber: seatNumber.trim() || 'Bench TBA',
        admitStatus: admitStatus.trim(),
        prepPercentage: Number(prepPercentage),
        syllabus: parsedSyllabus,
      };
      updatedList = updatedList.map((item) => (item.id === editingExam.id ? updated : item));
    } else {
      const newExam = {
        id: 'exam_' + Date.now(),
        courseCode: courseCode.trim().toUpperCase(),
        title: title.trim(),
        date: date.trim(),
        time: time.trim(),
        room: room.trim(),
        seatNumber: seatNumber.trim() || 'Bench TBA',
        admitStatus: admitStatus.trim(),
        prepPercentage: Number(prepPercentage),
        syllabus: parsedSyllabus,
      };

      updatedList.push(newExam);

      if (token) {
        try {
          await fetch('http://localhost:5001/api/exams', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(newExam)
          });
        } catch (err) {
          console.warn('Backend exam sync warning:', err);
        }
      }
    }

    if (typeof setExams === 'function') setExams(updatedList);
    localStorage.setItem('studentos_exams', JSON.stringify(updatedList));
    setShowEditModal(false);
  };

  const handleDeleteExam = async (id) => {
    if (isDemoMode && onRestrictedAction && onRestrictedAction()) return;
    if (!window.confirm('Delete this examination entry?')) return;

    const updatedList = exams.filter((e) => e.id !== id);
    if (typeof setExams === 'function') setExams(updatedList);
    localStorage.setItem('studentos_exams', JSON.stringify(updatedList));

    const token = localStorage.getItem('studentos_token');
    if (token) {
      try {
        await fetch(`http://localhost:5001/api/exams/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('Delete exam failed:', err);
      }
    }
  };

  const handleProcessImport = async () => {
    if (!rawText.trim() && !uploadFile) {
      alert('Please upload a file or paste routine text.');
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch('http://localhost:5001/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Extract an array of academic exams/quizzes from this text. Output valid JSON ONLY:
[
  {
    "courseCode": "CSE 101",
    "title": "Midterm Examination",
    "date": "2026-10-04",
    "time": "10:00 AM",
    "room": "Room 302",
    "seatNumber": "Bench 08",
    "admitStatus": "Cleared & Verified",
    "prepPercentage": 50,
    "syllabus": ["Topic 1"]
  }
]
Input:
${rawText || uploadFile?.name || ''}`
        })
      });

      const data = await res.json();
      if (data.success && data.reply) {
        const cleaned = data.reply.replace(/```json/g, '').replace(/```/g, '').trim();
        const extracted = JSON.parse(cleaned);
        if (Array.isArray(extracted) && extracted.length > 0) {
          const formatted = extracted.map((ex, idx) => ({
            id: 'exam_import_' + Date.now() + '_' + idx,
            seatNumber: 'Bench TBA',
            admitStatus: 'Cleared & Verified',
            ...ex
          }));
          const merged = [...exams, ...formatted];
          if (typeof setExams === 'function') setExams(merged);
          localStorage.setItem('studentos_exams', JSON.stringify(merged));
          setIsProcessing(false);
          setShowImportModal(false);
          return;
        }
      }
    } catch (err) {
      console.warn('AI extraction failed, fallback to parser:', err);
    }

    const lines = rawText.split('\n').filter(Boolean);
    const extracted = [];
    lines.forEach((line, i) => {
      const match = line.match(/([A-Z]{2,4}\s*\d{3})/i);
      if (match) {
        extracted.push({
          id: 'exam_parsed_' + Date.now() + '_' + i,
          courseCode: match[0].toUpperCase(),
          title: line.replace(match[0], '').trim() || 'Assessment',
          date: '2026-10-12',
          time: '10:00 AM',
          room: 'Room 302',
          seatNumber: 'Bench 04',
          admitStatus: 'Cleared & Verified',
          prepPercentage: 40,
          syllabus: ['Core Syllabus']
        });
      }
    });

    if (extracted.length > 0) {
      const merged = [...exams, ...extracted];
      if (typeof setExams === 'function') setExams(merged);
      localStorage.setItem('studentos_exams', JSON.stringify(merged));
    }
    setIsProcessing(false);
    setShowImportModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-600" />
            University Examination Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time countdown clocks, seat plan verification, and syllabus readiness meters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowSyncModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
          >
            <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
            <span>Sync to Google Calendar</span>
          </button>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer shadow-2xs"
          >
            <UploadCloud className="w-4 h-4 text-blue-600" />
            <span>Import Routine</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Assessment</span>
          </button>
        </div>
      </div>

      {nearestExam && nearestCountdown && (
        <div className="bg-[#0f172a] text-white p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3 h-3 fill-rose-500" />
                NEAREST CHECKPOINT
              </span>
              <span className="text-xs font-bold text-slate-300">
                {nearestExam.courseCode} — {nearestExam.title}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-400 flex items-center gap-3">
              <span>{nearestExam.date} at {nearestExam.time || '10:00 AM'}</span>
              <span>•</span>
              <span>{nearestExam.room || 'Room TBA'}</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{nearestExam.seatNumber || 'Bench Allocated'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[
              { label: 'DAYS', val: nearestCountdown.days },
              { label: 'HRS', val: nearestCountdown.hours },
              { label: 'MINS', val: nearestCountdown.minutes },
              { label: 'SECS', val: nearestCountdown.seconds }
            ].map((unit, i) => (
              <div key={i} className="flex flex-col items-center bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-xl min-w-[54px]">
                <span className="text-xl font-black font-mono text-white tracking-tight leading-none">
                  {String(unit.val).padStart(2, '0')}
                </span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-1">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {exams.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white border border-dashed border-slate-200 rounded-2xl p-8">
            <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No upcoming examinations</h3>
            <p className="text-xs text-slate-400 mt-1">
              Add assessments manually or upload your exam routine document.
            </p>
          </div>
        ) : (
          exams.map((exam) => {
            const cd = getCountdown(exam.date, exam.time);
            const syllabusList = Array.isArray(exam.syllabus) ? exam.syllabus : [];
            const checkedSet = new Set(completedTopics[exam.id] || []);

            const calculatedPrep = syllabusList.length > 0 
              ? Math.round((checkedSet.size / syllabusList.length) * 100) 
              : (exam.prepPercentage ?? 50);

            const prepScore = Math.max(calculatedPrep, exam.prepPercentage ?? 0);
            const isSeatPlanOpen = expandedSeatPlanId === exam.id;

            return (
              <div
                key={exam.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                      {exam.courseCode || exam.course}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        cd.isPast 
                          ? 'bg-slate-100 text-slate-500' 
                          : cd.days <= 3 
                          ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse' 
                          : 'bg-blue-50 text-blue-600'
                      }`}>
                        <Timer className="w-3 h-3" />
                        {cd.isPast ? 'Completed' : `${cd.days}d ${cd.hours}h ${cd.minutes}m`}
                      </span>

                      <button
                        type="button"
                        onClick={() => openInGoogleCalendar(exam)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Add to Google Calendar"
                      >
                        <CalendarCheck2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(exam)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Assessment"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteExam(exam.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Assessment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-black text-slate-900 mb-2">{exam.title}</h3>

                  <div className="space-y-1.5 text-xs text-slate-600 mb-3.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam.time || '10:00 AM'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam.room || 'Room TBA'}</span>
                    </div>
                  </div>

                  <div className="mb-3.5">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        Readiness Score
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                          prepScore >= 80 ? 'bg-emerald-50 text-emerald-700' : prepScore >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {prepScore >= 80 ? 'Prepared' : prepScore >= 40 ? 'In Progress' : 'Needs Attention'}
                        </span>
                      </span>
                      <span className="font-black text-blue-600">{prepScore}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          prepScore >= 80 ? 'bg-emerald-500' : prepScore >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${prepScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => setExpandedSeatPlanId(isSeatPlanOpen ? null : exam.id)}
                      className="w-full p-2 bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between transition cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Armchair className="w-3.5 h-3.5 text-blue-600" />
                        <span>Seat Plan & Clearance</span>
                      </span>
                      {isSeatPlanOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </button>

                    {isSeatPlanOpen && (
                      <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 mt-2 space-y-2 text-xs animate-in fade-in duration-100">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-semibold">Allocated Bench:</span>
                          <strong className="text-slate-900">{exam.seatNumber || 'Bench 08 - Row B'}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-semibold">Admit Card:</span>
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            {exam.admitStatus || 'Cleared & Verified'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-semibold">Exam Hall:</span>
                          <span className="text-slate-700 font-semibold">{exam.room || 'Room 302'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Interactive Syllabus Checklist
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {checkedSet.size}/{syllabusList.length} done
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {syllabusList.length > 0 ? (
                      syllabusList.map((topic, i) => {
                        const isDone = checkedSet.has(topic);
                        return (
                          <div
                            key={i}
                            onClick={() => handleToggleTopic(exam.id, topic)}
                            className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                              isDone
                                ? 'bg-emerald-50/60 border border-emerald-200 text-emerald-900 line-through opacity-80'
                                : 'bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100/70'
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            )}
                            <span className="truncate">{topic}</span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No syllabus specified</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingExam ? 'Edit Assessment' : 'Add New Assessment'}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Course Code</label>
                  <select
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    {(courses || []).map((c) => (
                      <option key={c.id || c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                    {!courses.some((c) => c.code === courseCode) && (
                      <option value={courseCode}>{courseCode}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assessment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Examination or Quiz 02"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hall / Room</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 302"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Seat / Bench</label>
                  <input
                    type="text"
                    placeholder="e.g. Bench 08 - Row B"
                    value={seatNumber}
                    onChange={(e) => setSeatNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admit Card Status</label>
                  <select
                    value={admitStatus}
                    onChange={(e) => setAdmitStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="Cleared & Verified">Cleared & Verified</option>
                    <option value="Clearance Pending">Clearance Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Base Readiness Score</label>
                  <span className="text-xs font-bold text-blue-600">{prepPercentage}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={prepPercentage}
                  onChange={(e) => setPrepPercentage(e.target.value)}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Syllabus Topics (Comma-separated)
                </label>
                <textarea
                  rows={2}
                  placeholder="Loops & Conditionals, Arrays & Strings, Pointers"
                  value={syllabusInput}
                  onChange={(e) => setSyllabusInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  {editingExam ? 'Save Changes' : 'Create Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Import & Scrape Exam Routine</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50/50">
                <UploadCloud className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <label className="text-xs font-bold text-blue-600 hover:underline cursor-pointer block">
                  Choose Exam Document (PDF / Image / TXT)
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setUploadFile(file);
                        const reader = new FileReader();
                        reader.onload = (event) => setRawText(event.target.result);
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {uploadFile ? uploadFile.name : 'Drag & drop or browse from device'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Or Paste Exam Schedule Text
                </label>
                <textarea
                  rows={4}
                  placeholder={`CSE 101 Midterm Examination 2026-10-04 10:00 AM Room 302\nMATH 101 Quiz 02: Calculus 2026-10-06 02:00 PM Room 201`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full p-3 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleProcessImport}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Scraping Schedule...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Extract & Sync</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Sync Exams with Google Calendar</h3>
                  <p className="text-[11px] text-slate-500">{exams.length} assessments scheduled</p>
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

            <div className="my-4 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Instant Batch Upload</span>
                  <span className="text-[11px] text-slate-500">Opens and adds all {exams.length} exams directly.</span>
                </div>
                <button
                  type="button"
                  onClick={handleSyncAllExams}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Sync All Exams</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Auto-Update Subscription</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Subscribe once to ensure that if an exam date changes or gets rescheduled, Google Calendar automatically updates.
                </p>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={feedUrl}
                    className="flex-1 px-2.5 py-1 text-[11px] font-mono bg-white border border-emerald-300 rounded-lg select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyFeed}
                    className="px-3 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    {copiedFeed ? 'Copied!' : 'Copy Feed'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}