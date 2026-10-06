import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings as SettingsIcon, 
  Download, 
  Upload, 
  Database, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  HardDrive, 
  ShieldCheck, 
  FileJson,
  Layers,
  Sparkles,
  RotateCcw,
  Check,
  X
} from 'lucide-react';

export default function SettingsView({ user = {}, onUpdateUser }) {
  const [backupStatus, setBackupStatus] = useState(null); // { type: 'success' | 'error', message: '' }
  const [storageUsage, setStorageUsage] = useState({ usedKb: 0, totalKb: 5120, pct: 0 });
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTarget, setResetTarget] = useState(null); // 'all' | 'attendance' | 'tasks' | 'notes' | 'materials'

  // Calculate live storage quota & usage
  const calculateStorage = () => {
    let totalChars = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalChars += (localStorage[key]?.length || 0) + key.length;
      }
    }
    const usedKb = Math.round((totalChars * 2) / 1024); // UTF-16 approximation
    const totalKb = 5120; // 5MB standard browser limit
    const pct = Math.min(100, Math.round((usedKb / totalKb) * 100));
    setStorageUsage({ usedKb, totalKb, pct });
  };

  useEffect(() => {
    calculateStorage();
  }, []);

  // Compute live items summary across modules
  const datasetSummary = useMemo(() => {
    const parseCount = (key) => {
      try {
        const item = localStorage.getItem(key);
        if (!item) return 0;
        const parsed = JSON.parse(item);
        return Array.isArray(parsed) ? parsed.length : 1;
      } catch (e) {
        return 0;
      }
    };

    let notesCount = 0;
    for (let key in localStorage) {
      if (key.startsWith('studentos_notes_') || key.startsWith('studentos_mat_notes_')) {
        notesCount++;
      }
    }

    return {
      courses: parseCount('studentos_courses'),
      tasks: parseCount('studentos_work_items') || parseCount('studentos_tasks'),
      exams: parseCount('studentos_exams'),
      materials: parseCount('studentos_materials'),
      notes: notesCount
    };
  }, []);

  // 1. Full State Snapshot Export (.json)
  const handleExportBackup = () => {
    try {
      const backupData = {
        meta: {
          app: 'StudentOS',
          version: '2.5.0',
          exportTimestamp: new Date().toISOString(),
          student: user?.name || 'Student'
        },
        payload: {}
      };

      // Collect all studentos_* keys
      for (let key in localStorage) {
        if (key.startsWith('studentos_')) {
          try {
            backupData.payload[key] = JSON.parse(localStorage.getItem(key));
          } catch (e) {
            backupData.payload[key] = localStorage.getItem(key);
          }
        }
      }

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateTag = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `studentos_backup_${dateTag}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupStatus({ type: 'success', message: 'Full workspace snapshot downloaded successfully!' });
      setTimeout(() => setBackupStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setBackupStatus({ type: 'error', message: 'Failed to create backup export.' });
    }
  };

  // 2. Full State Snapshot Restore (.json)
  const handleRestoreBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result;
        const parsed = JSON.parse(raw);

        if (!parsed || !parsed.payload || typeof parsed.payload !== 'object') {
          throw new Error('Invalid StudentOS backup schema.');
        }

        // Restore keys into localStorage
        Object.entries(parsed.payload).forEach(([key, val]) => {
          if (typeof val === 'object') {
            localStorage.setItem(key, JSON.stringify(val));
          } else {
            localStorage.setItem(key, String(val));
          }
        });

        // Broadcast global update events
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('studentos_courses_updated', { detail: parsed.payload['studentos_courses'] }));
        window.dispatchEvent(new CustomEvent('studentos_tasks_updated', { detail: parsed.payload['studentos_work_items'] }));
        window.dispatchEvent(new CustomEvent('studentos_cgpa_updated', { detail: parsed.payload['studentos_cgpa_data'] }));

        calculateStorage();
        setBackupStatus({ type: 'success', message: 'Backup successfully restored! Reloading fresh data...' });

        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (err) {
        console.error(err);
        setBackupStatus({ type: 'error', message: 'Invalid backup file or corrupted JSON format.' });
      }
    };

    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // 3. Selective or Factory Reset
  const handleExecuteReset = () => {
    if (!resetTarget) return;

    if (resetTarget === 'all') {
      const keysToDelete = [];
      for (let key in localStorage) {
        if (key.startsWith('studentos_')) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((k) => localStorage.removeItem(k));
    } else if (resetTarget === 'attendance') {
      try {
        const courses = JSON.parse(localStorage.getItem('studentos_courses') || '[]');
        const wiped = courses.map((c) => ({ ...c, attendanceLogs: [], attendance: { present: 0, total: 0 } }));
        localStorage.setItem('studentos_courses', JSON.stringify(wiped));
        window.dispatchEvent(new CustomEvent('studentos_courses_updated', { detail: wiped }));
      } catch (e) {}
    } else if (resetTarget === 'tasks') {
      localStorage.removeItem('studentos_work_items');
      localStorage.removeItem('studentos_tasks');
      window.dispatchEvent(new CustomEvent('studentos_tasks_updated', { detail: [] }));
    } else if (resetTarget === 'notes') {
      const noteKeys = [];
      for (let key in localStorage) {
        if (key.startsWith('studentos_notes_') || key.startsWith('studentos_mat_notes_')) {
          noteKeys.push(key);
        }
      }
      noteKeys.forEach((k) => localStorage.removeItem(k));
    } else if (resetTarget === 'materials') {
      localStorage.removeItem('studentos_materials');
    }

    calculateStorage();
    setShowResetModal(false);
    setBackupStatus({ type: 'success', message: 'Selected data successfully cleared.' });
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-blue-600" />
            <span>Workspace Settings & Data Engine</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage local data integrity, create timestamped backups, and configure workspace modules.
          </p>
        </div>

        {backupStatus && (
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 animate-in fade-in ${
            backupStatus.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {backupStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{backupStatus.message}</span>
          </div>
        )}
      </div>

      {/* 1. Storage Health & Module Snapshot Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">LOCAL STORAGE HEALTH</span>
            <HardDrive className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{storageUsage.usedKb} KB</span>
            <span className="text-xs text-slate-400 font-semibold">of ~{storageUsage.totalKb} KB allocated</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${storageUsage.pct}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">Browser localStorage quota is currently at {storageUsage.pct}%.</span>
        </div>

        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ACTIVE DATABASE ENTITIES</span>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Synchronized & Operational
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[9px] font-bold uppercase">COURSES</span>
              <strong className="text-slate-900 font-black text-sm">{datasetSummary.courses}</strong>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[9px] font-bold uppercase">TASKS</span>
              <strong className="text-slate-900 font-black text-sm">{datasetSummary.tasks}</strong>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[9px] font-bold uppercase">EXAMS</span>
              <strong className="text-slate-900 font-black text-sm">{datasetSummary.exams}</strong>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[9px] font-bold uppercase">FILES</span>
              <strong className="text-slate-900 font-black text-sm">{datasetSummary.materials}</strong>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[9px] font-bold uppercase">SCRATCHPADS</span>
              <strong className="text-slate-900 font-black text-sm">{datasetSummary.notes}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. One-Click Backup & Restore Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Export Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-slate-900">Create Full Workspace Backup</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Export all course records, attendance timestamps, study notes, uploaded material links, and custom simulator plans into a single timestamped <strong className="text-slate-700">.json</strong> file.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportBackup}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Download Backup (.json)</span>
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-slate-900">Restore From Backup</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Select a previously exported StudentOS JSON snapshot to restore all records instantly on this browser or another device.
            </p>
          </div>

          <label className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs">
            <Upload className="w-4 h-4" />
            <span>Choose Backup File to Restore</span>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 3. Selective Maintenance & Danger Zone */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-rose-600" />
              <span>Module Maintenance & Reset Controls</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Clear specific collections or restore your workspace to factory defaults.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <button
            type="button"
            onClick={() => { setResetTarget('attendance'); setShowResetModal(true); }}
            className="p-3.5 bg-slate-50 hover:bg-rose-50/50 border border-slate-200/80 hover:border-rose-200 rounded-xl text-left transition cursor-pointer group"
          >
            <span className="text-xs font-bold text-slate-800 group-hover:text-rose-700 block">Clear Attendance Logs</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Wipes check-ins while preserving enrolled courses.</span>
          </button>

          <button
            type="button"
            onClick={() => { setResetTarget('tasks'); setShowResetModal(true); }}
            className="p-3.5 bg-slate-50 hover:bg-rose-50/50 border border-slate-200/80 hover:border-rose-200 rounded-xl text-left transition cursor-pointer group"
          >
            <span className="text-xs font-bold text-slate-800 group-hover:text-rose-700 block">Clear Kanban Tasks</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Deletes all pending and completed coursework items.</span>
          </button>

          <button
            type="button"
            onClick={() => { setResetTarget('notes'); setShowResetModal(true); }}
            className="p-3.5 bg-slate-50 hover:bg-rose-50/50 border border-slate-200/80 hover:border-rose-200 rounded-xl text-left transition cursor-pointer group"
          >
            <span className="text-xs font-bold text-slate-800 group-hover:text-rose-700 block">Wipe Course Scratchpads</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Removes saved markdown lecture notes from workspaces.</span>
          </button>

          <button
            type="button"
            onClick={() => { setResetTarget('all'); setShowResetModal(true); }}
            className="p-3.5 bg-rose-50 hover:bg-rose-100/70 border border-rose-200 rounded-xl text-left transition cursor-pointer group"
          >
            <span className="text-xs font-black text-rose-700 block">Factory Reset Workspace</span>
            <span className="text-[11px] text-rose-500 block mt-0.5">Wipes all records and resets StudentOS to defaults.</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">Confirm Reset Action</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {resetTarget === 'all'
                  ? 'Are you sure you want to perform a full factory reset? All enrolled courses, attendance, routine slots, notes, and tasks will be erased.'
                  : `Are you sure you want to clear ${resetTarget}? This action cannot be undone unless you have a recent .json backup.`}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                Yes, Clear Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}