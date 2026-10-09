import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Boxes, Box, CheckCircle2, Wrench, Search, Download, FileText, Plus, Pencil, Trash2,
  ArrowRightLeft, Undo2, X, HandHelping, ImagePlus, Image, Printer,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/registry")({
  head: () => ({
    meta: [
      { title: "ระบบทะเบียนครุภัณฑ์และยืมคืนอุปกรณ์" },
      { name: "description", content: "บันทึก ค้นหา ติดตาม และยืมคืนครุภัณฑ์ของหน่วยงาน" },
      { property: "og:title", content: "ระบบทะเบียนครุภัณฑ์และยืมคืนอุปกรณ์" },
      { property: "og:description", content: "บันทึก ค้นหา ติดตาม และยืมคืนครุภัณฑ์ของหน่วยงาน" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Status = "ใช้งานได้" | "รอซ่อม" | "ชำรุด" | "ถูกยืม";
type Item = { id: string; code: string; name: string; category: string; location: string; acquired: string; status: Status; image?: string };
type Loan = { id: string; itemId: string; borrower: string; dept: string; borrowDate: string; dueDate: string; returnDate?: string; note?: string };

const CATEGORIES = ["คอมพิวเตอร์และอุปกรณ์", "เครื่องมือแพทย์", "เครื่องใช้สำนักงาน", "อื่น ๆ"] as const;
const STATUSES = ["ใช้งานได้", "ถูกยืม", "รอซ่อม", "ชำรุด"] as const satisfies readonly Status[];

const SEED: Item[] = [
  { id: "1", code: "ครภ.001/2568", name: "คอมพิวเตอร์โน้ตบุ๊ก Lenovo ThinkPad", category: CATEGORIES[0], location: "ห้องทำงานกลุ่มงานวิชาการ", acquired: "2025-03-12", status: "ใช้งานได้" },
  { id: "2", code: "ครภ.002/2567", name: "เครื่องวัดความดันโลหิตดิจิทัล Omron", category: CATEGORIES[1], location: "ห้องตรวจสุขภาพ", acquired: "2024-06-20", status: "ใช้งานได้" },
  { id: "3", code: "ครภ.003/2566", name: "เครื่องพิมพ์เลเซอร์ HP LaserJet", category: CATEGORIES[2], location: "ห้องสารบรรณ", acquired: "2023-11-05", status: "รอซ่อม" },
  { id: "4", code: "ครภ.004/2565", name: "โต๊ะทำงานไม้ 120 ซม.", category: CATEGORIES[2], location: "ห้องประชุม 2", acquired: "2022-01-15", status: "ใช้งานได้" },
  { id: "5", code: "ครภ.005/2564", name: "โปรเจกเตอร์ Epson", category: CATEGORIES[0], location: "ห้องประชุม 1", acquired: "2021-08-02", status: "ชำรุด" },
];

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "-");
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปได้"));
    reader.onload = () => {
      const img = document.createElement("img");
      img.onerror = () => reject(new Error("ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ"));
      img.onload = () => {
        const max = 900;
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("ไม่สามารถประมวลผลรูปได้"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      if (typeof reader.result === "string") img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function usePersist<T>(key: string, init: T) {
  const [v, setV] = useState<T>(init);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const s = localStorage.getItem(key);
    if (s) setV(JSON.parse(s));
    setReady(true);
  }, [key]);
  useEffect(() => { if (ready) localStorage.setItem(key, JSON.stringify(v)); }, [key, v, ready]);
  return [v, setV] as const;
}

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
}

const badge: Record<Status, string> = {
  "ใช้งานได้": "bg-success-soft text-success border-success/30",
  "ถูกยืม": "bg-info-soft text-info border-info/30",
  "รอซ่อม": "bg-warning-soft text-warning border-warning/30",
  "ชำรุด": "bg-destructive/10 text-destructive border-destructive/30",
};

const field = "w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30";
const btnOutline = "inline-flex items-center gap-2 rounded-xl border border-input bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted";
const btnPrimary = "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50";
const card = "rounded-2xl border border-border bg-card shadow-sm";

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`${card} max-h-[90dvh] w-full ${wide ? "max-w-4xl" : "max-w-lg"} overflow-y-auto p-6`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <Button type="button" variant="ghost" size="icon" aria-label="ปิด" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        {children}
      </div>
    </div>
  );
}

const L = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block space-y-1.5"><span className="text-sm font-medium text-muted-foreground">{label}</span>{children}</label>
);

function Index() {
  const [items, setItems] = usePersist<Item[]>("inv-items", SEED);
  const [loans, setLoans] = usePersist<Loan[]>("inv-loans", []);
  const [tab, setTab] = useState<"items" | "loans">("items");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [st, setSt] = useState("");
  const [edit, setEdit] = useState<Item | null>(null);
  const [borrowFor, setBorrowFor] = useState<Item | null>(null);
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnFor, setReturnFor] = useState<Loan | null>(null);
  const [report, setReport] = useState(false);

  const filtered = items.filter((i) =>
    (!q || [i.name, i.code, i.location].some((s) => s.toLowerCase().includes(q.toLowerCase()))) &&
    (!cat || i.category === cat) && (!st || i.status === st));

  const activeLoans = loans.filter((l) => !l.returnDate);
  const overdue = activeLoans.filter((l) => l.dueDate < today()).length;
  const itemOf = (id: string) => items.find((i) => i.id === id);

  const saveItem = (it: Item) => {
    setItems((p) => (p.some((x) => x.id === it.id) ? p.map((x) => (x.id === it.id ? it : x)) : [...p, it]));
    setEdit(null);
  };
  const delItem = (id: string) => {
    if (activeLoans.some((l) => l.itemId === id)) return alert("ครุภัณฑ์นี้กำลังถูกยืมอยู่ ไม่สามารถลบได้");
    if (confirm("ยืนยันการลบรายการนี้?")) setItems((p) => p.filter((x) => x.id !== id));
  };
  const borrow = (l: Loan) => {
    setLoans((p) => [l, ...p]);
    setItems((p) => p.map((x) => (x.id === l.itemId ? { ...x, status: "ถูกยืม" } : x)));
    setBorrowFor(null);
    setBorrowOpen(false);
  };
  const giveBack = (l: Loan) => {
    setLoans((p) => p.map((x) => (x.id === l.id ? { ...x, returnDate: l.returnDate ?? today() } : x)));
    setItems((p) => p.map((x) => (x.id === l.itemId ? { ...x, status: "ใช้งานได้" } : x)));
    setReturnOpen(false);
    setReturnFor(null);
  };
  const quickReturn = (itemId: string) => {
    const l = loans.find((x) => x.itemId === itemId && !x.returnDate);
    if (l) { setReturnFor(l); setReturnOpen(true); }
  };

  const stats = [
    { label: "รายการทั้งหมด", value: items.length, icon: Box, tone: "text-foreground", ic: "text-primary" },
    { label: "ใช้งานได้", value: items.filter((i) => i.status === "ใช้งานได้").length, icon: CheckCircle2, tone: "text-success", ic: "text-success" },
    { label: "กำลังถูกยืม", value: activeLoans.length, icon: ArrowRightLeft, tone: "text-info", ic: "text-info" },
    { label: "รอซ่อม / ชำรุด", value: items.filter((i) => i.status === "รอซ่อม" || i.status === "ชำรุด").length, icon: Wrench, tone: "text-warning", ic: "text-warning" },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground"><Boxes className="h-6 w-6" /></div>
            <div>
              <h1 className="text-xl font-bold">ระบบทะเบียนครุภัณฑ์</h1>
              <p className="text-xs text-muted-foreground">บันทึก ค้นหา ติดตาม และยืมคืนครุภัณฑ์ของหน่วยงาน</p>
            </div>
          </div>
          <button className={btnPrimary} onClick={() => setEdit({ id: "", code: "", name: "", category: CATEGORIES[0], location: "", acquired: today(), status: "ใช้งานได้", image: "" })}>
            <Plus className="h-4 w-4" /> เพิ่มครุภัณฑ์
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className={`${card} p-6`}>
              <div className="flex items-start justify-between text-sm text-muted-foreground">{s.label}<s.icon className={`h-5 w-5 ${s.ic}`} /></div>
              <div className={`mt-3 text-3xl font-bold ${s.tone}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          {([["items", "ทะเบียนครุภัณฑ์"], ["loans", `ยืม-คืนอุปกรณ์${overdue ? ` (เกินกำหนด ${overdue})` : ""}`]] as const).map(([k, t]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{t}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className={btnPrimary} onClick={() => { setBorrowFor(null); setBorrowOpen(true); }}><HandHelping /> ยืมครุภัณฑ์</Button>
          <Button variant="secondary" className={btnOutline} onClick={() => { setReturnFor(null); setReturnOpen(true); }}><Undo2 /> คืนครุภัณฑ์</Button>
        </div>

        {tab === "items" ? (
          <>
            <div className={`${card} flex flex-wrap gap-3 p-5`}>
              <div className="relative min-w-60 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input className={`${field} pl-9`} placeholder="ค้นหาชื่อ เลขครุภัณฑ์ หรือสถานที่..." value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <select className={`${field} w-52`} value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="">ทุกหมวดหมู่</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select className={`${field} w-40`} value={st} onChange={(e) => setSt(e.target.value)}>
                <option value="">ทุกสถานะ</option>{STATUSES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <button className={btnOutline} onClick={() => downloadCsv("ครุภัณฑ์.csv", [["เลขครุภัณฑ์", "ชื่อรายการ", "หมวดหมู่", "สถานที่", "วันที่ได้มา", "สถานะ"], ...filtered.map((i) => [i.code, i.name, i.category, i.location, i.acquired, i.status])])}>
                <Download className="h-4 w-4" /> ส่งออก CSV
              </button>
              <button className={btnOutline} onClick={() => setReport(true)}><FileText className="h-4 w-4" /> รายงานรายเดือน</button>
            </div>

            <div className={`${card} overflow-x-auto`}>
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-muted-foreground">
                  <tr>{["รูป", "เลขครุภัณฑ์", "ชื่อรายการ", "หมวดหมู่", "สถานที่", "วันที่ได้มา", "สถานะ"].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}<th className="px-5 py-3 text-right font-medium">จัดการ</th></tr>
                </thead>
                <tbody>
                  {filtered.map((i) => (
                    <tr key={i.id} className="border-b border-border last:border-0 hover:bg-secondary/60">
                      <td className="px-5 py-3.5">
                        <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-lg border border-border bg-muted">
                          {i.image ? <img src={i.image} alt={`รูป ${i.name}`} className="h-full w-full object-cover" /> : <Image className="h-5 w-5 text-muted-foreground" />}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs">{i.code}</td>
                      <td className="px-5 py-3.5 font-semibold">{i.name}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{i.category}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{i.location}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{fmt(i.acquired)}</td>
                      <td className="px-5 py-3.5"><span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge[i.status]}`}>{i.status}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          {i.status === "ถูกยืม" ? (
                            <button title="รับคืน" onClick={() => quickReturn(i.id)} className="rounded-lg p-2 text-info hover:bg-muted"><Undo2 className="h-4 w-4" /></button>
                          ) : (
                            <button title="ยืม" disabled={i.status !== "ใช้งานได้"} onClick={() => { setBorrowFor(i); setBorrowOpen(true); }} className="rounded-lg p-2 text-primary hover:bg-muted disabled:opacity-30"><HandHelping className="h-4 w-4" /></button>
                          )}
                          <button title="แก้ไข" onClick={() => setEdit(i)} className="rounded-lg p-2 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                          <button title="ลบ" onClick={() => delItem(i.id)} className="rounded-lg p-2 text-destructive hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && <tr><td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">ไม่พบรายการ</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className={`${card} overflow-x-auto`}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="font-bold">ประวัติการยืม-คืน</h2>
              <button className={btnOutline} onClick={() => downloadCsv("ยืมคืน.csv", [["เลขครุภัณฑ์", "ชื่อรายการ", "ผู้ยืม", "หน่วยงาน", "วันที่ยืม", "กำหนดคืน", "วันที่คืน"], ...loans.map((l) => [itemOf(l.itemId)?.code ?? "", itemOf(l.itemId)?.name ?? "", l.borrower, l.dept, l.borrowDate, l.dueDate, l.returnDate ?? "ยังไม่คืน"])])}>
                <Download className="h-4 w-4" /> ส่งออก CSV
              </button>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>{["ครุภัณฑ์", "ผู้ยืม", "วันที่ยืม", "กำหนดคืน", "วันที่คืน", "สถานะ"].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}<th className="px-5 py-3 text-right font-medium">จัดการ</th></tr>
              </thead>
              <tbody>
                {loans.map((l) => {
                  const it = itemOf(l.itemId);
                  const late = !l.returnDate && l.dueDate < today();
                  const s = l.returnDate ? ["คืนแล้ว", badge["ใช้งานได้"]] : late ? ["เกินกำหนด", badge["ชำรุด"]] : ["กำลังยืม", badge["ถูกยืม"]];
                  return (
                    <tr key={l.id} className="border-b border-border last:border-0 hover:bg-secondary/60">
                      <td className="px-5 py-3.5"><div className="font-semibold">{it?.name ?? "(ถูกลบ)"}</div><div className="font-mono text-xs text-muted-foreground">{it?.code}</div></td>
                      <td className="px-5 py-3.5"><div>{l.borrower}</div><div className="text-xs text-muted-foreground">{l.dept}</div></td>
                      <td className="px-5 py-3.5 text-muted-foreground">{fmt(l.borrowDate)}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{fmt(l.dueDate)}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{fmt(l.returnDate)}</td>
                      <td className="px-5 py-3.5"><span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s[1]}`}>{s[0]}</span></td>
                      <td className="px-5 py-3.5 text-right">
                        {!l.returnDate && <Button variant="secondary" className={btnOutline} onClick={() => { setReturnFor(l); setReturnOpen(true); }}><Undo2 className="h-4 w-4" /> รับคืน</Button>}
                      </td>
                    </tr>
                  );
                })}
                {!loans.length && <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">ยังไม่มีการยืม — กดไอคอนยืมในหน้าทะเบียนครุภัณฑ์เพื่อเริ่ม</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {edit && <ItemForm initial={edit} onClose={() => setEdit(null)} onSave={saveItem} />}
      {borrowOpen && <BorrowForm items={items.filter((i) => i.status === "ใช้งานได้")} initial={borrowFor} onClose={() => { setBorrowFor(null); setBorrowOpen(false); }} onSave={borrow} />}
      {returnOpen && <ReturnForm items={items} loans={activeLoans} initial={returnFor} onClose={() => { setReturnOpen(false); setReturnFor(null); }} onSave={giveBack} />}
      {report && <Report items={items} loans={loans} onClose={() => setReport(false)} />}
    </div>
  );
}

function ItemForm({ initial, onClose, onSave }: { initial: Item; onClose: () => void; onSave: (i: Item) => void }) {
  const [f, setF] = useState(initial);
  const [imageError, setImageError] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const set = (k: keyof Item) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const chooseImage = async (file?: File) => {
    if (!file) return;
    setImageLoading(true);
    setImageError("");
    try {
      const image = await resizeImage(file);
      setF((current) => ({ ...current, image }));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "ไม่สามารถเพิ่มรูปได้");
    } finally {
      setImageLoading(false);
    }
  };
  return (
    <Modal title={initial.id ? "แก้ไขครุภัณฑ์" : "เพิ่มครุภัณฑ์"} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave({ ...f, id: f.id || uid() }); }}>
        <L label="เลขครุภัณฑ์"><input required className={field} value={f.code} onChange={set("code")} placeholder="ครภ.006/2568" /></L>
        <L label="ชื่อรายการ"><input required className={field} value={f.name} onChange={set("name")} /></L>
        <div className="grid grid-cols-2 gap-3">
          <L label="หมวดหมู่"><select className={field} value={f.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></L>
          <L label="สถานะ"><select className={field} value={f.status} onChange={set("status")}>{STATUSES.map((c) => <option key={c}>{c}</option>)}</select></L>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <L label="สถานที่"><input required className={field} value={f.location} onChange={set("location")} /></L>
          <L label="วันที่ได้มา"><input type="date" className={field} value={f.acquired} onChange={set("acquired")} /></L>
        </div>
        <L label="รูปครุภัณฑ์">
          <div className="flex items-center gap-3 rounded-xl border border-input bg-card p-3">
            <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted">
              {f.image ? <img src={f.image} alt="ตัวอย่างรูปครุภัณฑ์" className="h-full w-full object-cover" /> : <Image className="h-7 w-7 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <label className={`${btnOutline} cursor-pointer justify-center`}>
                <ImagePlus className="h-4 w-4" /> {imageLoading ? "กำลังเตรียมรูป..." : f.image ? "เปลี่ยนรูป" : "เลือกรูป"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={imageLoading} onChange={(e) => void chooseImage(e.target.files?.[0])} />
              </label>
              {f.image && <Button type="button" variant="ghost" className="w-full text-destructive" onClick={() => setF((current) => ({ ...current, image: "" }))}>ลบรูป</Button>}
              <p className="text-xs text-muted-foreground">รองรับ JPG, PNG และ WebP</p>
            </div>
          </div>
          {imageError && <span className="text-xs text-destructive">{imageError}</span>}
        </L>
        <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnOutline} onClick={onClose}>ยกเลิก</button><button className={btnPrimary}>บันทึก</button></div>
      </form>
    </Modal>
  );
}

function BorrowForm({ items, initial, onClose, onSave }: { items: Item[]; initial: Item | null; onClose: () => void; onSave: (l: Loan) => void }) {
  const due = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const [f, setF] = useState<Loan>({ id: uid(), itemId: initial?.id ?? "", borrower: "", dept: "", borrowDate: today(), dueDate: due, note: "" });
  const item = items.find((i) => i.id === f.itemId);
  const set = (k: keyof Loan) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="ยืมครุภัณฑ์" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (item) onSave(f); }}>
        <L label="เลขครุภัณฑ์"><select required className={field} value={f.itemId} onChange={set("itemId")}><option value="">เลือกครุภัณฑ์</option>{items.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}</select></L>
        {!items.length && <p className="text-sm text-muted-foreground">ไม่มีครุภัณฑ์ที่พร้อมให้ยืม</p>}
        <L label="ชื่อรายการ"><input className={field} readOnly value={item?.name ?? ""} /></L>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <L label="ชื่อผู้ยืม"><input required className={field} value={f.borrower} onChange={set("borrower")} /></L>
          <L label="หน่วยงาน"><input required className={field} value={f.dept} onChange={set("dept")} /></L>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <L label="วันที่ยืม"><input required type="date" className={field} value={f.borrowDate} onChange={set("borrowDate")} /></L>
          <L label="กำหนดคืน"><input required type="date" min={f.borrowDate} className={field} value={f.dueDate} onChange={set("dueDate")} /></L>
        </div>
        <L label="หมายเหตุ / วัตถุประสงค์"><input className={field} value={f.note} onChange={set("note")} /></L>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" className={btnOutline} onClick={onClose}>ยกเลิก</Button><Button type="submit" className={btnPrimary} disabled={!item}>บันทึกการยืม</Button></div>
      </form>
    </Modal>
  );
}

function ReturnForm({ items, loans, initial, onClose, onSave }: { items: Item[]; loans: Loan[]; initial: Loan | null; onClose: () => void; onSave: (l: Loan) => void }) {
  const [loanId, setLoanId] = useState(initial?.id ?? "");
  const [returnDate, setReturnDate] = useState(today());
  const loan = loans.find((l) => l.id === loanId);
  const item = items.find((i) => i.id === loan?.itemId);
  return (
    <Modal title="คืนครุภัณฑ์" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (loan && item) onSave({ ...loan, returnDate }); }}>
        <L label="เลขครุภัณฑ์"><select required className={field} value={loanId} onChange={(e) => setLoanId(e.target.value)}><option value="">เลือกครุภัณฑ์ที่ต้องการคืน</option>{loans.map((l) => { const i = items.find((x) => x.id === l.itemId); return <option key={l.id} value={l.id}>{i?.code} — {i?.name}</option>; })}</select></L>
        {!loans.length && <p className="text-sm text-muted-foreground">ไม่มีครุภัณฑ์ที่ค้างคืน</p>}
        <L label="ชื่อรายการ"><input className={field} readOnly value={item?.name ?? ""} /></L>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <L label="ชื่อผู้ยืม"><input className={field} readOnly value={loan?.borrower ?? ""} /></L>
          <L label="หน่วยงาน"><input className={field} readOnly value={loan?.dept ?? ""} /></L>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <L label="วันที่ยืม"><input type="date" className={field} readOnly value={loan?.borrowDate ?? ""} /></L>
          <L label="กำหนดคืน"><input type="date" className={field} readOnly value={loan?.dueDate ?? ""} /></L>
        </div>
        <L label="วันที่คืน"><input required type="date" min={loan?.borrowDate} className={field} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} /></L>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" className={btnOutline} onClick={onClose}>ยกเลิก</Button><Button type="submit" className={btnPrimary} disabled={!loan || !item}>บันทึกการคืน</Button></div>
      </form>
    </Modal>
  );
}

function Report({ items, loans, onClose }: { items: Item[]; loans: Loan[]; onClose: () => void }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const report = useMemo(() => {
    const monthEnd = `${month}-31`;
    const added = items.filter((i) => i.acquired.startsWith(month));
    const cumulative = items.filter((i) => i.acquired <= monthEnd);
    const statuses: [string, number][] = STATUSES.map((status) => [status, cumulative.filter((i) => i.status === status).length]);
    const categories: [string, number][] = CATEGORIES.map((category) => [category, cumulative.filter((i) => i.category === category).length]);
    return { added, cumulative, statuses, categories };
  }, [items, month]);
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  const csvRows: (string | number)[][] = [
    ["รายงานครุภัณฑ์ประจำเดือน", monthLabel],
    ["ได้มาในเดือนนี้", report.added.length],
    ["ยอดสะสมถึงสิ้นเดือน", report.cumulative.length],
    [],
    ["รายการที่ได้มาในเดือนนี้"],
    ["เลขครุภัณฑ์", "ชื่อ", "หมวดหมู่", "สถานะ"],
    ...report.added.map((i) => [i.code, i.name, i.category, i.status]),
    [],
    ["สรุปตามสถานะ", "จำนวน"],
    ...report.statuses.map(([label, count]) => [label, count]),
    [],
    ["สรุปตามหมวดหมู่", "จำนวน"],
    ...report.categories.map(([label, count]) => [label, count]),
  ];
  return (
    <Modal title="รายงานครุภัณฑ์รายเดือน" onClose={onClose} wide>
      <div className="report-print space-y-5">
        <L label="เลือกเดือน"><input type="month" className={`${field} w-full sm:w-48`} value={month} onChange={(e) => setMonth(e.target.value)} /></L>
        <h3 className="text-lg font-bold">รายงานครุภัณฑ์ประจำเดือน {monthLabel}</h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-4"><div className="text-sm text-muted-foreground">ได้มาในเดือนนี้</div><div className="mt-1 text-2xl font-bold">{report.added.length} รายการ</div></div>
          <div className="rounded-xl border border-border p-4"><div className="text-sm text-muted-foreground">ยอดสะสมถึงสิ้นเดือน</div><div className="mt-1 text-2xl font-bold">{report.cumulative.length} รายการ</div></div>
        </div>

        <ReportTable title="รายการที่ได้มาในเดือนนี้" headers={["เลขครุภัณฑ์", "ชื่อ", "หมวดหมู่", "สถานะ"]} empty="ไม่มีรายการในเดือนนี้">
          {report.added.map((i) => <tr key={i.id} className="border-b border-border last:border-0"><td className="py-2 pr-3 font-mono text-xs">{i.code}</td><td className="px-3 py-2 font-medium">{i.name}</td><td className="px-3 py-2">{i.category}</td><td className="py-2 pl-3">{i.status}</td></tr>)}
        </ReportTable>

        <ReportTable title="สรุปตามสถานะ (ยอดสะสมถึงสิ้นเดือน)" headers={["รายการ", "จำนวน"]}>
          {report.statuses.map(([label, count]) => <tr key={label} className="border-b border-border last:border-0"><td className="py-2 pr-3">{label}</td><td className="py-2 pl-3">{count}</td></tr>)}
        </ReportTable>

        <ReportTable title="สรุปตามหมวดหมู่ (ยอดสะสมถึงสิ้นเดือน)" headers={["รายการ", "จำนวน"]}>
          {report.categories.map(([label, count]) => <tr key={label} className="border-b border-border last:border-0"><td className="py-2 pr-3">{label}</td><td className="py-2 pl-3">{count}</td></tr>)}
        </ReportTable>
      </div>
      <div className="report-actions flex flex-wrap justify-end gap-2 pt-5">
        <Button variant="secondary" className={btnOutline} onClick={() => downloadCsv(`รายงานครุภัณฑ์-${month}.csv`, csvRows)}><Download className="h-4 w-4" /> ดาวน์โหลด CSV</Button>
        <Button className={btnPrimary} onClick={() => window.print()}><Printer className="h-4 w-4" /> พิมพ์รายงาน</Button>
      </div>
    </Modal>
  );
}

function ReportTable({ title, headers, empty, children }: { title: string; headers: string[]; empty?: string; children: ReactNode }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section>
      <h4 className="mb-2 font-bold">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-left text-muted-foreground">{headers.map((header) => <th key={header} className="py-2 pr-3 font-semibold last:pl-3">{header}</th>)}</tr></thead>
          <tbody>{hasRows ? children : <tr><td colSpan={headers.length} className="py-3 text-muted-foreground">{empty}</td></tr>}</tbody>
        </table>
      </div>
    </section>
  );
}
