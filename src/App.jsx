import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { db } from "./firebase";
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const C = {
  pista:"#7cb98a",pistaLight:"#a8d4b0",pistaPale:"#e8f5ec",
  mint:"#b2dfc4",mintPale:"#f0faf4",sage:"#8fad96",sageDark:"#5a8a6a",
  beige:"#f7f3ed",offWhite:"#f4f6f5",
  g100:"#f3f4f6",g200:"#e5e7eb",g400:"#9ca3af",g500:"#6b7280",g600:"#4b5563",g700:"#374151",
  blue:"#a8c4e0",bluePale:"#e8f2fa",blueDeep:"#5b8db8",
  orange:"#f0c080",orangePale:"#fef3e0",coral:"#e8a090",coralPale:"#fdecea",
  red:"#e07070",green:"#6dab7e",gold:"#c8a84b",
  dark:"#1e2d24",
  sh:"0 2px 16px rgba(90,138,106,0.10)",shM:"0 4px 24px rgba(90,138,106,0.14)",shL:"0 8px 40px rgba(90,138,106,0.18)",
};

const fmt = n => n>=10000000?`₹${(n/10000000).toFixed(2)}Cr`:n>=100000?`₹${(n/100000).toFixed(1)}L`:`₹${Number(n).toLocaleString("en-IN")}`;

const INIT_SITES = {
  completed:[
    {id:1,name:"Green Valley Residency",client:"Suresh Mehta",contact:"9876543210",address:"Baner, Pune",totalCost:4500000,contractors:["Ramesh Build Co."],timeline:"Jan–Dec 2023",startDate:"01 Jan 2023",endDate:"31 Dec 2023"},
    {id:2,name:"Shivaji Nagar Complex",client:"Anita Patil",contact:"9765432109",address:"Shivaji Nagar, Pune",totalCost:8200000,contractors:["Om Constructions"],timeline:"Mar–Nov 2022",startDate:"01 Mar 2022",endDate:"30 Nov 2022"},
  ],
  ongoing:[
    {id:3,name:"Sunrise Heights",client:"Vikram Desai",contact:"9654321098",address:"Wakad, Pune",startDate:"15 Mar 2024",estCompletion:"30 Jun 2025",progress:65,contractorCount:3,materialCost:3200000,
      payment:{totalDeal:12000000,paid:7500000,methods:[{id:1,type:"Cash",amount:3000000,date:"10 Jan 2025"},{id:2,type:"Cheque",amount:2500000,date:"15 Feb 2025"},{id:3,type:"Bank Transfer",amount:2000000,date:"05 Mar 2025"}]},
      expenses:{
        material:[
          {id:1,material:"Cement",vendor:"Shree Traders",contractor:"Ramesh Build",qty:500,rate:380,total:190000,advance:100000,remaining:90000,status:"Partial",date:"12 Jan 2025"},
          {id:2,material:"Steel Rods",vendor:"Iron King",contractor:"SK Labour",qty:200,rate:6500,total:1300000,advance:1300000,remaining:0,status:"Paid",date:"20 Jan 2025"},
        ],
        labour:[
          {id:1,contractor:"Ramesh Build Co.",work:"Foundation Work",total:800000,advance:400000,remaining:400000,status:"Partial",workers:12},
          {id:2,contractor:"SK Labour",work:"Plastering",total:350000,advance:350000,remaining:0,status:"Paid",workers:8},
        ],
        bills:[
          {id:1,billNo:"B-0001",type:"Material",date:"12 Jan 2025",contractor:"Ramesh Build",material:"Cement",qty:100,rate:380,total:38000},
          {id:2,billNo:"B-0002",type:"Labour",date:"01 Feb 2025",contractor:"SK Labour",material:"Plastering Work",qty:1,rate:350000,total:350000},
        ],
      }
    },
    {id:4,name:"Royal Enclave Phase 2",client:"Meera Joshi",contact:"9543210987",address:"Hinjewadi, Pune",startDate:"01 Jun 2024",estCompletion:"31 Dec 2025",progress:38,contractorCount:2,materialCost:1800000,
      payment:{totalDeal:9500000,paid:4200000,methods:[{id:1,type:"Cash",amount:2000000,date:"15 Jun 2024"},{id:2,type:"NEFT",amount:2200000,date:"10 Oct 2024"}]},
      expenses:{
        material:[{id:1,material:"Sand",vendor:"River Traders",contractor:"Om Build",qty:300,rate:1200,total:360000,advance:180000,remaining:180000,status:"Partial",date:"05 Jun 2024"}],
        labour:[{id:1,contractor:"Om Build",work:"RCC Work",total:1200000,advance:600000,remaining:600000,status:"Partial",workers:15}],
        bills:[{id:1,billNo:"B-0003",type:"Material",date:"05 Jun 2024",contractor:"Om Build",material:"Sand",qty:50,rate:1200,total:60000}],
      }
    },
  ],
};

const INIT_CLIENTS = [
  {id:1,name:"Suresh Mehta",mobile:"9876543210",status:"Completed",totalValue:4500000,contractor:"Ramesh Build Co.",startDate:"01 Jan 2023",endDate:"31 Dec 2023",site:"Green Valley Residency"},
  {id:2,name:"Anita Patil",mobile:"9765432109",status:"Completed",totalValue:8200000,contractor:"Om Constructions",startDate:"01 Mar 2022",endDate:"30 Nov 2022",site:"Shivaji Nagar Complex"},
  {id:3,name:"Vikram Desai",mobile:"9654321098",status:"Under Process",totalValue:12000000,contractor:"Ramesh Build Co.",startDate:"15 Mar 2024",endDate:"30 Jun 2025",site:"Sunrise Heights"},
  {id:4,name:"Meera Joshi",mobile:"9543210987",status:"Under Process",totalValue:9500000,contractor:"Om Build",startDate:"01 Jun 2024",endDate:"31 Dec 2025",site:"Royal Enclave Phase 2"},
];

const CHART=[
  {month:"Aug",revenue:1800000,expense:1100000},{month:"Sep",revenue:1500000,expense:950000},
  {month:"Oct",revenue:2100000,expense:1300000},{month:"Nov",revenue:2400000,expense:1500000},
  {month:"Dec",revenue:1900000,expense:1200000},{month:"Jan",revenue:2800000,expense:1700000},
  {month:"Feb",revenue:3100000,expense:1900000},{month:"Mar",revenue:2600000,expense:1600000},
];
const PIE=[{name:"Material",value:45,color:C.pista},{name:"Labour",value:35,color:C.blueDeep},{name:"Overhead",value:20,color:C.gold}];

function computeRealChartData(sites) {
  const targetMonths = [
    { key: "08", name: "Aug", revenue: 0, expense: 0 },
    { key: "09", name: "Sep", revenue: 0, expense: 0 },
    { key: "10", name: "Oct", revenue: 0, expense: 0 },
    { key: "11", name: "Nov", revenue: 0, expense: 0 },
    { key: "12", name: "Dec", revenue: 0, expense: 0 },
    { key: "01", name: "Jan", revenue: 0, expense: 0 },
    { key: "02", name: "Feb", revenue: 0, expense: 0 },
    { key: "03", name: "Mar", revenue: 0, expense: 0 }
  ];

  const getMonthKey = (dateStr) => {
    if (!dateStr) return null;
    const str = dateStr.toLowerCase();
    if (str.includes("jan")) return "01";
    if (str.includes("feb")) return "02";
    if (str.includes("mar")) return "03";
    if (str.includes("apr")) return "04";
    if (str.includes("may")) return "05";
    if (str.includes("jun")) return "06";
    if (str.includes("jul")) return "07";
    if (str.includes("aug")) return "08";
    if (str.includes("sep")) return "09";
    if (str.includes("oct")) return "10";
    if (str.includes("nov")) return "11";
    if (str.includes("dec")) return "12";
    
    const parts = dateStr.split(/[-/]/);
    if (parts.length >= 2) {
      const m = parts[1].trim();
      if (m.length === 2) return m;
      if (m.length === 1) return "0" + m;
    }
    return null;
  };

  sites.ongoing.forEach(s => {
    if (s.payment && s.payment.methods) {
      s.payment.methods.forEach(m => {
        const mKey = getMonthKey(m.date);
        const match = targetMonths.find(t => t.key === mKey);
        if (match) match.revenue += Number(m.amount) || 0;
      });
    }
    if (s.expenses && s.expenses.material) {
      s.expenses.material.forEach(mat => {
        const mKey = getMonthKey(mat.date);
        const match = targetMonths.find(t => t.key === mKey);
        if (match) match.expense += Number(mat.advance) || 0;
      });
    }
    if (s.expenses && s.expenses.labour) {
      s.expenses.labour.forEach(lab => {
        const mKey = getMonthKey(lab.date || s.startDate);
        const match = targetMonths.find(t => t.key === mKey);
        if (match) match.expense += Number(lab.advance) || 0;
      });
    }
    if (s.expenses && s.expenses.bills) {
      s.expenses.bills.forEach(bill => {
        const mKey = getMonthKey(bill.date);
        const match = targetMonths.find(t => t.key === mKey);
        if (match) match.expense += Number(bill.total) || 0;
      });
    }
  });

  sites.completed.forEach(s => {
    const mKey = getMonthKey(s.endDate || s.timeline);
    const match = targetMonths.find(t => t.key === mKey);
    if (match) match.revenue += Number(s.totalCost) || 0;
  });

  return targetMonths.map(t => ({
    month: t.name,
    revenue: t.revenue,
    expense: t.expense
  }));
}

function computeRealPieData(sites) {
  let material = 0;
  let labour = 0;
  let overhead = 0;
  
  sites.ongoing.forEach(s => {
    if (s.expenses) {
      if (s.expenses.material) {
        s.expenses.material.forEach(m => {
          material += Number(m.advance) || 0;
        });
      }
      if (s.expenses.labour) {
        s.expenses.labour.forEach(l => {
          labour += Number(l.advance) || 0;
        });
      }
      if (s.expenses.bills) {
        s.expenses.bills.forEach(b => {
          if (b.type === "Material") {
            material += Number(b.total) || 0;
          } else if (b.type === "Labour") {
            labour += Number(b.total) || 0;
          } else {
            overhead += Number(b.total) || 0;
          }
        });
      }
    }
  });

  const total = material + labour + overhead;
  if (total === 0) {
    return [
      { name: "Material", value: 0, percent: 0, color: C.pista },
      { name: "Labour", value: 0, percent: 0, color: C.blueDeep },
      { name: "Overhead", value: 0, percent: 0, color: C.gold }
    ];
  }

  return [
    { name: "Material", value: material, percent: Math.round((material / total) * 100), color: C.pista },
    { name: "Labour", value: labour, percent: Math.round((labour / total) * 100), color: C.blueDeep },
    { name: "Overhead", value: overhead, percent: Math.round((overhead / total) * 100), color: C.gold }
  ];
}

// ─── ATOMS ────────────────────────────────────────────────────
function Bdg({s}){
  const m={Paid:[C.green,"#e8f5e9"],Partial:[C.gold,"#fff8e1"],Unpaid:[C.red,"#fdecea"],Completed:[C.green,"#e8f5e9"],"Under Process":[C.blueDeep,"#e3f2fd"],Admin:[C.sageDark,C.pistaPale],Staff:[C.blueDeep,C.bluePale],Cash:[C.sage,C.pistaPale],Cheque:[C.blueDeep,C.bluePale],"Bank Transfer":[C.gold,C.orangePale],NEFT:[C.blueDeep,C.bluePale],UPI:[C.coral,C.coralPale],Material:[C.pista,C.pistaPale],Labour:[C.blueDeep,C.bluePale]};
  const[c,bg]=m[s]||[C.g500,C.g100];
  return<span style={{padding:"3px 11px",borderRadius:20,background:bg,color:c,fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>{s}</span>;
}
function Card({children,style={}}){return<div style={{background:"#fff",borderRadius:16,boxShadow:C.sh,...style}}>{children}</div>;}
function StatCard({icon,label,value,sub,color}){
  return(
    <div style={{background:"#fff",borderRadius:16,padding:"22px 24px",boxShadow:C.sh,borderTop:`4px solid ${color}`,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:16,right:16,width:44,height:44,borderRadius:12,background:color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{icon}</div>
      <div style={{fontSize:12,color:C.g400,fontWeight:600,textTransform:"uppercase",letterSpacing:0.8,marginBottom:8}}>{label}</div>
      <div style={{fontSize:26,fontWeight:800,color:C.dark,marginBottom:4,lineHeight:1.1}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:C.g400}}>{sub}</div>}
    </div>
  );
}
function Btn({children,onClick,v="primary",small,full}){
  const st={primary:{background:C.sageDark,color:"#fff",border:"none"},secondary:{background:C.pistaPale,color:C.sageDark,border:`1.5px solid ${C.pistaLight}`},ghost:{background:"transparent",color:C.g500,border:`1.5px solid ${C.g200}`},danger:{background:"#fdecea",color:C.red,border:"none"},blue:{background:C.bluePale,color:C.blueDeep,border:"none"}};
  return<button onClick={onClick} style={{...st[v],borderRadius:10,padding:small?"6px 14px":"10px 20px",fontSize:small?12:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6,transition:"all 0.15s",whiteSpace:"nowrap",width:full?"100%":"auto",justifyContent:full?"center":"flex-start"}}>{children}</button>;
}
function Modal({title,children,onClose,w=520}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(30,45,36,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
      <div style={{background:"#fff",borderRadius:20,padding:"32px 36px",width:`min(${w}px,95vw)`,maxHeight:"88vh",overflowY:"auto",boxShadow:C.shL}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{fontSize:18,fontWeight:800,color:C.dark}}>{title}</div>
          <button onClick={onClose} style={{background:C.g100,border:"none",borderRadius:10,width:34,height:34,cursor:"pointer",fontSize:16,color:C.g500}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Fld({label,value,onChange,type="text",placeholder,as="input",options,disabled}){
  const base={width:"100%",border:`1.5px solid ${C.g200}`,borderRadius:10,padding:"10px 14px",fontSize:14,outline:"none",fontFamily:"inherit",background:disabled?"#f9f9f9":C.offWhite,boxSizing:"border-box",color:C.dark,opacity:disabled?0.7:1};
  return(
    <div style={{marginBottom:14}}>
      {label&&<div style={{fontSize:12,color:C.g500,fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>}
      {as==="select"?<select value={value} onChange={onChange} style={base} disabled={disabled}>{options?.map(o=><option key={o}>{o}</option>)}</select>
      :<input type={type} value={value} onChange={onChange} placeholder={placeholder} style={base} disabled={disabled}/>}
    </div>
  );
}
function Tbl({cols,rows,emptyMsg="No records"}){
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:400}}>
        <thead><tr style={{background:C.pistaPale}}>{cols.map(c=><th key={c} style={{padding:"12px 14px",textAlign:"left",fontSize:12,color:C.g500,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,whiteSpace:"nowrap"}}>{c}</th>)}</tr></thead>
        <tbody>{rows.length===0?<tr><td colSpan={cols.length} style={{padding:36,textAlign:"center",color:C.g400,fontSize:14}}>{emptyMsg}</td></tr>
          :rows.map((row,i)=><tr key={i} style={{borderBottom:`1px solid ${C.g100}`}} onMouseEnter={e=>e.currentTarget.style.background=C.pistaPale+"55"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            {row.map((cell,j)=><td key={j} style={{padding:"11px 14px",fontSize:13,color:C.g700,verticalAlign:"middle"}}>{cell}</td>)}
          </tr>)}
        </tbody>
      </table>
    </div>
  );
}
function Tabs({tabs,active,onChange}){
  return(
    <div style={{display:"flex",gap:6,background:C.pistaPale,padding:5,borderRadius:12,marginBottom:20,flexWrap:"wrap"}}>
      {tabs.map(([id,label])=>(
        <button key={id} onClick={()=>onChange(id)} style={{padding:"9px 18px",borderRadius:9,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit",background:active===id?C.sageDark:"transparent",color:active===id?"#fff":C.g500,transition:"all 0.18s",boxShadow:active===id?C.sh:"none"}}>
          {label}
        </button>
      ))}
    </div>
  );
}
function ProgBar({pct,h=8}){
  return(
    <div style={{background:C.g100,borderRadius:99,height:h,overflow:"hidden"}}>
      <div style={{width:`${Math.min(100,Math.max(0,pct))}%`,height:"100%",background:pct>=80?C.green:pct>=40?C.pista:C.gold,borderRadius:99,transition:"width 0.5s ease"}}/>
    </div>
  );
}
function Hdr({title,sub,action}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:22}}>
      <div>
        <div style={{fontSize:22,fontWeight:800,color:C.dark}}>{title}</div>
        {sub&&<div style={{fontSize:13,color:C.g400,marginTop:3}}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────
function Login({onLogin}){
  const[form,setForm]=useState({username:"",password:"",role:"Admin"});
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState("");
  function go(){
    if(!form.username||!form.password){setErr("Username & Password zaroori aahe");return;}
    setLoading(true);setErr("");
    setTimeout(()=>{setLoading(false);onLogin({name:form.username,role:form.role});},900);
  }
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${C.pistaPale} 0%,${C.mintPale} 50%,${C.beige} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{display:"flex",background:"#fff",borderRadius:24,boxShadow:C.shL,overflow:"hidden",width:"min(860px,100%)",animation:"up 0.5s ease"}}>
        <div style={{flex:1,background:`linear-gradient(160deg,${C.sageDark} 0%,${C.dark} 100%)`,padding:"56px 44px",display:"flex",flexDirection:"column",justifyContent:"center",minWidth:260}}>
          <div style={{fontSize:38,marginBottom:18}}>🏗️</div>
          <div style={{fontFamily:"Georgia,serif",fontSize:28,fontWeight:800,color:"#fff",lineHeight:1.2,marginBottom:12}}>BuildPro<br/><span style={{color:C.pistaLight}}>Manager</span></div>
          <div style={{fontSize:14,color:C.pistaLight+"aa",lineHeight:1.7,marginBottom:32}}>Construction Management ERP — Sites, clients, contractors & finances.</div>
          {[["🏗️","Multi-site management"],["💰","Real-time financials"],["📊","Advanced analytics"],["👥","Client management"]].map(([ic,t])=>(
            <div key={t} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <span style={{fontSize:15}}>{ic}</span><span style={{fontSize:13,color:"#ffffffaa"}}>{t}</span>
            </div>
          ))}
        </div>
        <div style={{flex:1,padding:"56px 44px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{fontSize:26,fontWeight:800,color:C.dark,marginBottom:6}}>Welcome back 👋</div>
          <div style={{fontSize:14,color:C.g400,marginBottom:30}}>Sign in to your dashboard</div>
          <Fld label="Username" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="Enter username"/>
          <Fld label="Password" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Enter password"/>
          <Fld label="Role" as="select" value={form.role} onChange={e=>setForm({...form,role:e.target.value})} options={["Admin","Staff"]}/>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:22,fontSize:13,color:C.g400}}>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}><input type="checkbox"/> Remember me</label>
            <span style={{color:C.sageDark,cursor:"pointer",fontWeight:600}}>Forgot password?</span>
          </div>
          {err&&<div style={{background:C.coralPale,color:C.red,borderRadius:10,padding:"10px 14px",fontSize:13,marginBottom:14}}>{err}</div>}
          <button onClick={go} style={{background:`linear-gradient(90deg,${C.sageDark},${C.pista})`,color:"#fff",border:"none",borderRadius:12,padding:"14px 0",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            {loading?<div style={{width:20,height:20,border:"2px solid #ffffff40",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>:"Sign In →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────
function Home({sites,user,setNav,onImportDemo}){
  const rev=sites.ongoing.reduce((a,s)=>a+s.payment.paid,0)+sites.completed.reduce((a,s)=>a+s.totalCost,0);
  const exp=sites.ongoing.reduce((a,s)=>a+s.expenses.material.reduce((b,m)=>b+m.advance,0)+s.expenses.labour.reduce((b,l)=>b+l.advance,0),0);
  const pending=sites.ongoing.reduce((a,s)=>a+Math.max(0,s.payment.totalDeal-s.payment.paid),0);
  const vouchers=sites.ongoing.reduce((a,s)=>a+s.expenses.bills.length,0);

  const realChartData = computeRealChartData(sites);
  const realPieData = computeRealPieData(sites);

  return(
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:26,fontWeight:800,color:C.dark}}>Good Morning, {user.name} 👋</div>
        <div style={{fontSize:14,color:C.g400,marginTop:4}}>Construction business overview</div>
      </div>

      {sites.ongoing.length === 0 && sites.completed.length === 0 && (
        <div style={{background:C.orangePale,border:`1.5px solid ${C.orange}`,borderRadius:16,padding:"20px 24px",marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontWeight:800,color:C.orange,fontSize:16}}>💡 Firebase Database is Empty</div>
            <div style={{fontSize:13,color:C.g600,marginTop:4,lineHeight:1.5}}>Your Cloud Firestore database is currently empty. Click the button to import all initial dummy sites, payments, expenses, and clients to make the dashboard fully workable!</div>
          </div>
          <Btn onClick={onImportDemo}>📥 Import Default Demo Data</Btn>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:14,marginBottom:24}}>
        <StatCard icon="🏗️" label="Total Sites" value={sites.ongoing.length+sites.completed.length} sub={`${sites.ongoing.length} ongoing`} color={C.pista}/>
        <StatCard icon="⚙️" label="Under Process" value={sites.ongoing.length} sub="Active" color={C.blueDeep}/>
        <StatCard icon="✅" label="Completed" value={sites.completed.length} sub="Done" color={C.green}/>
        <StatCard icon="💰" label="Revenue" value={fmt(rev)} sub="Collected" color={C.gold}/>
        <StatCard icon="📉" label="Expenses" value={fmt(exp)} sub="Spent" color={C.coral}/>
        <StatCard icon="⏳" label="Pending" value={fmt(pending)} sub="To collect" color={C.orange}/>
        <StatCard icon="👥" label="Clients" value={INIT_CLIENTS.length} sub="Registered" color={C.sage}/>
        <StatCard icon="🧾" label="Vouchers" value={vouchers} sub="Records" color={C.pistaLight}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:18,marginBottom:20}}>
        <Card style={{padding:22}}>
          <div style={{fontWeight:700,fontSize:15,color:C.dark,marginBottom:18}}>Monthly Revenue vs Expenses</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={realChartData}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.pista} stopOpacity={0.3}/><stop offset="95%" stopColor={C.pista} stopOpacity={0}/></linearGradient>
                <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.blueDeep} stopOpacity={0.2}/><stop offset="95%" stopColor={C.blueDeep} stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.g100}/>
              <XAxis dataKey="month" tick={{fontSize:12,fill:C.g400}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>v>=100000?`₹${v/100000}L`:`₹${v}`} tick={{fontSize:11,fill:C.g400}} axisLine={false} tickLine={false}/>
              <Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:10,fontSize:13}}/>
              <Area type="monotone" dataKey="revenue" stroke={C.pista} strokeWidth={2.5} fill="url(#rg)" name="Revenue"/>
              <Area type="monotone" dataKey="expense" stroke={C.blueDeep} strokeWidth={2} fill="url(#eg)" name="Expense"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{padding:22}}>
          <div style={{fontWeight:700,fontSize:15,color:C.dark,marginBottom:14}}>Expense Split</div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart><Pie data={realPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value" paddingAngle={4}>
              {realPieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
            </Pie><Tooltip formatter={v=>`${v}%`} contentStyle={{borderRadius:10,fontSize:13}}/></PieChart>
          </ResponsiveContainer>
          {realPieData.map((d,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:10,height:10,borderRadius:3,background:d.color}}/><span style={{fontSize:13,color:C.g600}}>{d.name}</span></div>
              <span style={{fontSize:13,fontWeight:700,color:C.dark}}>{d.percent}%</span>
            </div>
          ))}
        </Card>
      </div>
      <Card style={{padding:22,marginBottom:20}}>
        <div style={{fontWeight:700,fontSize:15,color:C.dark,marginBottom:14}}>Quick Navigation</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {[["🏗️","Sites","sites"],["💰","Transactions","transactions"],["🧾","Vouchers","vouchers"],["👥","Clients","clients"],...(user.role==="Admin"?[["📊","Reports","reports"]]:[])].map(([ic,lb,id])=>(
            <div key={id} onClick={()=>setNav(id)} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 18px",background:C.pistaPale,borderRadius:12,cursor:"pointer",border:`1.5px solid ${C.pistaLight}`,fontWeight:600,fontSize:14,color:C.sageDark,transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.background=C.sageDark;e.currentTarget.style.color="#fff";}}
              onMouseLeave={e=>{e.currentTarget.style.background=C.pistaPale;e.currentTarget.style.color=C.sageDark;}}>
              <span>{ic}</span><span>{lb}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card style={{overflow:"hidden"}}>
        <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.g100}`,fontWeight:700,fontSize:15,color:C.dark}}>Site Progress Overview</div>
        {sites.ongoing.map(s=>(
          <div key={s.id} style={{padding:"14px 22px",borderBottom:`1px solid ${C.g100}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
              <div><span style={{fontWeight:700,color:C.dark,fontSize:14}}>{s.name}</span><span style={{fontSize:13,color:C.g400,marginLeft:10}}>{s.client}</span></div>
              <span style={{fontSize:13,color:C.red,fontWeight:600}}>Pending: {fmt(Math.max(0,s.payment.totalDeal-s.payment.paid))}</span>
            </div>
            <ProgBar pct={s.progress} h={9}/>
            <div style={{fontSize:12,color:C.g400,marginTop:4,textAlign:"right"}}>{s.progress}% complete</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── PAYMENT TAB ──────────────────────────────────────────────
function PayTab({site}){
  const[showAdd,setShowAdd]=useState(false);
  const[editId,setEditId]=useState(null);
  const[form,setForm]=useState({amount:"",type:"Cash",date:""});
  const p=site.payment,rem=p.totalDeal-p.paid,extra=rem<0?Math.abs(rem):0;

  function openEdit(m){setEditId(m.id);setForm({amount:m.amount,type:m.type,date:m.date});}
  async function saveEdit(){
    const newMethods=site.payment.methods.map(m=>m.id===editId?{...m,amount:Number(form.amount),type:form.type,date:form.date}:m);
    const newPaid=newMethods.reduce((a,m)=>a+m.amount,0);
    const siteRef = doc(db, "sites", site.id.toString());
    await updateDoc(siteRef, {
      "payment.methods": newMethods,
      "payment.paid": newPaid
    });
    setEditId(null);
  }
  async function addPayment(){
    if(!form.amount)return;
    const amt=Number(form.amount);
    const newMethods=[...site.payment.methods,{id:Date.now(),type:form.type,amount:amt,date:form.date||new Date().toLocaleDateString("en-IN")}];
    const siteRef = doc(db, "sites", site.id.toString());
    await updateDoc(siteRef, {
      "payment.methods": newMethods,
      "payment.paid": site.payment.paid+amt
    });
    setForm({amount:"",type:"Cash",date:""});setShowAdd(false);
  }
  async function delPayment(id){
    const newMethods=site.payment.methods.filter(m=>m.id!==id);
    const newPaid=newMethods.reduce((a,m)=>a+m.amount,0);
    const siteRef = doc(db, "sites", site.id.toString());
    await updateDoc(siteRef, {
      "payment.methods": newMethods,
      "payment.paid": newPaid
    });
  }

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:14,marginBottom:20}}>
        {[["Total Deal",fmt(p.totalDeal),C.dark],["Amount Paid",fmt(p.paid),C.green],["Pending",fmt(Math.max(0,rem)),C.red],["Extra Paid",fmt(extra),C.gold]].map(([l,v,c])=>(
          <div key={l} style={{background:"#fff",borderRadius:14,padding:"16px 18px",boxShadow:C.sh,borderLeft:`4px solid ${c}`}}>
            <div style={{fontSize:12,color:C.g400,marginBottom:5,fontWeight:600}}>{l}</div>
            <div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}><Btn onClick={()=>{setForm({amount:"",type:"Cash",date:""});setShowAdd(true);}}>+ Add Payment</Btn></div>
      <Card>
        <Tbl cols={["Date","Method","Amount","Actions"]}
          rows={p.methods.map(m=>[
            m.date,<Bdg s={m.type}/>,
            <span style={{fontWeight:700,color:C.green}}>{fmt(m.amount)}</span>,
            <div style={{display:"flex",gap:8}}>
              <Btn small v="secondary" onClick={()=>openEdit(m)}>✏️ Edit</Btn>
              <Btn small v="danger" onClick={()=>delPayment(m.id)}>🗑️ Del</Btn>
            </div>
          ])}/>
      </Card>
      {showAdd&&<Modal title="Add Payment" onClose={()=>setShowAdd(false)}>
        <Fld label="Amount (₹)" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="Enter amount"/>
        <Fld label="Method" as="select" value={form.type} onChange={e=>setForm({...form,type:e.target.value})} options={["Cash","UPI","Cheque","Bank Transfer","NEFT"]}/>
        <Fld label="Date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
        <div style={{display:"flex",gap:10}}><Btn onClick={addPayment}>Save</Btn><Btn v="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn></div>
      </Modal>}
      {editId&&<Modal title="Edit Payment" onClose={()=>setEditId(null)}>
        <Fld label="Amount (₹)" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
        <Fld label="Method" as="select" value={form.type} onChange={e=>setForm({...form,type:e.target.value})} options={["Cash","UPI","Cheque","Bank Transfer","NEFT"]}/>
        <Fld label="Date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
        <div style={{display:"flex",gap:10}}><Btn onClick={saveEdit}>Update</Btn><Btn v="ghost" onClick={()=>setEditId(null)}>Cancel</Btn></div>
      </Modal>}
    </div>
  );
}

// ─── MATERIAL TAB ─────────────────────────────────────────────
function MatTab({site}){
  const[showAdd,setShowAdd]=useState(false);
  const[editRow,setEditRow]=useState(null);
  const blank={material:"",vendor:"",contractor:"",qty:"",rate:"",advance:"",status:"Partial",date:""};
  const[form,setForm]=useState(blank);

  async function calcAndSave(isEdit){
    const total=Number(form.qty)*Number(form.rate),remaining=total-Number(form.advance);
    const entry={...form,qty:Number(form.qty),rate:Number(form.rate),total,advance:Number(form.advance),remaining};
    const newMaterial=isEdit?site.expenses.material.map(m=>m.id===editRow?{...entry,id:editRow}:m):[...site.expenses.material,{...entry,id:Date.now()}];
    const siteRef = doc(db, "sites", site.id.toString());
    await updateDoc(siteRef, {
      "expenses.material": newMaterial
    });
    setForm(blank);isEdit?setEditRow(null):setShowAdd(false);
  }
  async function del(id){
    const newMaterial=site.expenses.material.filter(m=>m.id!==id);
    const siteRef = doc(db, "sites", site.id.toString());
    await updateDoc(siteRef, {
      "expenses.material": newMaterial
    });
  }

  return(
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}><Btn onClick={()=>{setForm(blank);setShowAdd(true);}}>➕ Add Material</Btn></div>
      <Card>
        <Tbl cols={["Material","Vendor","Contractor","Qty","Rate","Total","Advance","Remaining","Status","Actions"]}
          rows={site.expenses.material.map(m=>[
            <span style={{fontWeight:600,color:C.dark}}>{m.material}</span>,m.vendor,m.contractor,m.qty,fmt(m.rate),
            <span style={{fontWeight:700}}>{fmt(m.total)}</span>,
            <span style={{color:C.green,fontWeight:600}}>{fmt(m.advance)}</span>,
            <span style={{color:C.red,fontWeight:600}}>{fmt(m.remaining)}</span>,
            <Bdg s={m.status}/>,
            <div style={{display:"flex",gap:6}}>
              <Btn small v="secondary" onClick={()=>{setEditRow(m.id);setForm({material:m.material,vendor:m.vendor,contractor:m.contractor,qty:m.qty,rate:m.rate,advance:m.advance,status:m.status,date:m.date})}}>✏️</Btn>
              <Btn small v="danger" onClick={()=>del(m.id)}>🗑️</Btn>
            </div>
          ])}/>
      </Card>
      {(showAdd||editRow)&&<Modal title={editRow?"Edit Material":"Add Material"} onClose={()=>{setShowAdd(false);setEditRow(null);}} w={560}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label="Material" value={form.material} onChange={e=>setForm({...form,material:e.target.value})}/>
          <Fld label="Vendor" value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}/>
          <Fld label="Contractor" value={form.contractor} onChange={e=>setForm({...form,contractor:e.target.value})}/>
          <Fld label="Quantity" type="number" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})}/>
          <Fld label="Rate (₹)" type="number" value={form.rate} onChange={e=>setForm({...form,rate:e.target.value})}/>
          <Fld label="Advance (₹)" type="number" value={form.advance} onChange={e=>setForm({...form,advance:e.target.value})}/>
          <Fld label="Date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
          <Fld label="Status" as="select" value={form.status} onChange={e=>setForm({...form,status:e.target.value})} options={["Paid","Partial","Unpaid"]}/>
        </div>
        <div style={{display:"flex",gap:10,marginTop:8}}>
          <Btn onClick={()=>calcAndSave(!!editRow)}>{editRow?"Update":"Save"}</Btn>
          <Btn v="ghost" onClick={()=>{setShowAdd(false);setEditRow(null);}}>Cancel</Btn>
        </div>
      </Modal>}
    </div>
  );
}

// ─── LABOUR TAB ───────────────────────────────────────────────
function LabTab({site}){
  const[showAdd,setShowAdd]=useState(false);
  const[editRow,setEditRow]=useState(null);
  const blank={contractor:"",work:"",total:"",advance:"",status:"Unpaid",workers:""};
  const[form,setForm]=useState(blank);

  async function save(isEdit){
    const remaining=Number(form.total)-Number(form.advance);
    const entry={...form,total:Number(form.total),advance:Number(form.advance),remaining,workers:Number(form.workers)};
    const newLabour=isEdit?site.expenses.labour.map(l=>l.id===editRow?{...entry,id:editRow}:l):[...site.expenses.labour,{...entry,id:Date.now()}];
    const siteRef = doc(db, "sites", site.id.toString());
    await updateDoc(siteRef, {
      "expenses.labour": newLabour
    });
    setForm(blank);isEdit?setEditRow(null):setShowAdd(false);
  }
  async function del(id){
    const newLabour=site.expenses.labour.filter(l=>l.id!==id);
    const siteRef = doc(db, "sites", site.id.toString());
    await updateDoc(siteRef, {
      "expenses.labour": newLabour
    });
  }

  return(
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}><Btn onClick={()=>{setForm(blank);setShowAdd(true);}}>➕ Add Labour</Btn></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
        {site.expenses.labour.map(l=>(
          <Card key={l.id} style={{padding:20,borderTop:`4px solid ${C.blueDeep}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div><div style={{fontWeight:700,fontSize:14,color:C.dark}}>{l.contractor}</div><div style={{fontSize:13,color:C.g400,marginTop:2}}>{l.work}</div></div>
              <Bdg s={l.status}/>
            </div>
            <div style={{fontSize:12,color:C.g400,marginBottom:10}}>👷 {l.workers} workers</div>
            {[["Total",fmt(l.total),C.dark],["Advance",fmt(l.advance),C.green],["Remaining",fmt(l.remaining),C.red]].map(([k,v,c])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.g100}`}}>
                <span style={{fontSize:13,color:C.g400}}>{k}</span><span style={{fontSize:13,fontWeight:700,color:c}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:12,display:"flex",gap:8,justifyContent:"flex-end"}}>
              <Btn small v="secondary" onClick={()=>{setEditRow(l.id);setForm({contractor:l.contractor,work:l.work,total:l.total,advance:l.advance,status:l.status,workers:l.workers});}}>✏️ Edit</Btn>
              <Btn small v="danger" onClick={()=>del(l.id)}>🗑️</Btn>
            </div>
          </Card>
        ))}
      </div>
      {(showAdd||editRow)&&<Modal title={editRow?"Edit Labour":"Add Labour"} onClose={()=>{setShowAdd(false);setEditRow(null);}}>
        <Fld label="Contractor" value={form.contractor} onChange={e=>setForm({...form,contractor:e.target.value})}/>
        <Fld label="Work Type" value={form.work} onChange={e=>setForm({...form,work:e.target.value})}/>
        <Fld label="Workers Count" type="number" value={form.workers} onChange={e=>setForm({...form,workers:e.target.value})}/>
        <Fld label="Total Deal (₹)" type="number" value={form.total} onChange={e=>setForm({...form,total:e.target.value})}/>
        <Fld label="Advance (₹)" type="number" value={form.advance} onChange={e=>setForm({...form,advance:e.target.value})}/>
        <Fld label="Status" as="select" value={form.status} onChange={e=>setForm({...form,status:e.target.value})} options={["Paid","Partial","Unpaid"]}/>
        <div style={{display:"flex",gap:10}}><Btn onClick={()=>save(!!editRow)}>{editRow?"Update":"Save"}</Btn><Btn v="ghost" onClick={()=>{setShowAdd(false);setEditRow(null);}}>Cancel</Btn></div>
      </Modal>}
    </div>
  );
}

// ─── BILLS TAB ────────────────────────────────────────────────
function BillsTab({site}){
  const[showAdd,setShowAdd]=useState(false);
  const[editRow,setEditRow]=useState(null);
  const blank={type:"Material",date:"",contractor:"",material:"",qty:"",rate:""};
  const[form,setForm]=useState(blank);
  const bills=site.expenses.bills;
  const total=bills.reduce((a,b)=>a+b.total,0);

  async function save(isEdit){
    const t=Number(form.qty)*Number(form.rate);
    const n=bills.length;
    const entry={...form,qty:Number(form.qty),rate:Number(form.rate),total:t,billNo:`B-${String(n+1).padStart(4,"0")}`};
    const newBills=isEdit?site.expenses.bills.map(bl=>bl.id===editRow?{...entry,id:editRow}:bl):[...site.expenses.bills,{...entry,id:Date.now()}];
    const siteRef = doc(db, "sites", site.id.toString());
    await updateDoc(siteRef, {
      "expenses.bills": newBills
    });
    setForm(blank);isEdit?setEditRow(null):setShowAdd(false);
  }
  async function del(id){
    const newBills=site.expenses.bills.filter(b=>b.id!==id);
    const siteRef = doc(db, "sites", site.id.toString());
    await updateDoc(siteRef, {
      "expenses.bills": newBills
    });
  }

  return(
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}><Btn onClick={()=>{setForm(blank);setShowAdd(true);}}>➕ Add Bill</Btn></div>
      <Card style={{marginBottom:14}}>
        <Tbl cols={["Bill No.","Type","Date","Contractor","Item","Qty","Rate","Total","Actions"]}
          rows={bills.map(b=>[
            <span style={{color:C.blueDeep,fontWeight:700}}>{b.billNo}</span>,<Bdg s={b.type}/>,
            <span style={{fontSize:12,color:C.g400}}>{b.date}</span>,b.contractor,b.material,b.qty,fmt(b.rate),
            <span style={{fontWeight:700,color:C.green}}>{fmt(b.total)}</span>,
            <div style={{display:"flex",gap:6}}>
              <Btn small v="secondary" onClick={()=>{setEditRow(b.id);setForm({type:b.type,date:b.date,contractor:b.contractor,material:b.material,qty:b.qty,rate:b.rate});}}>✏️</Btn>
              <Btn small v="danger" onClick={()=>del(b.id)}>🗑️</Btn>
            </div>
          ])}/>
      </Card>
      <div style={{background:C.pistaPale,borderRadius:12,padding:"12px 18px",display:"flex",justifyContent:"space-between"}}>
        <span style={{fontWeight:700,color:C.dark}}>Total Expenses</span>
        <span style={{fontWeight:800,fontSize:17,color:C.sageDark}}>{fmt(total)}</span>
      </div>
      {(showAdd||editRow)&&<Modal title={editRow?"Edit Bill":"Add Bill"} onClose={()=>{setShowAdd(false);setEditRow(null);}}>
        <Fld label="Type" as="select" value={form.type} onChange={e=>setForm({...form,type:e.target.value})} options={["Material","Labour"]}/>
        <Fld label="Date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
        <Fld label="Contractor" value={form.contractor} onChange={e=>setForm({...form,contractor:e.target.value})}/>
        <Fld label="Material / Work" value={form.material} onChange={e=>setForm({...form,material:e.target.value})}/>
        <Fld label="Quantity" type="number" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})}/>
        <Fld label="Rate (₹)" type="number" value={form.rate} onChange={e=>setForm({...form,rate:e.target.value})}/>
        <div style={{display:"flex",gap:10}}><Btn onClick={()=>save(!!editRow)}>{editRow?"Update":"Save"}</Btn><Btn v="ghost" onClick={()=>{setShowAdd(false);setEditRow(null);}}>Cancel</Btn></div>
      </Modal>}
    </div>
  );
}

// ─── SITE DETAIL ──────────────────────────────────────────────
function SiteDetail({site,onBack,onComplete}){
  const[main,setMain]=useState("payment");
  const[exp,setExp]=useState("material");
  const[editSite,setEditSite]=useState(false);
  const[siteForm,setSiteForm]=useState({name:site.name,client:site.client,contact:site.contact,address:site.address,startDate:site.startDate,estCompletion:site.estCompletion,progress:site.progress,totalDeal:site.payment.totalDeal});

  async function saveSiteEdit(){
    const siteRef = doc(db, "sites", site.id.toString());
    await updateDoc(siteRef, {
      name: siteForm.name,
      client: siteForm.client,
      contact: siteForm.contact,
      address: siteForm.address,
      startDate: siteForm.startDate,
      estCompletion: siteForm.estCompletion,
      progress: Number(siteForm.progress),
      "payment.totalDeal": Number(siteForm.totalDeal)
    });
    setEditSite(false);
  }

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={onBack} style={{background:C.g100,border:"none",borderRadius:10,padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:700,color:C.g600}}>← Back</button>
        <div>
          <div style={{fontSize:19,fontWeight:800,color:C.dark}}>{site.name}</div>
          <div style={{fontSize:13,color:C.g400}}>{site.address} · {site.client} · 📞 {site.contact}</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <Bdg s="Under Process"/>
          <Btn v="secondary" small onClick={()=>setEditSite(true)}>✏️ Edit Site</Btn>
          <label style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:C.pistaPale,borderRadius:10,cursor:"pointer",border:`1.5px solid ${C.pistaLight}`,fontSize:13,fontWeight:600,color:C.sageDark}}>
            <input type="checkbox" onChange={e=>{if(e.target.checked)onComplete(site.id);}} style={{width:16,height:16,accentColor:C.sageDark}}/>
            Mark Completed
          </label>
        </div>
      </div>

      <Card style={{padding:22,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:14,fontWeight:700,color:C.dark}}>Work Progress — {site.progress}%</div>
          <span style={{fontSize:13,color:C.g400}}>Est. Completion: {site.estCompletion}</span>
        </div>
        <ProgBar pct={site.progress} h={12}/>
        <div style={{fontSize:12,color:C.g400,marginTop:6}}>Started: {site.startDate}</div>
      </Card>

      <Tabs tabs={[["payment","💰 Payment"],["expenses","📋 Expenses"]]} active={main} onChange={setMain}/>
      {main==="payment"&&<PayTab site={site}/>}
      {main==="expenses"&&<div>
        <Tabs tabs={[["material","🧱 Material"],["labour","👷 Labour"],["bills","🧾 Bills"]]} active={exp} onChange={setExp}/>
        {exp==="material"&&<MatTab site={site}/>}
        {exp==="labour"&&<LabTab site={site}/>}
        {exp==="bills"&&<BillsTab site={site}/>}
      </div>}

      {editSite&&<Modal title="Edit Site Details" onClose={()=>setEditSite(false)} w={540}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label="Site Name" value={siteForm.name} onChange={e=>setSiteForm({...siteForm,name:e.target.value})}/>
          <Fld label="Client Name" value={siteForm.client} onChange={e=>setSiteForm({...siteForm,client:e.target.value})}/>
          <Fld label="Contact" value={siteForm.contact} onChange={e=>setSiteForm({...siteForm,contact:e.target.value})}/>
          <Fld label="Total Deal (₹)" type="number" value={siteForm.totalDeal} onChange={e=>setSiteForm({...siteForm,totalDeal:e.target.value})}/>
          <Fld label="Address" value={siteForm.address} onChange={e=>setSiteForm({...siteForm,address:e.target.value})}/>
          <Fld label="Start Date" type="date" value={siteForm.startDate} onChange={e=>setSiteForm({...siteForm,startDate:e.target.value})}/>
          <Fld label="Est. Completion" type="date" value={siteForm.estCompletion} onChange={e=>setSiteForm({...siteForm,estCompletion:e.target.value})}/>
          <Fld label="Progress (%)" type="number" value={siteForm.progress} onChange={e=>setSiteForm({...siteForm,progress:e.target.value})}/>
        </div>
        <div style={{display:"flex",gap:10,marginTop:8}}><Btn onClick={saveSiteEdit}>Update Site</Btn><Btn v="ghost" onClick={()=>setEditSite(false)}>Cancel</Btn></div>
      </Modal>}
    </div>
  );
}

// ─── SITES MODULE ─────────────────────────────────────────────
function Sites({sites}){
  const[tab,setTab]=useState("ongoing");
  const[sel,setSel]=useState(null);
  const[showAdd,setShowAdd]=useState(false);
  const[editCompleted,setEditCompleted]=useState(null);
  const blank={name:"",client:"",contact:"",address:"",startDate:"",estCompletion:"",totalDeal:""};
  const[form,setForm]=useState(blank);

  async function addSite(){
    if(!form.name||!form.client||!form.totalDeal)return;
    const id = Date.now();
    await setDoc(doc(db, "sites", id.toString()), {
      id,
      ...form,
      status: "ongoing",
      progress: 0,
      contractorCount: 0,
      materialCost: 0,
      payment: { totalDeal: Number(form.totalDeal), paid: 0, methods: [] },
      expenses: { material: [], labour: [], bills: [] }
    });
    setForm(blank);setShowAdd(false);
  }

  async function completeSite(id){
    const s=sites.ongoing.find(x=>x.id===id);
    if(!s)return;
    const completedEntry={
      id:s.id,
      name:s.name,
      client:s.client,
      contact:s.contact,
      address:s.address,
      totalCost:s.payment.totalDeal,
      contractors:s.expenses.labour.map(l=>l.contractor).filter((v,i,a)=>a.indexOf(v)===i),
      timeline:`${s.startDate} – Today`,
      startDate:s.startDate,
      endDate:new Date().toLocaleDateString("en-IN"),
      status: "completed"
    };
    await setDoc(doc(db, "sites", id.toString()), completedEntry);
    setSel(null);setTab("completed");
  }

  async function delCompleted(id){
    await deleteDoc(doc(db, "sites", id.toString()));
  }

  if(sel){
    const live=sites.ongoing.find(s=>s.id===sel.id);
    if(!live){setSel(null);return null;}
    return<SiteDetail site={live} onBack={()=>setSel(null)} onComplete={completeSite}/>;
  }

  return(
    <div>
      <Hdr title="Sites" sub={`${sites.ongoing.length+sites.completed.length} total`} action={<Btn onClick={()=>{setForm(blank);setShowAdd(true);}}>➕ Add New Site</Btn>}/>
      <Tabs tabs={[[`ongoing`,`🏗️ Under Process (${sites.ongoing.length})`],["completed",`✅ Completed (${sites.completed.length})`]]} active={tab} onChange={setTab}/>

      {tab==="ongoing"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:18}}>
          {sites.ongoing.length===0&&<div style={{padding:40,color:C.g400,fontSize:14,gridColumn:"1/-1",textAlign:"center"}}>No ongoing sites. Click "Add New Site" to start.</div>}
          {sites.ongoing.map(s=>{
            const rem=s.payment.totalDeal-s.payment.paid;
            return(
              <Card key={s.id} style={{padding:20,borderTop:`4px solid ${C.pista}`,position:"relative"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{fontWeight:800,fontSize:14,color:C.dark,lineHeight:1.3,flex:1,marginRight:8}}>{s.name}</div>
                  <Bdg s="Under Process"/>
                </div>
                <div style={{fontSize:13,color:C.g400,marginBottom:2}}>👤 {s.client} · 📞 {s.contact}</div>
                <div style={{fontSize:13,color:C.g400,marginBottom:2}}>📍 {s.address}</div>
                <div style={{fontSize:13,color:C.g400,marginBottom:12}}>📅 {s.startDate} → {s.estCompletion}</div>
                {[["Total Deal",fmt(s.payment.totalDeal)],["Paid",fmt(s.payment.paid)],["Pending",fmt(Math.max(0,rem))]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.g100}`}}>
                    <span style={{fontSize:13,color:C.g400}}>{k}</span><span style={{fontSize:13,fontWeight:700,color:C.dark}}>{v}</span>
                  </div>
                ))}
                <div style={{marginTop:12}}><ProgBar pct={s.progress} h={8}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.g400,marginTop:4}}>
                    <span>👷 {s.contractorCount} contractors</span><span>{s.progress}% done</span>
                  </div>
                </div>
                <div style={{marginTop:14,display:"flex",gap:8,flexWrap:"wrap"}}>
                  <Btn small onClick={()=>setSel(s)}>📂 Open</Btn>
                  <label style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:C.pistaPale,borderRadius:8,cursor:"pointer",border:`1.5px solid ${C.pistaLight}`,fontSize:12,fontWeight:600,color:C.sageDark}}>
                    <input type="checkbox" onChange={e=>{if(e.target.checked)completeSite(s.id);}} style={{accentColor:C.sageDark}}/> Complete
                  </label>
                  <Btn small v="danger" onClick={async ()=>await deleteDoc(doc(db, "sites", s.id.toString()))}>🗑️</Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab==="completed"&&(
        <div>
          <Card>
            <Tbl cols={["Site Name","Client","Contact","Address","Total Cost","Timeline","Status","Actions"]}
              rows={sites.completed.map(s=>[
                <span style={{fontWeight:700,color:C.dark}}>{s.name}</span>,s.client,s.contact,s.address,
                <span style={{fontWeight:700,color:C.green}}>{fmt(s.totalCost)}</span>,s.timeline,
                <Bdg s="Completed"/>,
                <div style={{display:"flex",gap:6}}>
                  <Btn small v="secondary" onClick={()=>setEditCompleted({...s})}>✏️</Btn>
                  <Btn small v="danger" onClick={()=>delCompleted(s.id)}>🗑️</Btn>
                </div>
              ])}/>
          </Card>
        </div>
      )}

      {showAdd&&<Modal title="Add New Site" onClose={()=>setShowAdd(false)} w={560}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label="Site Name *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <Fld label="Client Name *" value={form.client} onChange={e=>setForm({...form,client:e.target.value})}/>
          <Fld label="Contact" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/>
          <Fld label="Total Deal (₹) *" type="number" value={form.totalDeal} onChange={e=>setForm({...form,totalDeal:e.target.value})}/>
          <Fld label="Address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/>
          <Fld label="Start Date" type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/>
          <Fld label="Est. Completion" type="date" value={form.estCompletion} onChange={e=>setForm({...form,estCompletion:e.target.value})}/>
        </div>
        <div style={{display:"flex",gap:10,marginTop:8}}><Btn onClick={addSite}>Add Site</Btn><Btn v="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn></div>
      </Modal>}

      {editCompleted&&<Modal title="Edit Completed Site" onClose={()=>setEditCompleted(null)}>
        <Fld label="Site Name" value={editCompleted.name} onChange={e=>setEditCompleted({...editCompleted,name:e.target.value})}/>
        <Fld label="Client" value={editCompleted.client} onChange={e=>setEditCompleted({...editCompleted,client:e.target.value})}/>
        <Fld label="Contact" value={editCompleted.contact} onChange={e=>setEditCompleted({...editCompleted,contact:e.target.value})}/>
        <Fld label="Total Cost (₹)" type="number" value={editCompleted.totalCost} onChange={e=>setEditCompleted({...editCompleted,totalCost:Number(e.target.value)})}/>
        <Fld label="Timeline" value={editCompleted.timeline} onChange={e=>setEditCompleted({...editCompleted,timeline:e.target.value})}/>
        <div style={{display:"flex",gap:10}}>
          <Btn onClick={async ()=>{await setDoc(doc(db, "sites", editCompleted.id.toString()), { ...editCompleted, status: "completed" });setEditCompleted(null);}}>Update</Btn>
          <Btn v="ghost" onClick={()=>setEditCompleted(null)}>Cancel</Btn>
        </div>
      </Modal>}
    </div>
  );
}

// ─── TRANSACTIONS ─────────────────────────────────────────────
function Transactions({sites}){
  const[tab,setTab]=useState("clients");
  const[showAdd,setShowAdd]=useState(false);
  const[editTxn,setEditTxn]=useState(null);
  const[txnForm,setTxnForm]=useState({siteId:"",amount:"",type:"Cash",date:""});

  const siteOpts=sites.ongoing.map(s=>s.name);

  async function addClientPayment(){
    const s=sites.ongoing.find(x=>x.name===txnForm.siteId);
    if(!s||!txnForm.amount)return;
    const amt=Number(txnForm.amount);
    const newM=[...s.payment.methods,{id:Date.now(),type:txnForm.type,amount:amt,date:txnForm.date||new Date().toLocaleDateString("en-IN")}];
    const siteRef = doc(db, "sites", s.id.toString());
    await updateDoc(siteRef, {
      "payment.methods": newM,
      "payment.paid": s.payment.paid+amt
    });
    setTxnForm({siteId:"",amount:"",type:"Cash",date:""});setShowAdd(false);
  }

  return(
    <div>
      <Hdr title="Transactions" sub="All payment records" action={<Btn onClick={()=>setShowAdd(true)}>+ Add Payment</Btn>}/>
      <Tabs tabs={[["clients","👥 Client Payments"],["contractors","👷 Contractor Payments"]]} active={tab} onChange={setTab}/>

      {tab==="clients"&&(
        <Card>
          <Tbl cols={["Client","Site","Total Deal","Paid","Unpaid","Extra","Actions"]}
            rows={[...sites.ongoing,...sites.completed].map(s=>{
              const total=s.payment?s.payment.totalDeal:s.totalCost,paid=s.payment?s.payment.paid:s.totalCost,unpaid=Math.max(0,total-paid),extra=Math.max(0,paid-total);
              return[<span style={{fontWeight:700}}>{s.client}</span>,s.name,fmt(total),<span style={{fontWeight:700,color:C.green}}>{fmt(paid)}</span>,<span style={{fontWeight:700,color:unpaid>0?C.red:C.green}}>{fmt(unpaid)}</span>,<span style={{color:C.gold,fontWeight:700}}>{fmt(extra)}</span>,
                s.payment?<Btn small v="secondary" onClick={()=>{setEditTxn(s.id);setTxnForm({siteId:s.name,amount:"",type:"Cash",date:""});}}>+ Pay</Btn>:null
              ];
            })}/>
        </Card>
      )}

      {tab==="contractors"&&(
        <Card>
          <Tbl cols={["Contractor","Site","Work","Total","Paid","Remaining","Status","Actions"]}
            rows={sites.ongoing.flatMap(s=>s.expenses.labour.map(l=>[
              <span style={{fontWeight:700}}>{l.contractor}</span>,s.name,l.work,fmt(l.total),
              <span style={{color:C.green,fontWeight:700}}>{fmt(l.advance)}</span>,
              <span style={{color:C.red,fontWeight:700}}>{fmt(l.remaining)}</span>,
              <Bdg s={l.status}/>,
              <Btn small v="secondary" onClick={async ()=>{
                const newAdv=prompt("Enter advance amount to add:");
                if(!newAdv)return;
                const amt=Number(newAdv);
                const newLabour=s.expenses.labour.map(lb=>lb.id===l.id?{...lb,advance:lb.advance+amt,remaining:Math.max(0,lb.remaining-amt),status:lb.remaining-amt<=0?"Paid":"Partial"}:lb);
                const siteRef = doc(db, "sites", s.id.toString());
                await updateDoc(siteRef, {
                  "expenses.labour": newLabour
                });
              }}>+ Pay</Btn>
            ]))}/>
        </Card>
      )}

      {showAdd&&<Modal title="Add Client Payment" onClose={()=>setShowAdd(false)}>
        <Fld label="Select Site" as="select" value={txnForm.siteId} onChange={e=>setTxnForm({...txnForm,siteId:e.target.value})} options={["-- Select Site --",...siteOpts]}/>
        <Fld label="Amount (₹)" type="number" value={txnForm.amount} onChange={e=>setTxnForm({...txnForm,amount:e.target.value})}/>
        <Fld label="Payment Method" as="select" value={txnForm.type} onChange={e=>setTxnForm({...txnForm,type:e.target.value})} options={["Cash","UPI","Cheque","Bank Transfer","NEFT"]}/>
        <Fld label="Date" type="date" value={txnForm.date} onChange={e=>setTxnForm({...txnForm,date:e.target.value})}/>
        <div style={{display:"flex",gap:10}}><Btn onClick={addClientPayment}>Save Payment</Btn><Btn v="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn></div>
      </Modal>}

      {editTxn&&<Modal title="Add Payment to Site" onClose={()=>setEditTxn(null)}>
        <Fld label="Site" value={txnForm.siteId} onChange={()=>{}} disabled/>
        <Fld label="Amount (₹)" type="number" value={txnForm.amount} onChange={e=>setTxnForm({...txnForm,amount:e.target.value})}/>
        <Fld label="Method" as="select" value={txnForm.type} onChange={e=>setTxnForm({...txnForm,type:e.target.value})} options={["Cash","UPI","Cheque","Bank Transfer","NEFT"]}/>
        <Fld label="Date" type="date" value={txnForm.date} onChange={e=>setTxnForm({...txnForm,date:e.target.value})}/>
        <div style={{display:"flex",gap:10}}>
          <Btn onClick={async ()=>{
            const s=sites.ongoing.find(x=>x.id===editTxn);
            if(!s||!txnForm.amount)return;
            const amt=Number(txnForm.amount);
            const newM=[...s.payment.methods,{id:Date.now(),type:txnForm.type,amount:amt,date:txnForm.date||new Date().toLocaleDateString("en-IN")}];
            const siteRef = doc(db, "sites", s.id.toString());
            await updateDoc(siteRef, {
              "payment.methods": newM,
              "payment.paid": s.payment.paid+amt
            });
            setEditTxn(null);
          }}>Save</Btn>
          <Btn v="ghost" onClick={()=>setEditTxn(null)}>Cancel</Btn>
        </div>
      </Modal>}
    </div>
  );
}

// ─── VOUCHERS ─────────────────────────────────────────────────
function Vouchers({sites}){
  const[search,setSearch]=useState("");
  let n=1;
  const list=sites.ongoing.flatMap(s=>s.expenses.bills.map(b=>({n:n++,client:s.client,site:s.name,...b}))).filter(v=>v.client.toLowerCase().includes(search.toLowerCase())||v.site.toLowerCase().includes(search.toLowerCase()));
  return(
    <div>
      <Hdr title="Vouchers" sub={`${list.length} expense records`}/>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search by client or site..."
        style={{border:`1.5px solid ${C.g200}`,borderRadius:12,padding:"10px 18px",fontSize:14,width:300,outline:"none",fontFamily:"inherit",background:"#fff",marginBottom:18}}/>
      <Card>
        <Tbl cols={["#","Voucher No.","Date","Client","Site","Contractor","Item","Qty","Rate","Total"]}
          rows={list.map(v=>[
            <span style={{color:C.g400,fontSize:12}}>{v.n}</span>,
            <span style={{color:C.blueDeep,fontWeight:700}}>V-{String(v.n).padStart(4,"0")}</span>,
            <span style={{fontSize:12,color:C.g400}}>{v.date}</span>,
            <span style={{fontWeight:600}}>{v.client}</span>,
            <span style={{fontSize:12,color:C.g500}}>{v.site}</span>,
            v.contractor,v.material,v.qty,fmt(v.rate),
            <span style={{fontWeight:700,color:C.green}}>{fmt(v.total)}</span>
          ])}/>
      </Card>
    </div>
  );
}

// ─── CLIENTS ──────────────────────────────────────────────────
function Clients({clients}){
  const[search,setSearch]=useState("");
  const[filter,setFilter]=useState("All");
  const[showAdd,setShowAdd]=useState(false);
  const[editC,setEditC]=useState(null);
  const blank={name:"",mobile:"",status:"Under Process",totalValue:"",contractor:"",startDate:"",endDate:"",site:""};
  const[form,setForm]=useState(blank);
  const list=clients.filter(c=>(filter==="All"||c.status===filter)&&c.name.toLowerCase().includes(search.toLowerCase()));

  async function save(isEdit){
    if(!form.name)return;
    if(isEdit){
      await setDoc(doc(db, "clients", editC.toString()), { ...form, id: editC, totalValue: Number(form.totalValue) });
      setEditC(null);
    } else {
      const id = Date.now();
      await setDoc(doc(db, "clients", id.toString()), { ...form, id, totalValue: Number(form.totalValue) });
      setShowAdd(false);
    }
    setForm(blank);
  }

  return(
    <div>
      <Hdr title="Clients" sub={`${clients.length} registered`} action={<Btn onClick={()=>{setForm(blank);setShowAdd(true);}}>➕ Add Client</Btn>}/>
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search..."
          style={{border:`1.5px solid ${C.g200}`,borderRadius:12,padding:"10px 16px",fontSize:14,width:220,outline:"none",fontFamily:"inherit",background:"#fff"}}/>
        {["All","Under Process","Completed"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"10px 16px",borderRadius:10,border:`1.5px solid ${filter===f?C.sageDark:C.g200}`,background:filter===f?C.pistaPale:"#fff",color:filter===f?C.sageDark:C.g500,fontWeight:600,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>{f}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        {list.map(c=>(
          <Card key={c.id} style={{padding:20,borderTop:`4px solid ${c.status==="Completed"?C.green:C.blueDeep}`}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:C.pistaPale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:C.sageDark,border:`2px solid ${C.pistaLight}`}}>{c.name[0]}</div>
              <div>
                <div style={{fontWeight:800,fontSize:15,color:C.dark}}>{c.name}</div>
                <div style={{fontSize:13,color:C.g400}}>📞 {c.mobile}</div>
              </div>
              <div style={{marginLeft:"auto"}}><Bdg s={c.status}/></div>
            </div>
            <div style={{fontSize:13,color:C.g500,marginBottom:10}}>🏗️ {c.site}</div>
            {[["Total Value",fmt(c.totalValue)],["Contractor",c.contractor],["Start",c.startDate],["End",c.endDate]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.g100}`}}>
                <span style={{fontSize:13,color:C.g400}}>{k}</span><span style={{fontSize:13,fontWeight:600,color:C.dark}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:12,display:"flex",gap:8,justifyContent:"flex-end"}}>
              <Btn small v="secondary" onClick={()=>{setEditC(c.id);setForm({name:c.name,mobile:c.mobile,status:c.status,totalValue:c.totalValue,contractor:c.contractor,startDate:c.startDate,endDate:c.endDate,site:c.site});}}>✏️ Edit</Btn>
              <Btn small v="danger" onClick={async ()=>await deleteDoc(doc(db, "clients", c.id.toString()))}>🗑️</Btn>
            </div>
          </Card>
        ))}
      </div>
      {(showAdd||editC)&&<Modal title={editC?"Edit Client":"Add Client"} onClose={()=>{setShowAdd(false);setEditC(null);}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <Fld label="Mobile" value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value})}/>
          <Fld label="Site" value={form.site} onChange={e=>setForm({...form,site:e.target.value})}/>
          <Fld label="Total Value (₹)" type="number" value={form.totalValue} onChange={e=>setForm({...form,totalValue:e.target.value})}/>
          <Fld label="Contractor" value={form.contractor} onChange={e=>setForm({...form,contractor:e.target.value})}/>
          <Fld label="Status" as="select" value={form.status} onChange={e=>setForm({...form,status:e.target.value})} options={["Under Process","Completed"]}/>
          <Fld label="Start Date" type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/>
          <Fld label="End Date" type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/>
        </div>
        <div style={{display:"flex",gap:10,marginTop:8}}><Btn onClick={()=>save(!!editC)}>{editC?"Update":"Save"}</Btn><Btn v="ghost" onClick={()=>{setShowAdd(false);setEditC(null);}}>Cancel</Btn></div>
      </Modal>}
    </div>
  );
}

// ─── REPORTS ──────────────────────────────────────────────────
function Reports({sites}){
  const rows=[...sites.ongoing,...sites.completed].map(s=>{
    const total=s.payment?s.payment.totalDeal:s.totalCost,paid=s.payment?s.payment.paid:s.totalCost;
    const expenses=s.expenses?s.expenses.material.reduce((a,m)=>a+m.total,0)+s.expenses.labour.reduce((a,l)=>a+l.total,0):0;
    return{client:s.client,site:s.name,total,paid,unpaid:Math.max(0,total-paid),refund:Math.max(0,paid-total),expenses,profit:paid-expenses};
  });
  const rev=rows.reduce((a,r)=>a+r.paid,0),exp=rows.reduce((a,r)=>a+r.expenses,0),profit=rows.reduce((a,r)=>a+r.profit,0);
  return(
    <div>
      <Hdr title="Reports & Analytics" sub="Admin only — financial intelligence"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:24}}>
        <StatCard icon="💰" label="Total Revenue" value={fmt(rev)} sub="Collected" color={C.green}/>
        <StatCard icon="📉" label="Total Expenses" value={fmt(exp)} sub="Spent" color={C.red}/>
        <StatCard icon="📈" label="Net Profit" value={fmt(profit)} sub={rev>0?`${Math.round((profit/rev)*100)}% margin`:""} color={C.gold}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:18,marginBottom:22}}>
        <Card style={{padding:22}}>
          <div style={{fontWeight:700,fontSize:15,color:C.dark,marginBottom:18}}>Revenue vs Expense</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={computeRealChartData(sites)}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.g100}/>
              <XAxis dataKey="month" tick={{fontSize:12,fill:C.g400}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>v>=100000?`₹${v/100000}L`:`₹${v}`} tick={{fontSize:11,fill:C.g400}} axisLine={false} tickLine={false}/>
              <Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:10,fontSize:13}}/>
              <Legend/>
              <Bar dataKey="revenue" name="Revenue" fill={C.pista} radius={[6,6,0,0]}/>
              <Bar dataKey="expense" name="Expense" fill={C.blue} radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{padding:22}}>
          <div style={{fontWeight:700,fontSize:15,color:C.dark,marginBottom:18}}>Profit Trend</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={computeRealChartData(sites).map(d=>({...d,profit:d.revenue-d.expense}))}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.g100}/>
              <XAxis dataKey="month" tick={{fontSize:12,fill:C.g400}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>v>=100000?`₹${v/100000}L`:`₹${v}`} tick={{fontSize:11,fill:C.g400}} axisLine={false} tickLine={false}/>
              <Tooltip formatter={v=>fmt(v)} contentStyle={{borderRadius:10,fontSize:13}}/>
              <Line type="monotone" dataKey="profit" stroke={C.gold} strokeWidth={2.5} dot={{r:4,fill:C.gold}} name="Profit"/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.g100}`,fontWeight:700,fontSize:15,color:C.dark}}>Business Summary</div>
        <Tbl cols={["Client","Site","Total","Paid","Unpaid","Refund","Expenses","Profit"]}
          rows={rows.map(r=>[
            <span style={{fontWeight:700}}>{r.client}</span>,
            <span style={{fontSize:12,color:C.g500}}>{r.site}</span>,
            fmt(r.total),
            <span style={{fontWeight:700,color:C.green}}>{fmt(r.paid)}</span>,
            <span style={{fontWeight:700,color:C.red}}>{fmt(r.unpaid)}</span>,
            <span style={{color:C.gold,fontWeight:700}}>{fmt(r.refund)}</span>,
            <span style={{color:C.g600}}>{fmt(r.expenses)}</span>,
            <span style={{fontWeight:800,color:r.profit>=0?C.green:C.red}}>{fmt(r.profit)}</span>
          ])}/>
      </Card>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────
function Settings({user}){
  return(
    <div>
      <Hdr title="Settings" sub="Account & preferences"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        <Card style={{padding:22}}>
          <div style={{fontWeight:700,fontSize:15,color:C.dark,marginBottom:18}}>Profile</div>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,padding:14,background:C.pistaPale,borderRadius:12}}>
            <div style={{width:50,height:50,borderRadius:"50%",background:C.sageDark,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:20,fontWeight:800}}>{user.name[0]}</div>
            <div><div style={{fontWeight:700,fontSize:15,color:C.dark}}>{user.name}</div><div style={{marginTop:4}}><Bdg s={user.role}/></div></div>
          </div>
          <Fld label="Display Name" value={user.name} onChange={()=>{}}/>
          <Btn>Save Changes</Btn>
        </Card>
        <Card style={{padding:22}}>
          <div style={{fontWeight:700,fontSize:15,color:C.dark,marginBottom:18}}>System</div>
          {[["Company","BuildPro Constructions"],["Currency","INR (₹)"],["Date Format","DD/MM/YYYY"],["Language","English"]].map(([k,v])=>(
            <div key={k} style={{marginBottom:12}}>
              <div style={{fontSize:12,color:C.g500,fontWeight:700,marginBottom:4,textTransform:"uppercase",letterSpacing:0.5}}>{k}</div>
              <div style={{background:C.offWhite,border:`1.5px solid ${C.g200}`,borderRadius:10,padding:"10px 14px",fontSize:14,color:C.dark}}>{v}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────
export default function App(){
  const[user,setUser]=useState(null);
  const[nav,setNav]=useState("home");
  const[sites,setSites]=useState({ ongoing: [], completed: [] });
  const[clients,setClients]=useState([]);
  const[collapsed,setCollapsed]=useState(false);

  useEffect(() => {
    const unsubSites = onSnapshot(collection(db, "sites"), (snapshot) => {
      if (snapshot.empty) {
        // Seed
        INIT_SITES.ongoing.forEach(s => {
          setDoc(doc(db, "sites", s.id.toString()), { ...s, status: "ongoing" });
        });
        INIT_SITES.completed.forEach(s => {
          setDoc(doc(db, "sites", s.id.toString()), { ...s, status: "completed" });
        });
      } else {
        const ongoing = [];
        const completed = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.status === "completed") {
            completed.push(data);
          } else {
            ongoing.push(data);
          }
        });
        setSites({ ongoing, completed });
      }
    });

    const unsubClients = onSnapshot(collection(db, "clients"), (snapshot) => {
      if (snapshot.empty) {
        INIT_CLIENTS.forEach(c => {
          setDoc(doc(db, "clients", c.id.toString()), c);
        });
      } else {
        const list = [];
        snapshot.forEach(doc => {
          list.push(doc.data());
        });
        setClients(list);
      }
    });

    return () => {
      unsubSites();
      unsubClients();
    };
  }, []);

  async function handleSeedAll() {
    try {
      const batch = [];
      INIT_CLIENTS.forEach(c => {
        batch.push(setDoc(doc(db, "clients", c.id.toString()), c));
      });
      INIT_SITES.ongoing.forEach(s => {
        batch.push(setDoc(doc(db, "sites", s.id.toString()), { ...s, status: "ongoing" }));
      });
      INIT_SITES.completed.forEach(s => {
        batch.push(setDoc(doc(db, "sites", s.id.toString()), { ...s, status: "completed" }));
      });
      await Promise.all(batch);
      alert("Success: Demo data successfully imported to Firebase Firestore!");
    } catch (err) {
      console.error(err);
      alert("Error seeding database: " + err.message);
    }
  }

  const navItems=[
    {id:"home",icon:"🏠",label:"Dashboard"},
    {id:"sites",icon:"🏗️",label:"Sites"},
    {id:"transactions",icon:"💰",label:"Transactions"},
    {id:"vouchers",icon:"🧾",label:"Vouchers"},
    {id:"clients",icon:"👥",label:"Clients"},
    ...(user?.role==="Admin"?[{id:"reports",icon:"📊",label:"Reports"}]:[]),
    {id:"settings",icon:"⚙️",label:"Settings"},
  ];

  if(!user)return<Login onLogin={u=>{setUser(u);setNav("home");}}/>;

  return(
    <div style={{display:"flex",minHeight:"100vh",fontFamily:"'DM Sans','Segoe UI',sans-serif",background:C.offWhite}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-track{background:${C.offWhite};}::-webkit-scrollbar-thumb{background:${C.pistaLight};border-radius:10px;}button{font-family:inherit;}`}</style>

      {/* Sidebar */}
      <div style={{width:collapsed?64:230,background:"#fff",borderRight:`1px solid ${C.g100}`,display:"flex",flexDirection:"column",transition:"width 0.22s ease",flexShrink:0,position:"sticky",top:0,height:"100vh",overflowY:"auto",overflowX:"hidden"}}>
        <div style={{padding:"18px 14px",borderBottom:`1px solid ${C.g100}`,display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,background:`linear-gradient(135deg,${C.sageDark},${C.pista})`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>🏗️</div>
          {!collapsed&&<div><div style={{fontWeight:800,fontSize:15,color:C.dark}}>BuildPro</div><div style={{fontSize:11,color:C.g400}}>Construction ERP</div></div>}
        </div>
        {!collapsed&&(
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.g100}`}}>
            <div style={{background:C.pistaPale,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:C.sageDark,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:12}}>{user.name[0]}</div>
              <div><div style={{fontSize:13,fontWeight:700,color:C.dark}}>{user.name}</div><Bdg s={user.role}/></div>
            </div>
          </div>
        )}
        <nav style={{flex:1,padding:"10px 8px"}}>
          {navItems.map(n=>(
            <div key={n.id} onClick={()=>setNav(n.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 11px",borderRadius:11,marginBottom:2,cursor:"pointer",background:nav===n.id?C.pistaPale:"transparent",color:nav===n.id?C.sageDark:C.g400,fontWeight:nav===n.id?700:500,fontSize:13,transition:"all 0.15s",overflow:"hidden"}}
              onMouseEnter={e=>{if(nav!==n.id)e.currentTarget.style.background=C.g100;}}
              onMouseLeave={e=>{if(nav!==n.id)e.currentTarget.style.background="transparent";}}>
              <span style={{fontSize:17,flexShrink:0}}>{n.icon}</span>
              {!collapsed&&<span style={{whiteSpace:"nowrap"}}>{n.label}</span>}
            </div>
          ))}
        </nav>
        <div style={{padding:"10px 8px",borderTop:`1px solid ${C.g100}`}}>
          <div onClick={()=>setCollapsed(!collapsed)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",borderRadius:10,cursor:"pointer",color:C.g400,fontSize:13}}
            onMouseEnter={e=>e.currentTarget.style.background=C.g100} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span>{collapsed?"▶":"◀"}</span>{!collapsed&&"Collapse"}
          </div>
          <div onClick={()=>setUser(null)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",borderRadius:10,cursor:"pointer",color:C.red,fontSize:13,fontWeight:600}}
            onMouseEnter={e=>e.currentTarget.style.background=C.coralPale} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span>🚪</span>{!collapsed&&"Logout"}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        <div style={{background:"#fff",borderBottom:`1px solid ${C.g100}`,padding:"0 24px",height:58,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:17}}>{navItems.find(n=>n.id===nav)?.icon}</span>
            <span style={{fontWeight:700,fontSize:15,color:C.dark}}>{navItems.find(n=>n.id===nav)?.label}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:13,color:C.g400}}>{new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</div>
            <div style={{width:6,height:6,borderRadius:"50%",background:C.green}}/>
            <Bdg s={user.role}/>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:24}}>
          {nav==="home"&&<Home sites={sites} user={user} setNav={setNav} onImportDemo={handleSeedAll}/>}
          {nav==="sites"&&<Sites sites={sites}/>}
          {nav==="transactions"&&<Transactions sites={sites}/>}
          {nav==="vouchers"&&<Vouchers sites={sites}/>}
          {nav==="clients"&&<Clients clients={clients}/>}
          {nav==="reports"&&user.role==="Admin"&&<Reports sites={sites}/>}
          {nav==="settings"&&<Settings user={user}/>}
        </div>
      </div>
    </div>
  );
}
