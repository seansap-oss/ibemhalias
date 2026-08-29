"use client";
import { useParams } from "next/navigation";
import { LiveTeleclassRoom } from "@/components/live-class/live-teleclass-room";
export default function Page() { const params = useParams(); return <LiveTeleclassRoom classId={String(params.classId || "")} mode="teacher" />; }
