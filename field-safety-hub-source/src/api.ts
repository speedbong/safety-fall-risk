import type { Report } from "./data";
import { BUCKET, checkConfig, imageExtension } from "./rules";

declare global {
  interface Window {
    FIELD_SAFETY_CONFIG?: { supabaseUrl: string; supabasePublishableKey: string };
    supabase?: { createClient: (url: string, key: string, opts: object) => any };
  }
}

let client: any;
const signed = new Map<string, { url: string; until: number }>();
const placeholder = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="100%" height="100%" fill="#eaf0f2"/><text x="50%" y="50%" text-anchor="middle" font-size="12" fill="#526473">사진 다시 불러오기</text></svg>');
export const photoUrl = (id: string) => signed.get(id)?.url || placeholder;

export function configError() {
  const c = window.FIELD_SAFETY_CONFIG;
  return checkConfig(c?.supabaseUrl || "", c?.supabasePublishableKey || "");
}

export async function connect() {
  const problem = configError();
  if (problem) throw Error(problem);
  if (!window.supabase) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = import.meta.env.BASE_URL + "vendor/supabase-js-2.116.0.js";
      script.onload = () => resolve();
      script.onerror = () => { script.remove(); reject(Error("로그인 모듈을 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요.")); };
      document.head.append(script);
    });
  }
  if (!window.supabase) throw Error("로그인 모듈을 시작하지 못했습니다.");
  const c = window.FIELD_SAFETY_CONFIG!;
  client = window.supabase.createClient(c.supabaseUrl, c.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" }
  });
  return client;
}

function requireClient() {
  if (!client) throw Error("서버 연결을 먼저 확인해 주세요.");
  return client;
}

function fail(error: any): never {
  const message = error?.message || "서버 요청을 처리하지 못했습니다.";
  if (/Failed to fetch|NetworkError|network request/i.test(message))
    throw Error("서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.");
  if (/fsh_load|fsh_mutate|schema cache/i.test(message))
    throw Error("서버 초기 설정이 필요합니다. 프로젝트에 DB 마이그레이션을 적용해 주세요.");
  throw Error(message);
}

async function refreshPhotos(paths: string[]) {
  const pending = [...new Set(paths)].filter(p => !signed.has(p) || signed.get(p)!.until < Date.now());
  if (!pending.length) return;
  const { data, error } = await requireClient().storage.from(BUCKET).createSignedUrls(pending, 600);
  if (error) fail(error);
  for (const item of data || []) {
    if (item.signedUrl && item.path && !item.error)
      signed.set(item.path, { url: item.signedUrl, until: Date.now() + 8 * 60 * 1000 });
    else if (item.path) signed.delete(item.path);
  }
}

export const api = {
  userId: "",
  setUser(id: string) { this.userId = id; signed.clear(); },
  async load(siteId: string): Promise<{ reports: Report[]; logs: any[]; profile: string }> {
    const { data, error } = await requireClient().rpc("fsh_load", { p_site: siteId });
    if (error) fail(error);
    const photos = (data.reports as Report[]).flatMap(r => [...r.photos, ...r.resolutionPhotos]);
    await refreshPhotos(photos);
    return data;
  },
  async action(payload: Record<string, unknown>) {
    const { data, error } = await requireClient().rpc("fsh_mutate", { p: payload });
    if (error) fail(error);
    return data;
  },
  async upload(file: File): Promise<{ id: string }> {
    if (!this.userId) throw Error("다시 로그인해 주세요.");
    if (file.size > 5 * 1024 * 1024 || file.size === 0) throw Error("사진은 0바이트 초과, 5MB 이하로 선택해 주세요.");
    const ext = imageExtension(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
    if (!ext) throw Error("JPG, PNG, WEBP 형식의 실제 이미지 파일을 선택해 주세요.");
    const path = `${this.userId}/${crypto.randomUUID()}.${ext}`;
    const type = ext === "jpg" ? "image/jpeg" : "image/" + ext;
    const { error } = await requireClient().storage.from(BUCKET).upload(path, file, { contentType: type, upsert: false });
    if (error) fail(error);
    await refreshPhotos([path]);
    return { id: path };
  }
};
