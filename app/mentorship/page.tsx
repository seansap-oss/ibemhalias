"use client";

import * as React from "react";
import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { CalendarDays, Clock3, MessagesSquare } from "lucide-react";

const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const timeSlots = ["9.30-10.30", "10.30-11.00"];

export default function Page() {
  const [day, setDay] = React.useState("MONDAY");
  const [time, setTime] = React.useState("");

  return (
    <PortalPageShell
      eyebrow="A5"
      title="Mentorship / Counselling / Slot Booking"
      description="Select the required day and TIME SLOT."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.618fr]">
        <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <CalendarDays className="h-5 w-5 text-indigo-600" />
            DAY
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {days.map((item) => (
              <button
                key={item}
                onClick={() => setDay(item)}
                className={[
                  "min-h-12 rounded-xl border px-3 text-xs font-black",
                  day === item
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-700",
                ].join(" ")}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <Clock3 className="h-5 w-5 text-indigo-600" />
            TIME SLOT
          </div>
          <div className="mt-4 space-y-3">
            {timeSlots.map((slot) => (
              <button
                key={slot}
                onClick={() => setTime(slot)}
                className={[
                  "flex min-h-14 w-full items-center justify-between rounded-xl border px-4 text-sm font-black",
                  time === slot
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-700",
                ].join(" ")}
              >
                {slot}
                <span className="text-xs">{time === slot ? "Selected" : "Book"}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
              Booking Summary
            </div>
            <div className="mt-3 text-sm text-slate-700"><strong>Day:</strong> {day}</div>
            <div className="mt-1 text-sm text-slate-700"><strong>Time:</strong> {time || "Select a time slot"}</div>
          </div>

          <button
            disabled={!time}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white disabled:opacity-40"
          >
            <MessagesSquare className="h-4 w-4" />
            Continue
          </button>
        </div>
      </div>
    </PortalPageShell>
  );
}
