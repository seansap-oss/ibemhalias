"use client";

import * as React from "react";
import {
  Activity,
  CheckCircle2,
  Gauge,
  Loader2,
  RefreshCw,
  Signal,
  Upload,
  Download,
  Wifi,
  WifiOff,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Grade = "green" | "amber" | "red" | "unknown";

type DiagnosticResult = {
  grade: Grade;
  latencyMs: number | null;
  jitterMs: number | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
  effectiveType: string | null;
  browserDownlink: number | null;
  browserRtt: number | null;
  online: boolean;
  testedAt: string | null;
};

type NetworkInformationLike = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  addEventListener?: (event: string, listener: () => void) => void;
  removeEventListener?: (event: string, listener: () => void) => void;
};

const EMPTY: DiagnosticResult = {
  grade: "unknown",
  latencyMs: null,
  jitterMs: null,
  downloadMbps: null,
  uploadMbps: null,
  effectiveType: null,
  browserDownlink: null,
  browserRtt: null,
  online: true,
  testedAt: null,
};

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function jitter(values: number[]) {
  if (values.length < 2) return 0;
  const diffs = values.slice(1).map((value, index) => Math.abs(value - values[index]));
  return diffs.reduce((sum, value) => sum + value, 0) / diffs.length;
}

function gradeNetwork(input: {
  latencyMs: number;
  jitterMs: number;
  downloadMbps: number;
  uploadMbps: number;
  online: boolean;
}): Grade {
  if (!input.online) return "red";

  if (
    input.downloadMbps < 3 ||
    input.uploadMbps < 1 ||
    input.latencyMs > 250 ||
    input.jitterMs > 80
  ) return "red";

  if (
    input.downloadMbps < 8 ||
    input.uploadMbps < 3 ||
    input.latencyMs > 120 ||
    input.jitterMs > 30
  ) return "amber";

  return "green";
}

function labelForGrade(grade: Grade) {
  if (grade === "green") return "GOOD FOR LIVE NOW";
  if (grade === "amber") return "USABLE — NETWORK MAY DEGRADE";
  if (grade === "red") return "NETWORK NOT READY";
  return "NOT TESTED";
}

function gradeClasses(grade: Grade) {
  if (grade === "green") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (grade === "amber") return "border-amber-200 bg-amber-50 text-amber-800";
  if (grade === "red") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function metricTone(value: number | null, good: (n: number) => boolean, warn: (n: number) => boolean) {
  if (value === null) return "text-slate-400";
  if (good(value)) return "text-emerald-600";
  if (warn(value)) return "text-amber-600";
  return "text-rose-600";
}

export default function NetworkCheckPage() {
  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState("");
  const [result, setResult] = React.useState<DiagnosticResult>(EMPTY);

  const readBrowserNetwork = React.useCallback(() => {
    const nav = navigator as Navigator & { connection?: NetworkInformationLike };
    const connection = nav.connection;
    setResult((old) => ({
      ...old,
      online: navigator.onLine,
      effectiveType: connection?.effectiveType || null,
      browserDownlink: typeof connection?.downlink === "number" ? connection.downlink : null,
      browserRtt: typeof connection?.rtt === "number" ? connection.rtt : null,
    }));
  }, []);

  React.useEffect(() => {
    readBrowserNetwork();
    const nav = navigator as Navigator & { connection?: NetworkInformationLike };
    const connection = nav.connection;
    const onChange = () => readBrowserNetwork();
    window.addEventListener("online", onChange);
    window.addEventListener("offline", onChange);
    connection?.addEventListener?.("change", onChange);
    return () => {
      window.removeEventListener("online", onChange);
      window.removeEventListener("offline", onChange);
      connection?.removeEventListener?.("change", onChange);
    };
  }, [readBrowserNetwork]);

  const runTest = React.useCallback(async () => {
    setRunning(true);
    setProgress("Checking latency…");

    try {
      const pingSamples: number[] = [];
      for (let index = 0; index < 6; index += 1) {
        const started = performance.now();
        const response = await fetch(`/api/network-check/ping?t=${Date.now()}-${index}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Latency check failed.");
        await response.text();
        pingSamples.push(performance.now() - started);
      }

      const latencyMs = median(pingSamples);
      const jitterMs = jitter(pingSamples);

      setProgress("Testing download speed…");
      const downloadStarted = performance.now();
      const downloadResponse = await fetch(`/api/network-check/download?size=2097152&t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!downloadResponse.ok) throw new Error("Download test failed.");
      const downloadBuffer = await downloadResponse.arrayBuffer();
      const downloadSeconds = Math.max((performance.now() - downloadStarted) / 1000, 0.001);
      const downloadMbps = (downloadBuffer.byteLength * 8) / downloadSeconds / 1_000_000;

      setProgress("Testing upload speed…");
      const uploadBytes = 512 * 1024;
      const uploadPayload = new Uint8Array(uploadBytes);
      crypto.getRandomValues(uploadPayload.subarray(0, Math.min(uploadPayload.length, 65536)));
      const uploadStarted = performance.now();
      const uploadResponse = await fetch(`/api/network-check/upload?t=${Date.now()}`, {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: uploadPayload,
        cache: "no-store",
      });
      if (!uploadResponse.ok) throw new Error("Upload test failed.");
      await uploadResponse.json();
      const uploadSeconds = Math.max((performance.now() - uploadStarted) / 1000, 0.001);
      const uploadMbps = (uploadBytes * 8) / uploadSeconds / 1_000_000;

      const nav = navigator as Navigator & { connection?: NetworkInformationLike };
      const connection = nav.connection;
      const online = navigator.onLine;

      setResult({
        grade: gradeNetwork({ latencyMs, jitterMs, downloadMbps, uploadMbps, online }),
        latencyMs,
        jitterMs,
        downloadMbps,
        uploadMbps,
        effectiveType: connection?.effectiveType || null,
        browserDownlink: typeof connection?.downlink === "number" ? connection.downlink : null,
        browserRtt: typeof connection?.rtt === "number" ? connection.rtt : null,
        online,
        testedAt: new Date().toISOString(),
      });
      setProgress("Complete");
    } catch (error) {
      console.warn("Network diagnostic failed", error);
      setResult((old) => ({ ...old, grade: "red", online: navigator.onLine, testedAt: new Date().toISOString() }));
      setProgress(error instanceof Error ? error.message : "Network diagnostic failed.");
    } finally {
      setRunning(false);
    }
  }, []);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            <Wifi className="h-3.5 w-3.5" />
            Network Connection
          </div>
          <h1 className="text-2xl font-black text-slate-950">Live Now Network Check</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Tests this browser&apos;s connection to the Ibemhal IAS website. Use it before a live class to separate local internet problems from website problems.
          </p>
        </div>
        <Button onClick={runTest} disabled={running} className="min-w-44">
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {running ? "Testing…" : "Run Network Test"}
        </Button>
      </div>

      <div className={`rounded-2xl border p-5 ${gradeClasses(result.grade)}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
              {result.online ? <Signal className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
            </div>
            <div>
              <div className="text-lg font-black">{labelForGrade(result.grade)}</div>
              <div className="text-xs font-semibold opacity-80">
                {running ? progress : result.testedAt ? `Last tested ${new Date(result.testedAt).toLocaleString()}` : "Run the test before starting a class."}
              </div>
            </div>
          </div>
          <div className="text-xs font-bold">
            {result.grade === "green" ? "Green = ready" : result.grade === "amber" ? "Amber = usable with caution" : result.grade === "red" ? "Red = fix the network first" : "Awaiting test"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <Gauge className="mb-3 h-5 w-5 text-slate-400" />
            <div className={`text-2xl font-black ${metricTone(result.latencyMs, n => n < 120, n => n <= 250)}`}>
              {result.latencyMs === null ? "—" : `${result.latencyMs.toFixed(0)} ms`}
            </div>
            <p className="text-xs text-slate-500">Latency</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Activity className="mb-3 h-5 w-5 text-slate-400" />
            <div className={`text-2xl font-black ${metricTone(result.jitterMs, n => n < 30, n => n <= 80)}`}>
              {result.jitterMs === null ? "—" : `${result.jitterMs.toFixed(0)} ms`}
            </div>
            <p className="text-xs text-slate-500">Jitter</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Download className="mb-3 h-5 w-5 text-slate-400" />
            <div className={`text-2xl font-black ${metricTone(result.downloadMbps, n => n >= 8, n => n >= 3)}`}>
              {result.downloadMbps === null ? "—" : `${result.downloadMbps.toFixed(1)} Mbps`}
            </div>
            <p className="text-xs text-slate-500">Download</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Upload className="mb-3 h-5 w-5 text-slate-400" />
            <div className={`text-2xl font-black ${metricTone(result.uploadMbps, n => n >= 3, n => n >= 1)}`}>
              {result.uploadMbps === null ? "—" : `${result.uploadMbps.toFixed(1)} Mbps`}
            </div>
            <p className="text-xs text-slate-500">Upload</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Live Now readiness guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="font-black text-emerald-800">GREEN — recommended</div>
              <div className="mt-1 text-emerald-700">8+ Mbps download, 3+ Mbps upload, latency below 120 ms, jitter below 30 ms.</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="font-black text-amber-800">AMBER — class can continue</div>
              <div className="mt-1 text-amber-700">3–8 Mbps download, 1–3 Mbps upload, or moderate latency/jitter. Video quality may reduce automatically.</div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="font-black text-rose-800">RED — fix network first</div>
              <div className="mt-1 text-rose-700">Below 3 Mbps download, below 1 Mbps upload, latency above 250 ms, or very unstable jitter.</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              What this test proves
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p><strong>Website path:</strong> latency, upload and download are measured between this browser and Ibemhal IAS.</p>
            <p><strong>Live classroom:</strong> once inside Live Now, the classroom also shows LiveKit&apos;s own participant connection-quality indicator.</p>
            <p><strong>Diagnosis:</strong> a red result means the local network should be corrected before reporting a website fault.</p>
            <p><strong>Not an ISP guarantee:</strong> speed can change during a class, especially on mobile data or congested Wi-Fi.</p>
            <div className="rounded-xl bg-slate-50 p-4 text-xs">
              Browser network: {result.online ? "Online" : "Offline"}
              {result.effectiveType ? ` · ${result.effectiveType}` : ""}
              {result.browserRtt !== null ? ` · browser RTT ${result.browserRtt} ms` : ""}
              {result.browserDownlink !== null ? ` · browser estimate ${result.browserDownlink} Mbps` : ""}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
