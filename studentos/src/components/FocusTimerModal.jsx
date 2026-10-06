import React, { useState, useEffect, useRef } from 'react';
import { 
  Timer as TimerIcon, 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  BookOpen, 
  Flame, 
  Coffee 
} from 'lucide-react';

const TIMER_MODES = {
  POMODORO: { label: 'Pomodoro', duration: 25 * 60, isBreak: false },
  SHORT_BREAK: { label: 'Short Break', duration: 5 * 60, isBreak: true },
  LONG_BREAK: { label: 'Long Break', duration: 15 * 60, isBreak: true },
};

export default function FocusTimerModal({ isOpen, onClose, courses = [] }) {
  const [currentMode, setCurrentMode] = useState('POMODORO');
  const [timeLeft, setTimeLeft] = useState(TIMER_MODES.POMODORO.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCourseCode, setSelectedCourseCode] = useState(() => {
    return courses[0]?.code || 'CSE 101';
  });
  const [completedSessions, setCompletedSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('studentos_focus_sessions_today');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const timerRef = useRef(null);

  // Sync default course if courses array changes
  useEffect(() => {
    if (courses.length > 0 && !courses.some(c => c.code === selectedCourseCode)) {
      setSelectedCourseCode(courses[0].code);
    }
  }, [courses, selectedCourseCode]);

  // Timer Tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, currentMode, selectedCourseCode]);

  // Log completed focus minutes into course study logs
  const handleSessionComplete = () => {
    const modeConfig = TIMER_MODES[currentMode];
    if (!modeConfig.isBreak) {
      const sessionMinutes = Math.round(modeConfig.duration / 60);

      try {
        const storedLogs = JSON.parse(localStorage.getItem('studentos_study_logs') || '[]');
        const newLog = {
          id: `log_${Date.now()}`,
          courseCode: selectedCourseCode,
          minutes: sessionMinutes,
          hours: +(sessionMinutes / 60).toFixed(2),
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now()
        };

        const updatedLogs = [newLog, ...storedLogs];
        localStorage.setItem('studentos_study_logs', JSON.stringify(updatedLogs));

        // Increment today's count
        const nextCount = completedSessions + 1;
        setCompletedSessions(nextCount);
        localStorage.setItem('studentos_focus_sessions_today', nextCount.toString());

        // Dispatch system-wide event for workspace and dashboard widgets
        window.dispatchEvent(new CustomEvent('studentos_study_hours_updated', { 
          detail: { courseCode: selectedCourseCode, minutes: sessionMinutes } 
        }));
      } catch (err) {
        console.warn('Failed to record focus study session:', err);
      }

      alert(`Great work! You completed a ${sessionMinutes}-minute focus block for ${selectedCourseCode}. Time for a break!`);
      switchMode('SHORT_BREAK');
    } else {
      alert('Break finished! Ready to dive back in?');
      switchMode('POMODORO');
    }
  };

  const switchMode = (modeKey) => {
    setIsRunning(false);
    setCurrentMode(modeKey);
    setTimeLeft(TIMER_MODES[modeKey].duration);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(TIMER_MODES[currentMode].duration);
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalDuration = TIMER_MODES[currentMode].duration;
  const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-150 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-5">
          {Object.entries(TIMER_MODES).map(([key, config]) => (
            <button
              key={key}
              type="button"
              onClick={() => switchMode(key)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                currentMode === key
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {config.label}
            </button>
          ))}
        </div>

        {/* Target Course Selector */}
        {!TIMER_MODES[currentMode].isBreak && (
          <div className="mb-4 text-left">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-blue-600" />
              Focus Subject:
            </label>
            <select
              value={selectedCourseCode}
              onChange={(e) => setSelectedCourseCode(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
            >
              {(courses || []).map((c) => (
                <option key={c.id || c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Circular / Styled Time Readout */}
        <div className="py-4 relative flex flex-col items-center justify-center">
          <div className="text-5xl font-black text-slate-900 tracking-tight font-mono">
            {formattedTime}
          </div>

          <div className="w-48 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-4">
            <div
              className={`h-full transition-all duration-500 ${
                TIMER_MODES[currentMode].isBreak ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-6">
          {TIMER_MODES[currentMode].isBreak 
            ? 'Step away, stretch, and rest your eyes.' 
            : `Tracking study hours directly to ${selectedCourseCode}.`}
        </p>

        {/* Control Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition cursor-pointer"
            title="Reset Timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex-1 py-3 text-xs font-bold text-white rounded-2xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-600'
                : TIMER_MODES[currentMode].isBreak
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause Session</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>{timeLeft < totalDuration ? 'Resume' : 'Start Focus'}</span>
              </>
            )}
          </button>
        </div>

        {/* Daily Streak Indicator */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1 text-slate-600 font-semibold">
            <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>Today's Sessions:</span>
          </span>
          <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
            {completedSessions} completed
          </span>
        </div>
      </div>
    </div>
  );
}