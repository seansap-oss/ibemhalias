import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server-session";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";
import { CMS_SECTIONS } from "@/lib/cms/sections";
import { cleanDisplayObject } from "@/lib/text/clean-display-text";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;
const BUCKET = "cms-content";
const MATERIAL_PREFIXES = ["/resources", "/current-affairs", "/student-space", "/courses"];

function isMaterialPath(path: string) {
  return MATERIAL_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function courseMap<T extends AnyRow>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

async function signedUrl(client: any, storagePath: string | null) {
  if (!storagePath) return null;
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60);
  if (error) return null;
  return data?.signedUrl || null;
}

function premiumAllowed(item: AnyRow, profile: AnyRow, flags: Record<string, boolean>, enrolledCourseIds: Set<string>) {
  if (item.access_level !== "premium") return true;
  if (profile.tier === "all-access") return true;
  if (item.course_id && !enrolledCourseIds.has(item.course_id)) return false;
  const key = String(item.access_key || "general_premium");
  if (key === "general_premium") {
    return ["premium", "foundation", "prelims", "mains", "optional"].includes(String(profile.tier || "free"));
  }
  return flags[key] === true;
}

export async function GET() {
  try {
    const session = await createSessionClient();
    const { data: authData } = await session.auth.getUser();
    const user = authData.user;
    if (!user) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

    const service = createCmsServiceClient();

    const [{ data: profile, error: profileError }, { data: enrollments, error: enrollmentError }, { data: prefs }] = await Promise.all([
      service.from("profiles").select("id,email,full_name,phone,student_code,tier,avatar_url,created_at").eq("id", user.id).single(),
      service.from("enrollments").select("course_id,enrolled_at").eq("user_id", user.id),
      service.from("student_access_preferences").select("material_flags,reminder_day_before,reminder_hour_before").eq("student_id", user.id).maybeSingle(),
    ]);

    if (profileError) throw profileError;
    if (enrollmentError) throw enrollmentError;

    const courseIds = (enrollments || []).map((row: AnyRow) => row.course_id).filter(Boolean);
    const enrolledCourseIds = new Set<string>(courseIds);

    const [{ data: courses }, { data: assignments }, { data: materialRows }, { data: materialProgress }] = await Promise.all([
      courseIds.length
        ? service.from("courses").select("id,title,slug,description,thumbnail_url,category,level,is_published").in("id", courseIds).order("title")
        : Promise.resolve({ data: [], error: null }),
      service.from("live_class_assignments").select("live_class_id,status").eq("student_id", user.id).eq("status", "active"),
      service.from("cms_content").select("id,section_path,title,description,media_type,mime_type,file_name,file_size,storage_path,external_url,thumbnail_path,date_label,month_label,sort_order,is_published,access_level,access_key,course_id,created_at,updated_at").eq("is_published", true).order("created_at", { ascending: false }).limit(250),
      service.from("student_material_progress").select("content_id,progress_percent,completed,bookmarked,last_opened_at,study_seconds,updated_at").eq("user_id", user.id),
    ]);

    const assignmentIds = (assignments || []).map((row: AnyRow) => row.live_class_id).filter(Boolean);
    const { data: liveClasses } = assignmentIds.length
      ? await service.from("live_classes").select("id,title,topic,faculty_name,starts_at,ends_at,status,join_url,recording_url,created_at").in("id", assignmentIds).order("starts_at")
      : { data: [] };

    const courseRows = courses || [];
    const courseById = courseMap(courseRows);
    const enrollmentByCourse = new Map((enrollments || []).map((row: AnyRow) => [row.course_id, row]));

    const { data: modules } = courseIds.length
      ? await service.from("modules").select("id,course_id").in("course_id", courseIds)
      : { data: [] };
    const moduleIds = (modules || []).map((row: AnyRow) => row.id);
    const { data: lessons } = moduleIds.length
      ? await service.from("lessons").select("id,module_id,title,duration_seconds").in("module_id", moduleIds)
      : { data: [] };
    const lessonIds = (lessons || []).map((row: AnyRow) => row.id);
    const { data: lessonProgress } = lessonIds.length
      ? await service.from("lesson_progress").select("lesson_id,completed,watched_seconds,updated_at").eq("user_id", user.id).in("lesson_id", lessonIds)
      : { data: [] };

    const moduleCourse = new Map((modules || []).map((row: AnyRow) => [row.id, row.course_id]));
    const progressByLesson = new Map((lessonProgress || []).map((row: AnyRow) => [row.lesson_id, row]));

    const courseStats = new Map<string, { total: number; completed: number }>();
    for (const lesson of lessons || []) {
      const courseId = moduleCourse.get(lesson.module_id);
      if (!courseId) continue;
      const current = courseStats.get(courseId) || { total: 0, completed: 0 };
      current.total += 1;
      if (progressByLesson.get(lesson.id)?.completed) current.completed += 1;
      courseStats.set(courseId, current);
    }

    const enrichedCourses = courseRows.map((course: AnyRow) => {
      const stat = courseStats.get(course.id) || { total: 0, completed: 0 };
      return {
        ...course,
        enrolledAt: enrollmentByCourse.get(course.id)?.enrolled_at || null,
        lessonCount: stat.total,
        completedLessons: stat.completed,
        progressPercent: stat.total ? Math.round((stat.completed / stat.total) * 100) : 0,
      };
    });

    const materialProgressMap = new Map((materialProgress || []).map((row: AnyRow) => [row.content_id, row]));
    const sectionLabels = new Map(CMS_SECTIONS.map((section) => [section.path, section.label]));
    const flags = prefs?.material_flags && typeof prefs.material_flags === "object" ? prefs.material_flags : {};

    const materials: AnyRow[] = [];
    for (const item of materialRows || []) {
      if (!isMaterialPath(item.section_path)) continue;
      const allowed = premiumAllowed(item, profile, flags, enrolledCourseIds);
      let mediaUrl: string | null = null;
      let thumbnailUrl: string | null = null;

      if (allowed) {
        mediaUrl = item.storage_path ? await signedUrl(service, item.storage_path) : item.external_url || null;
        thumbnailUrl = item.thumbnail_path ? await signedUrl(service, item.thumbnail_path) : null;
      }

      materials.push({
        ...item,
        external_url: allowed ? item.external_url : null,
        storage_path: allowed ? item.storage_path : null,
        thumbnail_path: allowed ? item.thumbnail_path : null,
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        locked: !allowed,
        lock_reason: allowed ? null : "premium_access_required",
        course_title: item.course_id ? courseById.get(item.course_id)?.title || null : null,
        section_label: sectionLabels.get(item.section_path) || item.section_path,
        progress: materialProgressMap.get(item.id) || {
          progress_percent: 0,
          completed: false,
          bookmarked: false,
          last_opened_at: null,
          study_seconds: 0,
        },
      });
    }

    const activityDates = new Set<string>();
    for (const row of lessonProgress || []) if (row.updated_at) activityDates.add(new Date(row.updated_at).toISOString().slice(0, 10));
    for (const row of materialProgress || []) if (row.last_opened_at) activityDates.add(new Date(row.last_opened_at).toISOString().slice(0, 10));
    const today = new Date().toISOString().slice(0, 10);
    const studyStreak = activityDates.has(today) ? 1 : 0;

    const announcements: AnyRow[] = [];
    for (const liveClass of (liveClasses || []).slice(0, 5)) {
      announcements.push({
        id: `class-${liveClass.id}`,
        title: `${liveClass.status === "live" ? "Live now" : "Live class"}: ${liveClass.title}${liveClass.topic ? ` — ${liveClass.topic}` : ""}`,
        date: liveClass.starts_at || liveClass.created_at,
        type: "live_class",
      });
    }
    for (const material of materials.slice(0, 5)) {
      announcements.push({
        id: `material-${material.id}`,
        title: `${material.access_level === "premium" ? "Premium" : "New"} study material: ${material.title}`,
        date: material.created_at,
        type: "material",
      });
    }
    announcements.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    const responseData = cleanDisplayObject({
      profile,
      courses: enrichedCourses,
      liveClasses: liveClasses || [],
      materials,
      announcements: announcements.slice(0, 12),
      stats: {
        enrolledCourses: enrichedCourses.length,
        liveClasses: (liveClasses || []).filter((item: AnyRow) => item.status !== "cancelled").length,
        studyMaterials: materials.filter((item) => !item.locked).length,
        studyStreak,
      },
    });

    return NextResponse.json({ ok: true, data: responseData });
  } catch (error: any) {
    console.error("Student dashboard error:", error);
    return NextResponse.json({ ok: false, error: error?.message || "Unable to load student dashboard." }, { status: 500 });
  }
}
