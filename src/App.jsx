import { useState, useEffect, useRef } from "react";

// ─── Storage Key ───────────────────────────────
const STORAGE_KEY = "inquiry-orders-v2";

// ─── Helpers ───────────────────────────────────
function genId() {
  const d = new Date();
  return `IQ${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${Math.floor(1000+Math.random()*9000)}`;
}
function today() {
  return new Date().toISOString().split("T")[0];
}

// ─── Status Config ─────────────────────────────
const STATUS = {
  pending:   { label:"待審核", color:"#F59E0B", bg:"#2A1F00" },
  reviewing: { label:"審核中", color:"#00A8E8", bg:"#001A2A" },
  quoted:    { label:"已報價", color:"#8B5CF6", bg:"#180F2A" },
  ordered:   { label:"已成立訂單", color:"#00C300", bg:"#002200" },
  rejected:  { label:"未成立", color:"#EF4444", bg:"#2A0A0A" },
};

const BRANDS = ["HINO","ISUZU","MITSUBISHI","NISSAN","SCANIA","MERCEDES","MAN","IVECO","其他"];
const PRODUCTS = [
  { id:"freezer", label:"冷凍機", icon:"🧊" },
  { id:"body",    label:"保溫車廂", icon:"🚛" },
  { id:"panel",   label:"冷凍隔板", icon:"📦" },
  { id:"repair",  label:"維修", icon:"🔧" },
  { id:"other",   label:"其他", icon:"📋" },
];

// ─── Shared UI Primitives ──────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Noto Sans TC',sans-serif;background:#0C1118;color:#D8E4EC;}
  input,select,textarea{font-family:'Noto Sans TC',sans-serif;}
  input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.6);}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:#1E3040;border-radius:4px;}
`;

const FIELD_STYLE = {
  width:"100%", background:"#0F1A24", border:"1px solid #1C2F3F",
  borderRadius:7, padding:"10px 13px", color:"#D8E4EC", fontSize:14,
  fontFamily:"inherit", outline:"none",
};
const LABEL_STYLE = { fontSize:11, color:"#4A7090", marginBottom:5, display:"block", letterSpacing:.5 };

// ─── Image Upload Component ────────────────────
function ImageUpload({ images=[], onChange }) {
  function handleFiles(e) {
    const files = Array.from(e.target.files);
    const remaining = 5 - images.length;
    if (remaining <= 0) return;
    let loaded = 0;
    const newImgs = [];
    files.slice(0, remaining).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        newImgs.push({ name: file.name, data: ev.target.result });
        loaded++;
        if (loaded === Math.min(files.length, remaining)) {
          onChange([...images, ...newImgs]);
        }
      };
      reader.readAsDataURL(file);
    });
  }
  function remove(idx) {
    onChange(images.filter((_,i)=>i!==idx));
  }
  return (
    <div>
      {/* Preview Grid */}
      {images.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:10}}>
          {images.map((img,i)=>(
            <div key={i} style={{position:"relative",borderRadius:8,overflow:"hidden",aspectRatio:"1",background:"#0C1118"}}>
              <img src={img.data} alt={img.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
              <button onClick={()=>remove(i)}
                style={{position:"absolute",top:4,right:4,width:22,height:22,borderRadius:"50%",background:"rgba(0,0,0,.75)",border:"none",color:"#EF4444",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>
                ✕
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <label style={{aspectRatio:"1",background:"#0F1A24",border:"1px dashed #1C2F3F",borderRadius:8,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:4}}>
              <input type="file" accept="image/*" multiple onChange={handleFiles} style={{display:"none"}} />
              <span style={{fontSize:22,color:"#1C2F3F"}}>＋</span>
            </label>
          )}
        </div>
      )}
      {/* Upload Zone (empty state) */}
      {images.length === 0 && (
        <label style={{display:"block",background:"#0F1A24",border:"1px dashed #1C2F3F",borderRadius:8,padding:"18px 14px",textAlign:"center",cursor:"pointer",transition:"border-color .15s"}}>
          <input type="file" accept="image/*" multiple onChange={handleFiles} style={{display:"none"}} />
          <div style={{fontSize:24,marginBottom:6}}>📷</div>
          <div style={{fontSize:13,color:"#4A7090"}}>點選上傳圖片（最多 5 張）</div>
          <div style={{fontSize:11,color:"#2A5070",marginTop:3}}>可拍照車廂現況、損壞部位等</div>
        </label>
      )}
      {images.length > 0 && (
        <div style={{fontSize:10,color:"#2A5070",textAlign:"right",marginTop:2}}>{images.length}/5 張</div>
      )}
    </div>
  );
}

function Inp({ label, required, children }) {
  return (
    <div style={{ marginBottom:13 }}>
      {label && <label style={LABEL_STYLE}>{label}{required && <span style={{color:"#EF4444"}}> *</span>}</label>}
      {children}
    </div>
  );
}
function Input({ value, onChange, placeholder, type="text", style={} }) {
  return <input value={value} onChange={e=>onChange(e.target.value)} type={type} placeholder={placeholder} style={{...FIELD_STYLE,...style}} />;
}
function Textarea({ value, onChange, placeholder, rows=3 }) {
  return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...FIELD_STYLE,resize:"vertical"}} />;
}
function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={FIELD_STYLE}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => typeof o==="string"
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.v} value={o.v}>{o.l}</option>
      )}
    </select>
  );
}
function ToggleRow({ label, options, value, onChange }) {
  return (
    <Inp label={label}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {options.map(o => (
          <button key={o} onClick={()=>onChange(o)}
            style={{ padding:"7px 14px", borderRadius:6, border:"1px solid", cursor:"pointer",
              borderColor: value===o ? "#00A8E8":"#1C2F3F",
              background: value===o ? "#001A2A":"transparent",
              color: value===o ? "#00A8E8":"#4A7090", fontSize:13, fontFamily:"inherit" }}>
            {o}
          </button>
        ))}
      </div>
    </Inp>
  );
}
function Section({ title, accent="#00A8E8", children }) {
  return (
    <div style={{ marginBottom:22 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <div style={{ width:3, height:16, borderRadius:2, background:accent }} />
        <span style={{ fontSize:12, fontWeight:700, letterSpacing:2, color:accent, textTransform:"uppercase" }}>{title}</span>
        <div style={{ flex:1, height:1, background:"#1C2F3F" }} />
      </div>
      {children}
    </div>
  );
}

// ─── Sub-Forms ─────────────────────────────────
function FreezerForm({ data, set }) {
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:13}}>
        <Inp label="品牌" required>
          <Select value={data.brand||""} onChange={v=>set({...data,brand:v})} options={BRANDS} placeholder="選擇品牌" />
        </Inp>
        <Inp label="噸數"><Input value={data.ton||""} onChange={v=>set({...data,ton:v})} placeholder="噸" /></Inp>
        <Inp label="呎數"><Input value={data.feet||""} onChange={v=>set({...data,feet:v})} placeholder="呎" /></Inp>
      </div>
      <ToggleRow label="類型" options={["冷凍","冷藏","其他"]} value={data.type||""} onChange={v=>set({...data,type:v})} />
      {data.type==="其他" && <Inp label="類型說明"><Input value={data.typeNote||""} onChange={v=>set({...data,typeNote:v})} placeholder="請說明" /></Inp>}
      <Inp label="載運貨物類型" required><Input value={data.cargo||""} onChange={v=>set({...data,cargo:v})} placeholder="例：生鮮食品、冷凍食品" /></Inp>
      <ToggleRow label="使用冷媒" options={["R134a","R404a"]} value={data.refrigerant||""} onChange={v=>set({...data,refrigerant:v})} />
      <Inp label="其他說明"><Textarea value={data.note||""} onChange={v=>set({...data,note:v})} placeholder="其他需求或備註" /></Inp>
      <Inp label="附件圖片"><ImageUpload images={data.images||[]} onChange={v=>set({...data,images:v})} /></Inp>
    </div>
  );
}

function PanelForm({ data, set }) {
  return (
    <div>
      <Inp label="車廂內尺寸（公分）" required>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,alignItems:"center"}}>
          <input value={data.width||""} onChange={e=>set({...data,width:e.target.value})} type="number" placeholder="寬"
            style={{...FIELD_STYLE,textAlign:"center",fontSize:18,fontFamily:"'IBM Plex Mono',monospace"}} />
          <span style={{color:"#1C2F3F",fontSize:20}}>✕</span>
          <input value={data.height||""} onChange={e=>set({...data,height:e.target.value})} type="number" placeholder="高"
            style={{...FIELD_STYLE,textAlign:"center",fontSize:18,fontFamily:"'IBM Plex Mono',monospace"}} />
        </div>
      </Inp>
      <ToggleRow label="饅頭" options={["有","沒有"]} value={data.mantou||""} onChange={v=>set({...data,mantou:v})} />
      <Inp label="其他說明"><Textarea value={data.note||""} onChange={v=>set({...data,note:v})} placeholder="特殊需求" /></Inp>
      <Inp label="附件圖片"><ImageUpload images={data.images||[]} onChange={v=>set({...data,images:v})} /></Inp>
    </div>
  );
}

const CHECKBOX_OPTIONS = {
  outer: ["FRP纖維板","白鐵平板","白鐵浪板","其他"],
  inner: ["烤漆平板","白鐵平板","其他"],
  floor: ["1.0白鐵花板","2.0白鐵花板","3.0白鐵花板","5.0鋁花板+骨架","底板補強","其他"],
  door_driver: ["有門","無"],
  door_passenger: ["有門","無"],
  door_rear: ["有門","無"],
};

function CheckGroup({ options, value=[], onChange }) {
  return (
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {options.map(o=>{
        const active = value.includes(o);
        return (
          <button key={o} onClick={()=>onChange(active ? value.filter(x=>x!==o) : [...value,o])}
            style={{padding:"6px 12px",borderRadius:6,border:"1px solid",cursor:"pointer",fontSize:12,fontFamily:"inherit",
              borderColor:active?"#00A8E8":"#1C2F3F", background:active?"#001A2A":"transparent", color:active?"#00A8E8":"#4A7090"}}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function ToggleBtn({ options, value, onChange }) {
  return (
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {options.map(o=>(
        <button key={o} onClick={()=>onChange(o)}
          style={{padding:"7px 14px",borderRadius:6,border:"1px solid",cursor:"pointer",fontSize:13,fontFamily:"inherit",
            borderColor:value===o?"#00A8E8":"#1C2F3F", background:value===o?"#001A2A":"transparent",
            color:value===o?"#00A8E8":"#4A7090"}}>
          {o}
        </button>
      ))}
    </div>
  );
}

function BodyForm({ data, set }) {
  return (
    <div>
      {/* 車型噸數 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:4}}>
        <Inp label="品牌" required>
          <Select value={data.brand||""} onChange={v=>set({...data,brand:v})} options={BRANDS} placeholder="選擇品牌" />
        </Inp>
        <Inp label="噸數"><Input value={data.ton||""} onChange={v=>set({...data,ton:v})} placeholder="噸" /></Inp>
        <Inp label="呎數"><Input value={data.feet||""} onChange={v=>set({...data,feet:v})} placeholder="呎" /></Inp>
      </div>
      <Inp label="底盤車型式"><Input value={data.chassis||""} onChange={v=>set({...data,chassis:v})} placeholder="例：單排、雙排" /></Inp>

      {/* 車廂尺寸 */}
      <div style={{background:"#0F1A24",border:"1px solid #1C2F3F",borderRadius:8,padding:12,marginBottom:13}}>
        <label style={{...LABEL_STYLE,marginBottom:10}}>車廂尺寸</label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[["outerSize","外尺寸"],["innerSize","內尺寸"],["floorHeight","聚地高"]].map(([k,l])=>(
            <Inp key={k} label={l}><Input value={data[k]||""} onChange={v=>set({...data,[k]:v})} placeholder="L×W×H" /></Inp>
          ))}
        </div>
      </div>

      <ToggleRow label="用途" options={["冷凍","冷藏"]} value={data.usage||""} onChange={v=>set({...data,usage:v})} />
      <Inp label="載運貨物類型"><Input value={data.cargo||""} onChange={v=>set({...data,cargo:v})} placeholder="例：生鮮食品" /></Inp>

      <Inp label="車廂厚度">
        <ToggleBtn options={["50mm","75mm","100mm","其他"]} value={data.thickness||""} onChange={v=>set({...data,thickness:v})} />
      </Inp>
      {data.thickness==="其他" && <Inp label="厚度說明"><Input value={data.thicknessNote||""} onChange={v=>set({...data,thicknessNote:v})} placeholder="說明" /></Inp>}

      <Inp label="冷凍機">
        <ToggleBtn options={["無","一般型","下置型"]} value={data.unitType||""} onChange={v=>set({...data,unitType:v})} />
      </Inp>

      {/* 板材 */}
      <Section title="板材" accent="#8B5CF6">
        <Inp label="外板">
          <CheckGroup options={["FRP纖維板","白鐵平板","白鐵浪板","前板補強","其他"]} value={data.outerBoard||[]} onChange={v=>set({...data,outerBoard:v})} />
          {(data.outerBoard||[]).includes("其他") && <div style={{marginTop:8}}><Input value={data.outerBoardNote||""} onChange={v=>set({...data,outerBoardNote:v})} placeholder="說明" /></div>}
        </Inp>
        <Inp label="內板">
          <CheckGroup options={["烤漆平板","白鐵平板","其他"]} value={data.innerBoard||[]} onChange={v=>set({...data,innerBoard:v})} />
          {(data.innerBoard||[]).includes("其他") && <div style={{marginTop:8}}><Input value={data.innerBoardNote||""} onChange={v=>set({...data,innerBoardNote:v})} placeholder="說明" /></div>}
        </Inp>
        <Inp label="內底板">
          <CheckGroup options={["1.0白鐵花板","2.0白鐵花板","3.0白鐵花板","5.0鋁花板+骨架","底板補強","其他"]} value={data.floorBoard||[]} onChange={v=>set({...data,floorBoard:v})} />
          {(data.floorBoard||[]).includes("其他") && <div style={{marginTop:8}}><Input value={data.floorBoardNote||""} onChange={v=>set({...data,floorBoardNote:v})} placeholder="說明" /></div>}
        </Inp>
        <Inp label="特殊規格說明"><Textarea value={data.specialSpec||""} onChange={v=>set({...data,specialSpec:v})} placeholder="特殊規格需求" /></Inp>
      </Section>

      {/* 標準三門 */}
      <Section title="標準三門" accent="#F59E0B">
        {[["driverDoor","駕駛邊"],["passengerDoor","副駕邊"],["rearDoor","後門"]].map(([k,l])=>(
          <Inp key={k} label={l}>
            <Input value={data[k]||""} onChange={v=>set({...data,[k]:v})} placeholder="說明（門型/尺寸/開法）" />
          </Inp>
        ))}
        <Inp label="其他說明"><Textarea value={data.doorNote||""} onChange={v=>set({...data,doorNote:v})} rows={2} /></Inp>
      </Section>

      {/* 配件 */}
      <Section title="配件" accent="#10B981">

        {/* 新式護欄 */}
        <Inp label="新式護欄">
          <ToggleBtn options={["白鐵","錏鐵","不需要"]} value={data.railing||""} onChange={v=>set({...data,railing:v})} />
        </Inp>

        {/* 防撞腳踢板 */}
        <Inp label="防撞腳踢板（含門）">
          <CheckGroup options={["1.0白鐵花板","2.0白鐵花板","3.0白鐵花板","3.0鋁花板","不需要"]} value={data.kickBoard||[]} onChange={v=>set({...data,kickBoard:v})} />
          {(data.kickBoard||[]).length > 0 && !(data.kickBoard||[]).includes("不需要") && (
            <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:12,color:"#4A7090",whiteSpace:"nowrap"}}>高度</span>
              <Input value={data.kickBoardHeight||""} onChange={v=>set({...data,kickBoardHeight:v})} placeholder="公分" style={{width:100}} />
              <span style={{fontSize:12,color:"#4A7090"}}>公分</span>
            </div>
          )}
        </Inp>

        {/* 綁帶架 */}
        <Inp label="綁帶架">
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
            {["白鐵","錏鐵"].map(o=>(
              <button key={o} onClick={()=>set({...data,strapMat:o})}
                style={{padding:"6px 12px",borderRadius:6,border:"1px solid",cursor:"pointer",fontSize:12,fontFamily:"inherit",
                  borderColor:data.strapMat===o?"#00A8E8":"#1C2F3F", background:data.strapMat===o?"#001A2A":"transparent",
                  color:data.strapMat===o?"#00A8E8":"#4A7090"}}>{o}</button>
            ))}
            {["內崁式","外露式"].map(o=>(
              <button key={o} onClick={()=>set({...data,strapStyle:o})}
                style={{padding:"6px 12px",borderRadius:6,border:"1px solid",cursor:"pointer",fontSize:12,fontFamily:"inherit",
                  borderColor:data.strapStyle===o?"#00A8E8":"#1C2F3F", background:data.strapStyle===o?"#001A2A":"transparent",
                  color:data.strapStyle===o?"#00A8E8":"#4A7090"}}>{o}</button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#4A7090",whiteSpace:"nowrap"}}>左</span>
              <Input value={data.strapLeft||""} onChange={v=>set({...data,strapLeft:v})} placeholder="排數" />
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#4A7090",whiteSpace:"nowrap"}}>右</span>
              <Input value={data.strapRight||""} onChange={v=>set({...data,strapRight:v})} placeholder="排數" />
            </div>
          </div>
          <div style={{marginTop:8}}><Input value={data.strapNote||""} onChange={v=>set({...data,strapNote:v})} placeholder="其他說明" /></div>
        </Inp>

        {/* 排水孔 */}
        <Inp label="排水孔">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Input value={data.drainHole||""} onChange={v=>set({...data,drainHole:v})} placeholder="個數" style={{width:80}} />
            <span style={{fontSize:12,color:"#4A7090"}}>個</span>
            <Input value={data.drainHoleNote||""} onChange={v=>set({...data,drainHoleNote:v})} placeholder="其他說明" />
          </div>
        </Inp>

        {/* 排水溝 */}
        <Inp label="排水溝">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Input value={data.drainChannel||""} onChange={v=>set({...data,drainChannel:v})} placeholder="排數" style={{width:80}} />
            <span style={{fontSize:12,color:"#4A7090"}}>排</span>
            <Input value={data.drainChannelNote||""} onChange={v=>set({...data,drainChannelNote:v})} placeholder="其他說明" />
          </div>
        </Inp>

        {/* 工具箱 */}
        <Inp label="工具箱">
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
            {["白鐵","錏鐵"].map(o=>(
              <button key={o} onClick={()=>set({...data,toolboxMat:o})}
                style={{padding:"6px 12px",borderRadius:6,border:"1px solid",cursor:"pointer",fontSize:12,fontFamily:"inherit",
                  borderColor:data.toolboxMat===o?"#00A8E8":"#1C2F3F", background:data.toolboxMat===o?"#001A2A":"transparent",
                  color:data.toolboxMat===o?"#00A8E8":"#4A7090"}}>{o}</button>
            ))}
            {["70cm","90cm","120cm","其他"].map(o=>(
              <button key={o} onClick={()=>set({...data,toolboxSize:o})}
                style={{padding:"6px 12px",borderRadius:6,border:"1px solid",cursor:"pointer",fontSize:12,fontFamily:"inherit",
                  borderColor:data.toolboxSize===o?"#00A8E8":"#1C2F3F", background:data.toolboxSize===o?"#001A2A":"transparent",
                  color:data.toolboxSize===o?"#00A8E8":"#4A7090"}}>{o}</button>
            ))}
          </div>
          {data.toolboxSize==="其他" && <Input value={data.toolboxNote||""} onChange={v=>set({...data,toolboxNote:v})} placeholder="說明" />}
        </Inp>

        {/* 工作梯 */}
        <Inp label="工作梯">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Input value={data.ladder||""} onChange={v=>set({...data,ladder:v})} placeholder="個數" style={{width:80}} />
            <span style={{fontSize:12,color:"#4A7090"}}>個</span>
          </div>
        </Inp>

        {/* 小牛車架 */}
        <Inp label="小牛車架">
          <ToggleBtn options={["有","沒有"]} value={data.calfRack||""} onChange={v=>set({...data,calfRack:v})} />
        </Inp>

        {/* 全白鐵配件 */}
        <Inp label="全白鐵配件">
          <ToggleBtn options={["有","沒有"]} value={data.allStainless||""} onChange={v=>set({...data,allStainless:v})} />
        </Inp>

        {/* 其他配件 */}
        <Inp label="其他配件說明">
          <Textarea value={data.accessories||""} onChange={v=>set({...data,accessories:v})} placeholder="其他配件需求" rows={2} />
        </Inp>
      </Section>

      <Inp label="其他備註"><Textarea value={data.note||""} onChange={v=>set({...data,note:v})} placeholder="其他說明" /></Inp>
      <Inp label="附件圖片"><ImageUpload images={data.images||[]} onChange={v=>set({...data,images:v})} /></Inp>
    </div>
  );
}

// ─── Main App ──────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("form"); // "form" | "admin"
  const [inquiries, setInquiries] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [lastInquiry, setLastInquiry] = useState(null);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [adminFilter, setAdminFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [adminNote, setAdminNote] = useState("");

  // Client form
  const [base, setBase] = useState({
    date: today(), company: "", contact: "", phone: "", taxId: "", address: "", card: null,
  });
  const [product, setProduct] = useState("");
  const [subForm, setSubForm] = useState({});

  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get(STORAGE_KEY); if(r) setInquiries(JSON.parse(r.value)); } catch {}
    })();
  }, []);

  async function save(list) {
    setInquiries(list);
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(list)); } catch {}
  }

  function showToast(msg, color="#00C300") { setToast({msg,color}); setTimeout(()=>setToast(null),2500); }

  function handleCardUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setBase(b => ({...b, card: { name: file.name, data: ev.target.result }}));
    reader.readAsDataURL(file);
  }

  const canSubmit = base.date && base.company && base.contact && base.phone && product &&
    (product !== "freezer" || (subForm.brand && subForm.cargo)) &&
    (product !== "panel" || (subForm.width && subForm.height && subForm.mantou)) &&
    (product !== "body" || subForm.brand);

  async function handleSubmit() {
    if (!canSubmit) return;
    const inquiry = { id: genId(), base, product, subForm, status: "pending", adminNote: "", createdAt: new Date().toISOString() };
    const updated = [inquiry, ...inquiries];
    await save(updated);
    setLastInquiry(inquiry);
    setSubmitted(true);
  }

  async function updateStatus(id, status) {
    const updated = inquiries.map(i => i.id===id ? {...i, status} : i);
    await save(updated);
    if (selectedInquiry?.id===id) setSelectedInquiry({...selectedInquiry, status});
    showToast("狀態已更新");
  }

  async function saveAdminNote(id) {
    const updated = inquiries.map(i => i.id===id ? {...i, adminNote} : i);
    await save(updated);
    if (selectedInquiry?.id===id) setSelectedInquiry({...selectedInquiry, adminNote});
    showToast("備註已儲存");
  }

  async function createOrder(id) {
    const updated = inquiries.map(i => i.id===id ? {...i, status:"ordered"} : i);
    await save(updated);
    if (selectedInquiry?.id===id) setSelectedInquiry({...selectedInquiry, status:"ordered"});
    showToast("✅ 訂單已成立！");
  }

  const filtered = adminFilter==="all" ? inquiries : inquiries.filter(i=>i.status===adminFilter);
  const productLabel = PRODUCTS.find(p=>p.id===product)?.label || "";

  return (
    <>
      <style>{css}</style>
      <div style={{minHeight:"100vh",background:"#0C1118",display:"flex",flexDirection:"column"}}>

        {/* Header */}
        <header style={{background:"#0F1A24",borderBottom:"1px solid #1C2F3F",position:"sticky",top:0,zIndex:40}}>
          <div style={{maxWidth:520,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",height:54}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,background:"linear-gradient(135deg,#00C300,#007700)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🚛</div>
              <div>
                <div style={{fontSize:13,fontWeight:700,letterSpacing:.5}}>冷凍車體詢價系統</div>
                <div style={{fontSize:9,color:"#2A5070",letterSpacing:1}}>LINE LIFF INQUIRY</div>
              </div>
            </div>
            <div style={{display:"flex",gap:4}}>
              {[["form","📋 詢價"],["admin","⚙️ 後台"]].map(([v,l])=>(
                <button key={v} onClick={()=>{setTab(v);setSubmitted(false);}}
                  style={{padding:"5px 12px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:700,
                    background:tab===v?"#00A8E8":"transparent", color:tab===v?"#fff":"#2A5070"}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main style={{flex:1,maxWidth:520,width:"100%",margin:"0 auto",padding:"20px 16px 40px"}}>

          {/* ── FORM ── */}
          {tab==="form" && !submitted && (
            <div>
              {/* Banner */}
              <div style={{background:"linear-gradient(135deg,#001A2A,#002A40)",border:"1px solid #1C2F3F",borderRadius:12,padding:"16px 18px",marginBottom:24,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",right:-10,top:-10,fontSize:80,opacity:.05}}>❄</div>
                <div style={{fontSize:11,color:"#00A8E8",marginBottom:4,letterSpacing:1}}>LINE 官方帳號</div>
                <div style={{fontSize:15,fontWeight:700}}>客戶詢價單</div>
                <div style={{fontSize:12,color:"#4A7090",marginTop:4}}>填寫完成後由業務確認報價，確認後正式成立訂單</div>
              </div>

              {/* Base Info */}
              <Section title="基本資料">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div style={{gridColumn:"span 1"}}>
                    <Inp label="日期" required>
                      <input type="date" value={base.date} onChange={e=>setBase({...base,date:e.target.value})} style={FIELD_STYLE} />
                    </Inp>
                  </div>
                  <div style={{gridColumn:"span 1"}}>
                    <Inp label="統一編號">
                      <Input value={base.taxId} onChange={v=>setBase({...base,taxId:v})} placeholder="12345678" />
                    </Inp>
                  </div>
                </div>
                <Inp label="公司名稱" required>
                  <Input value={base.company} onChange={v=>setBase({...base,company:v})} placeholder="OO股份有限公司" />
                </Inp>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <Inp label="聯絡人" required>
                    <Input value={base.contact} onChange={v=>setBase({...base,contact:v})} placeholder="姓名" />
                  </Inp>
                  <Inp label="電話/手機" required>
                    <Input value={base.phone} onChange={v=>setBase({...base,phone:v})} placeholder="09XX-XXX-XXX" />
                  </Inp>
                </div>
                <Inp label="地址">
                  <Input value={base.address} onChange={v=>setBase({...base,address:v})} placeholder="縣市區路號" />
                </Inp>
                <Inp label="名片上傳">
                  <label style={{display:"block",background:"#0F1A24",border:"1px dashed #1C2F3F",borderRadius:7,padding:"14px",textAlign:"center",cursor:"pointer"}}>
                    <input type="file" accept="image/*" onChange={handleCardUpload} style={{display:"none"}} />
                    {base.card
                      ? <div style={{fontSize:13,color:"#00C300"}}>✓ {base.card.name}</div>
                      : <div style={{fontSize:12,color:"#4A7090"}}>📷 點選上傳名片照片</div>
                    }
                  </label>
                </Inp>
              </Section>

              {/* Product Selection */}
              <Section title="詢價產品" accent="#F59E0B">
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                  {PRODUCTS.map(p=>(
                    <button key={p.id} onClick={()=>{setProduct(p.id);setSubForm({});}}
                      style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"14px 8px",borderRadius:9,border:"1px solid",cursor:"pointer",
                        borderColor:product===p.id?"#F59E0B":"#1C2F3F",
                        background:product===p.id?"#1A1200":"#0F1A24",
                        color:product===p.id?"#F59E0B":"#4A7090",fontFamily:"inherit"}}>
                      <span style={{fontSize:24}}>{p.icon}</span>
                      <span style={{fontSize:11,fontWeight:700}}>{p.label}</span>
                    </button>
                  ))}
                </div>
              </Section>

              {/* Dynamic Sub-Form */}
              {product === "freezer" && (
                <Section title="冷凍機詢價" accent="#00A8E8">
                  <FreezerForm data={subForm} set={setSubForm} />
                </Section>
              )}
              {product === "panel" && (
                <Section title="冷凍隔板詢價" accent="#00A8E8">
                  <PanelForm data={subForm} set={setSubForm} />
                </Section>
              )}
              {product === "body" && (
                <Section title="保溫車廂詢價" accent="#00A8E8">
                  <BodyForm data={subForm} set={setSubForm} />
                </Section>
              )}
              {product === "repair" && (
                <Section title="維修詢價" accent="#EF4444">
                  <Inp label="車型/年份"><Input value={subForm.vehicle||""} onChange={v=>setSubForm({...subForm,vehicle:v})} placeholder="例：HINO 3噸 / 2020年" /></Inp>
                  <Inp label="故障說明" required><Textarea value={subForm.desc||""} onChange={v=>setSubForm({...subForm,desc:v})} placeholder="請詳述故障狀況" rows={4} /></Inp>
                  <Inp label="其他說明"><Textarea value={subForm.note||""} onChange={v=>setSubForm({...subForm,note:v})} rows={2} /></Inp>
                  <Inp label="附件圖片（損壞部位等）"><ImageUpload images={subForm.images||[]} onChange={v=>setSubForm({...subForm,images:v})} /></Inp>
                </Section>
              )}
              {product === "other" && (
                <Section title="其他詢價" accent="#8B5CF6">
                  <Inp label="詢問內容" required><Textarea value={subForm.desc||""} onChange={v=>setSubForm({...subForm,desc:v})} placeholder="請說明詢問內容" rows={5} /></Inp>
                  <Inp label="附件圖片"><ImageUpload images={subForm.images||[]} onChange={v=>setSubForm({...subForm,images:v})} /></Inp>
                </Section>
              )}

              <button onClick={handleSubmit} disabled={!canSubmit}
                style={{width:"100%",padding:15,borderRadius:10,border:"none",cursor:canSubmit?"pointer":"not-allowed",fontSize:15,fontWeight:700,fontFamily:"inherit",marginTop:8,
                  background:canSubmit?"linear-gradient(135deg,#00A8E8,#0077B6)":"#1C2F3F",
                  color:canSubmit?"#fff":"#2A5070",transition:"all .2s"}}>
                📤 送出詢價單
              </button>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {tab==="form" && submitted && lastInquiry && (
            <div style={{textAlign:"center",paddingTop:20}}>
              <div style={{width:72,height:72,background:"linear-gradient(135deg,#00A8E8,#0077B6)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,margin:"0 auto 20px"}}>✓</div>
              <h2 style={{fontSize:20,fontWeight:700,marginBottom:8}}>詢價單已送出！</h2>
              <p style={{fontSize:13,color:"#4A7090",marginBottom:24}}>業務將盡快確認並透過 LINE 聯繫您</p>
              <div style={{background:"#0F1A24",border:"1px solid #1C2F3F",borderRadius:12,padding:18,textAlign:"left",marginBottom:20}}>
                {[["單號",lastInquiry.id],["公司",lastInquiry.base.company],["聯絡人",lastInquiry.base.contact],["詢價產品",PRODUCTS.find(p=>p.id===lastInquiry.product)?.label]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #1C2F3F",fontSize:13}}>
                    <span style={{color:"#4A7090"}}>{k}</span>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",color:"#D8E4EC"}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{background:"#001A00",border:"1px solid #003300",borderLeft:"3px solid #00C300",borderRadius:10,padding:"12px 14px",marginBottom:20,textAlign:"left"}}>
                <div style={{fontSize:11,color:"#00C300",marginBottom:3}}>✓ 通知已發送</div>
                <div style={{fontSize:12,color:"#4A9060"}}>業務收到詢價單後將確認內容，確認後正式成立訂單。</div>
              </div>
              <button onClick={()=>{setSubmitted(false);setBase({date:today(),company:"",contact:"",phone:"",taxId:"",address:"",card:null});setProduct("");setSubForm({});}}
                style={{padding:"11px 28px",borderRadius:8,border:"1px solid #1C2F3F",background:"transparent",color:"#4A7090",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                繼續詢價
              </button>
            </div>
          )}

          {/* ── ADMIN ── */}
          {tab==="admin" && (
            <div>
              {/* Stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:20}}>
                {Object.entries(STATUS).map(([k,cfg])=>(
                  <div key={k} style={{background:"#0F1A24",border:"1px solid #1C2F3F",borderRadius:8,padding:"10px 4px",textAlign:"center"}}>
                    <div style={{fontSize:18,fontWeight:700,color:cfg.color,fontFamily:"'IBM Plex Mono',monospace"}}>{inquiries.filter(i=>i.status===k).length}</div>
                    <div style={{fontSize:8,color:"#2A5070",marginTop:2,letterSpacing:.3}}>{cfg.label}</div>
                  </div>
                ))}
              </div>

              {/* Filter */}
              <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
                {[["all","全部"],...Object.entries(STATUS).map(([k,v])=>[k,v.label])].map(([v,l])=>(
                  <button key={v} onClick={()=>setAdminFilter(v)}
                    style={{padding:"5px 11px",borderRadius:20,border:"1px solid",cursor:"pointer",fontSize:10,fontFamily:"inherit",fontWeight:700,
                      borderColor:adminFilter===v?"#00A8E8":"#1C2F3F",
                      background:adminFilter===v?"#001A2A":"transparent",
                      color:adminFilter===v?"#00A8E8":"#2A5070"}}>
                    {l}
                  </button>
                ))}
              </div>

              {/* List */}
              {filtered.length===0
                ? <div style={{textAlign:"center",padding:"50px 0",color:"#1C2F3F",fontSize:14}}>尚無詢價單</div>
                : (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {filtered.map(iq=>{
                      const cfg = STATUS[iq.status];
                      const prod = PRODUCTS.find(p=>p.id===iq.product);
                      return (
                        <div key={iq.id} onClick={()=>{setSelectedInquiry(iq);setAdminNote(iq.adminNote||"");}}
                          style={{background:"#0F1A24",border:`1px solid ${selectedInquiry?.id===iq.id?"#00A8E8":"#1C2F3F"}`,borderRadius:10,padding:"14px 16px",cursor:"pointer",transition:"border-color .15s"}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                            <span style={{fontSize:10,fontFamily:"'IBM Plex Mono',monospace",color:"#2A5070"}}>{iq.id}</span>
                            <span style={{fontSize:10,padding:"3px 8px",borderRadius:20,background:cfg.bg,color:cfg.color,fontWeight:700}}>{cfg.label}</span>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div>
                              <div style={{fontSize:14,fontWeight:700,marginBottom:2}}>{iq.base.company}</div>
                              <div style={{fontSize:12,color:"#4A7090"}}>{prod?.icon} {prod?.label} · {iq.base.contact}</div>
                            </div>
                            <div style={{fontSize:10,color:"#1C2F3F"}}>{new Date(iq.createdAt).toLocaleDateString("zh-TW")}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}
        </main>

        {/* ── Detail Drawer ── */}
        {selectedInquiry && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"flex-end",zIndex:60}}
            onClick={e=>{if(e.target===e.currentTarget)setSelectedInquiry(null);}}>
            <div style={{width:"100%",maxWidth:520,margin:"0 auto",background:"#0F1A24",borderRadius:"16px 16px 0 0",padding:"20px 20px 36px",maxHeight:"85vh",overflowY:"auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700}}>詢價單詳情</div>
                  <div style={{fontSize:10,fontFamily:"'IBM Plex Mono',monospace",color:"#2A5070",marginTop:2}}>{selectedInquiry.id}</div>
                </div>
                <button onClick={()=>setSelectedInquiry(null)} style={{background:"none",border:"none",color:"#2A5070",fontSize:22,cursor:"pointer"}}>✕</button>
              </div>

              {/* Info */}
              <Section title="客戶資料">
                {[["公司",selectedInquiry.base.company],["聯絡人",selectedInquiry.base.contact],["電話",selectedInquiry.base.phone],["統一編號",selectedInquiry.base.taxId||"—"],["地址",selectedInquiry.base.address||"—"],["詢價日期",selectedInquiry.base.date]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #1C2F3F",fontSize:13}}>
                    <span style={{color:"#2A5070"}}>{k}</span>
                    <span style={{color:"#D8E4EC",textAlign:"right",maxWidth:"65%"}}>{v}</span>
                  </div>
                ))}
              </Section>

              {selectedInquiry.base.card && (
                <Inp label="名片">
                  <img src={selectedInquiry.base.card.data} alt="名片" style={{width:"100%",borderRadius:8,border:"1px solid #1C2F3F"}} />
                </Inp>
              )}

              <Section title={`${PRODUCTS.find(p=>p.id===selectedInquiry.product)?.icon} 詢價內容`} accent="#F59E0B">
                {Object.entries(selectedInquiry.subForm).filter(([k])=>k!=="images").map(([k,v])=>{
                  if(!v || (Array.isArray(v) && !v.length)) return null;
                  return (
                    <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #1C2F3F",fontSize:12}}>
                      <span style={{color:"#2A5070",minWidth:80}}>{k}</span>
                      <span style={{color:"#D8E4EC",textAlign:"right",maxWidth:"65%"}}>{Array.isArray(v)?v.join("、"):v}</span>
                    </div>
                  );
                })}
                {(selectedInquiry.subForm.images||[]).length > 0 && (
                  <div style={{marginTop:14}}>
                    <label style={{...LABEL_STYLE,marginBottom:8}}>附件圖片</label>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                      {selectedInquiry.subForm.images.map((img,i)=>(
                        <a key={i} href={img.data} target="_blank" rel="noreferrer" style={{borderRadius:8,overflow:"hidden",aspectRatio:"1",display:"block",background:"#0C1118"}}>
                          <img src={img.data} alt={img.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </Section>

              {/* Admin Note */}
              <Section title="業務備註" accent="#8B5CF6">
                <textarea value={adminNote} onChange={e=>setAdminNote(e.target.value)} rows={3}
                  placeholder="內部備註（報價金額、備忘事項…）"
                  style={{...FIELD_STYLE,resize:"vertical",marginBottom:8}} />
                <button onClick={()=>saveAdminNote(selectedInquiry.id)}
                  style={{padding:"8px 16px",borderRadius:7,border:"1px solid #8B5CF6",background:"transparent",color:"#8B5CF6",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                  儲存備註
                </button>
              </Section>

              {/* Status */}
              <Section title="更新狀態">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                  {Object.entries(STATUS).map(([k,cfg])=>(
                    <button key={k} onClick={()=>updateStatus(selectedInquiry.id,k)}
                      style={{padding:"10px",borderRadius:8,border:"1px solid",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700,
                        borderColor:selectedInquiry.status===k?cfg.color:"#1C2F3F",
                        background:selectedInquiry.status===k?cfg.bg:"transparent",
                        color:selectedInquiry.status===k?cfg.color:"#2A5070"}}>
                      {cfg.label}
                    </button>
                  ))}
                </div>

                {/* Create Order CTA */}
                {selectedInquiry.status !== "ordered" && selectedInquiry.status !== "rejected" && (
                  <button onClick={()=>createOrder(selectedInquiry.id)}
                    style={{width:"100%",padding:"14px",borderRadius:10,border:"none",cursor:"pointer",fontSize:15,fontWeight:700,fontFamily:"inherit",
                      background:"linear-gradient(135deg,#00C300,#007700)",color:"#fff"}}>
                    ✅ 確認報價 → 成立訂單
                  </button>
                )}
                {selectedInquiry.status === "ordered" && (
                  <div style={{background:"#001A00",border:"1px solid #003300",borderRadius:10,padding:"14px",textAlign:"center",fontSize:14,color:"#00C300",fontWeight:700}}>
                    ✅ 訂單已成立
                  </div>
                )}
              </Section>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#0F1A24",border:`1px solid ${toast.color}`,borderRadius:8,padding:"10px 20px",fontSize:13,color:toast.color,zIndex:100,whiteSpace:"nowrap"}}>
            {toast.msg}
          </div>
        )}
      </div>
    </>
  );
}
