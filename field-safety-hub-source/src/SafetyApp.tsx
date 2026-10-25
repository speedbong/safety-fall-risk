"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { api, photoUrl } from "./api";
import {
  HardHat,
  LayoutDashboard,
  Map,
  ClipboardCheck,
  Plus,
  UserRound,
  MapPin,
  Camera,
  ChevronRight,
  RefreshCw,
  Download,
  TriangleAlert,
  CheckCircle2,
  Clock,
  Building2,
  LogOut,
  Settings,
  Trash2,
  X,
  History,
  ShieldCheck,
  ScanLine,
  Bell,
  Check,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  layout,
  floors,
  prefixes,
  hazards,
  statuses,
  sites,
  Report,
} from "./data";
type View = "home" | "report" | "map" | "reports" | "settings" | "access";
type Log = { id: string; kind: string; created_at: string };
const date = (s: string) =>
  new Date(s).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const longDate = (s: string) =>
  new Date(s).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
const color = (n: number) =>
  n === 0 ? "#e4edf0" : n === 1 ? "#f9d874" : n === 2 ? "#f6a45f" : "#e85e57";
function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="choice" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Badge({ status }: { status: string }) {
  return (
    <span className={"badge status-" + statuses.indexOf(status)}>
      {status === "완료" && <Check size={12} />} {status}
    </span>
  );
}
function FloorMap({
  floor,
  counts,
  selected,
  onSelect,
  compact = false,
}: {
  floor: string;
  counts: Record<string, number>;
  selected: string;
  onSelect: (s: string) => void;
  compact?: boolean;
}) {
  const p = prefixes[floors.indexOf(floor)];
  return (
    <div className={"map-wrap " + (compact ? "compact" : "")}>
      <div className="map-heading">
        <span>
          <MapPin size={16} /> {floor.replace("F", "층")} 구역 배치도
        </span>
        <span className="fine">34개 구역</span>
      </div>
      <div className="map-scroll">
        <div className="map-canvas">
          <div className="map-coordinate">기존 구역 배치 · 수동 위치 선택</div>
          {layout.map((l, i) => {
            const sector = p + "-" + (i + 1),
              n = counts[sector] || 0;
            return (
              <button
                key={sector}
                type="button"
                aria-label={sector + (compact ? " 선택" : " 신고 " + n + "건")}
                aria-pressed={selected === sector}
                className={
                  "map-cell " +
                  (selected === sector ? "selected" : "") +
                  (l.w < 0.056 ? " narrow" : "")
                }
                onClick={() => onSelect(sector)}
                style={{
                  left: l.x * 100 + "%",
                  top: l.y * 100 + "%",
                  width: l.w * 100 + "%",
                  height: l.h * 100 + "%",
                  background: compact
                    ? selected === sector
                      ? "#2c625a"
                      : "#e7eeed"
                    : color(n),
                }}
              >
                <span>{sector}</span>
                {!compact && n > 0 && <b>{n}</b>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="map-caption">
        실제 치수 도면이 아닌 구역 배치도입니다. 휴대폰에서는 좌우로 이동할 수
        있습니다.
      </div>
    </div>
  );
}
function PhotoPicker({
  value,
  onChange,
  onError,
  onBusy,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  onError: (s: string) => void;
  onBusy: (v: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  async function upload(files: FileList | null) {
    if (!files) return;
    if (value.length + files.length > 3) {
      onError("사진은 최대 3장까지 등록할 수 있습니다.");
      return;
    }
    setLoading(true);
    onBusy(true);
    const result = [...value];
    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024)
          throw Error("사진은 5MB 이하로 선택해 주세요.");
        const d = await api.upload(file);
        result.push(d.id);
        onChange([...result]);
      }
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setLoading(false);
      onBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  return (
    <div>
      <div className="photos">
        {value.map((id, i) => (
          <div className="photo" key={id}>
            <a href={photoUrl(id)} target="_blank" rel="noreferrer">
              <img src={photoUrl(id)} alt={"첨부 사진 " + (i + 1)} />
            </a>
            <button
              type="button"
              aria-label={"사진 " + (i + 1) + " 제거"}
              disabled={loading}
              onClick={() => onChange(value.filter((x) => x !== id))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
        {value.length < 3 && (
          <Button
            type="button"
            variant="outline"
            className="photo-add"
            disabled={loading}
            onClick={() => fileRef.current?.click()}
          >
            <Camera />
            {loading ? "사진 저장 중…" : "사진 추가"}
          </Button>
        )}
      </div>
      <input
        ref={fileRef}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => upload(e.target.files)}
      />
      <p className="fine">최대 3장 · 장당 5MB · JPG, PNG, WEBP</p>
      {loading && <p role="status">사진 저장이 끝난 뒤 제출해 주세요.</p>}
    </div>
  );
}
export default function SafetyApp({
  user, onSignOut,
}: {
  user: { name: string; email: string };
  onSignOut: () => void;
}) {
  const [siteId, setSiteId] = useState("");
  const [mode, setMode] = useState("worker");
  const [view, setView] = useState<View>("home");
  const [reports, setReports] = useState<Report[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [name, setName] = useState(user.name);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState("");
  const [floor, setFloor] = useState("6F");
  const [type, setType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [sectorFilter, setSectorFilter] = useState("");
  const [dataFilter, setDataFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState("");
  const [photoModal, setPhotoModal] = useState("");
  const [clearOpen, setClearOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [qr, setQr] = useState("");
  const [qrData, setQrData] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [nameDraft, setNameDraft] = useState(user.name);
  const requestId = useRef("");
  const siteCurrent = useRef("");
  const busyRef = useRef(false);
  const dirtyRef = useRef(false);
  const activeRef = useRef("");
  const [draft, setDraft] = useState({
    floor: "6F",
    sector: "",
    hazard: "",
    detail: "",
    priority: "일반",
    photos: [] as string[],
  });
  const [edit, setEdit] = useState({
    status: "접수",
    assignee: "",
    note: "",
    resolutionPhotos: [] as string[],
  });
  const active = reports.find((r) => r.id === activeId);
  activeRef.current = activeId;
  useEffect(() => {
    const s = localStorage.getItem("fsh-v2-site-" + api.userId);
    const m = localStorage.getItem("fsh-v2-view-" + api.userId);
    if (sites.some((x) => x.id === s)) {
      siteCurrent.current = s!;
      setSiteId(s!);
    }
    if (m === "manager") setMode(m);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").catch(() => {});
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const load = useCallback(async (s: string, quiet = false) => {
    try {
      const d = await api.load(s);
      if (siteCurrent.current !== s) return;
      setReports(d.reports);
      setLogs(d.logs);
      setName(d.profile);
      if (!quiet) setNameDraft(d.profile);
      setLoaded(true);
      setLastSync(new Date().toISOString());
      if (!quiet) setError("");
    } catch (e) {
      if (siteCurrent.current === s) setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (!siteId) return;
    siteCurrent.current = siteId;
    setLoaded(false);
    setReports([]);
    setLogs([]);
    load(siteId);
    const timer = setInterval(() => {
      if (!busyRef.current && !dirtyRef.current) load(siteId, true);
    }, 15000);
    return () => clearInterval(timer);
  }, [siteId, load]);
  useEffect(() => {
    if (!active || dirtyRef.current) return;
    setEdit({
      status: active.status,
      assignee: active.assignee,
      note: active.resolutionNote,
      resolutionPhotos: active.resolutionPhotos,
    });
  }, [active]);
  function chooseSite(id: string) {
    siteCurrent.current = id;
    setSiteId(id);
    localStorage.setItem("fsh-v2-site-" + api.userId, id);
    setView("home");
    setActiveId("");
    setSectorFilter("");
    setError("");
  }
  function changeMode(m: string) {
    setMode(m);
    localStorage.setItem("fsh-v2-view-" + api.userId, m);
    setView("home");
    setActiveId("");
    dirtyRef.current = false;
    setStatusFilter("open");
    setSectorFilter("");
  }
  function navigate(v: View) {
    setView(v);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function action(payload: Record<string, unknown>, message: string) {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const d = await api.action({ siteId, ...payload });
      dirtyRef.current = false;
      await load(siteId);
      setToast(message);
      return d;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  function openReport(r: Report) {
    dirtyRef.current = false;
    setEdit({
      status: r.status,
      assignee: r.assignee,
      note: r.resolutionNote,
      resolutionPhotos: r.resolutionPhotos,
    });
    setActiveId(r.id);
    setError("");
  }
  const scoped = reports.filter(
    (r) =>
      dataFilter === "all" ||
      (dataFilter === "real" ? r.sample === 0 : r.sample === 1),
  );
  const visible = scoped.filter(
    (r) =>
      (mode === "manager" || !r.sample) &&
      (statusFilter === "all" ||
        (statusFilter === "open"
          ? r.status !== "완료"
          : r.status === statusFilter)) &&
      (!sectorFilter || r.sector === sectorFilter) &&
      (!search ||
        [r.sector, r.hazard, r.detail, r.assignee, r.workerName]
          .join(" ")
          .includes(search)),
  );
  const mapReports = scoped.filter(
    (r) =>
      r.floor === floor &&
      (type === "all" || r.hazard === type) &&
      (statusFilter === "all" ||
        (statusFilter === "open"
          ? r.status !== "완료"
          : r.status === statusFilter)),
  );
  const counts: Record<string, number> = {};
  mapReports.forEach((r) => (counts[r.sector] = (counts[r.sector] || 0) + 1));
  const open = scoped.filter((r) => r.status !== "완료");
  const urgent = open.filter((r) => r.priority === "긴급");
  const complete = scoped.filter((r) => r.status === "완료");
  const homeCounts: Record<string, number> = {};
  open
    .filter((r) => r.floor === floor)
    .forEach((r) => (homeCounts[r.sector] = (homeCounts[r.sector] || 0) + 1));
  const nav = [
    { id: "home", label: "홈", icon: LayoutDashboard },
    { id: "report", label: "위험 신고", icon: Plus },
    { id: "map", label: "위험 지도", icon: Map },
    {
      id: "reports",
      label: mode === "manager" ? "신고·조치관리" : "내 신고",
      icon: ClipboardCheck,
    },
    { id: "settings", label: "내 설정", icon: Settings },
  ];
  function cards(items: Report[]) {
    return items.length ? (
      <div className="report-list">
        {items.map((r) => (
          <button
            className="report-row"
            key={r.id}
            onClick={() => openReport(r)}
          >
            <div
              className={
                "report-icon " + (r.priority === "긴급" ? "urgent" : "")
              }
            >
              <TriangleAlert size={20} />
            </div>
            <div className="report-summary">
              <div className="report-top">
                <b>{r.hazard}</b>
                <Badge status={r.status} />
                {r.sample === 1 && <span className="sample">샘플</span>}
              </div>
              <p>{r.detail}</p>
              <div className="metadata">
                <span>
                  {r.floor.replace("F", "층")} · {r.sector}
                </span>
                <span>{date(r.createdAt)}</span>
                {r.assignee && <span>담당 {r.assignee}</span>}
              </div>
            </div>
            <ChevronRight className="row-chevron" size={18} />
          </button>
        ))}
      </div>
    ) : (
      <div className="empty">
        <ClipboardCheck size={36} />
        <h3>표시할 신고가 없습니다</h3>
        <p>조건을 바꾸거나 새로운 위험을 신고해 주세요.</p>
        {mode === "worker" && (
          <Button onClick={() => navigate("report")}>위험 신고하기</Button>
        )}
      </div>
    );
  }
  function exportCsv() {
    const rows = [
      [
        "신고ID",
        "현장",
        "층",
        "구역",
        "위험유형",
        "상세내용",
        "긴급도",
        "상태",
        "담당자",
        "신고자",
        "신고시간",
        "완료시간",
        "조치내용",
        "샘플여부",
        "위치출처",
      ],
      ...scoped.map((r) => [
        r.id,
        sites.find((s) => s.id === siteId)?.name || "",
        r.floor,
        r.sector,
        r.hazard,
        r.detail,
        r.priority,
        r.status,
        r.assignee,
        r.workerName,
        r.createdAt,
        r.resolvedAt || "",
        r.resolutionNote,
        r.sample ? "샘플" : "실제",
        r.locationSource,
      ]),
    ];
    const escape = (s: string) =>
      '"' + (/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"';
    const blob = new Blob(
      ["\uFEFF" + rows.map((r) => r.map(escape).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8;" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      "현장안전_신고_" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function makeQR(kind: string) {
    try {
      const lib = await import("qrcode");
      const payload = JSON.stringify({
        version: 2,
        demo: true,
        kind,
        siteId,
        name,
        date: new Date().toLocaleDateString("en-CA", {
          timeZone: "Asia/Seoul",
        }),
      });
      setQr(
        await lib.toDataURL(payload, {
          width: 220,
          margin: 2,
          errorCorrectionLevel: "M",
        }),
      );
      setQrData(kind === "pass" ? "출입 QR · 데모" : "식권 QR · 데모");
    } catch {
      setError("QR을 생성하지 못했습니다. 다시 시도해 주세요.");
    }
  }
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: "read_safety_reports",
            description: "현재 선택된 현장의 위험 신고와 조치 상태를 읽습니다.",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute: (input: any) => {
              if (input && Object.keys(input).length)
                throw Error("입력 필드가 없어야 합니다.");
              return {
                siteId,
                reports: reports.map((r) => ({
                  id: r.id,
                  floor: r.floor,
                  sector: r.sector,
                  hazard: r.hazard,
                  status: r.status,
                  sample: !!r.sample,
                })),
              };
            },
          },
          { signal: controller.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => controller.abort();
  }, [reports, siteId]);
  if (!siteId)
    return (
      <main className="site-selection">
        <div className="brand">
          <HardHat />
          <span>
            현장안전 허브 <small>2.0</small>
          </span>
        </div>
        <div className="selection-body">
          <p className="eyebrow">내 작업 공간</p>
          <h1>현장을 선택하세요.</h1>
          <p className="muted">{user.name} 님, 어떤 현장에서 시작할까요?</p>
          <div className="site-cards">
            {sites.map((s, i) => (
              <button
                key={s.id}
                className="site-card"
                onClick={() => chooseSite(s.id)}
              >
                <div className="site-number">0{i + 1}</div>
                <Building2 />
                <h2>{s.name}</h2>
                <p>{s.location}</p>
                <span>
                  {i === 0 ? "신고·조치 흐름 연습" : "나의 데이터 기록"}
                </span>
                <ChevronRight />
              </button>
            ))}
          </div>
          <div className="note">
            <ShieldCheck size={20} />
            <p>
              이 버전은 개인 개발 공간입니다. 로그인한 계정의 데이터를 저장하며,
              같은 계정에서 작업자·관리자 화면을 전환해 전체 흐름을 검증합니다.
            </p>
          </div>
        </div>
      </main>
    );
  return (
    <SidebarProvider className="app-root">
      <Sidebar className="app-sidebar" collapsible="none">
        <SidebarHeader>
          <div className="brand">
            <HardHat />
            <span>
              현장안전 허브 <small>2.0</small>
            </span>
          </div>
          <div className="sidebar-site">
            <Building2 size={18} />
            <div>
              <b>{sites.find((s) => s.id === siteId)?.name}</b>
              <button
                onClick={() => {
                  setSiteId("");
                  localStorage.removeItem("fsh-v2-site-" + api.userId);
                }}
              >
                현장 변경
              </button>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <p className="sidebar-label">작업 공간</p>
          <SidebarMenu>
            {nav.map((n) => (
              <SidebarMenuItem key={n.id}>
                <SidebarMenuButton
                  isActive={view === n.id}
                  onClick={() => navigate(n.id as View)}
                  className="nav-button"
                >
                  <n.icon />
                  <span>{n.label}</span>
                  {n.id === "reports" &&
                    mode === "manager" &&
                    open.length > 0 && <b>{open.length}</b>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <button
            className={"access-nav " + (view === "access" ? "active" : "")}
            onClick={() => navigate("access")}
          >
            <ScanLine size={18} />
            출입·식권 데모
          </button>
        </SidebarContent>
        <SidebarFooter>
          <div className="sidebar-version">
            <ShieldCheck size={18} />
            <p>
              개인 개발 공간
              <br />
              <span>UWB 연결 준비 · 위치 수동입력</span>
            </p>
          </div>
          <button className="account" onClick={() => navigate("settings")}>
            <span className="avatar">{name.slice(0, 1)}</span>
            <div>
              <b>{name}</b>
              <small>
                {mode === "manager" ? "관리자 화면" : "작업자 화면"}
              </small>
            </div>
            <Settings size={17} />
          </button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="content-shell">
        <header className="topbar">
          <div className="mobile-brand">
            <HardHat size={23} />
            <b>현장안전 허브</b>
          </div>
          <div className="breadcrumb">
            <span>{sites.find((s) => s.id === siteId)?.name}</span>
            <ChevronRight size={15} />
            <b>{nav.find((n) => n.id === view)?.label || "출입·식권 데모"}</b>
          </div>
          <div className="top-actions">
            <Tabs value={mode} onValueChange={changeMode}>
              <TabsList className="role-tabs">
                <TabsTrigger value="worker">작업자</TabsTrigger>
                <TabsTrigger value="manager">관리자</TabsTrigger>
              </TabsList>
            </Tabs>
            <button
              className="avatar desktop-avatar"
              aria-label="내 설정"
              onClick={() => navigate("settings")}
            >
              {name.slice(0, 1)}
            </button>
          </div>
        </header>
        <div className="workspace">
          {error && (
            <div className="error" role="alert">
              <TriangleAlert size={18} />
              <span>{error}</span>
              <button onClick={() => load(siteId)}>다시 불러오기</button>
            </div>
          )}
          {!loaded ? (
            <div className="loading">
              <RefreshCw className="spin" />
              신고 데이터를 불러오는 중…
            </div>
          ) : (
            <>
              {view === "home" && (
                <>
                  <div className="page-heading">
                    <div>
                      <p className="eyebrow">
                        {mode === "manager" ? "SITE OVERVIEW" : "MY WORKSPACE"}
                      </p>
                      <h1>
                        {mode === "manager"
                          ? "현장의 위험을 한눈에."
                          : name + " 님, 안전하게 시작하세요."}
                      </h1>
                      <p>
                        {new Date().toLocaleDateString("ko-KR", {
                          timeZone: "Asia/Seoul",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "long",
                        })}{" "}
                        · {sites.find((s) => s.id === siteId)?.name}
                      </p>
                    </div>
                    <Button
                      className="primary-action"
                      onClick={() => navigate("report")}
                    >
                      <Plus />
                      위험 신고
                    </Button>
                  </div>
                  {mode === "worker" ? (
                    <>
                      <div className="worker-hero">
                        <div>
                          <span className="hero-label">
                            위험 발견 시 바로 기록
                          </span>
                          <h2>
                            통로의 작은 위험도
                            <br />
                            놓치지 않도록.
                          </h2>
                          <p>층과 구역을 선택하고, 사진과 함께 알려주세요.</p>
                          <Button onClick={() => navigate("report")}>
                            <Camera />새 위험 신고하기
                          </Button>
                        </div>
                        <div className="hero-stat">
                          <span>내 신고</span>
                          <b>
                            {reports.filter((r) => !r.sample).length}
                            <small>건</small>
                          </b>
                          <span>
                            조치 완료{" "}
                            {
                              reports.filter(
                                (r) => !r.sample && r.status === "완료",
                              ).length
                            }
                            건
                          </span>
                        </div>
                      </div>
                      <div className="section-head">
                        <h2>내 신고 진행상황</h2>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setStatusFilter("all");
                            navigate("reports");
                          }}
                        >
                          전체 보기 <ChevronRight />
                        </Button>
                      </div>
                      {cards(reports.filter((r) => !r.sample).slice(0, 4))}
                      <div className="worker-links">
                        <button onClick={() => navigate("map")}>
                          <Map />
                          <div>
                            <b>위험 지도 확인</b>
                            <span>내가 이동할 구역의 신고 확인</span>
                          </div>
                          <ChevronRight />
                        </button>
                        <button onClick={() => navigate("access")}>
                          <ScanLine />
                          <div>
                            <b>출입·식권 데모</b>
                            <span>기존 QR 기능 체험</span>
                          </div>
                          <ChevronRight />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="stat-grid">
                        {[
                          {
                            label: "전체 신고",
                            value: scoped.length,
                            icon: FileText,
                            cls: "",
                          },
                          {
                            label: "미조치",
                            value: open.length,
                            icon: Clock,
                            cls: "amber",
                          },
                          {
                            label: "긴급 미조치",
                            value: urgent.length,
                            icon: TriangleAlert,
                            cls: "red",
                          },
                          {
                            label: "조치 완료",
                            value: complete.length,
                            icon: CheckCircle2,
                            cls: "green",
                          },
                        ].map((s) => (
                          <div className={"stat-card " + s.cls} key={s.label}>
                            <span>
                              {s.label}
                              <s.icon size={18} />
                            </span>
                            <b>
                              {s.value}
                              <small>건</small>
                            </b>
                          </div>
                        ))}
                      </div>
                      <div className="home-columns">
                        <section className="panel">
                          <div className="section-head">
                            <div>
                              <h2>구역별 위험 신고</h2>
                              <p className="fine">
                                미조치 신고 기준 · {floor.replace("F", "층")}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              onClick={() => navigate("map")}
                            >
                              지도 보기
                              <ChevronRight />
                            </Button>
                          </div>
                          <FloorMap
                            floor={floor}
                            counts={homeCounts}
                            selected={sectorFilter}
                            onSelect={(s) => {
                              setSectorFilter(s);
                              setStatusFilter("open");
                              navigate("reports");
                            }}
                          />
                          <div className="legend">
                            {["0건", "1건", "2건", "3건 이상"].map((t, i) => (
                              <span key={t}>
                                <i style={{ background: color(i) }} />
                                {t}
                              </span>
                            ))}
                          </div>
                        </section>
                        <section className="panel">
                          <div className="section-head">
                            <h2>먼저 확인할 신고</h2>
                            <span className="count">
                              {urgent.length}건 긴급
                            </span>
                          </div>
                          {cards(
                            [
                              ...urgent,
                              ...open.filter((r) => r.priority !== "긴급"),
                            ].slice(0, 4),
                          )}
                          <Button
                            variant="outline"
                            className="full"
                            onClick={() => {
                              setStatusFilter("open");
                              setSectorFilter("");
                              navigate("reports");
                            }}
                          >
                            미조치 신고 전체 보기
                          </Button>
                        </section>
                      </div>
                    </>
                  )}
                  {siteId === "training" &&
                    !reports.some((r) => r.sample === 1) && (
                      <div className="seed-banner">
                        <div>
                          <b>샘플 신고로 전체 흐름을 연습해 보세요.</b>
                          <p>
                            8개의 신고가 추가됩니다. 직접 등록한 신고는
                            유지됩니다.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            action(
                              { action: "seed" },
                              "샘플 신고 8건이 준비되었습니다.",
                            )
                          }
                        >
                          샘플 데이터 추가
                        </Button>
                      </div>
                    )}
                </>
              )}
              {view === "report" && (
                <>
                  <div className="page-heading">
                    <div>
                      <p className="eyebrow">SAFETY REPORT</p>
                      <h1>위험 신고</h1>
                      <p>발견한 장소와 위험을 정확하게 알려주세요.</p>
                    </div>
                    <span className="location-status">
                      <MapPin size={15} />
                      수동 위치 기록
                    </span>
                  </div>
                  <form
                    className="report-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!draft.sector || !draft.hazard) {
                        setError("구역과 위험유형을 선택해 주세요.");
                        window.scrollTo(0, 0);
                        return;
                      }
                      if (photoBusy) return;
                      if (!requestId.current)
                        requestId.current = crypto.randomUUID();
                      const d = await action(
                        {
                          action: "create",
                          requestId: requestId.current,
                          ...draft,
                        },
                        "위험 신고가 접수되었습니다.",
                      );
                      if (d) {
                        requestId.current = "";
                        setDraft({
                          floor: draft.floor,
                          sector: "",
                          hazard: "",
                          detail: "",
                          priority: "일반",
                          photos: [],
                        });
                        setStatusFilter("all");
                        setSectorFilter("");
                        setView("reports");
                        setActiveId(d.id);
                      }
                    }}
                  >
                    <section className="panel location-panel">
                      <div className="step-title">
                        <span>01</span>
                        <div>
                          <h2>어디에서 발견했나요?</h2>
                          <p>층을 선택한 뒤 구역을 눌러주세요.</p>
                        </div>
                      </div>
                      <div className="field">
                        <label>층</label>
                        <Choice
                          label="신고 층"
                          value={draft.floor}
                          onChange={(f) =>
                            setDraft({ ...draft, floor: f, sector: "" })
                          }
                          options={floors.map((f) => ({
                            value: f,
                            label: f.replace("F", "층"),
                          }))}
                        />
                      </div>
                      <FloorMap
                        floor={draft.floor}
                        counts={{}}
                        selected={draft.sector}
                        compact
                        onSelect={(s) => setDraft({ ...draft, sector: s })}
                      />
                      <div className="field">
                        <label>
                          선택한 구역 <span className="required">*</span>
                        </label>
                        <Choice
                          label="신고 구역"
                          value={draft.sector}
                          onChange={(s) => setDraft({ ...draft, sector: s })}
                          options={layout.map((_, i) => ({
                            value:
                              prefixes[floors.indexOf(draft.floor)] +
                              "-" +
                              (i + 1),
                            label:
                              prefixes[floors.indexOf(draft.floor)] +
                              "-" +
                              (i + 1) +
                              " 구역",
                          }))}
                        />
                      </div>
                    </section>
                    <section className="panel">
                      <div className="step-title">
                        <span>02</span>
                        <div>
                          <h2>어떤 위험인가요?</h2>
                          <p>위험유형과 현장 상태를 기록해 주세요.</p>
                        </div>
                      </div>
                      <div className="field">
                        <label>
                          위험유형 <span className="required">*</span>
                        </label>
                        <Choice
                          label="위험유형"
                          value={draft.hazard}
                          onChange={(h) => setDraft({ ...draft, hazard: h })}
                          options={hazards.map((h) => ({
                            value: h,
                            label:
                              h === "추락낙하"
                                ? "추락·낙하"
                                : h === "전도넘어짐"
                                  ? "전도·넘어짐"
                                  : h,
                          }))}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="detail">
                          상세내용 <span className="required">*</span>
                        </label>
                        <Textarea
                          id="detail"
                          required
                          minLength={5}
                          maxLength={2000}
                          rows={4}
                          value={draft.detail}
                          onChange={(e) =>
                            setDraft({ ...draft, detail: e.target.value })
                          }
                          placeholder="예: 통로 중앙에 폐자재가 쌓여 이동을 방해합니다."
                        />
                        <span className="fine">
                          5자 이상 · {draft.detail.length}/2,000자
                        </span>
                      </div>
                      <div className="field">
                        <label>긴급도</label>
                        <Choice
                          label="긴급도"
                          value={draft.priority}
                          onChange={(p) => setDraft({ ...draft, priority: p })}
                          options={[
                            {
                              value: "일반",
                              label: "일반 · 점검 및 개선 필요",
                            },
                            { value: "긴급", label: "긴급 · 빠른 확인 필요" },
                          ]}
                        />
                      </div>
                      <div className="field">
                        <label>현장 사진</label>
                        <PhotoPicker
                          value={draft.photos}
                          onChange={(p) =>
                            setDraft((d) => ({ ...d, photos: p }))
                          }
                          onError={setError}
                          onBusy={setPhotoBusy}
                        />
                      </div>
                      <div className="submit-summary">
                        <MapPin size={18} />
                        <span>
                          {draft.floor.replace("F", "층")} ·{" "}
                          {draft.sector || "구역 미선택"}
                        </span>
                        <Badge status="접수" />
                      </div>
                      <Button
                        type="submit"
                        className="full primary-action"
                        disabled={busy || photoBusy}
                      >
                        {busy ? "신고 저장 중…" : "위험 신고 등록"}
                      </Button>
                    </section>
                  </form>
                </>
              )}
              {view === "map" && (
                <>
                  <div className="page-heading">
                    <div>
                      <p className="eyebrow">SAFETY MAP</p>
                      <h1>위험 지도</h1>
                      <p>
                        신고가 반복되는 구역을 확인하고 조치할 대상을
                        살펴보세요.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => load(siteId)}
                    >
                      <RefreshCw />
                      새로고침
                    </Button>
                  </div>
                  <div className="filterbar">
                    <Choice
                      label="지도 층"
                      value={floor}
                      onChange={(f) => {
                        setFloor(f);
                        setSectorFilter("");
                      }}
                      options={floors.map((f) => ({
                        value: f,
                        label: f.replace("F", "층"),
                      }))}
                    />
                    <Choice
                      label="지도 위험유형"
                      value={type}
                      onChange={setType}
                      options={[
                        { value: "all", label: "모든 위험유형" },
                        ...hazards.map((h) => ({ value: h, label: h })),
                      ]}
                    />
                    <Choice
                      label="지도 신고 상태"
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={[
                        { value: "open", label: "미조치 신고" },
                        { value: "all", label: "전체 신고" },
                        { value: "완료", label: "조치 완료" },
                      ]}
                    />
                  </div>
                  <div className="map-columns">
                    <section className="panel">
                      <div className="section-head">
                        <h2>{floor.replace("F", "층")} 위험 신고 현황</h2>
                        <span className="count">{mapReports.length}건</span>
                      </div>
                      <FloorMap
                        floor={floor}
                        counts={counts}
                        selected={sectorFilter}
                        onSelect={setSectorFilter}
                      />
                      <div className="legend">
                        {["0건", "1건", "2건", "3건 이상"].map((t, i) => (
                          <span key={t}>
                            <i style={{ background: color(i) }} />
                            {t}
                          </span>
                        ))}
                      </div>
                      <p className="fine">
                        색상은 신고 건수입니다. 0건은 안전 판정을 의미하지
                        않습니다.
                      </p>
                    </section>
                    <section className="panel">
                      <div className="section-head">
                        <h2>위험유형별 신고</h2>
                      </div>
                      <div className="hazard-bars">
                        {hazards.map((h) => {
                          const n = mapReports.filter(
                            (r) => r.hazard === h,
                          ).length;
                          return (
                            <button
                              key={h}
                              onClick={() => setType(type === h ? "all" : h)}
                              className={type === h ? "chosen" : ""}
                            >
                              <span>{h}</span>
                              <div>
                                <i
                                  style={{
                                    width:
                                      (n / Math.max(1, mapReports.length)) *
                                        100 +
                                      "%",
                                  }}
                                />
                              </div>
                              <b>{n}</b>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mini-note">
                        <MapPin size={17} />
                        <span>
                          위치 출처: 작업자 직접 선택
                          <br />
                          UWB 위치 연결은 다음 버전에서 진행합니다.
                        </span>
                      </div>
                    </section>
                  </div>
                  <div className="section-head">
                    <h2>
                      {sectorFilter
                        ? sectorFilter + " 구역 신고"
                        : "선택 층의 신고"}
                    </h2>
                    {sectorFilter && (
                      <Button
                        variant="ghost"
                        onClick={() => setSectorFilter("")}
                      >
                        구역 선택 해제
                      </Button>
                    )}
                  </div>
                  {cards(
                    mapReports.filter(
                      (r) => !sectorFilter || r.sector === sectorFilter,
                    ),
                  )}
                </>
              )}
              {view === "reports" && (
                <>
                  <div className="page-heading">
                    <div>
                      <p className="eyebrow">
                        {mode === "manager"
                          ? "ACTION MANAGEMENT"
                          : "MY REPORTS"}
                      </p>
                      <h1>
                        {mode === "manager" ? "신고·조치관리" : "내 신고"}
                      </h1>
                      <p>
                        {mode === "manager"
                          ? "담당자를 지정하고 조치 진행과 결과를 기록하세요."
                          : "내가 등록한 위험의 처리 상태를 확인하세요."}
                      </p>
                    </div>
                    {mode === "manager" && (
                      <Button variant="outline" onClick={exportCsv}>
                        <Download />
                        CSV 내보내기
                      </Button>
                    )}
                  </div>
                  <div className="filterbar">
                    <Choice
                      label="신고 상태 필터"
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={[
                        { value: "open", label: "미조치 전체" },
                        { value: "all", label: "모든 상태" },
                        ...statuses.map((s) => ({ value: s, label: s })),
                      ]}
                    />
                    {mode === "manager" && (
                      <Choice
                        label="데이터 구분"
                        value={dataFilter}
                        onChange={setDataFilter}
                        options={[
                          { value: "all", label: "전체 데이터" },
                          { value: "real", label: "직접 등록 신고" },
                          { value: "sample", label: "샘플 신고" },
                        ]}
                      />
                    )}
                    <div className="search-field">
                      <Input
                        aria-label="신고 검색"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="구역, 유형, 내용, 담당자 검색"
                      />
                    </div>
                    {sectorFilter && (
                      <Button
                        variant="outline"
                        onClick={() => setSectorFilter("")}
                      >
                        {sectorFilter}
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                  <p className="list-count">{visible.length}건의 신고</p>
                  {cards(visible)}
                </>
              )}
              {view === "settings" && (
                <>
                  <div className="page-heading">
                    <div>
                      <p className="eyebrow">ACCOUNT & WORKSPACE</p>
                      <h1>내 설정</h1>
                      <p>계정과 작업 공간을 관리합니다.</p>
                    </div>
                  </div>
                  <div className="settings-columns">
                    <section className="panel">
                      <h2>내 계정</h2>
                      <p className="muted">{user.email}</p>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          action(
                            { action: "profile", name: nameDraft },
                            "이름이 저장되었습니다.",
                          );
                        }}
                      >
                        <div className="field">
                          <label htmlFor="name">신고자 이름</label>
                          <Input
                            id="name"
                            value={nameDraft}
                            maxLength={60}
                            required
                            onChange={(e) => setNameDraft(e.target.value)}
                          />
                        </div>
                        <Button disabled={busy}>이름 저장</Button>
                      </form>
                      <hr />
                      <h2>현재 현장</h2>
                      <p>{sites.find((s) => s.id === siteId)?.name}</p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSiteId("");
                          localStorage.removeItem("fsh-v2-site-" + api.userId);
                        }}
                      >
                        다른 현장 선택
                      </Button>
                      <hr />
                      <button type="button" className="signout" onClick={onSignOut}>
                        <LogOut size={17} />
                        로그아웃
                      </button>
                    </section>
                    <section className="panel">
                      <h2>버전 2.0 개발 공간</h2>
                      <p>
                        실제 로그인과 서버 저장을 사용합니다. 지금은 같은
                        계정에서 작업자·관리자 화면을 전환하는 개인 실습용
                        구조입니다.
                      </p>
                      <ul className="capability-list">
                        <li>
                          <CheckCircle2 />
                          신고·사진·조치 이력 서버 저장
                        </li>
                        <li>
                          <CheckCircle2 />
                          15초 간격으로 변경 내용 확인
                        </li>
                        <li>
                          <CheckCircle2 />
                          층·34개 구역·위험유형 연결
                        </li>
                        <li>
                          <Clock />
                          현장별 다중 사용자 권한 · 다음 단계
                        </li>
                        <li>
                          <Clock />
                          UWB 자동 위치 · 다음 단계
                        </li>
                      </ul>
                      <hr />
                      <h2>홈 화면에 추가</h2>
                      <p>
                        아이폰: Safari 공유 메뉴 → 홈 화면에 추가
                        <br />
                        안드로이드: 브라우저 메뉴 → 앱 설치 또는 홈 화면에 추가
                      </p>
                      {installEvent && (
                        <Button
                          variant="outline"
                          onClick={async () => {
                            await installEvent.prompt();
                            setInstallEvent(null);
                          }}
                        >
                          앱 설치
                        </Button>
                      )}
                      <p className="fine">
                        네트워크 연결이 필요합니다. 현재는 웹앱이며 앱스토어용
                        네이티브 앱은 다음 단계입니다.
                      </p>
                    </section>
                    <section className="panel">
                      <h2>샘플 데이터 관리</h2>
                      <p>
                        실습용 신고만 추가하거나 삭제합니다. 직접 등록한 신고는
                        유지됩니다.
                      </p>
                      <div className="buttons">
                        <Button
                          variant="outline"
                          disabled={busy || siteId !== "training"}
                          onClick={() =>
                            action(
                              { action: "seed" },
                              "샘플 신고가 준비되었습니다.",
                            )
                          }
                        >
                          샘플 추가
                        </Button>
                        <Button
                          variant="outline"
                          disabled={busy || !reports.some((r) => r.sample)}
                          onClick={() => setClearOpen(true)}
                        >
                          <Trash2 />
                          샘플만 삭제
                        </Button>
                      </div>
                      {siteId !== "training" && (
                        <p className="fine">
                          샘플은 안전관리 실습 현장에서 추가할 수 있습니다.
                        </p>
                      )}
                    </section>
                  </div>
                </>
              )}
              {view === "access" && (
                <>
                  <div className="page-heading">
                    <div>
                      <p className="eyebrow">ACCESS DEMO</p>
                      <h1>출입·식권 데모</h1>
                      <p>
                        기존 QR 기능의 체험 화면입니다. 실제 출입장치와 연동되지
                        않습니다.
                      </p>
                    </div>
                    <span className="sample">데모</span>
                  </div>
                  <div className="settings-columns">
                    <section className="panel">
                      <h2>출입 QR</h2>
                      <p>
                        {name} · {sites.find((s) => s.id === siteId)?.name}
                      </p>
                      <Button variant="outline" onClick={() => makeQR("pass")}>
                        <ScanLine />
                        출입 QR 생성
                      </Button>
                      <div className="buttons">
                        <Button
                          disabled={busy}
                          onClick={() =>
                            action(
                              { action: "demoLog", kind: "입장" },
                              "입장 데모가 기록되었습니다.",
                            )
                          }
                        >
                          입장 기록
                        </Button>
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            action(
                              { action: "demoLog", kind: "퇴장" },
                              "퇴장 데모가 기록되었습니다.",
                            )
                          }
                        >
                          퇴장 기록
                        </Button>
                      </div>
                      <p className="fine">
                        기록만으로 실제 잔류 인원이나 현재 위치를 판단하지
                        않습니다.
                      </p>
                    </section>
                    <section className="panel">
                      <h2>식권 QR</h2>
                      <p>식권 발급 흐름을 연습합니다.</p>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={async () => {
                          const r = await action(
                            { action: "demoLog", kind: "식권" },
                            "오늘의 데모 식권이 발급되었습니다.",
                          );
                          if (r) makeQR("meal");
                        }}
                      >
                        오늘 식권 발급
                      </Button>
                      {logs.some((l) => l.kind === "식권") && (
                        <Button variant="ghost" onClick={() => makeQR("meal")}>
                          QR 다시 보기
                        </Button>
                      )}
                    </section>
                  </div>
                  <div className="section-head">
                    <h2>데모 기록</h2>
                    <span className="fine">최근 30건</span>
                  </div>
                  <div className="panel">
                    {logs.length ? (
                      logs.map((l) => (
                        <div className="log-row" key={l.id}>
                          <span>{l.kind}</span>
                          <span>{name}</span>
                          <span>{date(l.created_at)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="muted">아직 기록이 없습니다.</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
          <footer className="workspace-footer">
            <span>현장안전 2.0 · 개인 개발 공간</span>
            <span>
              {lastSync ? "마지막 동기화 " + date(lastSync) : "연결 확인 중"}
            </span>
          </footer>
        </div>
        <nav className="mobile-nav" aria-label="앱 탐색">
          {nav.map((n) => (
            <button
              key={n.id}
              className={view === n.id ? "active" : ""}
              onClick={() => navigate(n.id as View)}
            >
              <n.icon size={22} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
      </SidebarInset>
      <Sheet
        open={!!activeId}
        onOpenChange={(v) => {
          if (!v) {
            setActiveId("");
            dirtyRef.current = false;
            setError("");
          }
        }}
      >
        <SheetContent className="detail-sheet">
          <SheetHeader>
            <SheetTitle>신고 상세</SheetTitle>
            <SheetDescription>
              위험정보와 조치 진행 이력을 확인합니다.
            </SheetDescription>
          </SheetHeader>
          {active && (
            <div className="detail-body">
              <div className="detail-location">
                <span>
                  {active.floor.replace("F", "층")} · {active.sector}
                </span>
                <Badge status={active.status} />
              </div>
              <h2>{active.hazard}</h2>
              <div className="metadata">
                {active.sample === 1 && <span className="sample">샘플</span>}
                <span>
                  {active.priority} · {active.workerName}
                </span>
                <span>{date(active.createdAt)}</span>
              </div>
              <p className="detail-description">{active.detail}</p>
              <div className="detail-location-source">
                <MapPin size={15} />
                직접 선택한 신고 위치
              </div>
              <div className="photos">
                {active.photos.map((p, i) => (
                  <button
                    className="photo detail-photo"
                    key={p}
                    onClick={() => setPhotoModal(p)}
                  >
                    <img
                      src={photoUrl(p)}
                      alt={"신고 사진 " + (i + 1)}
                    />
                  </button>
                ))}
              </div>
              <hr />
              <div className="section-head">
                <h3>조치 진행</h3>
                <History size={18} />
              </div>
              <ol className="timeline">
                {active.history.map((h) => (
                  <li key={h.id}>
                    <i className={h.status === "완료" ? "done" : ""} />
                    <div>
                      <b>{h.status}</b>
                      <span>{date(h.createdAt)}</span>
                      <p>{h.note}</p>
                      <small>{h.actor}</small>
                    </div>
                  </li>
                ))}
              </ol>
              {active.assignee && (
                <p className="fine">담당자: {active.assignee}</p>
              )}
              {active.status === "완료" && (
                <div className="resolution">
                  <b>
                    <CheckCircle2 size={18} />
                    조치 완료
                  </b>
                  <p>{active.resolutionNote}</p>
                  <span className="fine">
                    {active.resolvedAt && longDate(active.resolvedAt)}
                  </span>
                  <div className="photos">
                    {active.resolutionPhotos.map((p, i) => (
                      <button
                        className="photo detail-photo"
                        key={p}
                        onClick={() => setPhotoModal(p)}
                      >
                        <img
                          src={photoUrl(p)}
                          alt={"조치 후 사진 " + (i + 1)}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {mode === "manager" && active.status !== "완료" && (
                <form
                  className="action-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (photoBusy) return;
                    await action(
                      {
                        action: "update",
                        id: active.id,
                        updatedAt: active.updatedAt,
                        ...edit,
                      },
                      "조치 정보가 저장되었습니다.",
                    );
                  }}
                >
                  <hr />
                  <h3>조치 정보 업데이트</h3>
                  <div className="field">
                    <label>상태</label>
                    <Choice
                      label="조치 상태"
                      value={edit.status}
                      onChange={(s) => {
                        dirtyRef.current = true;
                        setEdit({ ...edit, status: s });
                      }}
                      options={statuses
                        .filter(
                          (_, i) =>
                            i === statuses.indexOf(active.status) ||
                            i === statuses.indexOf(active.status) + 1,
                        )
                        .map((s) => ({ value: s, label: s }))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="assignee">
                      담당자{" "}
                      {["조치중", "완료"].includes(edit.status) && (
                        <span className="required">*</span>
                      )}
                    </label>
                    <Input
                      id="assignee"
                      value={edit.assignee}
                      maxLength={60}
                      required={["조치중", "완료"].includes(edit.status)}
                      placeholder="예: 안전담당자 장현승"
                      onChange={(e) => {
                        dirtyRef.current = true;
                        setEdit({ ...edit, assignee: e.target.value });
                      }}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="actionNote">
                      조치내용{" "}
                      {edit.status === "완료" && (
                        <span className="required">*</span>
                      )}
                    </label>
                    <Textarea
                      id="actionNote"
                      value={edit.note}
                      required={edit.status === "완료"}
                      minLength={edit.status === "완료" ? 5 : undefined}
                      maxLength={2000}
                      rows={3}
                      placeholder="확인 내용 또는 조치 결과를 기록하세요."
                      onChange={(e) => {
                        dirtyRef.current = true;
                        setEdit({ ...edit, note: e.target.value });
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>조치 후 사진</label>
                    <PhotoPicker
                      value={edit.resolutionPhotos}
                      onChange={(p) => {
                        dirtyRef.current = true;
                        setEdit((x) => ({ ...x, resolutionPhotos: p }));
                      }}
                      onError={setError}
                      onBusy={setPhotoBusy}
                    />
                  </div>
                  {error && (
                    <p className="error" role="alert">
                      {error}
                    </p>
                  )}
                  <Button className="full" disabled={busy || photoBusy}>
                    {busy ? "저장 중…" : "조치 정보 저장"}
                  </Button>
                </form>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Dialog open={!!photoModal} onOpenChange={() => setPhotoModal("")}>
        <DialogContent className="photo-dialog">
          <DialogTitle>현장 사진</DialogTitle>
          <DialogDescription>
            신고 또는 조치 시 등록한 사진입니다.
          </DialogDescription>
          {photoModal && (
            <img src={photoUrl(photoModal)} alt="현장 사진 확대" />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!qr} onOpenChange={() => setQr("")}>
        <DialogContent>
          <DialogTitle>{qrData}</DialogTitle>
          <DialogDescription>
            실제 출입장치나 식당에서는 사용할 수 없는 실습용 QR입니다.
          </DialogDescription>
          {qr && <img className="qr-image" src={qr} alt={qrData} />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>샘플 신고만 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            샘플 신고와 샘플 조치 이력이 삭제됩니다. 직접 등록한 신고는
            유지됩니다.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                action(
                  { action: "clearSamples" },
                  "샘플 신고가 삭제되었습니다.",
                )
              }
            >
              샘플 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
        </div>
      )}
    </SidebarProvider>
  );
}
