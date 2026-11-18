import { CourseFormV59 } from "@/components/admin/course-form-v59";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <CourseFormV59 id={id} />; }
