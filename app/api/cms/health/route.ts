import { NextResponse } from "next/server";
import { createCmsServiceClient } from "@/lib/supabase/cms-server";

export async function GET() {
  try {
    const supabase = createCmsServiceClient();

    const { data, error } = await supabase
      .from("cms_content")
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          database: "error",
          error: error.message,
          code: error.code || null,
          details: error.details || null,
          hint: error.hint || null,
        },
        { status: 500 }
      );
    }

    const { data: buckets, error: bucketError } =
      await supabase.storage.listBuckets();

    if (bucketError) {
      return NextResponse.json(
        {
          ok: false,
          database: "ok",
          storage: "error",
          error: bucketError.message,
        },
        { status: 500 }
      );
    }

    const cmsBucket = buckets?.find(
      (bucket) => bucket.id === "cms-content"
    );

    return NextResponse.json({
      ok: true,
      database: "ok",
      storage: cmsBucket ? "ok" : "missing",
      bucket: cmsBucket
        ? {
            id: cmsBucket.id,
            name: cmsBucket.name,
            public: cmsBucket.public,
          }
        : null,
      rows_checked: data?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "CMS health check failed",
      },
      { status: 500 }
    );
  }
}
