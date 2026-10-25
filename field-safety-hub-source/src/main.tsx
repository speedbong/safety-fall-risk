import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { HardHat, ShieldCheck, Cloud, ArrowRight, AlertCircle } from "lucide-react";
import SafetyApp from "./SafetyApp";
import { api, configError, connect } from "./api";
import "./styles.css";

function App() {
  const [client, setClient] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "password">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const setup = configError();

  useEffect(() => {
    if (setup) { setReady(true); return; }
    let stopped = false;
    let subscription: any;
    connect().then(async c => {
      if (stopped) return;
      setClient(c);
      subscription = c.auth.onAuthStateChange((event: string, next: any) => {
        if (stopped) return;
        if (api.userId !== (next?.user.id || "")) api.setUser(next?.user.id || "");
        setSession(next);
        if (event === "PASSWORD_RECOVERY") setMode("password");
        if (event === "SIGNED_OUT") { setPassword(""); setMode("signin"); }
      }).data.subscription;
      const result = await c.auth.getSession();
      if (result.error) throw result.error;
      if (stopped) return;
      if (api.userId !== (result.data.session?.user.id || "")) api.setUser(result.data.session?.user.id || "");
      setSession(result.data.session);
      setReady(true);
    }).catch(e => { if (!stopped) { setError(e.message); setReady(true); } });
    return () => { stopped = true; subscription?.unsubscribe(); };
  }, [setup]);

  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) { setError("로그아웃하지 못했습니다. 다시 시도해 주세요."); return; }
    api.setUser(""); setSession(null);
  }
  if (session && mode !== "password") return <SafetyApp key={session.user.id} user={{ name: session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "작업자", email: session.user.email || "" }} onSignOut={signOut} />;
  return <main className="hub-login">
    <section className="hub-story">
      <div className="brand"><HardHat /><span>Field Safety Hub<small>2.0</small></span></div>
      <div><p className="eyebrow">현장안전 허브</p><h1>작은 위험을 기록하고,<br />확실한 조치로 연결하세요.</h1><p>작업자의 신고에서 관리자의 조치 확인까지.<br />현장의 위험정보를 한곳에 모읍니다.</p></div>
      <div className="hub-features"><span><ShieldCheck />신고 · 히트맵 · 조치 이력</span><span><Cloud />계정별 서버 저장</span></div>
    </section>
    <section className="hub-entry">
      {setup ? <div className="hub-card"><span className="hub-label">서버 연결 준비 중</span><h2>Field Safety Hub</h2><p>앱 화면이 준비되었습니다. 서버 연결을 완료하면 로그인하고 신고·사진을 저장할 수 있습니다.</p><div className="hub-setup"><h3>연결할 항목</h3><ol><li>Supabase 프로젝트 생성 또는 선택</li><li>앱의 DB·사진 저장 정책 적용</li><li>프로젝트 URL과 Publishable key 연결</li></ol></div><p className="fine">현재는 로그인·신고 기능을 사용할 수 없습니다. 실제 신고를 브라우저 저장으로 대체하지 않습니다.</p></div> : <div className="hub-card">
        <span className="hub-label">현장안전 허브 · 계정 로그인</span>
        <h2>{mode === "signup" ? "새 계정 만들기" : mode === "reset" ? "비밀번호 재설정" : mode === "password" ? "새 비밀번호 설정" : "안전하게 시작하세요."}</h2>
        <p>등록한 계정으로 접속하면 다른 기기에서도 내 신고와 조치 이력을 확인할 수 있습니다.</p>
        {error && <div className="error" role="alert"><AlertCircle size={18} />{error}</div>}
        {notice && <p className="hub-notice" role="status">{notice}</p>}
        {!ready ? <p role="status">로그인 정보를 확인하는 중…</p> : <form onSubmit={async e => {
          e.preventDefault(); if (!client || busy) return; setBusy(true); setError(""); setNotice("");
          try {
            const redirectTo = new URL(import.meta.env.BASE_URL, window.location.href).href;
            let result;
            if (mode === "signup") result = await client.auth.signUp({ email, password, options: { data: { display_name: displayName.trim() }, emailRedirectTo: redirectTo } });
            else if (mode === "reset") result = await client.auth.resetPasswordForEmail(email, { redirectTo });
            else if (mode === "password") result = await client.auth.updateUser({ password });
            else result = await client.auth.signInWithPassword({ email, password });
            if (result.error) throw result.error;
            setPassword("");
            if (mode === "signup" && !result.data.session) setNotice("이메일의 확인 링크를 열어 가입을 완료해 주세요.");
            if (mode === "reset") setNotice("계정이 등록되어 있다면 비밀번호 재설정 이메일이 발송됩니다.");
            if (mode === "password") { setMode("signin"); setNotice("비밀번호가 변경되었습니다."); }
          } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
        }}>
          {mode === "signup" && <div className="field"><label htmlFor="displayName">신고자 이름</label><input id="displayName" autoComplete="name" required minLength={1} maxLength={60} value={displayName} onChange={e => setDisplayName(e.target.value)} /></div>}
          {mode !== "password" && <div className="field"><label htmlFor="email">이메일</label><input id="email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></div>}
          {mode !== "reset" && <div className="field"><label htmlFor="password">비밀번호</label><input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={mode === "signin" ? undefined : 10} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />{mode !== "signin" && <span className="fine">10자 이상으로 설정해 주세요.</span>}</div>}
          <button className="hub-submit" disabled={busy || !client}>{busy ? "처리 중…" : mode === "signup" ? "계정 만들기" : mode === "reset" ? "재설정 이메일 받기" : mode === "password" ? "비밀번호 변경" : "로그인"}<ArrowRight size={18} /></button>
        </form>}
        <div className="hub-auth-links">{mode !== "signin" && <button disabled={busy} onClick={() => { setMode("signin"); setError(""); setNotice(""); setPassword(""); }}>로그인으로 돌아가기</button>}{mode === "signin" && <><button disabled={busy} onClick={() => { setMode("signup"); setError(""); setNotice(""); }}>회원가입</button><button disabled={busy} onClick={() => { setMode("reset"); setError(""); setNotice(""); }}>비밀번호를 잊으셨나요?</button></>}</div>
        <p className="fine">개인 개발용 · 계정별 데이터 분리<br />작업자·관리자는 같은 계정에서 전환하는 화면입니다.</p>
      </div>}
    </section>
  </main>;
}

createRoot(document.getElementById("root")!).render(<App />);
