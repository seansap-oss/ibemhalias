"use client";

import * as React from "react";
import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { CalendarDays, Clock3, MessageSquareText, UserRoundCheck } from "lucide-react";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const slots = ["09:30 - 10:30", "10:30 - 11:00", "11:30 - 12:30", "02:00 - 03:00", "03:00 - 04:00"];

export default function MentorshipPage() {
  const [day, setDay] = React.useState("Monday");
  const [slot, setSlot] = React.useState("");

  return (
    <PortalPageShell
      eyebrow="A5"
      title="Mentorship / Counselling / Slot Booking"
      description="Choose a day and available time slot for mentorship or counselling."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <CalendarDays className="h-5 w-5 text-indigo-600" />
            Select Day
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {days.map((item) => (
              <button
                key={item}
                onClick={() => setDay(item)}
                className={[
                  "min-h-12 rounded-xl border px-3 text-xs font-black",
                  day === item ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700",
                ].join(" ")}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm font-black text-slate-900">
            <Clock3 className="h-5 w-5 text-indigo-600" />
            Time Slot
          </div>
          <div className="mt-3 space-y-2">
            {slots.map((item) => (
              <button
                key={item}
                onClick={() => setSlot(item)}
                className={[
                  "flex min-h-12 w-full items-center justify-between rounded-xl border px-4 text-sm font-black",
                  slot === item ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-700",
                ].join(" ")}
              >
                {item}
                <span className="text-xs">{slot === item ? "Selected" : "Choose"}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <UserRoundCheck className="h-8 w-8 text-indigo-600" />
          <h2 className="mt-4 text-2xl font-black text-slate-950">Your Booking</h2>
          <div className="mt-5 space-y-3 rounded-2xl bg-white p-4">
            <div className="text-sm"><span className="font-black">Day:</span> {day}</div>
            <div className="text-sm"><span className="font-black">Time:</span> {slot || "Select a time slot"}</div>
            <div className="text-sm"><span className="font-black">Service:</span> Mentorship / Counselling</div>
          </div>
          <button
            disabled={!slot}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MessageSquareText className="h-4 w-4" />
            Continue Booking
          </button>
        </div>
      </div>
    </PortalPageShell>
  );
}
