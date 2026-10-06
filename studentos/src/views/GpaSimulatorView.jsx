import React, { useState, useMemo, useEffect } from 'react';
import { 
  GraduationCap, 
  Sliders, 
  Target, 
  TrendingUp, 
  Award,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const GRADE_POINTS = {
  'A+': 4.00,
  'A': 3.75,
  'A-': 3.50,
  'B+': 3.25,
  'B': 3.00,
  'C+': 2.50,
  'D': 2.00,
  'F': 0.00
};

export default function GpaSimulatorView({ courses = [] }) {
  const [completedCredits, setCompletedCredits] = useState(() => {
    const saved = localStorage.getItem('studentos_cgpa_data');
    if (saved) {
      try { return JSON.parse(saved).completedCredits ?? 18; } catch (e) {}
    }
    return 18;
  });

  const [currentCgpa, setCurrentCgpa] = useState(() => {
    const saved = localStorage.getItem('studentos_cgpa_data');
    if (saved) {
      try { return JSON.parse(saved).currentCgpa ?? 3.62; } catch (e) {}
    }
    return 3.62;
  });

  const [targetCgpa, setTargetCgpa] = useState(() => {
    const saved = localStorage.getItem('studentos_cgpa_data');
    if (saved) {
      try { return JSON.parse(saved).targetCgpa ?? 3.80; } catch (e) {}
    }
    return 3.80;
  });

  const [remainingCredits, setRemainingCredits] = useState(130);

  const [simulatedGrades, setSimulatedGrades] = useState(() => {
    if (courses && courses.length > 0) {
      const initial = {};
      courses.forEach((c) => {
        initial[c.id || c.code] = {
          code: c.code,
          name: c.name,
          credits: Number(c.credits) || 3,
          grade: 'A'
        };
      });
      return initial;
    }
    return {
      c1: { code: 'CSE 101', name: 'C Programming', credits: 3.0, grade: 'A' },
      c2: { code: 'MATH 101', name: 'Mathematics', credits: 3.0, grade: 'A-' },
      c3: { code: 'SE 101', name: 'Software Engineering', credits: 3.0, grade: 'A' },
      c4: { code: 'ENG 101', name: 'English', credits: 3.0, grade: 'B+' },
    };
  });

  useEffect(() => {
    const payload = {
      currentCgpa: Number(currentCgpa),
      targetCgpa: Number(targetCgpa),
      completedCredits: Number(completedCredits),
      remainingCredits: Number(remainingCredits)
    };
    localStorage.setItem('studentos_cgpa_data', JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('studentos_cgpa_updated', { detail: payload }));
  }, [currentCgpa, targetCgpa, completedCredits, remainingCredits]);

  const projection = useMemo(() => {
    const currentTotalPoints = completedCredits * currentCgpa;
    let semesterCredits = 0;
    let semesterPoints = 0;

    Object.values(simulatedGrades).forEach((item) => {
      const pts = (GRADE_POINTS[item.grade] ?? 0) * item.credits;
      semesterCredits += item.credits;
      semesterPoints += pts;
    });

    const semesterGpa = semesterCredits > 0 ? semesterPoints / semesterCredits : 0;
    const newTotalCredits = completedCredits + semesterCredits;
    const projected = newTotalCredits > 0 ? (currentTotalPoints + semesterPoints) / newTotalCredits : currentCgpa;

    const totalDegreeCredits = completedCredits + remainingCredits;
    const requiredTotalPoints = targetCgpa * totalDegreeCredits;
    const pointsNeeded = requiredTotalPoints - currentTotalPoints;
    const neededAverageGpa = remainingCredits > 0 ? pointsNeeded / remainingCredits : 0;
    const isFeasible = neededAverageGpa <= 4.00;

    return {
      semesterCredits,
      semesterGpa: semesterGpa.toFixed(2),
      projectedCgpa: projected.toFixed(2),
      cgpaShift: (projected - currentCgpa).toFixed(2),
      targetGap: (targetCgpa - projected).toFixed(2),
      neededAverageGpa: Math.min(4.00, Math.max(0, neededAverageGpa)).toFixed(2),
      rawNeededGpa: neededAverageGpa.toFixed(2),
      isFeasible
    };
  }, [completedCredits, currentCgpa, targetCgpa, remainingCredits, simulatedGrades]);

  // Compute individual course impact
  const getCourseDelta = (item) => {
    const gradePts = GRADE_POINTS[item.grade] ?? 0;
    const newTotalCredits = completedCredits + projection.semesterCredits;
    if (newTotalCredits === 0) return '0.00';
    const delta = (gradePts - currentCgpa) * (item.credits / newTotalCredits);
    return delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-blue-600" />
          CGPA Forecaster & Target Planner
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Credit-weighted mathematical modeling for semester predictions and graduation honors.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Baseline Configuration */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            Degree Baseline
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Current Cumulative GPA</label>
            <input
              type="number"
              step="0.01"
              value={currentCgpa}
              onChange={(e) => setCurrentCgpa(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Completed Credits</label>
            <input
              type="number"
              value={completedCredits}
              onChange={(e) => setCompletedCredits(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Target CGPA Goal</span>
              <span className="text-blue-600 font-extrabold">{targetCgpa.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="2.50"
              max="4.00"
              step="0.05"
              value={targetCgpa}
              onChange={(e) => setTargetCgpa(parseFloat(e.target.value) || 3.0)}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remaining Degree Credits</label>
            <input
              type="number"
              value={remainingCredits}
              onChange={(e) => setRemainingCredits(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Center Column: Course Grades & Shift Deliberation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              Semester Course Grades
            </h3>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              SGPA: {projection.semesterGpa}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {Object.entries(simulatedGrades).map(([key, item]) => {
              const delta = getCourseDelta(item);
              const isPositive = delta.startsWith('+');

              return (
                <div 
                  key={key} 
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{item.code}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded flex items-center gap-0.5 ${
                        isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {isPositive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                        {delta}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {item.credits} Credits • {item.name || ''}
                    </span>
                  </div>

                  <select
                    value={item.grade}
                    onChange={(e) => {
                      const nextGrade = e.target.value;
                      setSimulatedGrades((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], grade: nextGrade }
                      }));
                    }}
                    className="px-2 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {Object.keys(GRADE_POINTS).map((g) => (
                      <option key={g} value={g}>
                        {g} ({GRADE_POINTS[g].toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Projection Engine */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider block">
              Projection Engine
            </span>
            <div className="text-4xl font-black mt-2 tracking-tight">
              {projection.projectedCgpa}
            </div>
            <p className="text-xs text-slate-300 mt-1">Projected Cumulative GPA after this semester.</p>

            <div className="mt-6 pt-6 border-t border-slate-800 space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Target Goal:</span>
                <span className="font-extrabold text-white text-sm">{targetCgpa.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Target Gap:</span>
                <span className={`font-bold ${parseFloat(projection.targetGap) <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {parseFloat(projection.targetGap) <= 0 ? 'Goal Met! 🎉' : `${projection.targetGap} points`}
                </span>
              </div>

              {projection.isFeasible ? (
                <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Target Attainable</span>
                  </div>
                  <p className="text-[11px] text-slate-200 leading-relaxed">
                    Maintain an average of{' '}
                    <strong className="text-emerald-300 font-bold">{projection.neededAverageGpa} GPA</strong> across your remaining{' '}
                    {remainingCredits} degree credits.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-rose-500/15 rounded-xl border border-rose-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Target Mathematically Out of Reach</span>
                  </div>
                  <p className="text-[11px] text-rose-200 leading-relaxed">
                    Needs an average of <strong className="text-white font-bold">{projection.rawNeededGpa} GPA</strong>, which exceeds the 4.00 maximum ceiling.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Semester Credits: {projection.semesterCredits}</span>
            <span className="text-blue-300 font-bold">
              Shift: {projection.cgpaShift > 0 ? `+${projection.cgpaShift}` : projection.cgpaShift} pts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}