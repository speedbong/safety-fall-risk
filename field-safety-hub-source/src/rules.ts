export function checkConfig(url: string, key: string): string {
  if (!url || !key) return "서버 연결 설정이 아직 완료되지 않았습니다.";
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))
    return "Supabase 프로젝트의 HTTPS 주소를 확인해 주세요.";
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))
    return "브라우저용 Publishable key를 사용해 주세요. Secret/service_role 키는 사용할 수 없습니다.";
  return "";
}

export function imageExtension(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) return "png";
  const text = String.fromCharCode(...bytes.slice(0, 12));
  if (text.startsWith("RIFF") && text.slice(8, 12) === "WEBP") return "webp";
  return null;
}

export const BUCKET = "field-safety-photos";
