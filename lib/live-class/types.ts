export type LiveAdminView =
  | "overview"
  | "schedule"
  | "students"
  | "classrooms"
  | "reminders"
  | "attendance"
  | "packages";

export type LiveClassStatus = "scheduled" | "live" | "completed" | "cancelled";

export type LiveClassRow = {
  id: string;
  title: string;
  topic: string;
  faculty_name: string;
  starts_at: string;
  ends_at?: string | null;
  status: LiveClassStatus;
  capacity: number;
  room_id?: string | null;
  room_name?: string | null;
  assigned_count?: number;
  package_names?: string[];
  recording_url?: string | null;
  join_url?: string | null;
};

export type StudentSummary = {
  id: string;
  student_code: string;
  full_name: string;
  email: string;
  phone?: string | null;
  whatsapp_opt_in?: boolean;
  tier?: string;
  package_names: string[];
  assigned_count: number;
};
