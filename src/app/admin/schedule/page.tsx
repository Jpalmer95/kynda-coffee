"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Calendar } from "lucide-react";

const STAFF = ["Maya", "Jordan", "Alex", "Sam", "Taylor"];

const DAYS = ["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16", "Sat 17", "Sun 18"];

export default function AdminSchedulePage() {
  const [shifts, setShifts] = useState<Record<string, Array<{ staff: string; start: string; end: string }>>>({
    "Mon 12": [{ staff: "Maya", start: "07:00", end: "15:00" }],
    "Wed 14": [{ staff: "Jordan", start: "09:00", end: "17:00" }],
  });
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);

  function addShift(staff: string, start: string, end: string) {
    setShifts((prev) => ({
      ...prev,
      [selectedDay]: [...(prev[selectedDay] || []), { staff, start, end }],
    }));
    setShowAdd(false);
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="rounded-lg p-2 hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
            <Calendar className="h-8 w-8 text-forest" /> Staff Schedule
          </h1>
          <p className="text-sm text-mocha">Week of May 12 – 18</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="ml-auto btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" /> Add Shift
        </button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-4">
        {DAYS.map((day) => (
          <div key={day} className="border border-latte/20 rounded-2xl bg-white p-4">
            <div className="font-medium text-sm text-espresso mb-3 flex items-center justify-between">
              {day}
              <button
                onClick={() => {
                  setSelectedDay(day);
                  setShowAdd(true);
                }}
                className="text-xs px-2 py-0.5 rounded bg-latte/10 hover:bg-latte/20"
              >
                + Shift
              </button>
            </div>

            {(shifts[day] || []).length === 0 && (
              <p className="text-xs text-mocha/60">No shifts scheduled</p>
            )}

            {(shifts[day] || []).map((shift, idx) => (
              <div key={idx} className="mb-2 rounded-lg border bg-cream px-3 py-2 text-sm">
                <div className="font-medium">{shift.staff}</div>
                <div className="font-mono text-xs text-mocha">
                  {shift.start} – {shift.end}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Add Shift Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-4">Add Shift • {selectedDay}</h3>
            <select
              className="select-field mb-3"
              onChange={(e) => setSelectedDay(e.target.value)}
              defaultValue={selectedDay}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <div className="space-y-3">
              {STAFF.map((name) => (
                <button
                  key={name}
                  onClick={() => addShift(name, "09:00", "17:00")}
                  className="w-full text-left px-4 py-2 border rounded-xl hover:bg-latte/10"
                >
                  {name} <span className="text-xs text-mocha">(9am – 5pm)</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowAdd(false)} className="mt-4 text-sm text-mocha">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
