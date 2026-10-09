import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "เข้าสู่ระบบ | ระบบทะเบียนครุภัณฑ์" },
    { name: "description", content: "เข้าสู่ระบบสำหรับเจ้าหน้าที่เพื่อจัดการทะเบียนครุภัณฑ์" },
    { property: "og:title", content: "เข้าสู่ระบบ | ระบบทะเบียนครุภัณฑ์" },
    { property: "og:description", content: "เข้าสู่ระบบสำหรับเจ้าหน้าที่เพื่อจัดการทะเบียนครุภัณฑ์" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthPage,
});

const field = "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30";

function AuthPage() {
  const navigate = useNavigate();
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    if (signup) {
      const result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { display_name: name, department } } });
      setBusy(false);
      if (result.error) return setError(result.error.message);
      if (!result.data.session) { setSignup(false); setNotice("สมัครสำเร็จ กรุณาตรวจอีเมลและกดลิงก์ยืนยันก่อนเข้าสู่ระบบ"); return; }
    } else {
      const result = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (result.error) return setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
    await navigate({ to: "/registry", replace: true });
  };

  const google = async () => {
    setBusy(true); setError("");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    setBusy(false);
    if (result.error) setError("ไม่สามารถเข้าสู่ระบบด้วย Google ได้");
    else if (!result.redirected) await navigate({ to: "/registry", replace: true });
  };

  return <main className="grid min-h-screen place-items-center px-4 py-10">
    <section className="w-full max-w-md rounded-lg border border-border bg-card p-7 shadow-sm">
      <div className="mb-6 text-center"><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-primary text-primary-foreground"><Boxes /></div><h1 className="text-2xl font-bold">ระบบทะเบียนครุภัณฑ์</h1><p className="mt-1 text-sm text-muted-foreground">สำหรับเจ้าหน้าที่ผู้มีสิทธิ์จัดการข้อมูล</p></div>
      <div className="mb-5 grid grid-cols-2 rounded-lg bg-secondary p-1"><Button type="button" variant={!signup ? "default" : "ghost"} onClick={() => setSignup(false)}>เข้าสู่ระบบ</Button><Button type="button" variant={signup ? "default" : "ghost"} onClick={() => setSignup(true)}>สมัครบัญชี</Button></div>
      <form className="space-y-4" onSubmit={submit}>
        {signup && <><label className="block space-y-1 text-sm font-medium">ชื่อที่แสดง<input required className={field} value={name} onChange={(e) => setName(e.target.value)} /></label><label className="block space-y-1 text-sm font-medium">แผนก<input required className={field} value={department} onChange={(e) => setDepartment(e.target.value)} /></label></>}
        <label className="block space-y-1 text-sm font-medium">อีเมล<input required type="email" autoComplete="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="block space-y-1 text-sm font-medium">รหัสผ่าน<input required minLength={8} type="password" autoComplete={signup ? "new-password" : "current-password"} className={field} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}{notice && <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">{notice}</p>}
        <Button className="w-full" disabled={busy}>{busy ? "กำลังดำเนินการ..." : signup ? "สมัครบัญชี" : "เข้าสู่ระบบ"}</Button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />หรือ<span className="h-px flex-1 bg-border" /></div>
      <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void google()}><span className="font-bold">G</span> ดำเนินการต่อด้วย Google</Button>
    </section>
  </main>;
}