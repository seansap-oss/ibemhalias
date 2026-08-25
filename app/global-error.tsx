"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Arial, sans-serif",
            padding: "24px",
            background: "#f8fafc",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "520px" }}>
            <div
              style={{
                fontSize: "64px",
                fontWeight: 700,
                color: "#14256f",
              }}
            >
              500
            </div>

            <h1>Something went wrong</h1>

            <p>
              Ibemhal IAS encountered an unexpected error.
            </p>

            <button
              onClick={() => reset()}
              style={{
                marginTop: "16px",
                padding: "12px 20px",
                border: 0,
                borderRadius: "8px",
                cursor: "pointer",
                background: "#14256f",
                color: "white",
                fontWeight: 600,
              }}
            >
              Try Again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
