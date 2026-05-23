// Calculator design-system styles (HMI cyberpunk theme).
// Extracted verbatim from SepticTankCalculator.jsx during the modular refactor.

const C = {
  // ── Layout ──
  root:      {display:"flex",flexDirection:"column",height:"calc(100vh - 52px)",overflow:"hidden",fontFamily:"'IBM Plex Mono',monospace",background:"#020C10",color:"#E8F8FF"},
  hdr:       {flexShrink:0,borderBottom:"1px solid rgba(0,245,255,0.10)",padding:"0 24px",height:"52px",display:"flex",alignItems:"center",gap:"14px",background:"rgba(2,12,16,0.9)",boxShadow:"0 1px 32px rgba(0,0,0,0.6)"},
  layout:    {flex:1,display:"flex",overflow:"hidden"},

  // ── Sidebar ──
  side:      {width:"280px",flexShrink:0,borderRight:"1px solid rgba(0,245,255,0.08)",overflowY:"auto",display:"flex",flexDirection:"column",background:"rgba(4,24,32,0.6)"},
  sideInner: {padding:"10px 14px",flex:1},
  slab:      {fontSize:"8px",letterSpacing:"0.16em",textTransform:"uppercase",color:"#4A7A8A",marginBottom:"5px",marginTop:"10px",fontWeight:"700"},
  calcWrap:  {padding:"10px 14px",borderTop:"1px solid rgba(0,245,255,0.08)",background:"rgba(2,12,16,0.5)",flexShrink:0},

  // ── Panel principal ──
  main:      {flex:1,display:"flex",flexDirection:"column",overflow:"hidden"},
  tabBar:    {flexShrink:0,borderBottom:"1px solid rgba(0,245,255,0.08)",display:"flex",padding:"0 20px",gap:"2px",background:"rgba(2,12,16,0.4)"},
  tabBtn:    (a)=>({padding:"10px 18px",border:"none",borderBottom:a?"2px solid #00F5FF":"2px solid transparent",marginBottom:"-1px",background:a?"rgba(0,245,255,0.06)":"none",color:a?"#00F5FF":"#4A7A8A",cursor:"pointer",fontSize:"10px",fontFamily:"inherit",fontWeight:a?"600":"400",whiteSpace:"nowrap",letterSpacing:"0.06em",transition:"color 0.15s,background 0.15s"}),
  content:   {flex:1,overflowY:"auto",padding:"20px 28px"},

  // ── Estado vacío ──
  empty:     {display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:"10px"},

  // ── Header typography ──
  logo:      {fontSize:"18px",fontWeight:"900",color:"#00F5FF",fontFamily:"'Orbitron',sans-serif",textShadow:"0 0 16px rgba(0,245,255,0.4)"},
  lsub:      {fontSize:"8px",color:"#4A7A8A",letterSpacing:"0.16em",textTransform:"uppercase"},
  badge:     {marginLeft:"auto",fontSize:"8px",color:"#4A7A8A",letterSpacing:"0.12em",textTransform:"uppercase",border:"1px solid rgba(0,245,255,0.12)",padding:"3px 12px",borderRadius:"3px"},

  // ── Separadores de sección ──
  sec:       {fontSize:"9px",letterSpacing:"0.16em",textTransform:"uppercase",color:"#4A7A8A",marginBottom:"12px",marginTop:"22px",display:"flex",alignItems:"center",gap:"10px",fontWeight:"700"},
  ln:        {flex:1,height:"1px",background:"linear-gradient(90deg,rgba(0,245,255,0.15),transparent)"},

  // ── Sidebar inputs ──
  ig:        {display:"flex",flexDirection:"column",gap:"3px"},
  lbl:       {fontSize:"9px",color:"#4A7A8A",fontWeight:"600",letterSpacing:"0.06em"},
  inp:       {background:"rgba(4,24,32,0.9)",border:"1px solid rgba(0,245,255,0.12)",borderRadius:"4px",padding:"5px 8px",color:"#E8F8FF",fontSize:"12px",fontFamily:"'IBM Plex Mono',monospace",width:"100%",boxSizing:"border-box",outline:"none",transition:"border-color 0.2s"},
  sel:       {background:"rgba(4,24,32,0.9)",border:"1px solid rgba(0,245,255,0.12)",borderRadius:"4px",padding:"5px 8px",color:"#E8F8FF",fontSize:"11px",fontFamily:"inherit",width:"100%",boxSizing:"border-box",outline:"none",transition:"border-color 0.2s"},
  inote:     {fontSize:"8px",color:"#4A7A8A",lineHeight:"1.3"},

  // ── Grids ──
  g2:        {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"},
  g3:        {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px"},
  g4:        {display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"12px"},

  // ── Botones tipo uso ──
  utg:       {display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"5px"},
  utb:       (a)=>({background:a?"rgba(0,255,136,0.08)":"rgba(4,24,32,0.6)",border:a?"1.5px solid rgba(0,255,136,0.35)":"1px solid rgba(0,245,255,0.08)",borderRadius:"6px",padding:"6px 4px",cursor:"pointer",color:a?"#00FF88":"#4A7A8A",textAlign:"center",transition:"all 0.15s"}),

  // ── Botones norma ──
  ngn:       {display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"5px"},
  nbn:       (a)=>({background:a?"rgba(0,245,255,0.07)":"rgba(4,24,32,0.6)",border:a?"1.5px solid rgba(0,245,255,0.35)":"1px solid rgba(0,245,255,0.08)",borderRadius:"6px",padding:"6px",cursor:"pointer",color:a?"#00F5FF":"#4A7A8A",textAlign:"center",transition:"all 0.15s"}),

  // ── Cards de resultado ──
  card:      {background:"#041820",border:"1px solid rgba(0,245,255,0.12)",borderRadius:"10px",padding:"16px 20px",marginBottom:"12px",position:"relative",overflow:"hidden"},
  ri:        (hi)=>({background:hi?"rgba(0,245,255,0.05)":"rgba(4,24,32,0.8)",border:"1px solid rgba(0,245,255,0.12)",borderLeft:hi?"3px solid #00F5FF":"3px solid rgba(0,245,255,0.12)",borderRadius:"8px",padding:"12px 14px",textAlign:"center"}),
  rv:        (hi)=>({fontSize:"26px",fontWeight:"700",color:hi?"#00F5FF":"#6ac8e8",lineHeight:1.1,fontFamily:"'Orbitron',sans-serif"}),
  ru:        {fontSize:"9px",color:"#4A7A8A",marginTop:"3px",letterSpacing:"0.06em"},
  rl:        {fontSize:"9px",color:"#4A7A8A",marginTop:"5px",lineHeight:"1.4"},

  // ── Barra de dimensiones ──
  dr:        {display:"flex",gap:"14px",flexWrap:"wrap",alignItems:"center",background:"rgba(0,245,255,0.03)",border:"1px solid rgba(0,245,255,0.10)",borderRadius:"8px",padding:"12px 16px",marginBottom:"12px"},
  db:        {textAlign:"center"},
  dl:        {fontSize:"8px",color:"#4A7A8A",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"2px"},
  dv:        {fontSize:"17px",fontWeight:"700",color:"#00F5FF",fontFamily:"'Orbitron',sans-serif"},

  // ── Checks ──
  ck:        (ok)=>({display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",marginBottom:"4px",background:ok?"rgba(0,255,136,0.04)":"rgba(255,176,32,0.04)",border:`1px solid ${ok?"rgba(0,255,136,0.15)":"rgba(255,176,32,0.15)"}`,borderLeft:`3px solid ${ok?"#00FF88":"#FFB020"}`,borderRadius:"6px"}),
  ci:        (ok)=>({fontSize:"13px",color:ok?"#00FF88":"#FFB020",fontWeight:"700",minWidth:"16px",flexShrink:0}),
  ct:        {color:"#E8F8FF",flex:1,fontSize:"11px"},
  cv:        (ok)=>({background:ok?"rgba(0,255,136,0.12)":"rgba(255,176,32,0.12)",color:ok?"#00FF88":"#FFB020",fontWeight:"600",fontSize:"10px",fontFamily:"'IBM Plex Mono',monospace",padding:"2px 8px",borderRadius:"20px",whiteSpace:"nowrap",flexShrink:0}),

  // ── KPI cards ──
  kpi:       {background:"#041820",border:"1px solid rgba(0,245,255,0.12)",borderRadius:"8px",padding:"12px",textAlign:"center"},
  kv:        (c)=>({fontSize:"22px",fontWeight:"700",color:c||"#00F5FF",fontFamily:"'Orbitron',sans-serif",lineHeight:1.1}),
  ku:        {fontSize:"9px",color:"#4A7A8A",marginTop:"3px",letterSpacing:"0.06em"},
  kl:        {fontSize:"9px",color:"#4A7A8A",marginTop:"5px",lineHeight:"1.4"},

  // ── Tuberías ──
  pr:        {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px"},
  pc:        {background:"rgba(0,245,255,0.03)",border:"1px solid rgba(0,245,255,0.12)",borderRadius:"8px",padding:"12px 14px"},
  pt:        {fontSize:"9px",color:"#4A7A8A",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"6px"},
  pv:        {fontSize:"18px",fontWeight:"700",color:"#00F5FF",fontFamily:"'Orbitron',sans-serif"},
  ps:        {fontSize:"9px",color:"#4A7A8A",marginTop:"3px",lineHeight:"1.4"},

  // ── Efluente ──
  er:        {display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:"12px",marginBottom:"10px"},
  eb:        (c)=>({background:`rgba(${c},0.05)`,border:`1px solid rgba(${c},0.14)`,borderRadius:"8px",padding:"12px",textAlign:"center"}),
  ev:        {fontSize:"22px",fontWeight:"700",fontFamily:"'Orbitron',sans-serif"},
  el:        {fontSize:"9px",color:"#4A7A8A",marginTop:"3px"},
  ea:        {color:"#4A7A8A",fontSize:"18px",textAlign:"center"},

  // ── Misceláneos ──
  tag:       (c)=>({display:"inline-block",background:`rgba(${c},0.07)`,border:`1px solid rgba(${c},0.2)`,borderRadius:"20px",padding:"2px 10px",fontSize:"10px",color:`rgb(${c})`,marginRight:"6px",fontWeight:"600"}),
  warn:      {marginTop:"10px",padding:"9px 13px",background:"rgba(255,176,32,0.04)",border:"1px solid rgba(255,176,32,0.15)",borderLeft:"3px solid #FFB020",borderRadius:"6px",fontSize:"10px",color:"#FFB020",lineHeight:"1.6"},
  fml:       {padding:"14px 16px",background:"rgba(4,24,32,0.9)",border:"1px solid rgba(0,245,255,0.10)",borderRadius:"8px",fontSize:"10px",color:"#4A7A8A",lineHeight:"2.0",fontFamily:"'IBM Plex Mono',monospace"},
  eduBox:    {marginTop:"8px",padding:"10px 14px",background:"rgba(0,255,136,0.03)",border:"1px solid rgba(0,255,136,0.12)",borderLeft:"3px solid rgba(0,255,136,0.4)",borderRadius:"6px",fontSize:"10px",color:"#00FF88",lineHeight:"1.7"},
  tbl:       {width:"100%",borderCollapse:"collapse",fontSize:"11px"},
  th:        {padding:"8px 12px",borderBottom:"1px solid rgba(0,245,255,0.10)",color:"#4A7A8A",textAlign:"right",fontWeight:"600"},
  th0:       {padding:"8px 12px",borderBottom:"1px solid rgba(0,245,255,0.10)",color:"#4A7A8A",textAlign:"left",fontWeight:"600"},
  td:        {padding:"7px 12px",borderBottom:"1px solid rgba(4,24,32,0.8)",color:"#7ab8c8",textAlign:"right"},
  td0:       {padding:"7px 12px",borderBottom:"1px solid rgba(4,24,32,0.8)",color:"#4A7A8A",textAlign:"left"},
  tdHi:      {padding:"7px 12px",borderBottom:"1px solid rgba(4,24,32,0.8)",color:"#00F5FF",fontWeight:"700",textAlign:"right"},
  tBtn:      (a,c)=>({padding:"7px 14px",background:a?`rgba(${c},0.1)`:"rgba(4,24,32,0.6)",border:a?`1px solid rgba(${c},0.3)`:"1px solid rgba(0,245,255,0.08)",borderRadius:"20px",cursor:"pointer",color:a?`rgb(${c})`:"#4A7A8A",fontSize:"10px",fontFamily:"inherit",fontWeight:a?"600":"400",transition:"all 0.15s"}),
  pBtn:      {padding:"7px 18px",background:"transparent",border:"1px solid rgba(0,245,255,0.3)",borderRadius:"20px",cursor:"pointer",color:"#00F5FF",fontSize:"10px",fontFamily:"inherit",fontWeight:"600",transition:"all 0.2s"},
  foot:      {textAlign:"center",fontSize:"8px",color:"#4A7A8A",marginTop:"24px",letterSpacing:"0.1em",paddingBottom:"16px"},
};

export { C };
