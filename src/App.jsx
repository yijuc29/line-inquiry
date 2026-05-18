import { useState, useEffect, useRef } from "react";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs";

// ─── 設定區 ────────────────────────────────────────────────────
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxYhlllyNApKSUATQOSoEiB_B2yk-ueWiItmgcIsY9nVHUciydc8oMPKRFiHJ3st9aOFQ/exec";

// ─── 常數 ────────────────────────────────────────────────────
const STORE_KEY = "yiju_inquiries_v2";
const BRANDS = ["HINO", "ISUZU", "MITSUBISHI", "SCANIA", "MAN", "MERCEDES", "FORD", "其他"];
const STATUS_CONFIG = {
  pending:   { label: "待報價", color: "#B8860B", bg: "#FEF9C3" },
  quoted:    { label: "已報價", color: "#1565C0", bg: "#DBEAFE" },
  deal:      { label: "已成交", color: "#1B5E20", bg: "#D1FAE5" },
  cancel:    { label: "取消",   color: "#7F1D1D", bg: "#FEE2E2" },
};
const PRODUCTS = [
  { id: "freezer", label: "冷凍機",   icon: "❄" },
  { id: "body",    label: "保溫車廂", icon: "🚛" },
  { id: "panel",   label: "冷凍隔板", icon: "📦" },
  { id: "repair",  label: "維修",     icon: "🔧" },
  { id: "other",   label: "其他",     icon: "📋" },
];

// ─── 工具函數 ─────────────────────────────────────────────────
function genId() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
  const recs = loadRecords();
  const todayCount = recs.filter(r => r.id && r.id.includes(date)).length;
  return `INQ-${date}-${String(todayCount + 1).padStart(3,"0")}`;
}
function loadRecords() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; }
}
function saveRecords(recs) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(recs)); } catch { alert("儲存空間不足，請先匯出備份"); }
}

// ─── 樣式常數 ─────────────────────────────────────────────────
const C = {
  bg:    "#0A1520",
  bg2:   "#0F1E2E",
  bg3:   "#142436",
  line:  "#1C3044",
  blue:  "#00A8E8",
  text:  "#C8D8E4",
  muted: "#4A7090",
  green: "#00C300",
};
const FIELD = {
  width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${C.line}`,
  background:C.bg2, color:C.text, fontSize:14, fontFamily:"inherit", outline:"none",
};
const BTN_PRIMARY = {
  padding:"12px 20px", borderRadius:9, border:"none", background:C.blue,
  color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
};
const BTN_GHOST = {
  padding:"8px 14px", borderRadius:8, border:`1px solid ${C.line}`,
  background:"transparent", color:C.muted, fontSize:13, cursor:"pointer", fontFamily:"inherit",
};

// ─── 通用元件 ─────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:12, color:C.muted, marginBottom:5 }}>
        {label}{required && <span style={{ color:C.blue }}> *</span>}
      </div>
      {children}
    </div>
  );
}
function Input({ value, onChange, placeholder, type="text", readOnly }) {
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)}
    placeholder={placeholder} readOnly={readOnly} style={{...FIELD, opacity: readOnly?0.6:1}} />;
}
function Textarea({ value, onChange, placeholder, rows=3 }) {
  return <textarea value={value} onChange={e=>onChange(e.target.value)}
    placeholder={placeholder} rows={rows} style={{...FIELD, resize:"vertical", lineHeight:1.5}} />;
}
function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={FIELD}>
      <option value="">{placeholder||"請選擇"}</option>
      {options.map(o => typeof o === "string"
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.v} value={o.v}>{o.l}</option>
      )}
    </select>
  );
}
function Toggle({ options, value, onChange }) {
  return (
    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
      {options.map(o => (
        <button key={o} onClick={()=>onChange(o)} style={{
          padding:"7px 14px", borderRadius:7, border:"1px solid", cursor:"pointer", fontFamily:"inherit",
          borderColor: value===o ? C.blue : C.line,
          background:  value===o ? "#001A2A" : "transparent",
          color:       value===o ? C.blue : C.muted, fontSize:13,
        }}>{o}</button>
      ))}
    </div>
  );
}
function Section({ title, accent=C.blue, children }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <div style={{ width:3, height:16, borderRadius:2, background:accent }} />
        <span style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:accent, textTransform:"uppercase" }}>{title}</span>
        <div style={{ flex:1, height:1, background:C.line }} />
      </div>
      {children}
    </div>
  );
}
function Badge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:c.bg, color:c.color, fontWeight:700 }}>{c.label}</span>;
}

// ─── 子表單 ───────────────────────────────────────────────────
function FreezerForm({ data, set }) {
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
        <Field label="品牌" required><Select value={data.brand||""} onChange={v=>set({...data,brand:v})} options={BRANDS} /></Field>
        <Field label="噸數"><Input value={data.ton||""} onChange={v=>set({...data,ton:v})} placeholder="噸" /></Field>
        <Field label="呎數"><Input value={data.feet||""} onChange={v=>set({...data,feet:v})} placeholder="呎" /></Field>
      </div>
      <Field label="類型" required><Toggle options={["冷凍","冷藏","其他"]} value={data.type||""} onChange={v=>set({...data,type:v})} /></Field>
      {data.type==="其他" && <Field label="類型說明"><Input value={data.typeNote||""} onChange={v=>set({...data,typeNote:v})} placeholder="請說明" /></Field>}
      <Field label="載運貨物類型" required><Input value={data.cargo||""} onChange={v=>set({...data,cargo:v})} placeholder="例：生鮮食品、冷凍食品" /></Field>
      <Field label="使用冷媒"><Toggle options={["R134a","R404a"]} value={data.refrigerant||""} onChange={v=>set({...data,refrigerant:v})} /></Field>
      <Field label="其他說明"><Textarea value={data.note||""} onChange={v=>set({...data,note:v})} placeholder="其他需求或備註" /></Field>
    </div>
  );
}

function PanelForm({ data, set }) {
  return (
    <div>
      <Field label="車廂內尺寸（公分）" required>
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:10, alignItems:"center" }}>
          <Input value={data.width||""} onChange={v=>set({...data,width:v})} type="number" placeholder="寬" />
          <span style={{ color:C.muted }}>×</span>
          <Input value={data.height||""} onChange={v=>set({...data,height:v})} type="number" placeholder="高" />
        </div>
      </Field>
      <Field label="饅頭（車頂形狀）"><Toggle options={["有饅頭","沒有饅頭"]} value={data.top||""} onChange={v=>set({...data,top:v})} /></Field>
      <Field label="數量"><Input value={data.qty||""} onChange={v=>set({...data,qty:v})} type="number" placeholder="片數" /></Field>
      <Field label="其他說明"><Textarea value={data.note||""} onChange={v=>set({...data,note:v})} placeholder="其他需求或備註" /></Field>
    </div>
  );
}

function BodyForm({ data, set }) {
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
        <Field label="品牌" required><Select value={data.brand||""} onChange={v=>set({...data,brand:v})} options={BRANDS} /></Field>
        <Field label="噸數"><Input value={data.ton||""} onChange={v=>set({...data,ton:v})} placeholder="噸" /></Field>
        <Field label="呎數"><Input value={data.feet||""} onChange={v=>set({...data,feet:v})} placeholder="呎" /></Field>
      </div>
      <Field label="底盤車型式"><Input value={data.chassis||""} onChange={v=>set({...data,chassis:v})} placeholder="例：平台式" /></Field>
      <Field label="車廂外尺寸（mm）">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          <Input value={data.outL||""} onChange={v=>set({...data,outL:v})} placeholder="長" />
          <Input value={data.outW||""} onChange={v=>set({...data,outW:v})} placeholder="寬" />
          <Input value={data.outH||""} onChange={v=>set({...data,outH:v})} placeholder="高" />
        </div>
      </Field>
      <Field label="車廂內尺寸（mm）">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          <Input value={data.inL||""} onChange={v=>set({...data,inL:v})} placeholder="長" />
          <Input value={data.inW||""} onChange={v=>set({...data,inW:v})} placeholder="寬" />
          <Input value={data.inH||""} onChange={v=>set({...data,inH:v})} placeholder="高" />
        </div>
      </Field>
      <Field label="距地高（mm）"><Input value={data.ground||""} onChange={v=>set({...data,ground:v})} placeholder="距地高" /></Field>
      <Field label="溫度需求"><Toggle options={["冷凍","冷藏"]} value={data.tempType||""} onChange={v=>set({...data,tempType:v})} /></Field>
      <Field label="載運貨物類型"><Input value={data.cargo||""} onChange={v=>set({...data,cargo:v})} placeholder="例：生鮮、冷凍食品" /></Field>
      <Field label="車廂厚度"><Toggle options={["50mm","75mm","100mm","其他"]} value={data.thickness||""} onChange={v=>set({...data,thickness:v})} /></Field>
      {data.thickness==="其他" && <Field label="厚度說明"><Input value={data.thicknessNote||""} onChange={v=>set({...data,thicknessNote:v})} placeholder="請說明" /></Field>}
      <Field label="冷凍機需求"><Toggle options={["不需要","一般型","下置型"]} value={data.freezerType||""} onChange={v=>set({...data,freezerType:v})} /></Field>
      <Section title="板材規格" accent="#4A90D9">
        <Field label="外板"><Toggle options={["FRP纖維板","白鐵平板","白鐵浪板"]} value={data.outerPanel||""} onChange={v=>set({...data,outerPanel:v})} /></Field>
        <Field label="內板"><Toggle options={["烤漆平板","白鐵平板","其他"]} value={data.innerPanel||""} onChange={v=>set({...data,innerPanel:v})} /></Field>
        {data.innerPanel==="其他" && <Field label="內板說明"><Input value={data.innerPanelNote||""} onChange={v=>set({...data,innerPanelNote:v})} placeholder="請說明" /></Field>}
        <Field label="內底板"><Toggle options={["1.0白鐵花板","2.0白鐵花板","3.0白鐵花板","5.0鋁花板+骨架","底板補強","其他"]} value={data.floorPanel||""} onChange={v=>set({...data,floorPanel:v})} /></Field>
        {data.floorPanel==="其他" && <Field label="底板說明"><Input value={data.floorNote||""} onChange={v=>set({...data,floorNote:v})} placeholder="請說明" /></Field>}
        <Field label="特殊規格說明"><Textarea value={data.specialSpec||""} onChange={v=>set({...data,specialSpec:v})} placeholder="其他特殊規格" rows={2} /></Field>
      </Section>
      <Section title="標準三門" accent="#4A90D9">
        <Field label="駕駛邊"><Input value={data.doorDriver||""} onChange={v=>set({...data,doorDriver:v})} placeholder="說明" /></Field>
        <Field label="副駕邊"><Input value={data.doorPassenger||""} onChange={v=>set({...data,doorPassenger:v})} placeholder="說明" /></Field>
        <Field label="後門"><Input value={data.doorRear||""} onChange={v=>set({...data,doorRear:v})} placeholder="說明" /></Field>
        <Field label="其他門說明"><Input value={data.doorOther||""} onChange={v=>set({...data,doorOther:v})} placeholder="說明" /></Field>
      </Section>
      <Field label="新式護欄"><Toggle options={["白鐵","錏鐵","不需要"]} value={data.railing||""} onChange={v=>set({...data,railing:v})} /></Field>
      <Field label="其他配件說明"><Textarea value={data.accessories||""} onChange={v=>set({...data,accessories:v})} placeholder="其他配件或需求" /></Field>
    </div>
  );
}

// ─── PDF 產生器 ───────────────────────────────────────────────
function buildPdfRows(rec) {
  const b = rec.base || {};
  const s = rec.subForm || {};
  const prodLabel = PRODUCTS.find(p=>p.id===rec.product)?.label || rec.product;
  const rows = [
    ["詢價單編號", rec.id],
    ["填單日期", b.date || rec.createdAt?.slice(0,10) || ""],
    ["公司名稱", b.company || ""],
    ["聯絡人", b.contact || ""],
    ["電話/手機", b.phone || ""],
    ["統一編號", b.taxId || ""],
    ["地址", b.address || ""],
    ["詢價產品", prodLabel],
  ];
  if (rec.product === "freezer") {
    rows.push(["品牌", s.brand||""],["噸數", s.ton||""],["呎數", s.feet||""],
      ["類型", s.type+(s.typeNote?" - "+s.typeNote:"")],["載運貨物", s.cargo||""],
      ["使用冷媒", s.refrigerant||""],["其他說明", s.note||""]);
  } else if (rec.product === "panel") {
    rows.push(["車廂內寬(cm)", s.width||""],["車廂內高(cm)", s.height||""],
      ["饅頭", s.top||""],["數量", s.qty||""],["其他說明", s.note||""]);
  } else if (rec.product === "body") {
    rows.push(["品牌", s.brand||""],["噸數", s.ton||""],["呎數", s.feet||""],
      ["底盤型式", s.chassis||""],
      ["外尺寸L×W×H(mm)", `${s.outL||""}×${s.outW||""}×${s.outH||""}`],
      ["內尺寸L×W×H(mm)", `${s.inL||""}×${s.inW||""}×${s.inH||""}`],
      ["距地高(mm)", s.ground||""],["溫度需求", s.tempType||""],["載運貨物", s.cargo||""],
      ["車廂厚度", s.thickness+(s.thicknessNote?" - "+s.thicknessNote:"")],
      ["冷凍機", s.freezerType||""],["外板", s.outerPanel||""],
      ["內板", s.innerPanel+(s.innerPanelNote?" - "+s.innerPanelNote:"")],
      ["內底板", s.floorPanel+(s.floorNote?" - "+s.floorNote:"")],
      ["特殊規格", s.specialSpec||""],["駕駛邊門", s.doorDriver||""],
      ["副駕邊門", s.doorPassenger||""],["後門", s.doorRear||""],
      ["其他門", s.doorOther||""],["護欄", s.railing||""],["其他配件", s.accessories||""]);
  } else if (rec.product === "repair") {
    rows.push(["車型/年份", s.vehicle||""],["故障說明", s.desc||""],["其他說明", s.note||""]);
  } else {
    rows.push(["詢問內容", s.desc||""]);
  }
  return rows;
}

function generatePDF(rec, forCustomer = false) {
  const rows = buildPdfRows(rec);
  const title = forCustomer ? "客戶詢價單" : "詢價單（內部留存）";
  const trs = rows.map(r =>
    `<tr><td style="padding:6px 10px;border:.5px solid #ccc;font-size:12px;color:#555;background:#f8f8f7;width:38%;white-space:nowrap">${r[0]}</td>` +
    `<td style="padding:6px 10px;border:.5px solid #ccc;font-size:13px">${r[1]}</td></tr>`
  ).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
<style>body{font-family:serif;padding:28px;color:#222;max-width:700px;margin:auto}
h1{font-size:20px;margin-bottom:4px}
.meta{font-size:12px;color:#666;margin-bottom:16px;display:flex;gap:20px}
table{width:100%;border-collapse:collapse}
.footer{margin-top:24px;font-size:12px;color:#888;border-top:1px solid #eee;padding-top:12px}
@media print{.np{display:none}}</style></head><body>
<h1>${title}</h1>
<div class="meta"><span>編號：${rec.id}</span><span>日期：${rec.base?.date || rec.createdAt?.slice(0,10) || ""}</span><span>產品：${PRODUCTS.find(p=>p.id===rec.product)?.label||""}</span></div>
<table>${trs}</table>
<div class="footer">${forCustomer ? "感謝您的詢價，我們將於最短時間內與您聯繫。" : "此為內部留存副本，請妥善保存。"}</div>
<br><button class="np" onclick="window.print()" style="padding:8px 20px;font-size:14px;cursor:pointer">列印 / 儲存 PDF</button>
</body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${rec.id}_${forCustomer?"客戶":"內部"}.html`;
  a.click();
}

// ─── Google Sheets 送出 ───────────────────────────────────────
async function sendToSheets(rec) {
  if (!GOOGLE_SHEET_URL) return;
  try {
    const formData = new FormData();
    formData.append("data", JSON.stringify(rec));
    await fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      body: formData,
    });
  } catch (e) { console.warn("Sheets 送出失敗", e); }
}

// ─── 主元件 ───────────────────────────────────────────────────
export default function App() {
  const [view, setView]         = useState("list");
  const [base, setBase]         = useState({ date: new Date().toISOString().slice(0,10), company:"", contact:"", phone:"", taxId:"", address:"", card:null });
  const [product, setProduct]   = useState("");
  const [subForm, setSubForm]   = useState({});
  const [submitted, setSubmitted] = useState(null);
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilter] = useState("all");
  const [selected, setSelected]   = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [quotedAmt, setQuotedAmt] = useState("");
  const [toast, setToast]         = useState(null);
  const [recs, setRecs]           = useState([]);
  const [loading, setLoading]     = useState(false);

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null), 2500); }

  // 從 Google Sheets 讀取資料（JSONP 方式避免 CORS 問題）
  function fetchRecs() {
    setLoading(true);
    const cbName = "gsCallback_" + Date.now();
    const script = document.createElement("script");
    window[cbName] = function(data) {
      if (data.ok && data.records) {
        const mapped = data.records
          .filter(r => r["詢價編號"])
          .map(r => ({
            id: r["詢價編號"] || "",
            createdAt: r["建立時間"] || "",
            status: statusFromLabel(r["狀態"]),
            adminNote: r["內部備註"] || "",
            quotedAmount: r["報價金額"] || "",
            base: {
              date: r["填單日期"] || "",
              company: r["公司名稱"] || "",
              contact: r["聯絡人"] || "",
              phone: r["電話/手機"] || "",
              taxId: r["統一編號"] || "",
              address: r["地址"] || "",
            },
            product: productIdFromLabel(r["詢價產品"]),
            subForm: {
              brand: r["品牌"] || "",
              ton: r["噸數"] || "",
              feet: r["呎數"] || "",
              type: r["類型"] || "",
              cargo: r["載運貨物"] || "",
              refrigerant: r["冷媒"] || "",
              width: r["車廂內寬cm"] || "",
              height: r["車廂內高cm"] || "",
              top: r["饅頭"] || "",
              qty: r["數量"] || "",
              chassis: r["底盤型式"] || "",
              tempType: r["溫度需求"] || "",
              thickness: r["車廂厚度"] || "",
              freezerType: r["冷凍機"] || "",
              outerPanel: r["外板"] || "",
              innerPanel: r["內板"] || "",
              floorPanel: r["內底板"] || "",
              specialSpec: r["特殊規格"] || "",
              doorDriver: r["駕駛邊門"] || "",
              doorPassenger: r["副駕邊門"] || "",
              doorRear: r["後門"] || "",
              railing: r["護欄"] || "",
              accessories: r["其他配件"] || "",
              desc: r["故障說明"] || r["詢問內容"] || "",
              note: r["其他說明"] || "",
            },
          }));
        setRecs(mapped);
      }
      setLoading(false);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    script.onerror = function() { showToast("讀取失敗，請重試"); setLoading(false); };
    script.src = GOOGLE_SHEET_URL + "?callback=" + cbName;
    document.body.appendChild(script);
  }

  function statusFromLabel(label) {
    const map = {"待報價":"pending","已報價":"quoted","已成交":"deal","取消":"cancel"};
    return map[label] || "pending";
  }
  function productIdFromLabel(label) {
    const map = {"冷凍機":"freezer","保溫車廂":"body","冷凍隔板":"panel","維修":"repair","其他":"other"};
    return map[label] || "other";
  }

  useEffect(() => { if (view === "admin") fetchRecs(); }, [view]);

  function saveAndRefresh(newRecs) { setRecs([...newRecs]); }

  const canSubmit = base.company && base.contact && base.phone && product &&
    (product==="other" ? subForm.desc : true) &&
    (product==="repair" ? subForm.desc : true) &&
    (product==="freezer" ? subForm.brand && subForm.type && subForm.cargo : true) &&
    (product==="panel" ? subForm.width && subForm.height : true) &&
    (product==="body" ? subForm.brand && subForm.tempType : true);

  async function handleSubmit() {
    const rec = {
      id: genId(),
      createdAt: new Date().toISOString(),
      status: "pending",
      base: { ...base },
      product,
      subForm: { ...subForm },
      adminNote: "",
      quotedAmount: "",
    };
    await sendToSheets(rec);
    setSubmitted(rec);
    setView("done");
  }

  async function handleAdminSave() {
    if (!selected) return;
    try {
      await fetch(GOOGLE_SHEET_URL, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _action:"update", _id: selected.id, _amount: quotedAmt, _note: adminNote }),
      });
      setSelected({ ...selected, adminNote, quotedAmount: quotedAmt });
      showToast("已儲存");
      fetchRecs();
    } catch(e) { showToast("儲存失敗"); }
  }

  async function handleStatusChange(id, status) {
    const labelMap = {pending:"待報價", quoted:"已報價", deal:"已成交", cancel:"取消"};
    try {
      await fetch(GOOGLE_SHEET_URL, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _action:"update", _id: id, _status: labelMap[status] }),
      });
      if (selected?.id === id) setSelected({ ...selected, status });
      showToast("狀態已更新");
      fetchRecs();
    } catch(e) { showToast("更新失敗"); }
  }

  function handleDelete(id) {
    showToast("請直接在 Google Sheets 刪除該列");
  }

  function exportAllExcel() {
    if (!recs.length) { showToast("尚無資料"); return; }
    const allRows = [];
    recs.forEach((rec, i) => {
      if (i > 0) allRows.push({ 欄位:"", 內容:"" });
      allRows.push({ 欄位: `── ${rec.id} (${PRODUCTS.find(p=>p.id===rec.product)?.label||""}) ──`, 內容: STATUS_CONFIG[rec.status]?.label||"" });
      buildPdfRows(rec).forEach(r => allRows.push({ 欄位: r[0], 內容: r[1] }));
      allRows.push({ 欄位:"報價金額", 內容: rec.quotedAmount||"" });
      allRows.push({ 欄位:"備註", 內容: rec.adminNote||"" });
    });
    const ws = XLSX.utils.json_to_sheet(allRows);
    ws["!cols"] = [{ wch:28 }, { wch:40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "詢價紀錄");
    XLSX.writeFile(wb, `詢價紀錄_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  const filteredRecs = recs
    .filter(r => filterStatus === "all" || r.status === filterStatus)
    .filter(r => {
      if (!search) return true;
      const kw = search.toLowerCase();
      return [r.id, r.base?.company, r.base?.contact, r.base?.phone, r.product]
        .some(v => (v||"").toLowerCase().includes(kw));
    })
    .slice().reverse();

  const W = { maxWidth:520, margin:"0 auto", width:"100%" };
  const HEADER = {
    background: C.bg2, borderBottom:`1px solid ${C.line}`,
    padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between",
    position:"sticky", top:0, zIndex:50,
  };

  // ─── 送出完成畫面 ───────────────────────────────────────────
  if (view === "done" && submitted) {
    return (
      <div style={{ background:C.bg, minHeight:"100vh", color:C.text, fontFamily:"system-ui,-apple-system,sans-serif" }}>
        <div style={{ ...W, padding:"60px 20px 40px", textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
          <div style={{ fontSize:22, fontWeight:700, marginBottom:8 }}>詢價單已送出</div>
          <div style={{ fontSize:14, color:C.muted, marginBottom:4 }}>詢價編號</div>
          <div style={{ fontSize:18, fontWeight:700, color:C.blue, marginBottom:32, fontFamily:"monospace" }}>{submitted.id}</div>
          <div style={{ fontSize:13, color:C.muted, marginBottom:32 }}>我們將盡快與您聯繫，感謝您的詢價！</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <button onClick={()=>generatePDF(submitted, true)} style={{ ...BTN_PRIMARY, background:"transparent", border:`1px solid ${C.blue}`, color:C.blue }}>
              下載我的詢價單 PDF
            </button>
            <button onClick={()=>{ setBase({ date:new Date().toISOString().slice(0,10), company:"", contact:"", phone:"", taxId:"", address:"", card:null }); setProduct(""); setSubForm({}); setSubmitted(null); setView("form"); }} style={BTN_GHOST}>
              填寫新的詢價單
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 後台管理 ───────────────────────────────────────────────
  if (view === "admin") {
    return (
      <div style={{ background:C.bg, minHeight:"100vh", color:C.text, fontFamily:"system-ui,-apple-system,sans-serif" }}>
        {toast && (
          <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,.85)", color:"#fff", padding:"8px 18px", borderRadius:20, fontSize:13, zIndex:999, whiteSpace:"nowrap" }}>
            {toast}
          </div>
        )}
        <div style={HEADER}>
          <div style={{ ...W, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <button onClick={()=>setView("form")} style={{ ...BTN_GHOST, padding:"6px 12px" }}>← 返回</button>
            <span style={{ fontSize:15, fontWeight:700 }}>後台管理</span>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={fetchRecs} style={{ ...BTN_GHOST, padding:"6px 12px" }}>↻</button>
              <button onClick={exportAllExcel} style={{ ...BTN_GHOST, padding:"6px 12px", color:C.blue }}>Excel</button>
            </div>
          </div>
        </div>

        <div style={{ ...W, padding:"12px 16px" }}>
          {loading && <div style={{ textAlign:"center", padding:"30px 0", color:C.muted, fontSize:14 }}>載入中...</div>}
          {/* 搜尋 + 篩選 */}
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="搜尋編號、公司、電話..." style={{ ...FIELD, flex:1, padding:"8px 12px" }} />
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
            {[["all","全部"], ...Object.entries(STATUS_CONFIG).map(([k,v])=>[k,v.label])].map(([k,l]) => (
              <button key={k} onClick={()=>setFilter(k)} style={{
                padding:"5px 12px", borderRadius:20, border:"1px solid", cursor:"pointer", fontSize:12, fontFamily:"inherit",
                borderColor: filterStatus===k ? C.blue : C.line,
                background:  filterStatus===k ? "#001A2A" : "transparent",
                color:       filterStatus===k ? C.blue : C.muted,
              }}>{l} {k==="all" ? `(${recs.length})` : `(${recs.filter(r=>r.status===k).length})`}</button>
            ))}
          </div>

          {/* 列表 */}
          {!filteredRecs.length
            ? <div style={{ textAlign:"center", padding:"50px 0", color:C.muted }}>找不到相符紀錄</div>
            : filteredRecs.map(r => (
              <div key={r.id} onClick={()=>{ setSelected(r); setAdminNote(r.adminNote||""); setQuotedAmt(r.quotedAmount||""); }}
                style={{ background: selected?.id===r.id ? C.bg3 : C.bg2, border:`1px solid ${selected?.id===r.id?C.blue:C.line}`, borderRadius:10, padding:"12px 14px", marginBottom:8, cursor:"pointer" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:11, color:C.muted, fontFamily:"monospace" }}>{r.id}</span>
                  <Badge status={r.status} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>{r.base?.company || "(未填公司)"}</div>
                    <div style={{ fontSize:12, color:C.muted }}>{PRODUCTS.find(p=>p.id===r.product)?.icon} {PRODUCTS.find(p=>p.id===r.product)?.label} · {r.base?.contact} · {r.base?.phone}</div>
                  </div>
                  <div style={{ fontSize:11, color:C.muted }}>{r.createdAt?.slice(0,10)}</div>
                </div>
                {r.quotedAmount && <div style={{ fontSize:12, color:"#F59E0B", marginTop:4 }}>報價：{r.quotedAmount}</div>}
              </div>
            ))
          }
        </div>

        {/* 詳情抽屜 */}
        {selected && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"flex-end", zIndex:60 }}
            onClick={e=>{ if(e.target===e.currentTarget) setSelected(null); }}>
            <div style={{ width:"100%", maxWidth:520, margin:"0 auto", background:C.bg2, borderRadius:"16px 16px 0 0", padding:"20px 20px 40px", maxHeight:"88vh", overflowY:"auto" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700 }}>詢價單詳情</div>
                  <div style={{ fontSize:11, color:C.muted, fontFamily:"monospace" }}>{selected.id}</div>
                </div>
                <button onClick={()=>setSelected(null)} style={{ background:"none", border:"none", color:C.muted, fontSize:22, cursor:"pointer" }}>×</button>
              </div>

              {/* 狀態切換 */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>狀態</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {Object.entries(STATUS_CONFIG).map(([k,v]) => (
                    <button key={k} onClick={()=>handleStatusChange(selected.id, k)} style={{
                      padding:"5px 12px", borderRadius:20, border:"1px solid", cursor:"pointer", fontSize:12, fontFamily:"inherit",
                      borderColor: selected.status===k ? v.color : C.line,
                      background:  selected.status===k ? v.bg : "transparent",
                      color:       selected.status===k ? v.color : C.muted,
                    }}>{v.label}</button>
                  ))}
                </div>
              </div>

              {/* 報價金額 */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>報價金額（NT$）</div>
                <input value={quotedAmt} onChange={e=>setQuotedAmt(e.target.value)} placeholder="例：120,000" style={{ ...FIELD, marginBottom:0 }} />
              </div>

              {/* 備註 */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>內部備註</div>
                <textarea value={adminNote} onChange={e=>setAdminNote(e.target.value)} rows={3}
                  placeholder="報價說明、注意事項..." style={{ ...FIELD, resize:"vertical", lineHeight:1.5 }} />
              </div>

              <button onClick={handleAdminSave} style={{ ...BTN_PRIMARY, width:"100%", marginBottom:10 }}>儲存備註與報價</button>

              {/* 詳細資料 */}
              <div style={{ background:C.bg3, borderRadius:8, padding:"12px 14px", marginBottom:12 }}>
                {buildPdfRows(selected).map((r,i) => (
                  <div key={i} style={{ display:"flex", gap:12, padding:"5px 0", borderBottom:`1px solid ${C.line}`, fontSize:13 }}>
                    <span style={{ color:C.muted, minWidth:100, flexShrink:0 }}>{r[0]}</span>
                    <span style={{ color:C.text, wordBreak:"break-all" }}>{r[1]}</span>
                  </div>
                ))}
              </div>

              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>generatePDF(selected, false)} style={{ ...BTN_GHOST, flex:1, fontSize:12 }}>下載留存 PDF</button>
                <button onClick={()=>generatePDF(selected, true)}  style={{ ...BTN_GHOST, flex:1, fontSize:12, color:C.blue }}>下載客戶 PDF</button>
                <button onClick={()=>handleDelete(selected.id)} style={{ ...BTN_GHOST, flex:1, fontSize:12, color:"#EF4444", borderColor:"#7F1D1D" }}>刪除</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── 詢價表單 ───────────────────────────────────────────────
  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.text, fontFamily:"system-ui,-apple-system,sans-serif" }}>
      <div style={HEADER}>
        <div style={{ ...W, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700 }}>客戶詢價單</div>
            <div style={{ fontSize:11, color:C.muted }}>填寫完成後業務盡快與您聯繫</div>
          </div>
          <button onClick={()=>setView("admin")} style={{ ...BTN_GHOST, fontSize:12, padding:"6px 12px" }}>後台 →</button>
        </div>
      </div>

      <div style={{ ...W, padding:"20px 16px 80px" }}>
        <Section title="基本資料">
          <Field label="日期" required><Input type="date" value={base.date} onChange={v=>setBase({...base,date:v})} /></Field>
          <Field label="公司名稱" required><Input value={base.company} onChange={v=>setBase({...base,company:v})} placeholder="OO股份有限公司" /></Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="聯絡人" required><Input value={base.contact} onChange={v=>setBase({...base,contact:v})} placeholder="姓名" /></Field>
            <Field label="電話/手機" required><Input value={base.phone} onChange={v=>setBase({...base,phone:v})} placeholder="09XX-XXXXXX" /></Field>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="統一編號"><Input value={base.taxId} onChange={v=>setBase({...base,taxId:v})} placeholder="12345678" /></Field>
            <Field label="地址"><Input value={base.address} onChange={v=>setBase({...base,address:v})} placeholder="縣市區路號" /></Field>
          </div>
          <Field label="名片上傳">
            <label style={{ display:"block", background:C.bg3, border:`1px dashed ${C.line}`, borderRadius:8, padding:14, textAlign:"center", cursor:"pointer" }}>
              <input type="file" accept="image/*" onChange={e=>{const f=e.target.files[0];if(f)setBase({...base,card:f});}} style={{ display:"none" }} />
              {base.card
                ? <div style={{ fontSize:13, color:C.green }}>✓ {base.card.name}</div>
                : <div style={{ fontSize:12, color:C.muted }}>點選上傳名片照片</div>}
            </label>
          </Field>
        </Section>

        <Section title="詢價產品" accent="#F59E0B">
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {PRODUCTS.map(p => (
              <button key={p.id} onClick={()=>{ setProduct(p.id); setSubForm({}); }} style={{
                display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                padding:"14px 8px", borderRadius:9, border:"1px solid", cursor:"pointer", fontFamily:"inherit",
                borderColor: product===p.id ? "#F59E0B" : C.line,
                background:  product===p.id ? "#1A1200" : C.bg2,
                color:       product===p.id ? "#F59E0B" : C.muted,
              }}>
                <span style={{ fontSize:24 }}>{p.icon}</span>
                <span style={{ fontSize:11, fontWeight:700 }}>{p.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {product==="freezer" && <Section title="冷凍機詢價"><FreezerForm data={subForm} set={setSubForm} /></Section>}
        {product==="panel"   && <Section title="冷凍隔板詢價"><PanelForm data={subForm} set={setSubForm} /></Section>}
        {product==="body"    && <Section title="保溫車廂詢價"><BodyForm data={subForm} set={setSubForm} /></Section>}
        {product==="repair"  && <Section title="維修詢價">
          <Field label="車型/年份"><Input value={subForm.vehicle||""} onChange={v=>setSubForm({...subForm,vehicle:v})} placeholder="例：HINO 3噸 / 2020年" /></Field>
          <Field label="故障說明" required><Textarea value={subForm.desc||""} onChange={v=>setSubForm({...subForm,desc:v})} placeholder="請詳述故障狀況" rows={4} /></Field>
          <Field label="其他說明"><Textarea value={subForm.note||""} onChange={v=>setSubForm({...subForm,note:v})} rows={2} /></Field>
        </Section>}
        {product==="other"   && <Section title="其他詢價">
          <Field label="詢問內容" required><Textarea value={subForm.desc||""} onChange={v=>setSubForm({...subForm,desc:v})} placeholder="請說明詢問內容" rows={5} /></Field>
        </Section>}

        <button onClick={handleSubmit} disabled={!canSubmit} style={{
          ...BTN_PRIMARY, width:"100%", opacity: canSubmit ? 1 : 0.4,
          cursor: canSubmit ? "pointer" : "not-allowed",
        }}>送出詢價單</button>
        <div style={{ fontSize:12, color:C.muted, textAlign:"center", marginTop:10 }}>送出後可下載詢價單 PDF 留存</div>
      </div>
    </div>
  );
}
