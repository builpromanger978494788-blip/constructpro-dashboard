import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { db, auth, provider } from "./firebase";
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch, query, where, getDocs, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import jsPDF from "jspdf";
import "jspdf-autotable";

const C = {
  pista:"var(--pista)",pistaLight:"var(--pistaLight)",pistaPale:"var(--pistaPale)",
  mint:"var(--mint)",mintPale:"var(--mintPale)",sage:"var(--sage)",sageDark:"var(--sageDark)",
  beige:"var(--beige)",offWhite:"var(--offWhite)",
  g100:"var(--g100)",g200:"var(--g200)",g400:"var(--g400)",g500:"var(--g500)",g600:"var(--g600)",g700:"var(--g700)",
  blue:"var(--blue)",bluePale:"var(--bluePale)",blueDeep:"var(--blueDeep)",
  orange:"var(--orange)",orangePale:"var(--orangePale)",coral:"var(--coral)",coralPale:"var(--coralPale)",
  red:"var(--red)",green:"var(--green)",gold:"var(--gold)",
  dark:"var(--dark)",
  cardBg:"var(--cardBg)",
  sh:"var(--sh)",shM:"var(--shM)",shL:"var(--shL)",
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

// Global Helper to move deleted items to Trash
async function moveToTrash(type, data, extra = {}) {
  const trashId = Date.now().toString();
  await setDoc(doc(db, "trash", trashId), {
    id: trashId,
    deletedAt: Date.now(),
    type,
    data,
    ...extra
  });
}

function Card({children,style={}}){return<div style={{background:C.cardBg,borderRadius:16,boxShadow:C.sh,...style}}>{children}</div>;}
function StatCard({icon,label,value,sub,color}){
  return(
    <div style={{background:C.cardBg,borderRadius:16,padding:"22px 24px",boxShadow:C.sh,borderTop:`4px solid ${color}`,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:16,right:16,width:44,height:44,borderRadius:12,background:color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{icon}</div>
      <div style={{fontSize:12,color:C.g400,fontWeight:600,textTransform:"uppercase",letterSpacing:0.8,marginBottom:8,paddingRight:42}}>{label}</div>
      <div style={{fontSize:26,fontWeight:600,color:C.dark,marginBottom:4,lineHeight:1.1}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:C.g400}}>{sub}</div>}
    </div>
  );
}
function Btn({children,onClick,v="primary",small,full}){
  const st={primary:{background:C.sageDark,color:"var(--btnPrimaryText)",border:"none"},secondary:{background:C.pistaPale,color:C.sageDark,border:`1.5px solid ${C.pistaLight}`},ghost:{background:"transparent",color:C.g500,border:`1.5px solid ${C.g200}`},danger:{background:C.coralPale,color:C.red,border:"none"},blue:{background:C.bluePale,color:C.blueDeep,border:"none"}};
  return<button onClick={onClick} style={{...st[v],borderRadius:10,padding:small?"6px 14px":"10px 20px",fontSize:small?12:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6,transition:"all 0.15s",whiteSpace:"nowrap",width:full?"100%":"auto",justifyContent:full?"center":"flex-start"}}>{children}</button>;
}
function Modal({title,children,onClose,w=520}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(30,45,36,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
      <div className="modal-container" style={{background:C.cardBg,borderRadius:20,padding:"32px 36px",width:`min(${w}px,95vw)`,maxHeight:"88vh",overflowY:"auto",boxShadow:C.shL}}>
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
function Login({onLogin, authError, setAuthError}){
  const[mode,setMode]=useState("Admin");
  const[loading,setLoading]=useState(false);
  const[staffEmail, setStaffEmail]=useState("");
  const[otp, setOtp]=useState("");
  const[sentOtp, setSentOtp]=useState(null);
  const[pendingDevice, setPendingDevice]=useState(null);

  useEffect(() => {
     let interval;
     if(pendingDevice) {
        interval = setInterval(async () => {
           const dSnap = await getDoc(doc(db, "devices", pendingDevice));
           if(dSnap.exists()) {
             if(dSnap.data().status === "approved") {
                completeStaffLogin(pendingDevice, staffEmail);
             } else if(dSnap.data().status === "rejected") {
                setAuthError("Device login rejected by Admin.");
                setPendingDevice(null);
                setSentOtp(null);
             }
           }
        }, 3000);
     }
     return () => clearInterval(interval);
  }, [pendingDevice, staffEmail]);

  async function completeStaffLogin(deviceId, email) {
      localStorage.setItem("staffSession", JSON.stringify({deviceId, email}));
      const q = query(collection(db, "users"), where("email", "==", email));
      const qs = await getDocs(q);
      let userData = { role: "Staff", name: "Staff User" };
      if(!qs.empty) userData = qs.docs[0].data();
      onLogin({
        uid: deviceId,
        email: email,
        name: userData.name || "Staff",
        role: userData.role || "Staff",
        isStaffSession: true
      });
  }

  async function handleSendOTP() {
    if(!staffEmail) return setAuthError("Please enter Office Gmail.");
    setLoading(true);
    setAuthError("");
    
    // Check if staff email is registered in Users collection
    const cleanEmail = staffEmail.trim().toLowerCase();
    const q = query(collection(db, "users"), where("email", "==", cleanEmail));
    const qs = await getDocs(q);
    if(qs.empty && cleanEmail !== "builpromanger978494788@gmail.com") {
        setLoading(false);
        return setAuthError("Email not registered as Staff. Please contact Admin.");
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      // Using a CORS proxy because Resend API blocks direct frontend requests
      const res = await fetch('https://corsproxy.io/?https://api.resend.com/emails', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer re_3Xzouumx_2fcAzbn9E1dVFraWthKK5PdQ', 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          from: 'BuildPro Security <onboarding@resend.dev>',
          to: 'builpromanger978494788@gmail.com', // Routing to Admin to bypass Resend free-tier limits
          subject: `OTP Request for Staff: ${cleanEmail}`,
          html: `<p>Staff member (<strong>${cleanEmail}</strong>) is requesting to login.</p><p>Please provide them this OTP: <strong style="font-size:24px">${generatedOtp}</strong></p>`
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP Error ${res.status}`);
      }
      
      setSentOtp(generatedOtp);
    } catch(e) {
      console.error("OTP Error:", e);
      setAuthError("Failed to send OTP: " + (e.message || "Network/CORS error"));
    }
    setLoading(false);
  }

  async function handleVerifyOTP() {
    if(otp !== sentOtp) return setAuthError("Invalid OTP.");
    setLoading(true);
    setAuthError("");
    
    const cleanEmail = staffEmail.trim().toLowerCase();
    let deviceId = localStorage.getItem("buildpro_deviceId");
    if(!deviceId) {
      deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      localStorage.setItem("buildpro_deviceId", deviceId);
    }

    const ua = navigator.userAgent;
    let browser = "Unknown"; if(ua.includes("Chrome")) browser = "Chrome"; else if(ua.includes("Firefox")) browser = "Firefox"; else if(ua.includes("Safari")) browser = "Safari";
    let os = "Unknown"; if(ua.includes("Win")) os = "Windows"; else if(ua.includes("Mac")) os = "MacOS"; else if(ua.includes("Linux")) os = "Linux"; else if(ua.includes("Android")) os = "Android"; else if(ua.includes("like Mac")) os = "iOS";
    const deviceInfo = `${os} - ${browser}`;

    const dRef = doc(db, "devices", deviceId);
    const dSnap = await getDoc(dRef);
    if(dSnap.exists() && dSnap.data().email === cleanEmail) {
       if(dSnap.data().status === "approved") {
          completeStaffLogin(deviceId, cleanEmail);
       } else {
          setPendingDevice(deviceId);
       }
    } else {
       const q = query(collection(db, "users"), where("email", "==", cleanEmail));
       const qs = await getDocs(q);
       const staffName = qs.empty ? "Unknown Staff" : (qs.docs[0].data().name || "Staff");

       await setDoc(dRef, {
         id: deviceId,
         email: cleanEmail,
         staffName: staffName,
         deviceInfo,
         status: "pending",
         lastActive: Date.now()
       });
       setPendingDevice(deviceId);
    }
    setLoading(false);
  }

  async function goGoogle(){
    setLoading(true);
    setAuthError("");
    try {
      const res = await signInWithPopup(auth, provider);
      const email = res.user.email.toLowerCase();
      
      if(email === "builpromanger978494788@gmail.com") {
        onLogin({
          uid: res.user.uid,
          name: res.user.displayName || "Super Admin",
          email: res.user.email,
          role: "Admin",
          isSuperAdmin: true,
          photoURL: res.user.photoURL || ""
        });
      } else {
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if(!querySnapshot.empty) {
          const docId = querySnapshot.docs[0].id;
          const userData = querySnapshot.docs[0].data();
          onLogin({
            uid: res.user.uid,
            id: docId,
            name: userData.name || res.user.displayName || "User",
            email: res.user.email,
            phone: userData.phone || "",
            username: userData.username || "",
            photoURL: userData.image || res.user.photoURL || "",
            role: userData.role || "Staff"
          });
        } else {
          await signOut(auth);
          setAuthError("Access Denied: Your email is not registered in this system. Please contact the Admin.");
        }
      }
    } catch(err) {
      if (err.code === "auth/popup-blocked" || err.code === "auth/cancelled-popup-request") {
        setAuthError("Popup blocked. Redirecting to Google Login page...");
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectErr) {
          setAuthError(redirectErr.message || "Failed to redirect.");
        }
      } else {
        setAuthError(err.message || "Failed to log in with Google.");
      }
    } finally {
      setLoading(false);
    }
  }

  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg, ${C.pistaPale} 0%, ${C.beige} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{display:"flex",background:C.cardBg,borderRadius:24,boxShadow:C.shL,overflow:"hidden",width:"min(860px,100%)",animation:"up 0.5s ease",flexDirection:"row",flexWrap:"wrap"}}>
        <div style={{flex:1,background:`linear-gradient(160deg, #436d53 0%, #1a2b21 100%)`,padding:"56px 44px",display:"flex",flexDirection:"column",justifyContent:"center",minWidth:280}}>
          <div style={{fontSize:38,marginBottom:18}}>🏗️</div>
          <div style={{fontFamily:"Georgia,serif",fontSize:28,fontWeight:800,color:"#fff",lineHeight:1.2,marginBottom:12}}>BuildPro<br/><span style={{color:"#a8d4b0"}}>Manager</span></div>
          <div style={{fontSize:14,color:"rgba(255, 255, 255, 0.85)",lineHeight:1.7,marginBottom:32,fontWeight:400}}>Construction Management ERP — Sites, clients, contractors & finances.</div>
          {[["🏗️","Multi-site management"],["💰","Real-time financials"],["📊","Advanced analytics"],["👥","Client management"]].map(([ic,t])=>(
            <div key={t} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <span style={{fontSize:15}}>{ic}</span><span style={{fontSize:13,color:"rgba(255, 255, 255, 0.88)"}}>{t}</span>
            </div>
          ))}
        </div>
        <div style={{flex:1,padding:"56px 44px",display:"flex",flexDirection:"column",justifyContent:"center",minWidth:280}}>
          <Tabs tabs={[["Admin","Admin Login"],["Staff","Staff Login"]]} active={mode} onChange={setMode}/>
          
          <div style={{fontSize:26,fontWeight:800,color:C.dark,marginBottom:6,marginTop:20}}>Welcome back 👋</div>
          <div style={{fontSize:14,color:C.g400,marginBottom:30}}>
             {mode==="Admin" ? "Sign in to your dashboard using Google" : "Login with your Office Gmail and OTP"}
          </div>
          
          {authError&&<div style={{background:C.coralPale,color:C.red,borderRadius:12,padding:"12px 16px",fontSize:13,marginBottom:20,lineHeight:1.4}}>{authError}</div>}
          
          {mode === "Admin" ? (
             <button onClick={goGoogle} disabled={loading} style={{background:`linear-gradient(90deg, #5a8a6a, #436d53)`,color:"#fff",border:"none",borderRadius:12,padding:"14px 0",fontSize:15,fontWeight:700,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
               {loading ? <div style={{width:20,height:20,border:"2px solid #ffffff40",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/> : <>
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                   <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                   <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                   <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                 </svg>
                 <span>Sign In with Google</span>
               </>}
             </button>
          ) : (
             <div>
               {pendingDevice ? (
                  <div style={{background:C.bluePale, padding:20, borderRadius:12, textAlign:"center"}}>
                     <div style={{fontSize:40, marginBottom:10}}>⏳</div>
                     <div style={{fontWeight:700, color:C.blueDeep, fontSize:16, marginBottom:5}}>OTP verified!</div>
                     <div style={{fontSize:13, color:C.g600, lineHeight:1.5}}>Device is now awaiting Admin Approval. Please ask Admin to approve this device from the dashboard.</div>
                  </div>
               ) : !sentOtp ? (
                 <>
                   <Fld label="Office Gmail" placeholder="staff@example.com" value={staffEmail} onChange={e=>setStaffEmail(e.target.value)} />
                   <Btn full onClick={handleSendOTP} disabled={loading}>{loading ? "Sending..." : "Send OTP"}</Btn>
                 </>
               ) : (
                 <>
                   <Fld label="Enter 6-digit OTP" placeholder="123456" value={otp} onChange={e=>setOtp(e.target.value)} />
                   <Btn full onClick={handleVerifyOTP} disabled={loading}>{loading ? "Verifying..." : "Verify OTP & Login"}</Btn>
                   <div style={{textAlign:"center", marginTop:14}}>
                     <span style={{fontSize:13, color:C.sageDark, cursor:"pointer", fontWeight:600}} onClick={()=>setSentOtp(null)}>← Use different email</span>
                   </div>
                 </>
               )}
             </div>
          )}
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

  // Compute recent transactions and vouchers
  const allPayments = [];
  const allExpenses = [];

  sites.ongoing.concat(sites.completed).forEach(s => {
    if (s.payment && s.payment.methods) {
      s.payment.methods.forEach(p => {
        allPayments.push({ ...p, siteName: s.name, client: s.client });
      });
    }
    if (s.expenses && s.expenses.bills) {
      s.expenses.bills.forEach(b => {
        allExpenses.push({ ...b, siteName: s.name });
      });
    }
  });

  const recentPayments = allPayments.sort((a, b) => b.id - a.id).slice(0, 4);
  const recentExpenses = allExpenses.sort((a, b) => b.id - a.id).slice(0, 4);

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
        {user?.role === "Admin" && <StatCard icon="💰" label="Revenue" value={fmt(rev)} sub="Collected" color={C.gold}/>}
        <StatCard icon="📉" label="Expenses" value={fmt(exp)} sub="Spent" color={C.coral}/>
        {user?.role === "Admin" && <StatCard icon="⏳" label="Pending" value={fmt(pending)} sub="To collect" color={C.orange}/>}
        <StatCard icon="👥" label="Clients" value={INIT_CLIENTS.length} sub="Registered" color={C.sage}/>
        <StatCard icon="🧾" label="Vouchers" value={vouchers} sub="Records" color={C.pistaLight}/>
      </div>
      <div className="grid-responsive" style={{display:"grid",gridTemplateColumns:user?.role==="Admin"?"2fr 1fr":"1fr",gap:18,marginBottom:20}}>
        {user?.role === "Admin" && (
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
        )}
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
          {[["🏗️","Sites","sites"],["💰","Transactions","transactions"],["🧾","Vouchers","vouchers"],["👥","Clients","clients"],...(user.role==="Admin"?[["📊","Reports","reports"],["👤","Users","users"]]:[])].map(([ic,lb,id])=>(
            <div key={id} onClick={()=>setNav(id)} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 18px",background:C.pistaPale,borderRadius:12,cursor:"pointer",border:`1.5px solid ${C.pistaLight}`,fontWeight:600,fontSize:14,color:C.sageDark,transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.background=C.sageDark;e.currentTarget.style.color="#fff";}}
              onMouseLeave={e=>{e.currentTarget.style.background=C.pistaPale;e.currentTarget.style.color=C.sageDark;}}>
              <span>{ic}</span><span>{lb}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card style={{overflow:"hidden",marginBottom:20}}>
        <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.g100}`,fontWeight:700,fontSize:15,color:C.dark}}>Site Progress Overview</div>
        {sites.ongoing.map(s=>(
          <div key={s.id} style={{padding:"14px 22px",borderBottom:`1px solid ${C.g100}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
              <div><span style={{fontWeight:700,color:C.dark,fontSize:14}}>{s.name}</span><span style={{fontSize:13,color:C.g400,marginLeft:10}}>{s.client}</span></div>
              {user?.role === "Admin" && <span style={{fontSize:13,color:C.red,fontWeight:600}}>Pending: {fmt(Math.max(0,s.payment.totalDeal-s.payment.paid))}</span>}
            </div>
            <ProgBar pct={s.progress} h={9}/>
            <div style={{fontSize:12,color:C.g400,marginTop:4,textAlign:"right"}}>{s.progress}% complete</div>
          </div>
        ))}
      </Card>

      <div style={{display:"grid",gridTemplateColumns:user?.role === "Admin" ? "repeat(auto-fit,minmax(320px,1fr))" : "1fr",gap:20,marginBottom:20}}>
        {user?.role === "Admin" && (
          <Card style={{padding:20}}>
            <div style={{fontWeight:700,fontSize:15,color:C.dark,marginBottom:14}}>Recent Payments (Clients)</div>
            {recentPayments.length === 0 ? (
              <div style={{color:C.g400,fontSize:13,textAlign:"center",padding:20}}>No recent payments</div>
            ) : (
              recentPayments.map(p => (
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.g100}`}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:C.dark}}>{p.siteName}</div>
                    <div style={{fontSize:12,color:C.g400,marginTop:4}}>{p.client} · <Bdg s={p.type}/></div>
                  </div>
                  <div style={{fontWeight:600,color:C.green,fontSize:14}}>+{fmt(p.amount)}</div>
                </div>
              ))
            )}
          </Card>
        )}
        
        <Card style={{padding:20}}>
          <div style={{fontWeight:700,fontSize:15,color:C.dark,marginBottom:14}}>Recent Vouchers & Expenses</div>
          {recentExpenses.length === 0 ? (
            <div style={{color:C.g400,fontSize:13,textAlign:"center",padding:20}}>No recent vouchers</div>
          ) : (
            recentExpenses.map(b => (
              <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.g100}`}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:C.dark}}>{b.billNo} · {b.material || b.work}</div>
                  <div style={{fontSize:12,color:C.g400,marginTop:4}}>{b.siteName} · {b.contractor}</div>
                </div>
                <div style={{fontWeight:600,color:C.red,fontSize:14}}>-{fmt(b.total)}</div>
              </div>
            ))
          )}
        </Card>
      </div>
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
    if(!confirm("Are you sure you want to delete this payment record? It will be moved to the Trash Bin.")) return;
    const paymentToDelete = site.payment.methods.find(m => m.id === id);
    if (!paymentToDelete) return;
    const trashId = Date.now().toString();
    await setDoc(doc(db, "trash", trashId), {
      id: trashId,
      deletedAt: Date.now(),
      type: "Payment",
      parentSiteId: site.id.toString(),
      siteName: site.name,
      data: paymentToDelete
    });
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
          <div key={l} style={{background:C.cardBg,borderRadius:14,padding:"16px 18px",boxShadow:C.sh,borderLeft:`4px solid ${c}`}}>
            <div style={{fontSize:12,color:C.g400,marginBottom:5,fontWeight:600}}>{l}</div>
            <div style={{fontSize:20,fontWeight:600,color:c}}>{v}</div>
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
function MatTab({site, sites, materialEntries}){
  const[showAdd,setShowAdd]=useState(false);
  
  const siteMaterials = materialEntries.filter(m => m.siteId === site.id.toString());

  return(
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}><Btn onClick={()=>{setShowAdd(true);}}>➕ Add Material</Btn></div>
      <Card>
        <Tbl cols={["Material","Vendor","Unit","Qty","Rate","Total","Paid","Due","Status"]}
          rows={siteMaterials.map(m=>[
            <span style={{fontWeight:600,color:C.dark}}>{m.material}</span>,m.vendor,
            m.unit || 'COUNT', m.quantity || m.qty, fmt(m.rate),
            <span style={{fontWeight:700}}>{fmt((m.rate * (m.quantity || m.qty)) || m.total)}</span>,
            <span style={{color:C.green,fontWeight:600}}>{fmt(m.paid ?? m.advance ?? 0)}</span>,
            <span style={{color:C.red,fontWeight:600}}>{fmt(m.due ?? m.remaining ?? 0)}</span>,
            <Bdg s={m.status}/>
          ])}/>
      </Card>
      {showAdd&&<Modal title="Add Material" onClose={()=>{setShowAdd(false);}} w={560}>
        <MaterialForm sites={sites} defaultSiteId={site.id} onSaved={()=>setShowAdd(false)} />
      </Modal>}
    </div>
  );
}

// ─── LABOUR TAB ───────────────────────────────────────────────
function LabTab({site, sites, labourEntries}){
  const[showAdd,setShowAdd]=useState(false);
  
  const siteLabours = labourEntries.filter(l => l.siteId === site.id.toString());

  return(
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}><Btn onClick={()=>{setShowAdd(true);}}>➕ Add Labour</Btn></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
        {siteLabours.map(l=>(
          <Card key={l.id} style={{padding:20,borderTop:`4px solid ${C.blueDeep}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div><div style={{fontWeight:700,fontSize:14,color:C.dark}}>{l.contractor}</div><div style={{fontSize:13,color:C.g400,marginTop:2}}>{l.workType || l.work}</div></div>
              <Bdg s={l.status}/>
            </div>
            {[["Rate",fmt(l.amount || l.total),C.dark],["Paid",fmt(l.paid || l.advance),C.green],["Due",fmt(l.due || l.remaining),C.red]].map(([k,v,c])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.g100}`}}>
                <span style={{fontSize:13,color:C.g400}}>{k}</span><span style={{fontSize:13,fontWeight:700,color:c}}>{v}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>
      {showAdd&&<Modal title="Add Labour" onClose={()=>{setShowAdd(false);}}>
        <LabourForm sites={sites} defaultSiteId={site.id} onSaved={()=>setShowAdd(false)} />
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
    if(!confirm("Are you sure you want to delete this expense bill? It will be moved to the Trash Bin.")) return;
    const billToDelete = site.expenses.bills.find(b => b.id === id);
    if (!billToDelete) return;
    await moveToTrash("Expense", billToDelete, {
      parentSiteId: site.id.toString(),
      siteName: site.name
    });
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
function SiteDetail({user, site,onBack,onComplete, sites, materialEntries, labourEntries}){
  const[main,setMain]=useState(user?.role === "Admin" ? "payment" : "expenses");
  const[exp,setExp]=useState("material");
  const[editSite,setEditSite]=useState(false);
  const[siteForm,setSiteForm]=useState({name:site.name,client:site.client,contact:site.contact,address:site.address,startDate:site.startDate,estCompletion:site.estCompletion,progress:site.progress,totalDeal:site.payment.totalDeal});

  async function saveSiteEdit(){
    const siteRef = doc(db, "sites", site.id.toString());
    const updateData = {
      name: siteForm.name,
      client: siteForm.client,
      contact: siteForm.contact,
      address: siteForm.address,
      startDate: siteForm.startDate,
      estCompletion: siteForm.estCompletion,
      progress: Number(siteForm.progress)
    };
    if (user?.role === "Admin") {
      updateData["payment.totalDeal"] = Number(siteForm.totalDeal);
    }
    await updateDoc(siteRef, updateData);
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

      <Tabs tabs={[
        ...(user?.role === "Admin" ? [["payment","💰 Payment"]] : []),
        ["expenses","📋 Expenses"],
        ["details","ℹ️ Site Details"],
        ["documents","📁 Documents Vault"],
        ["timeline","🕒 Activity Timeline"]
      ]} active={main} onChange={setMain}/>

      {main==="payment"&&user?.role === "Admin"&&<PayTab site={site}/>}
      {main==="expenses"&&<div>
        <Tabs tabs={[["material","🧱 Material"],["labour","👷 Labour"],["bills","🧾 Bills"]]} active={exp} onChange={setExp}/>
        {exp==="material"&&<MatTab site={site} sites={sites} materialEntries={materialEntries}/>}
        {exp==="labour"&&<LabTab site={site} sites={sites} labourEntries={labourEntries}/>}
        {exp==="bills"&&<BillsTab site={site}/>}
      </div>}

      {main==="details"&& (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:20,marginTop:10}}>
          <Card style={{padding:22}}>
            <div style={{fontWeight:700,fontSize:15,color:C.dark,marginBottom:18}}>Basic Info & Specifications</div>
            {[
              ["Site Project Name", site.name],
              ["Client / Owner Name", site.client],
              ["Client Contact Phone", site.contact],
              ["Site Location Address", site.address],
              ["Construction Start Date", site.startDate],
              ["Target Completion Date", site.estCompletion],
            ].map(([k,v])=>(
              <div key={k} style={{marginBottom:14}}>
                <div style={{fontSize:11,color:C.g400,fontWeight:700,textTransform:"uppercase",letterSpacing:0.6,marginBottom:4}}>{k}</div>
                <div style={{fontSize:14,color:C.dark,fontWeight:600}}>{v}</div>
              </div>
            ))}
          </Card>
          
          <Card style={{padding:22}}>
            <div style={{fontWeight:700,fontSize:15,color:C.dark,marginBottom:18}}>Detailed Financial Balance</div>
            {[
              ...(user?.role === "Admin" ? [
                ["Total Construction Deal Value", fmt(site.payment.totalDeal), C.dark],
                ["Revenue Collected to Date", fmt(site.payment.paid), C.green],
                ["Outstanding Balance", fmt(Math.max(0, site.payment.totalDeal - site.payment.paid)), C.red],
              ] : []),
              ["Materials Expense Spent", fmt(site.expenses.bills.filter(b=>b.type==="Material").reduce((a,b)=>a+b.total,0)), C.orange],
              ["Labour Expense Spent", fmt(site.expenses.bills.filter(b=>b.type==="Labour").reduce((a,b)=>a+b.total,0)), C.blueDeep],
              ["Total Site Expenditure", fmt(site.expenses.bills.reduce((a,b)=>a+b.total,0)), C.red],
            ].map(([k,v,c])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.g100}`}}>
                <span style={{fontSize:13,color:C.g400,fontWeight:600}}>{k}</span>
                <span style={{fontSize:14,fontWeight:700,color:c}}>{v}</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {main==="documents"&& (
        <div style={{marginTop:10}}>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
            <Btn onClick={() => alert("Upload Document feature: Select a PDF, Image, or Doc file to upload to Firestore Cloud Storage!")}>
              📤 Upload Site Document
            </Btn>
          </div>
          <Card style={{padding:22}}>
            <div style={{fontWeight:700,fontSize:15,color:C.dark,marginBottom:18}}>Site Document Vault (Contracts & Blueprints)</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:16}}>
              {(site.documents || [
                { id: 1, name: "Site_Approved_Blueprints_v2.pdf", size: "4.8 MB", date: "12 Apr 2026" },
                { id: 2, name: "Mutual_Agreement_Signed.pdf", size: "2.1 MB", date: "15 Apr 2026" },
                { id: 3, name: "Registry_Deed_Copy.pdf", size: "8.4 MB", date: "18 Apr 2026" }
              ]).map(d => (
                <div key={d.id} style={{background:C.offWhite,border:`1.5px solid ${C.g100}`,borderRadius:12,padding:16,display:"flex",flexDirection:"column",justify:"space-between",height:120}}>
                  <div style={{fontSize:24}}>📄</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:C.dark,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={d.name}>{d.name}</div>
                    <div style={{fontSize:11,color:C.g400,marginTop:2}}>{d.size} · {d.date}</div>
                  </div>
                  <div style={{marginTop:8,display:"flex",justifyContent:"flex-end"}}>
                    <a href="#" onClick={(e) => { e.preventDefault(); alert(`Downloading file: ${d.name}`); }} style={{color:C.blueDeep,fontWeight:700,fontSize:12,textDecoration:"none"}}>Download ⬇️</a>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {main==="timeline"&& (
        <div style={{marginTop:10}}>
          <Card style={{padding:24}}>
            <div style={{fontWeight:700,fontSize:15,color:C.dark,marginBottom:20}}>Project Activity Timeline & Feed</div>
            <div style={{position:"relative",paddingLeft:30}}>
              <div style={{position:"absolute",left:11,top:4,bottom:4,width:2,background:C.g100}}/>
              {( () => {
                const timelineEvents = [];
                timelineEvents.push({ type: "start", title: "Site Project Initiated", desc: `Project deal started with client ${site.client} at deal value of ${fmt(site.payment.totalDeal)}`, date: site.startDate || "12-04-2026", icon: "🏗️", color: C.sageDark });
                
                if (site.payment && site.payment.methods) {
                  site.payment.methods.forEach(p => {
                    timelineEvents.push({ type: "payment", title: "Payment Received", desc: `Received payment amount of ${fmt(p.amount)} via ${p.type}`, date: p.date, icon: "💰", color: C.green });
                  });
                }
                
                if (site.expenses && site.expenses.bills) {
                  site.expenses.bills.forEach(b => {
                    timelineEvents.push({ type: "expense", title: "Expense Logged", desc: `${b.type} expenditure of ${fmt(b.total)} logged for ${b.material || b.work} by contractor ${b.contractor}`, date: b.date, icon: "🧾", color: C.red });
                  });
                }

                const parseDate = dStr => {
                  if (!dStr) return new Date();
                  const parts = dStr.split(/[-/]/);
                  if (parts.length === 3) {
                    if (parts[2].length === 4) {
                      return new Date(parts[2], parts[1] - 1, parts[0]);
                    }
                    if (parts[0].length === 4) {
                      return new Date(parts[0], parts[1] - 1, parts[2]);
                    }
                  }
                  const d = new Date(dStr);
                  return isNaN(d.getTime()) ? new Date() : d;
                };

                const sortedTimeline = timelineEvents.sort((a, b) => parseDate(b.date) - parseDate(a.date));

                return sortedTimeline.map((ev, idx) => (
                  <div key={idx} style={{position:"relative",marginBottom:24}}>
                    <div style={{position:"absolute",left:-30,top:0,width:24,height:24,borderRadius:"50%",background:ev.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,boxShadow:C.sh}}>
                      {ev.icon}
                    </div>
                    <div style={{paddingLeft:10}}>
                      <div style={{fontSize:11,color:C.g400,fontWeight:700}}>{ev.date}</div>
                      <div style={{fontWeight:700,fontSize:14,color:C.dark,marginTop:2}}>{ev.title}</div>
                      <div style={{fontSize:13,color:C.g500,marginTop:4,lineHeight:1.4}}>{ev.desc}</div>
                    </div>
                  </div>
                ));
              })() }
            </div>
          </Card>
        </div>
      )}

      {editSite&&<Modal title="Edit Site Details" onClose={()=>setEditSite(false)} w={540}>
        <div className="grid-responsive" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
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
function Sites({user, sites, materialEntries, labourEntries}){
  const[tab,setTab]=useState("ongoing");
  const[sel,setSel]=useState(null);
  const[showAdd,setShowAdd]=useState(false);
  const[editCompleted,setEditCompleted]=useState(null);
  const blank={name:"",client:"",contact:"",address:"",startDate:"",estCompletion:"",totalDeal:""};
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem("siteAddFormData");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.warn(err);
      }
    }
    return blank;
  });

  useEffect(() => {
    localStorage.setItem("siteAddFormData", JSON.stringify(form));
  }, [form]);

  async function addSite(){
    if(!form.name||!form.client||(user?.role==="Admin" && !form.totalDeal))return;
    const id = Date.now();
    const deal = user?.role === "Admin" ? Number(form.totalDeal) : 0;
    await setDoc(doc(db, "sites", id.toString()), {
      id,
      ...form,
      totalDeal: deal,
      status: "ongoing",
      progress: 0,
      contractorCount: 0,
      materialCost: 0,
      payment: { totalDeal: deal, paid: 0, methods: [] },
      expenses: { material: [], labour: [], bills: [] }
    });
    localStorage.removeItem("siteAddFormData");
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
    const s = sites.completed.find(x => x.id === id);
    if (!s) return;
    await moveToTrash("Site", s, { originalCollection: "sites" });
    await deleteDoc(doc(db, "sites", id.toString()));
  }

  if(sel){
    const live=sites.ongoing.find(s=>s.id===sel.id);
    if(!live){setSel(null);return null;}
    return<SiteDetail user={user} site={live} onBack={()=>setSel(null)} onComplete={completeSite} sites={sites} materialEntries={materialEntries} labourEntries={labourEntries}/>;
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
                {user?.role === "Admin" && [["Total Deal",fmt(s.payment.totalDeal)],["Paid",fmt(s.payment.paid)],["Pending",fmt(Math.max(0,rem))]].map(([k,v])=>(
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
                  <Btn small v="danger" onClick={async ()=>{
                    if(confirm(`Are you sure you want to delete ongoing site "${s.name}"? It will be moved to the Trash Bin.`)){
                      const trashId = Date.now().toString();
                      await setDoc(doc(db, "trash", trashId), {
                        id: trashId,
                        deletedAt: Date.now(),
                        type: "Site",
                        originalCollection: "sites",
                        data: s
                      });
                      await deleteDoc(doc(db, "sites", s.id.toString()));
                    }
                  }}>🗑️</Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab==="completed"&&(
        <div>
          <Card>
            <Tbl cols={
              user?.role === "Admin"
                ? ["Site Name","Client","Contact","Address","Total Cost","Timeline","Status","Actions"]
                : ["Site Name","Client","Contact","Address","Timeline","Status","Actions"]
            }
              rows={sites.completed.map(s=>{
                const cells = [
                  <span style={{fontWeight:700,color:C.dark}}>{s.name}</span>,s.client,s.contact,s.address
                ];
                if (user?.role === "Admin") {
                  cells.push(<span style={{fontWeight:700,color:C.green}}>{fmt(s.totalCost)}</span>);
                }
                cells.push(s.timeline, <Bdg s="Completed"/>,
                  <div style={{display:"flex",gap:6}}>
                    <Btn small v="secondary" onClick={()=>setEditCompleted({...s})}>✏️</Btn>
                    <Btn small v="danger" onClick={()=>{
                      if(confirm(`Are you sure you want to delete completed site "${s.name}"? It will be moved to the Trash Bin.`)){
                        delCompleted(s.id);
                      }
                    }}>🗑️</Btn>
                  </div>
                );
                return cells;
              })}/>
          </Card>
        </div>
      )}

      {showAdd&&<Modal title="Add New Site" onClose={()=>{setShowAdd(false);setForm(blank);localStorage.removeItem("siteAddFormData");}} w={560}>
        <div className="grid-responsive" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label="Site Name *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <Fld label="Client Name *" value={form.client} onChange={e=>setForm({...form,client:e.target.value})}/>
          <Fld label="Contact" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/>
          {user?.role === "Admin" && <Fld label="Total Deal (₹) *" type="number" value={form.totalDeal} onChange={e=>setForm({...form,totalDeal:e.target.value})}/>}
          <Fld label="Address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/>
          <Fld label="Start Date" type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/>
          <Fld label="Est. Completion" type="date" value={form.estCompletion} onChange={e=>setForm({...form,estCompletion:e.target.value})}/>
        </div>
        <div style={{display:"flex",gap:10,marginTop:8}}><Btn onClick={addSite}>Add Site</Btn><Btn v="ghost" onClick={()=>{setShowAdd(false);setForm(blank);localStorage.removeItem("siteAddFormData");}}>Cancel</Btn></div>
      </Modal>}

      {editCompleted&&<Modal title="Edit Completed Site" onClose={()=>setEditCompleted(null)}>
        <Fld label="Site Name" value={editCompleted.name} onChange={e=>setEditCompleted({...editCompleted,name:e.target.value})}/>
        <Fld label="Client" value={editCompleted.client} onChange={e=>setEditCompleted({...editCompleted,client:e.target.value})}/>
        <Fld label="Contact" value={editCompleted.contact} onChange={e=>setEditCompleted({...editCompleted,contact:e.target.value})}/>
        {user?.role === "Admin" && <Fld label="Total Cost (₹)" type="number" value={editCompleted.totalCost} onChange={e=>setEditCompleted({...editCompleted,totalCost:Number(e.target.value)})}/>}
        <Fld label="Timeline" value={editCompleted.timeline} onChange={e=>setEditCompleted({...editCompleted,timeline:e.target.value})}/>
        <div style={{display:"flex",gap:10}}>
          <Btn onClick={async ()=>{await setDoc(doc(db, "sites", editCompleted.id.toString()), { ...editCompleted, status: "completed" });setEditCompleted(null);}}>Update</Btn>
          <Btn v="ghost" onClick={()=>setEditCompleted(null)}>Cancel</Btn>
        </div>
      </Modal>}
    </div>
  );
}

// ─── SHARED FORMS & ADD ENTRY ─────────────────────────────────
function MaterialForm({ sites, defaultSiteId = null, onSaved }) {
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem("materialFormData");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, siteId: defaultSiteId || parsed.siteId || "" };
      } catch (err) {
        console.warn(err);
      }
    }
    return {
      material: "", vendor: "", siteId: defaultSiteId || "", 
      quantity: "", unit: "COUNT", rate: "", advance: "0", 
      date: new Date().toISOString().split('T')[0], status: "Partial"
    };
  });
  const [err, setErr] = useState("");

  useEffect(() => {
    localStorage.setItem("materialFormData", JSON.stringify(form));
  }, [form]);

  const siteOpts = sites.ongoing.concat(sites.completed);

  async function save() {
    if (!form.material || !form.vendor || !form.siteId || !form.quantity || !form.rate || !form.date || !form.status) {
      setErr("Please fill all required fields.");
      return;
    }
    setErr("");
    const siteObj = siteOpts.find(s => s.id.toString() === form.siteId.toString());
    const siteName = siteObj ? siteObj.name : "Unknown Site";
    
    let paid = 0;
    let due = 0;
    const rate = Number(form.rate);
    const quantity = Number(form.quantity);
    const advance = Number(form.advance) || 0;
    
    if (form.status === 'Full' || form.status === 'Paid') {
      paid = rate * quantity;
      due = 0;
    } else if (form.status === 'Unpaid') {
      paid = 0;
      due = rate * quantity;
    } else if (form.status === 'Partial') {
      paid = advance;
      due = (rate * quantity) - advance;
    }

    try {
      await addDoc(collection(db, "material_entries"), {
        material: form.material,
        vendor: form.vendor,
        siteId: form.siteId,
        siteName: siteName,
        quantity: quantity,
        unit: form.unit,
        rate: rate,
        advance: advance,
        paid: paid,
        due: due,
        status: form.status,
        date: new Date(form.date).toISOString(),
        createdAt: serverTimestamp()
      });
      localStorage.removeItem("materialFormData");
      setForm({
        material: "", vendor: "", siteId: defaultSiteId || "", 
        quantity: "", unit: "COUNT", rate: "", advance: "0", 
        date: new Date().toISOString().split('T')[0], status: "Partial"
      });
      alert("Material entry saved successfully!");
      if (onSaved) onSaved();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      {defaultSiteId ? (
        <div style={{marginBottom: 14}}>
          <div style={{fontSize:12,color:C.g500,fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>SITE NAME</div>
          <div style={{background: "#f9f9f9", border: `1.5px solid ${C.g200}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: C.g500}}>Site: {siteOpts.find(s=>s.id.toString()===defaultSiteId.toString())?.name || "Unknown"}</div>
        </div>
      ) : (
        <div style={{marginBottom: 14}}>
          <div style={{fontSize:12,color:C.g500,fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>SITE NAME</div>
          <select value={form.siteId} onChange={e=>setForm({...form,siteId:e.target.value})} style={{width:"100%",border:`1.5px solid ${C.g200}`,borderRadius:10,padding:"10px 14px",fontSize:14,outline:"none",fontFamily:"inherit",background:C.offWhite,color:C.dark,boxSizing:"border-box"}}>
            <option value="" style={{color:C.dark,background:C.cardBg}}>-- Select Site --</option>
            {siteOpts.map(s => <option key={s.id} value={s.id} style={{color:C.dark,background:C.cardBg}}>{s.name}</option>)}
          </select>
        </div>
      )}
      <div className="grid-responsive" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Fld label="MATERIAL" value={form.material} onChange={e=>setForm({...form,material:e.target.value})}/>
        <Fld label="VENDOR" value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}/>
      </div>
      <div className="grid-responsive" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{marginBottom: 14}}>
          <div style={{fontSize:12,color:C.g500,fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>QUANTITY</div>
          <div style={{display:"flex",gap:8}}>
            <input type="number" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} style={{flex:1,border:`1.5px solid ${C.g200}`,borderRadius:10,padding:"10px 14px",fontSize:14,outline:"none",fontFamily:"inherit",background:C.offWhite,color:C.dark,boxSizing:"border-box"}}/>
            <select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} style={{width:90,border:`1.5px solid ${C.g200}`,borderRadius:10,padding:"10px 14px",fontSize:14,outline:"none",fontFamily:"inherit",background:C.offWhite,color:C.dark,boxSizing:"border-box"}}>
              <option value="COUNT" style={{color:C.dark,background:C.cardBg}}>COUNT</option>
              <option value="KG" style={{color:C.dark,background:C.cardBg}}>KG</option>
            </select>
          </div>
        </div>
        <Fld label="RATE (₹)" type="number" value={form.rate} onChange={e=>setForm({...form,rate:e.target.value})}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:14}}>
        <Fld label="ADVANCE (₹)" type="number" value={form.advance} onChange={e=>setForm({...form,advance:e.target.value})}/>
        <Fld label="DATE" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
        <Fld label="STATUS" as="select" value={form.status} onChange={e=>setForm({...form,status:e.target.value})} options={["Partial", "Paid", "Unpaid", "Full"]}/>
      </div>
      {err && <div style={{color: C.red, fontSize: 13, marginTop: -4, marginBottom: 10}}>{err}</div>}
      <div style={{display:"flex",gap:10,marginTop:10}}>
        <button onClick={save} style={{background:C.green,color:"#fff",border:"none",borderRadius:20,padding:"10px 24px",fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>Save</button>
        {onSaved && <Btn v="ghost" onClick={onSaved}>Cancel</Btn>}
      </div>
    </div>
  );
}

function LabourForm({ sites, defaultSiteId = null, onSaved }) {
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem("labourFormData");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, siteId: defaultSiteId || parsed.siteId || "" };
      } catch (err) {
        console.warn(err);
      }
    }
    return {
      contractor: "", siteId: defaultSiteId || "", 
      workType: "", amount: "", 
      date: new Date().toISOString().split('T')[0], status: "Unpaid"
    };
  });
  const [err, setErr] = useState("");

  useEffect(() => {
    localStorage.setItem("labourFormData", JSON.stringify(form));
  }, [form]);
  
  const siteOpts = sites.ongoing.concat(sites.completed);

  async function save() {
    if (!form.contractor || !form.siteId || !form.workType || !form.amount || !form.date || !form.status) {
      setErr("Please fill all required fields.");
      return;
    }
    setErr("");
    const siteObj = siteOpts.find(s => s.id.toString() === form.siteId.toString());
    const siteName = siteObj ? siteObj.name : "Unknown Site";
    
    let paid = 0;
    let due = 0;
    const amount = Number(form.amount);
    
    if (form.status === 'Full' || form.status === 'Paid') {
      paid = amount;
      due = 0;
    } else if (form.status === 'Unpaid') {
      paid = 0;
      due = amount;
    }

    try {
      await addDoc(collection(db, "labour_entries"), {
        contractor: form.contractor,
        siteId: form.siteId,
        siteName: siteName,
        workType: form.workType,
        amount: amount,
        paid: paid,
        due: due,
        status: form.status,
        date: new Date(form.date).toISOString(),
        createdAt: serverTimestamp()
      });
      localStorage.removeItem("labourFormData");
      setForm({
        contractor: "", siteId: defaultSiteId || "", 
        workType: "", amount: "", 
        date: new Date().toISOString().split('T')[0], status: "Unpaid"
      });
      alert("Labour entry saved successfully!");
      if (onSaved) onSaved();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <Fld label="CONTRACTOR" value={form.contractor} onChange={e=>setForm({...form,contractor:e.target.value})}/>
      {defaultSiteId ? (
        <div style={{marginBottom: 14}}>
          <div style={{fontSize:12,color:C.g500,fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>SITE NAME</div>
          <div style={{background: "#f9f9f9", border: `1.5px solid ${C.g200}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: C.g500}}>Site: {siteOpts.find(s=>s.id.toString()===defaultSiteId.toString())?.name || "Unknown"}</div>
        </div>
      ) : (
        <div style={{marginBottom: 14}}>
          <div style={{fontSize:12,color:C.g500,fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>SITE NAME</div>
          <select value={form.siteId} onChange={e=>setForm({...form,siteId:e.target.value})} style={{width:"100%",border:`1.5px solid ${C.g200}`,borderRadius:10,padding:"10px 14px",fontSize:14,outline:"none",fontFamily:"inherit",background:C.offWhite,color:C.dark,boxSizing:"border-box"}}>
            <option value="" style={{color:C.dark,background:C.cardBg}}>-- Select Site --</option>
            {siteOpts.map(s => <option key={s.id} value={s.id} style={{color:C.dark,background:C.cardBg}}>{s.name}</option>)}
          </select>
        </div>
      )}
      <Fld label="WORK TYPE" value={form.workType} onChange={e=>setForm({...form,workType:e.target.value})}/>
      <Fld label="AMOUNT (₹)" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:14}}>
        <Fld label="PAID / UNPAID / FULL" as="select" value={form.status} onChange={e=>setForm({...form,status:e.target.value})} options={["Paid", "Unpaid", "Full"]}/>
        <Fld label="DATE" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
      </div>
      {err && <div style={{color: C.red, fontSize: 13, marginTop: -4, marginBottom: 10}}>{err}</div>}
      <div style={{display:"flex",gap:10,marginTop:10}}>
        <button onClick={save} style={{background:C.green,color:"#fff",border:"none",borderRadius:20,padding:"10px 24px",fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>Save</button>
        {onSaved && <Btn v="ghost" onClick={onSaved}>Cancel</Btn>}
      </div>
    </div>
  );
}

function AddEntry({ sites }) {
  const [tab, setTab] = useState("material");
  return (
    <div>
      <Hdr title="Add Entry" sub="Create a new material or labour entry" />
      <div style={{display:"flex",gap:10,marginBottom:24}}>
        <button onClick={()=>setTab("material")} style={{background:tab==="material"?C.green:C.cardBg,color:tab==="material"?"#fff":C.green,border:`1.5px solid ${C.green}`,borderRadius:20,padding:"8px 24px",fontWeight:700,cursor:"pointer",fontSize:14,transition:"all 0.2s"}}>🧱 Material</button>
        <button onClick={()=>setTab("labour")} style={{background:tab==="labour"?C.green:C.cardBg,color:tab==="labour"?"#fff":C.green,border:`1.5px solid ${C.green}`,borderRadius:20,padding:"8px 24px",fontWeight:700,cursor:"pointer",fontSize:14,transition:"all 0.2s"}}>👷 Labour</button>
      </div>
      <Card style={{padding: "24px 32px"}}>
        {tab === "material" && <MaterialForm sites={sites} />}
        {tab === "labour" && <LabourForm sites={sites} />}
      </Card>
    </div>
  );
}

// ─── LEDGER ───────────────────────────────────────────────────
function LedgerDetailTable({ type, name, entries }) {
  const [search, setSearch] = useState("");
  
  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    if (type === "Material") {
      return (e.siteName?.toLowerCase()||"").includes(q) || (e.material?.toLowerCase()||"").includes(q);
    } else {
      return (e.siteName?.toLowerCase()||"").includes(q) || (e.workType?.toLowerCase()||"").includes(q);
    }
  });

  const totalBill = filtered.reduce((a, b) => a + ((type === "Material" ? (b.rate * b.quantity) : b.amount) || 0), 0);
  const totalPaid = filtered.reduce((a, b) => a + (b.paid || 0), 0);
  const totalDue = filtered.reduce((a, b) => a + (b.due || 0), 0);

  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${type} Ledger — ${name}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const body = filtered.map((e, i) => {
      if (type === "Material") {
        return [i+1, e.siteName || "N/A", e.material || "N/A", fmt(e.rate * e.quantity), fmt(e.paid || 0), fmt(e.due || 0)];
      } else {
        return [i+1, e.siteName || "N/A", e.workType || "N/A", fmt(e.amount || 0), fmt(e.paid || 0), fmt(e.due || 0)];
      }
    });

    const head = type === "Material" 
      ? [["Sr. No", "Site Name", "Material Name", "Bill (Rs)", "Paid (Rs)", "Due (Rs)"]]
      : [["Sr. No", "Site Name", "Work Type", "Rate (Rs)", "Paid (Rs)", "Due (Rs)"]];

    doc.autoTable({
      startY: 36,
      head: head,
      body: body,
      foot: [["", "", "TOTAL", fmt(totalBill), fmt(totalPaid), fmt(totalDue)]]
    });
    doc.save(`Ledger_${name.replace(/\s+/g, '_')}.pdf`);
  }

  return (
    <div className="print-container">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:22,fontWeight:800,color:C.dark}}>{type} Ledger — {name}</div>
        </div>
        <div className="no-print" style={{display:"flex",gap:10}}>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:12,top:8,fontSize:14}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{padding:"8px 12px 8px 34px",borderRadius:10,border:`1.5px solid ${C.g200}`,outline:"none",fontFamily:"inherit",background:C.offWhite,color:C.dark}}/>
          </div>
          <Btn onClick={handlePrint}>🖨️ Print</Btn>
          <Btn onClick={handleDownload}>📥 Download</Btn>
        </div>
      </div>
      <Card>
        <Tbl 
          cols={type === "Material" ? ["Sr. No", "Site Name", "Material Name", "Bill (₹)", "Paid (₹)", "Due (₹)"] : ["Sr. No", "Site Name", "Work Type", "Rate (₹)", "Paid (₹)", "Due (₹)"]}
          rows={filtered.map((e, i) => [
            i+1, e.siteName || "N/A", type === "Material" ? (e.material || "N/A") : (e.workType || "N/A"),
            <span style={{fontWeight:700}}>{fmt(type === "Material" ? (e.rate * e.quantity) : e.amount)}</span>,
            <span style={{fontWeight:700,color:C.green}}>{fmt(e.paid || 0)}</span>,
            <span style={{fontWeight:700,color:C.red}}>{fmt(e.due || 0)}</span>
          ])}
        />
        <div style={{padding:"12px 14px",background:C.pistaPale,display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:14}}>
          <span>Totals:</span>
          <div style={{display:"flex",gap:40}}>
            <span>Bill: {fmt(totalBill)}</span>
            <span style={{color:C.green}}>Paid: {fmt(totalPaid)}</span>
            <span style={{color:C.red}}>Due: {fmt(totalDue)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Ledger({ materialEntries, labourEntries }) {
  const [tab, setTab] = useState("material");
  const [detailView, setDetailView] = useState(null);

  if (detailView) {
    const entries = detailView.type === "Material" 
      ? materialEntries.filter(m => m.vendor === detailView.name)
      : labourEntries.filter(l => l.contractor === detailView.name);
      
    return (
      <div>
        <div className="no-print" style={{marginBottom: 16}}>
          <button onClick={() => setDetailView(null)} style={{background:C.g100,border:"none",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontWeight:700,color:C.g600}}>← Back to Ledger</button>
        </div>
        <LedgerDetailTable type={detailView.type} name={detailView.name} entries={entries} />
      </div>
    );
  }

  const matGroups = {};
  materialEntries.forEach(m => {
    const v = m.vendor || "Unknown Vendor";
    if (!matGroups[v]) matGroups[v] = { count: 0, total: 0 };
    matGroups[v].count++;
    matGroups[v].total += ((m.rate * m.quantity) || 0);
  });
  const uniqueVendors = Object.keys(matGroups);

  const labGroups = {};
  labourEntries.forEach(l => {
    const c = l.contractor || "Unknown Contractor";
    if (!labGroups[c]) labGroups[c] = { count: 0, total: 0, workTypes: new Set() };
    labGroups[c].count++;
    labGroups[c].total += (l.amount || 0);
    if (l.workType) labGroups[c].workTypes.add(l.workType);
  });
  const uniqueContractors = Object.keys(labGroups);

  async function handleDelete(type, name) {
    if (!confirm(`Are you sure you want to delete all entries for ${type === 'Material' ? 'vendor' : 'contractor'} "${name}"? They will be moved to the Trash Bin.`)) return;
    const entries = type === "Material" ? materialEntries.filter(m => m.vendor === name) : labourEntries.filter(l => l.contractor === name);
    if (entries.length === 0) return;
    const trashId = Date.now().toString();
    await setDoc(doc(db, "trash", trashId), {
      id: trashId,
      deletedAt: Date.now(),
      type: "Ledger",
      entryType: type,
      vendorOrContractor: name,
      data: entries
    });
    const batch = writeBatch(db);
    entries.forEach(e => {
      const ref = doc(db, type === "Material" ? "material_entries" : "labour_entries", e.id);
      batch.delete(ref);
    });
    await batch.commit();
  }

  return (
    <div>
      <Hdr title="Ledger" sub="Manage accounts per vendor or contractor" />
      <div style={{display:"flex",gap:10,marginBottom:24}}>
        <button onClick={()=>setTab("material")} style={{background:tab==="material"?C.green:C.cardBg,color:tab==="material"?"#fff":C.green,border:`1.5px solid ${C.green}`,borderRadius:20,padding:"8px 24px",fontWeight:700,cursor:"pointer",fontSize:14,transition:"all 0.2s"}}>🧱 Material</button>
        <button onClick={()=>setTab("contractor")} style={{background:tab==="contractor"?C.green:C.cardBg,color:tab==="contractor"?"#fff":C.green,border:`1.5px solid ${C.green}`,borderRadius:20,padding:"8px 24px",fontWeight:700,cursor:"pointer",fontSize:14,transition:"all 0.2s"}}>👷 Contractor</button>
      </div>

      {tab === "material" && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
          {uniqueVendors.length === 0 && <div style={{color: C.g400, padding: 20}}>No material entries found.</div>}
          {uniqueVendors.map(v => (
            <Card key={v} style={{padding:20}}>
              <div style={{fontWeight:800,fontSize:18,color:C.dark,marginBottom:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}} title={v}>{v}</div>
              <div style={{fontSize:14,color:C.g500,marginBottom:4}}>Entries: <span style={{fontWeight:700}}>{matGroups[v].count}</span></div>
              <div style={{fontSize:14,color:C.g500,marginBottom:18}}>Total: <span style={{fontWeight:700,color:C.dark}}>{fmt(matGroups[v].total)}</span></div>
              <div style={{display:"flex",gap:10}}>
                <Btn small full onClick={() => setDetailView({type: "Material", name: v})}>Open</Btn>
                <Btn small v="danger" onClick={() => handleDelete("Material", v)}>Delete</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "contractor" && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
          {uniqueContractors.length === 0 && <div style={{color: C.g400, padding: 20}}>No labour entries found.</div>}
          {uniqueContractors.map(c => (
            <Card key={c} style={{padding:20}}>
              <div style={{fontWeight:800,fontSize:18,color:C.dark,marginBottom:6,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}} title={c}>{c}</div>
              <div style={{fontSize:12,color:C.g400,marginBottom:14,height:34,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                Work Types: {Array.from(labGroups[c].workTypes).join(", ") || "N/A"}
              </div>
              <div style={{fontSize:14,color:C.g500,marginBottom:4}}>Entries: <span style={{fontWeight:700}}>{labGroups[c].count}</span></div>
              <div style={{fontSize:14,color:C.g500,marginBottom:18}}>Total: <span style={{fontWeight:700,color:C.dark}}>{fmt(labGroups[c].total)}</span></div>
              <div style={{display:"flex",gap:10}}>
                <Btn small full onClick={() => setDetailView({type: "Contractor", name: c})}>Open</Btn>
                <Btn small v="danger" onClick={() => handleDelete("Contractor", c)}>Delete</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TRANSACTIONS ─────────────────────────────────────────────
function Transactions({user, sites}){
  const[tab,setTab]=useState(user?.role === "Admin" ? "clients" : "contractors");
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

  const txTabs = user?.role === "Admin" ? [["clients","👥 Client Payments"],["contractors","👷 Contractor Payments"]] : [["contractors","👷 Contractor Payments"]];

  return(
    <div>
      <Hdr title="Transactions" sub="All payment records" action={user?.role === "Admin" ? <Btn onClick={()=>setShowAdd(true)}>+ Add Payment</Btn> : null}/>
      <Tabs tabs={txTabs} active={tab} onChange={setTab}/>

      {tab==="clients"&&user?.role === "Admin"&&(
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
function Vouchers({materialEntries, labourEntries}){
  const[search,setSearch]=useState("");
  
  const all = [
    ...materialEntries.map(m => ({ ...m, type: "Material", desc: m.material, nameOrVendor: m.vendor })),
    ...labourEntries.map(l => ({ ...l, type: "Labour", desc: l.workType, nameOrVendor: l.contractor }))
  ].sort((a,b) => new Date(b.createdAt?.toDate() || 0) - new Date(a.createdAt?.toDate() || 0));

  let n=1;
  const list=all.map(b=>({n:n++, ...b})).filter(v=>(v.siteName?.toLowerCase()||"").includes(search.toLowerCase())||(v.nameOrVendor?.toLowerCase()||"").includes(search.toLowerCase()));

  return(
    <div>
      <Hdr title="Vouchers" sub={`${list.length} expense records`}/>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search by vendor, contractor or site..."
        style={{border:`1.5px solid ${C.g200}`,borderRadius:12,padding:"10px 18px",fontSize:14,width:300,outline:"none",fontFamily:"inherit",background:C.offWhite,color:C.dark,marginBottom:18}}/>
      <Card>
        <Tbl cols={["#","Type","Date","Site","Vendor/Contractor","Item/Work","Qty","Rate","Total"]}
          rows={list.map(v=>[
            <span style={{color:C.g400,fontSize:12}}>{v.n}</span>,
            <Bdg s={v.type}/>,
            <span style={{fontSize:12,color:C.g400}}>{v.date ? new Date(v.date).toLocaleDateString("en-IN") : "N/A"}</span>,
            <span style={{fontSize:12,color:C.g500}}>{v.siteName || "N/A"}</span>,
            <span style={{fontWeight:600}}>{v.nameOrVendor || "N/A"}</span>,
            v.desc || "N/A",
            v.quantity || v.qty || v.unit || "-",
            fmt(v.rate || v.amount || 0),
            <span style={{fontWeight:700,color:C.green}}>{fmt(v.type === "Material" ? ((v.rate * (v.quantity || v.qty)) || v.total) : (v.amount || v.total))}</span>
          ])}/>
      </Card>
    </div>
  );
}

// ─── CLIENTS ──────────────────────────────────────────────────
function Clients({user, clients}){
  const[search,setSearch]=useState("");
  const[filter,setFilter]=useState("All");
  const[showAdd,setShowAdd]=useState(false);
  const[editC,setEditC]=useState(null);
  const blank={name:"",mobile:"",status:"Under Process",totalValue:"",contractor:"",startDate:"",endDate:"",site:""};
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem("clientAddFormData");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.warn(err);
      }
    }
    return blank;
  });

  useEffect(() => {
    localStorage.setItem("clientAddFormData", JSON.stringify(form));
  }, [form]);

  const list=clients.filter(c=>(filter==="All"||c.status===filter)&&c.name.toLowerCase().includes(search.toLowerCase()));

  async function save(isEdit){
    if(!form.name)return;
    const totalVal = user?.role === "Admin" ? Number(form.totalValue) : 0;
    if(isEdit){
      await setDoc(doc(db, "clients", editC.toString()), { ...form, id: editC, totalValue: totalVal });
      setEditC(null);
    } else {
      const id = Date.now();
      await setDoc(doc(db, "clients", id.toString()), { ...form, id, totalValue: totalVal });
      setShowAdd(false);
    }
    localStorage.removeItem("clientAddFormData");
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
            {[
              ...(user?.role === "Admin" ? [["Total Value",fmt(c.totalValue)]] : []),
              ["Contractor",c.contractor],
              ["Start",c.startDate],
              ["End",c.endDate]
            ].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.g100}`}}>
                <span style={{fontSize:13,color:C.g400}}>{k}</span><span style={{fontSize:13,fontWeight:600,color:C.dark}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:12,display:"flex",gap:8,justifyContent:"flex-end"}}>
              <Btn small v="secondary" onClick={()=>{setEditC(c.id);setForm({name:c.name,mobile:c.mobile,status:c.status,totalValue:c.totalValue,contractor:c.contractor,startDate:c.startDate,endDate:c.endDate,site:c.site});}}>✏️ Edit</Btn>
              <Btn small v="danger" onClick={async ()=>{
                if (confirm(`Are you sure you want to delete client "${c.name}"? It will be moved to the Trash Bin.`)) {
                  const trashId = Date.now().toString();
                  await setDoc(doc(db, "trash", trashId), {
                    id: trashId,
                    deletedAt: Date.now(),
                    type: "Client",
                    originalCollection: "clients",
                    data: c
                  });
                  await deleteDoc(doc(db, "clients", c.id.toString()));
                }
              }}>🗑️</Btn>
            </div>
          </Card>
        ))}
      </div>
      {(showAdd||editC)&&<Modal title={editC?"Edit Client":"Add Client"} onClose={()=>{setShowAdd(false);setEditC(null);setForm(blank);localStorage.removeItem("clientAddFormData");}}>
        <div className="grid-responsive" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <Fld label="Mobile" value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value})}/>
          <Fld label="Site" value={form.site} onChange={e=>setForm({...form,site:e.target.value})}/>
          {user?.role === "Admin" && <Fld label="Total Value (₹)" type="number" value={form.totalValue} onChange={e=>setForm({...form,totalValue:e.target.value})}/>}
          <Fld label="Contractor" value={form.contractor} onChange={e=>setForm({...form,contractor:e.target.value})}/>
          <Fld label="Status" as="select" value={form.status} onChange={e=>setForm({...form,status:e.target.value})} options={["Under Process","Completed"]}/>
          <Fld label="Start Date" type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/>
          <Fld label="End Date" type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/>
        </div>
        <div style={{display:"flex",gap:10,marginTop:8}}><Btn onClick={()=>save(!!editC)}>{editC?"Update":"Save"}</Btn><Btn v="ghost" onClick={()=>{setShowAdd(false);setEditC(null);setForm(blank);localStorage.removeItem("clientAddFormData");}}>Cancel</Btn></div>
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
      <div className="grid-responsive" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:24}}>
        <StatCard icon="💰" label="Total Revenue" value={fmt(rev)} sub="Collected" color={C.green}/>
        <StatCard icon="📉" label="Total Expenses" value={fmt(exp)} sub="Spent" color={C.red}/>
        <StatCard icon="📈" label="Net Profit" value={fmt(profit)} sub={rev>0?`${Math.round((profit/rev)*100)}% margin`:""} color={C.gold}/>
      </div>
      <div className="grid-responsive" style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:18,marginBottom:22}}>
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
            <span style={{fontWeight:600,color:r.profit>=0?C.green:C.red}}>{fmt(r.profit)}</span>
          ])}/>
      </Card>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────
function Settings({user, onUpdateUser}){
  const [name, setName] = useState(user.name);
  return(
    <div>
      <Hdr title="Settings" sub="Account & preferences"/>
      <div className="grid-responsive" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        <Card style={{padding:22}}>
          <div style={{fontWeight:700,fontSize:15,color:C.dark,marginBottom:18}}>Profile</div>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,padding:14,background:C.pistaPale,borderRadius:12}}>
            <div style={{width:50,height:50,borderRadius:"50%",background:C.sageDark,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--btnPrimaryText)",fontSize:20,fontWeight:800}}>{name[0]?.toUpperCase() || ""}</div>
            <div><div style={{fontWeight:700,fontSize:15,color:C.dark}}>{name}</div><div style={{marginTop:4}}><Bdg s={user.role}/></div></div>
          </div>
          <Fld label="Display Name" value={name} onChange={e=>setName(e.target.value)}/>
          <Btn onClick={() => {
            if (!name.trim()) {
              alert("Error: Display Name cannot be empty!");
              return;
            }
            onUpdateUser({ ...user, name: name.trim() });
            alert("Success: Display name updated successfully to " + name.trim() + "!");
          }}>Save Changes</Btn>
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

// ─── USERS SECTION ─────────────────────────────────────────────
function UsersSection({ users }) {
  const [tab, setTab] = useState("staff");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);
  
  const blank = { name: "", email: "", phone: "", username: "", image: "", role: "Staff" };
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem("userAddFormData");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.warn(err);
      }
    }
    return blank;
  });
  const [err, setErr] = useState("");

  useEffect(() => {
    localStorage.setItem("userAddFormData", JSON.stringify(form));
  }, [form]);

  const filtered = users.filter(u => 
    u.role?.toLowerCase() === tab &&
    ((u.name?.toLowerCase()||"").includes(search.toLowerCase()) || 
     (u.email?.toLowerCase()||"").includes(search.toLowerCase()) ||
     (u.username?.toLowerCase()||"").includes(search.toLowerCase()))
  );

  async function handleSave() {
    if (!form.name || !form.email || !form.username) {
      setErr("Name, Email and Username are required.");
      return;
    }
    setErr("");
    
    const emailLower = form.email.toLowerCase();
    
    if (!editUser) {
      const emailExists = users.some(u => u.email?.toLowerCase() === emailLower);
      if (emailExists || emailLower === "builpromanger978494788@gmail.com") {
        setErr("This email is already registered.");
        return;
      }
    } else {
      const emailExists = users.some(u => u.email?.toLowerCase() === emailLower && u.id !== editUser);
      if (emailExists || emailLower === "builpromanger978494788@gmail.com") {
        setErr("This email is already registered by another user.");
        return;
      }
    }

    const payload = {
      name: form.name.trim(),
      email: emailLower.trim(),
      phone: form.phone.trim(),
      username: form.username.trim(),
      image: form.image.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name.trim())}&background=7cb98a&color=fff`,
      role: form.role
    };

    try {
      if (editUser) {
        await setDoc(doc(db, "users", editUser), payload);
        setEditUser(null);
      } else {
        const docId = Date.now().toString();
        await setDoc(doc(db, "users", docId), payload);
        setShowAdd(false);
      }
      localStorage.removeItem("userAddFormData");
      setForm(blank);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function handleDelete(u) {
    if (confirm(`Are you sure you want to delete user "${u.name}"? It will be moved to the Trash Bin.`)) {
      await moveToTrash("User", u, { originalCollection: "users" });
      await deleteDoc(doc(db, "users", u.id));
    }
  }

  return (
    <div>
      <Hdr 
        title="Users Management" 
        sub="Manage access permissions for Staff and Admins" 
        action={<Btn onClick={() => { setForm({ ...blank, role: tab === "staff" ? "Staff" : "Admin" }); setErr(""); setShowAdd(true); }}>➕ Add {tab === "staff" ? "Staff" : "Admin"}</Btn>}
      />
      
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,marginBottom:20,flexWrap:"wrap"}}>
        <Tabs tabs={[["staff", "👷 Staff"], ["admin", "🛡️ Admins"]]} active={tab} onChange={setTab} />
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="🔍 Search users..."
          style={{border:`1.5px solid ${C.g200}`,borderRadius:12,padding:"10px 16px",fontSize:14,width:240,outline:"none",fontFamily:"inherit",background:C.offWhite,color:C.dark}}
        />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        {filtered.length === 0 && (
          <div style={{gridColumn:"1/-1",textAlign:"center",padding:40,color:C.g400,fontSize:14}}>
            No {tab} members found.
          </div>
        )}
        {filtered.map(u => (
          <Card key={u.id} style={{padding:20,borderTop:`4px solid ${tab === "admin" ? C.gold : C.blueDeep}`}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <img 
                src={u.image} 
                alt={u.name} 
                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=7cb98a&color=fff`; }}
                style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.pistaLight}`}}
              />
              <div style={{minWidth: 0, flex: 1}}>
                <div style={{fontWeight:800,fontSize:15,color:C.dark,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}} title={u.name}>{u.name}</div>
                <div style={{fontSize:12,color:C.g400}}>@{u.username}</div>
              </div>
              <Bdg s={u.role}/>
            </div>
            
            <div style={{fontSize:13,color:C.g500,marginBottom:10,display:"flex",flexDirection:"column",gap:4}}>
              <div style={{display:"flex",justifyContent:"space-between",borderBottom:`1px solid ${C.g100}`,padding:"4px 0"}}>
                <span style={{color:C.g400}}>Gmail:</span>
                <span style={{fontWeight:600,color:C.dark,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={u.email}>{u.email}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",borderBottom:`1px solid ${C.g100}`,padding:"4px 0"}}>
                <span style={{color:C.g400}}>Phone:</span>
                <span style={{fontWeight:600,color:C.dark}}>{u.phone || "N/A"}</span>
              </div>
            </div>

            <div style={{marginTop:12,display:"flex",gap:8,justifyContent:"flex-end"}}>
              <Btn small v="secondary" onClick={() => { setEditUser(u.id); setForm(u); setErr(""); }}>✏️ Edit</Btn>
              <Btn small v="danger" onClick={() => handleDelete(u)}>🗑️ Delete</Btn>
            </div>
          </Card>
        ))}
      </div>

      {(showAdd || editUser) && (
        <Modal title={editUser ? "Edit User" : `Add New ${tab === "staff" ? "Staff" : "Admin"}`} onClose={() => { setShowAdd(false); setEditUser(null); setForm(blank); localStorage.removeItem("userAddFormData"); }}>
          <div className="grid-responsive" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Fld label="Full Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="E.g. Rajesh Kumar" />
            <Fld label="Username *" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="E.g. rajeshk" />
            <Fld label="Gmail Address *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="E.g. user@gmail.com" />
            <Fld label="Phone Number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="E.g. 9876543210" />
            <Fld label="Profile Image URL" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="HTTPS Image URL" />
            <Fld label="Role *" as="select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} options={["Staff", "Admin"]} />
          </div>
          {err && <div style={{color:C.red,fontSize:13,marginTop:4,marginBottom:10}}>{err}</div>}
          <div style={{display:"flex",gap:10,marginTop:8}}>
            <Btn onClick={handleSave}>{editUser ? "Update" : "Save"}</Btn>
            <Btn v="ghost" onClick={() => { setShowAdd(false); setEditUser(null); setForm(blank); localStorage.removeItem("userAddFormData"); }}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── TRASH BIN ────────────────────────────────────────────────
function TrashBin({trashList}) {
  const [tab, setTab] = useState("sites");

  const sites = trashList.filter(t => t.type === "Site");
  const clients = trashList.filter(t => t.type === "Client");
  const users = trashList.filter(t => t.type === "User");
  const payments = trashList.filter(t => t.type === "Payment");
  const expenses = trashList.filter(t => t.type === "Expense");
  const ledgers = trashList.filter(t => t.type === "Ledger");

  async function handleRestore(item) {
    if (!confirm(`Are you sure you want to restore this ${item.type.toLowerCase()}?`)) return;
    try {
      if (item.type === "Site") {
        await setDoc(doc(db, "sites", item.data.id.toString()), item.data);
      } else if (item.type === "Client") {
        await setDoc(doc(db, "clients", item.data.id.toString()), item.data);
      } else if (item.type === "User") {
        await setDoc(doc(db, "users", item.data.id), item.data);
      } else if (item.type === "Payment") {
        const siteRef = doc(db, "sites", item.parentSiteId);
        const siteSnap = await getDoc(siteRef);
        if (!siteSnap.exists()) {
          alert(`Cannot restore payment. Please restore the parent site "${item.siteName || "Unknown"}" first.`);
          return;
        }
        const siteData = siteSnap.data();
        const newMethods = [...(siteData.payment?.methods || []), item.data];
        const newPaid = newMethods.reduce((a, m) => a + m.amount, 0);
        await updateDoc(siteRef, {
          "payment.methods": newMethods,
          "payment.paid": newPaid
        });
      } else if (item.type === "Expense") {
        const siteRef = doc(db, "sites", item.parentSiteId);
        const siteSnap = await getDoc(siteRef);
        if (!siteSnap.exists()) {
          alert(`Cannot restore expense. Please restore the parent site "${item.siteName || "Unknown"}" first.`);
          return;
        }
        const siteData = siteSnap.data();
        const newBills = [...(siteData.expenses?.bills || []), item.data];
        await updateDoc(siteRef, {
          "expenses.bills": newBills
        });
      } else if (item.type === "Ledger") {
        const batch = writeBatch(db);
        const coll = item.entryType === "Material" ? "material_entries" : "labour_entries";
        item.data.forEach(e => {
          const ref = doc(db, coll, e.id);
          batch.set(ref, e);
        });
        await batch.commit();
      }
      await deleteDoc(doc(db, "trash", item.id));
      alert("Item restored successfully!");
    } catch (err) {
      console.error(err);
      alert("Error restoring item: " + err.message);
    }
  }

  async function handlePermanentDelete(item) {
    if (!confirm("Are you sure you want to permanently delete this item? This action is irreversible.")) return;
    try {
      await deleteDoc(doc(db, "trash", item.id));
      alert("Item deleted permanently.");
    } catch (err) {
      console.error(err);
      alert("Error deleting item: " + err.message);
    }
  }

  const trashTabs = [
    ["sites", `🏗️ Sites (${sites.length})`],
    ["clients", `👥 Clients (${clients.length})`],
    ["users", `👤 Users (${users.length})`],
    ["payments", `💰 Payments (${payments.length})`],
    ["expenses", `📋 Expenses (${expenses.length})`],
    ["ledger", `📖 Ledger (${ledgers.length})`],
  ];

  return (
    <div>
      <Hdr title="Recycle Bin" sub="View, restore or permanently delete deleted records" />
      <Tabs tabs={trashTabs} active={tab} onChange={setTab} />

      <Card style={{marginTop: 18}}>
        {tab === "sites" && (
          <Tbl 
            cols={["Site Name", "Client", "Status", "Deleted At", "Actions"]}
            rows={sites.map(item => [
              <span style={{fontWeight: 700}}>{item.data?.name || "N/A"}</span>,
              item.data?.client || "N/A",
              <Bdg s={item.data?.status || "Unknown"}/>,
              new Date(item.deletedAt).toLocaleString("en-IN"),
              <div style={{display: "flex", gap: 8}}>
                <Btn small onClick={() => handleRestore(item)}>🔄 Restore</Btn>
                <Btn small v="danger" onClick={() => handlePermanentDelete(item)}>🗑️ Permanent Delete</Btn>
              </div>
            ])}
            emptyMsg="Recycle bin is empty for sites."
          />
        )}

        {tab === "clients" && (
          <Tbl 
            cols={["Client Name", "Site", "Mobile", "Deleted At", "Actions"]}
            rows={clients.map(item => [
              <span style={{fontWeight: 700}}>{item.data?.name || "N/A"}</span>,
              item.data?.site || "N/A",
              item.data?.mobile || "N/A",
              new Date(item.deletedAt).toLocaleString("en-IN"),
              <div style={{display: "flex", gap: 8}}>
                <Btn small onClick={() => handleRestore(item)}>🔄 Restore</Btn>
                <Btn small v="danger" onClick={() => handlePermanentDelete(item)}>🗑️ Permanent Delete</Btn>
              </div>
            ])}
            emptyMsg="Recycle bin is empty for clients."
          />
        )}

        {tab === "users" && (
          <Tbl 
            cols={["Name", "Gmail", "Role", "Deleted At", "Actions"]}
            rows={users.map(item => [
              <span style={{fontWeight: 700}}>{item.data?.name || "N/A"}</span>,
              item.data?.email || "N/A",
              <Bdg s={item.data?.role || "Staff"}/>,
              new Date(item.deletedAt).toLocaleString("en-IN"),
              <div style={{display: "flex", gap: 8}}>
                <Btn small onClick={() => handleRestore(item)}>🔄 Restore</Btn>
                <Btn small v="danger" onClick={() => handlePermanentDelete(item)}>🗑️ Permanent Delete</Btn>
              </div>
            ])}
            emptyMsg="Recycle bin is empty for users."
          />
        )}

        {tab === "payments" && (
          <Tbl 
            cols={["Site Name", "Date", "Method", "Amount", "Deleted At", "Actions"]}
            rows={payments.map(item => [
              <span style={{fontWeight: 700}}>{item.siteName || "N/A"}</span>,
              item.data?.date || "N/A",
              <Bdg s={item.data?.type || "Cash"}/>,
              <span style={{fontWeight: 700, color: C.green}}>{fmt(item.data?.amount || 0)}</span>,
              new Date(item.deletedAt).toLocaleString("en-IN"),
              <div style={{display: "flex", gap: 8}}>
                <Btn small onClick={() => handleRestore(item)}>🔄 Restore</Btn>
                <Btn small v="danger" onClick={() => handlePermanentDelete(item)}>🗑️ Permanent Delete</Btn>
              </div>
            ])}
            emptyMsg="Recycle bin is empty for payments."
          />
        )}

        {tab === "expenses" && (
          <Tbl 
            cols={["Site Name", "Bill No", "Type", "Contractor", "Material/Work", "Total", "Deleted At", "Actions"]}
            rows={expenses.map(item => [
              <span style={{fontWeight: 700}}>{item.siteName || "N/A"}</span>,
              item.data?.billNo || "N/A",
              <Bdg s={item.data?.type || "Material"}/>,
              item.data?.contractor || "N/A",
              item.data?.material || item.data?.work || "N/A",
              <span style={{fontWeight: 700, color: C.red}}>{fmt(item.data?.total || 0)}</span>,
              new Date(item.deletedAt).toLocaleString("en-IN"),
              <div style={{display: "flex", gap: 8}}>
                <Btn small onClick={() => handleRestore(item)}>🔄 Restore</Btn>
                <Btn small v="danger" onClick={() => handlePermanentDelete(item)}>🗑️ Permanent Delete</Btn>
              </div>
            ])}
            emptyMsg="Recycle bin is empty for expenses."
          />
        )}

        {tab === "ledger" && (
          <Tbl 
            cols={["Vendor / Contractor", "Entry Type", "Entries Count", "Deleted At", "Actions"]}
            rows={ledgers.map(item => [
              <span style={{fontWeight: 700}}>{item.vendorOrContractor || "N/A"}</span>,
              <Bdg s={item.entryType || "Material"}/>,
              item.data?.length || 0,
              new Date(item.deletedAt).toLocaleString("en-IN"),
              <div style={{display: "flex", gap: 8}}>
                <Btn small onClick={() => handleRestore(item)}>🔄 Restore</Btn>
                <Btn small v="danger" onClick={() => handlePermanentDelete(item)}>🗑️ Permanent Delete</Btn>
              </div>
            ])}
            emptyMsg="Recycle bin is empty for ledger entries."
          />
        )}
      </Card>
    </div>
  );
}

// ─── SECURITY MANAGER ─────────────────────────────────────────
function SecurityManager() {
  const [devices, setDevices] = useState([]);
  
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "devices"), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setDevices(list.sort((a,b) => (b.lastActive||0) - (a.lastActive||0)));
    });
    return () => unsub();
  }, []);

  async function updateStatus(id, status) {
    await updateDoc(doc(db, "devices", id), { status });
  }

  async function deleteDevice(id) {
    if(!confirm("Are you sure you want to remove this device? Staff will need to login and verify OTP again.")) return;
    await deleteDoc(doc(db, "devices", id));
  }

  return (
    <div>
      <Hdr title="Device Security Manager" sub="Manage staff device access and sessions"/>
      <Card>
        <Tbl cols={["Staff Name", "Office Email", "Device Info", "Status", "Last Active", "Actions"]}
          rows={devices.map(d => [
            <span style={{fontWeight:800, color:C.sageDark}}>{d.staffName || "Unknown"}</span>,
            <span style={{fontWeight:700, color:C.dark}}>{d.email}</span>,
            <span style={{fontSize:13, color:C.g600}}>{d.deviceInfo}</span>,
            <span style={{padding:"4px 10px", borderRadius:20, fontSize:12, fontWeight:700, background: d.status==="approved"?"#e8f5e9":d.status==="pending"?"#fff8e1":"#fdecea", color: d.status==="approved"?C.green:d.status==="pending"?C.gold:C.red}}>{d.status?.toUpperCase()}</span>,
            <span style={{fontSize:12, color:C.g400}}>{d.lastActive ? new Date(d.lastActive).toLocaleString() : ""}</span>,
            <div style={{display:"flex", gap:6}}>
               {d.status === "pending" && <Btn small onClick={()=>updateStatus(d.id, "approved")}>✅ Approve</Btn>}
               {d.status === "pending" && <Btn small v="danger" onClick={()=>updateStatus(d.id, "rejected")}>❌ Reject</Btn>}
               {d.status === "approved" && <Btn small v="secondary" onClick={()=>updateStatus(d.id, "rejected")}>🔒 Lock</Btn>}
               {d.status === "rejected" && <Btn small onClick={()=>updateStatus(d.id, "approved")}>🔓 Unlock</Btn>}
               <Btn small v="danger" onClick={()=>deleteDevice(d.id)}>🗑️ Remove</Btn>
            </div>
          ])}
        />
      </Card>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────
export default function App(){
  const[user,setUser]=useState(null);
  const[authLoading,setAuthLoading]=useState(true);
  const[authError,setAuthError]=useState("");
  const[usersList,setUsersList]=useState([]);
  const[nav, _setNav]=useState("home");
  const[navHistory, setNavHistory]=useState([]);
  const[darkMode, setDarkMode]=useState(() => localStorage.getItem("darkMode") === "true");
  
  const setNav = (newNav) => {
    if (newNav === nav) return;
    setNavHistory(prev => [...prev.slice(-20), nav]);
    _setNav(newNav);
  };

  const handleBack = () => {
    if (navHistory.length === 0) {
      _setNav("home");
      return;
    }
    const prev = [...navHistory];
    const prevPage = prev.pop();
    setNavHistory(prev);
    _setNav(prevPage);
  };

  const[sites,setSites]=useState({ ongoing: [], completed: [] });
  const[clients,setClients]=useState([]);
  const[materialEntries,setMaterialEntries]=useState([]);
  const[labourEntries,setLabourEntries]=useState([]);
  const[trashList,setTrashList]=useState([]);
  const[collapsed,setCollapsed]=useState(false);
  const[mobileOpen,setMobileOpen]=useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email.toLowerCase();
        if (email === "builpromanger978494788@gmail.com") {
          setUser({ uid: firebaseUser.uid, name: firebaseUser.displayName || "Super Admin", email: firebaseUser.email, role: "Admin", isSuperAdmin: true, photoURL: firebaseUser.photoURL || "" });
        } else {
          const q = query(collection(db, "users"), where("email", "==", email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const docId = querySnapshot.docs[0].id; const userData = querySnapshot.docs[0].data();
            setUser({ uid: firebaseUser.uid, id: docId, name: userData.name || firebaseUser.displayName || "User", email: firebaseUser.email, phone: userData.phone || "", username: userData.username || "", photoURL: userData.image || firebaseUser.photoURL || "", role: userData.role || "Staff" });
          } else {
            setUser(null); await signOut(auth); setAuthError("Access Denied: Your email is not registered in this system. Please contact the Admin.");
          }
        }
      } else {
        const staffSessionStr = localStorage.getItem("staffSession");
        if (staffSessionStr) {
          try {
            const session = JSON.parse(staffSessionStr);
            const dRef = doc(db, "devices", session.deviceId);
            const dSnap = await getDoc(dRef);
            if (dSnap.exists() && dSnap.data().status === "approved" && dSnap.data().email === session.email) {
               const q = query(collection(db, "users"), where("email", "==", session.email));
               const qs = await getDocs(q);
               let userData = { role: "Staff", name: "Staff User" };
               if(!qs.empty) userData = qs.docs[0].data();
               setUser({ uid: session.deviceId, email: session.email, name: userData.name || "Staff", role: userData.role || "Staff", isStaffSession: true });
               setAuthLoading(false);
               return;
            } else {
               localStorage.removeItem("staffSession");
            }
          } catch(e){}
        }
        setUser(null);
      }
      setAuthLoading(false);
    });

    const unsubSites = onSnapshot(collection(db, "sites"), (snapshot) => {
      if (snapshot.empty) {
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

    const unsubMaterial = onSnapshot(collection(db, "material_entries"), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setMaterialEntries(list.sort((a,b) => new Date(b.createdAt?.toDate() || 0) - new Date(a.createdAt?.toDate() || 0)));
    });

    const unsubLabour = onSnapshot(collection(db, "labour_entries"), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setLabourEntries(list.sort((a,b) => new Date(b.createdAt?.toDate() || 0) - new Date(a.createdAt?.toDate() || 0)));
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setUsersList(list);
    });

    const unsubTrash = onSnapshot(collection(db, "trash"), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setTrashList(list.sort((a,b) => b.deletedAt - a.deletedAt));
    });

    return () => {
      unsubAuth();
      unsubSites();
      unsubClients();
      unsubMaterial();
      unsubLabour();
      unsubUsers();
      unsubTrash();
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
    {id:"add-entry",icon:"➕",label:"Add Entry"},
    {id:"ledger",icon:"📖",label:"Ledger"},
    ...(user?.role==="Admin"?[{id:"users",icon:"👤",label:"Users"}]:[]),
    ...(user?.role==="Admin"?[{id:"security",icon:"🔐",label:"Security"}]:[]),
    {id:"settings",icon:"⚙️",label:"Settings"},
    {id:"trash",icon:"🗑️",label:"Recycle Bin"},
  ];

  if (authLoading) {
    return (
      <div data-theme={darkMode ? "dark" : "light"} style={{minHeight:"100vh",background:C.offWhite,color:C.dark,width:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{width:40,height:40,border:"3px solid #ffffff40",borderTop:`3px solid ${C.sageDark}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      </div>
    );
  }

  if(!user) {
    return (
      <div data-theme={darkMode ? "dark" : "light"} style={{minHeight:"100vh",background:C.offWhite,color:C.dark,width:"100%"}}>
        <style>{`
          :root {
            --pista: #7cb98a;
            --pistaLight: #a8d4b0;
            --pistaPale: #e8f5ec;
            --mint: #b2dfc4;
            --mintPale: #f0faf4;
            --sage: #8fad96;
            --sageDark: #5a8a6a;
            --beige: #f7f3ed;
            --offWhite: #f4f6f5;
            --g100: #e2e8f0;
            --g200: #cbd5e1;
            --g400: #475569;
            --g500: #334155;
            --g600: #1e293b;
            --g700: #0f172a;
            --blue: #a8c4e0;
            --bluePale: #e8f2fa;
            --blueDeep: #5b8db8;
            --orange: #f0c080;
            --orangePale: #fef3e0;
            --coral: #e8a090;
            --coralPale: #fdecea;
            --red: #e07070;
            --green: #6dab7e;
            --gold: #c8a84b;
            --dark: #1e2d24;
            --cardBg: #ffffff;
            --sh: 0 2px 16px rgba(90,138,106,0.10);
            --shM: 0 4px 24px rgba(90,138,106,0.14);
            --shL: 0 8px 40px rgba(90,138,106,0.18);
            --btnPrimaryText: #ffffff;
          }
          [data-theme="dark"] {
            --pista: #8fad96;
            --pistaLight: #5a8a6a;
            --pistaPale: #1c2b21;
            --mint: #a8d4b0;
            --mintPale: #16261c;
            --sage: #7cb98a;
            --sageDark: #a8d4b0;
            --beige: #1a1c1a;
            --offWhite: #111312;
            --g100: #242826;
            --g200: #333835;
            --g400: #9ca3af;
            --g500: #d1d5db;
            --g600: #e5e7eb;
            --g700: #ffffff;
            --blue: #a8c4e0;
            --bluePale: #1f2b35;
            --blueDeep: #7da5c9;
            --orange: #f0c080;
            --orangePale: #2f2516;
            --coral: #e8a090;
            --coralPale: #2b1d1d;
            --red: #f87171;
            --green: #86efac;
            --gold: #fde047;
            --dark: #ffffff;
            --cardBg: #181c19;
            --sh: 0 2px 16px rgba(0,0,0,0.4);
            --shM: 0 4px 24px rgba(0,0,0,0.5);
            --shL: 0 8px 40px rgba(0,0,0,0.6);
            --btnPrimaryText: #121e15;
          }
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          ::-webkit-scrollbar { width: 5px; height: 5px; }
          ::-webkit-scrollbar-track { background: var(--offWhite); }
          ::-webkit-scrollbar-thumb { background: var(--pistaLight); border-radius: 10px; }
          button { font-family: inherit; }
        `}</style>
        <Login onLogin={u=>{setUser(u);setNav("home");}} authError={authError} setAuthError={setAuthError}/>
      </div>
    );
  }

  return(
    <div data-theme={darkMode ? "dark" : "light"} style={{display:"flex",minHeight:"100vh",fontFamily:"'DM Sans','Segoe UI',sans-serif",background:C.offWhite,width:"100%",color:C.dark}}>
      <style>{`
        :root {
          --pista: #7cb98a;
          --pistaLight: #a8d4b0;
          --pistaPale: #e8f5ec;
          --mint: #b2dfc4;
          --mintPale: #f0faf4;
          --sage: #8fad96;
          --sageDark: #5a8a6a;
          --beige: #f7f3ed;
          --offWhite: #f4f6f5;
          --g100: #e2e8f0;
          --g200: #cbd5e1;
          --g400: #475569;
          --g500: #334155;
          --g600: #1e293b;
          --g700: #0f172a;
          --blue: #a8c4e0;
          --bluePale: #e8f2fa;
          --blueDeep: #5b8db8;
          --orange: #f0c080;
          --orangePale: #fef3e0;
          --coral: #e8a090;
          --coralPale: #fdecea;
          --red: #e07070;
          --green: #6dab7e;
          --gold: #c8a84b;
          --dark: #1e2d24;
          --cardBg: #ffffff;
          --sh: 0 2px 16px rgba(90,138,106,0.10);
          --shM: 0 4px 24px rgba(90,138,106,0.14);
          --shL: 0 8px 40px rgba(90,138,106,0.18);
          --btnPrimaryText: #ffffff;
        }
        [data-theme="dark"] {
          --pista: #8fad96;
          --pistaLight: #5a8a6a;
          --pistaPale: #1c2b21;
          --mint: #a8d4b0;
          --mintPale: #16261c;
          --sage: #7cb98a;
          --sageDark: #a8d4b0;
          --beige: #1a1c1a;
          --offWhite: #111312;
          --g100: #242826;
          --g200: #333835;
          --g400: #9ca3af;
          --g500: #d1d5db;
          --g600: #e5e7eb;
          --g700: #ffffff;
          --blue: #a8c4e0;
          --bluePale: #1f2b35;
          --blueDeep: #7da5c9;
          --orange: #f0c080;
          --orangePale: #2f2516;
          --coral: #e8a090;
          --coralPale: #2b1d1d;
          --red: #f87171;
          --green: #86efac;
          --gold: #fde047;
          --dark: #ffffff;
          --cardBg: #181c19;
          --sh: 0 2px 16px rgba(0,0,0,0.4);
          --shM: 0 4px 24px rgba(0,0,0,0.5);
          --shL: 0 8px 40px rgba(0,0,0,0.6);
          --btnPrimaryText: #121e15;
        }
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: var(--offWhite); }
        ::-webkit-scrollbar-thumb { background: var(--pistaLight); border-radius: 10px; }
        button { font-family: inherit; }
        @media (max-width: 768px) {
          .sidebar-desktop {
            display: none !important;
          }
          .hamburger-btn {
            display: block !important;
          }
          .main-content-container {
            padding: 12px !important;
          }
          .main-header {
            padding: 0 12px !important;
          }
          .grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 480px) {
          .modal-container {
            padding: 20px 16px !important;
          }
        }
      `}</style>

      {/* Sidebar (Desktop) */}
      <div className="sidebar-desktop" style={{width:collapsed?64:230,background:C.cardBg,borderRight:`1px solid ${C.g100}`,display:"flex",flexDirection:"column",transition:"width 0.22s ease",flexShrink:0,position:"sticky",top:0,height:"100vh",overflowY:"auto",overflowX:"hidden"}}>
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
          <div onClick={async () => { if(user?.isStaffSession){localStorage.removeItem("staffSession");setUser(null);}else{await signOut(auth);} }} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",borderRadius:10,cursor:"pointer",color:C.red,fontSize:13,fontWeight:600}}
            onMouseEnter={e=>e.currentTarget.style.background=C.coralPale} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span>🚪</span>{!collapsed&&"Logout"}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer Sidebar */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{position:"fixed",inset:0,background:"rgba(30,45,36,0.45)",zIndex:999,backdropFilter:"blur(2px)"}} />
          <div style={{position:"fixed",top:0,left:0,width:250,background:C.cardBg,height:"100vh",display:"flex",flexDirection:"column",zIndex:1000,boxShadow:C.shL,overflowY:"auto"}}>
            <div style={{padding:"18px 14px",borderBottom:`1px solid ${C.g100}`,display:"flex",alignItems:"center",gap:10,justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,background:`linear-gradient(135deg,${C.sageDark},${C.pista})`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>🏗️</div>
                <div><div style={{fontWeight:800,fontSize:15,color:C.dark}}>BuildPro</div><div style={{fontSize:11,color:C.g400}}>Construction ERP</div></div>
              </div>
              <button onClick={() => setMobileOpen(false)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.dark}}>✕</button>
            </div>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.g100}`}}>
              <div style={{background:C.pistaPale,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:C.sageDark,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:12}}>{user.name[0]}</div>
                <div><div style={{fontSize:13,fontWeight:700,color:C.dark}}>{user.name}</div><Bdg s={user.role}/></div>
              </div>
            </div>
            <nav style={{flex:1,padding:"10px 8px"}}>
              {navItems.map(n=>(
                <div key={n.id} onClick={()=>{setNav(n.id);setMobileOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 11px",borderRadius:11,marginBottom:2,cursor:"pointer",background:nav===n.id?C.pistaPale:"transparent",color:nav===n.id?C.sageDark:C.g400,fontWeight:nav===n.id?700:500,fontSize:13}}>
                  <span style={{fontSize:17}}>{n.icon}</span>
                  <span style={{whiteSpace:"nowrap"}}>{n.label}</span>
                </div>
              ))}
            </nav>
            <div style={{padding:"10px 8px",borderTop:`1px solid ${C.g100}`}}>
              <div onClick={async () => { if(user?.isStaffSession){localStorage.removeItem("staffSession");setUser(null);}else{await signOut(auth);} setMobileOpen(false); }} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",borderRadius:10,cursor:"pointer",color:C.red,fontSize:13,fontWeight:600}}>
                <span>🚪</span>Logout
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Container */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        <div className="main-header" style={{background:C.cardBg,borderBottom:`1px solid ${C.g100}`,padding:"0 24px",height:58,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setMobileOpen(true)}
              className="hamburger-btn"
              style={{
                background: "none",
                border: "none",
                fontSize: 22,
                cursor: "pointer",
                marginRight: 6,
                color: C.dark,
                display: "none"
              }}
            >
              ☰
            </button>
            {nav !== "home" && (
              <button 
                onClick={handleBack} 
                style={{
                  background: C.g100,
                  border: "none",
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 16,
                  color: C.sageDark,
                  transition: "all 0.15s ease",
                  marginRight: 10
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.pistaPale; e.currentTarget.style.transform = "translateX(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.g100; e.currentTarget.style.transform = "translateX(0)"; }}
                title="Back"
              >
                ⬅️
              </button>
            )}
            <span style={{fontSize:17}}>{navItems.find(n=>n.id===nav)?.icon}</span>
            <span style={{fontWeight:700,fontSize:15,color:C.dark}}>{navItems.find(n=>n.id===nav)?.label}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button 
              onClick={() => {
                const nextMode = !darkMode;
                setDarkMode(nextMode);
                localStorage.setItem("darkMode", String(nextMode));
              }}
              style={{
                background: C.g100,
                border: "none",
                borderRadius: "50%",
                width: 34,
                height: 34,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                transition: "all 0.15s ease",
                color: C.dark
              }}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
            <div style={{fontSize:13,color:C.g400}}>{new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</div>
            <div style={{width:6,height:6,borderRadius:"50%",background:C.green}}/>
            <Bdg s={user.role}/>
          </div>
        </div>
        <div className="main-content-container" style={{flex:1,overflowY:"auto",padding:24}}>
          {nav==="home"&&<Home sites={sites} user={user} setNav={setNav} onImportDemo={handleSeedAll}/>}
          {nav==="sites"&&<Sites user={user} sites={sites} materialEntries={materialEntries} labourEntries={labourEntries}/>}
          {nav==="transactions"&&<Transactions user={user} sites={sites}/>}
          {nav==="vouchers"&&<Vouchers materialEntries={materialEntries} labourEntries={labourEntries}/>}
          {nav==="clients"&&<Clients user={user} clients={clients}/>}
          {nav==="reports"&&user.role==="Admin"&&<Reports sites={sites}/>}
          {nav==="add-entry"&&<AddEntry sites={sites}/>}
          {nav==="ledger"&&<Ledger materialEntries={materialEntries} labourEntries={labourEntries}/>}
          {nav==="users"&&user.role==="Admin"&&<UsersSection users={usersList}/>}
          {nav==="security"&&user.role==="Admin"&&<SecurityManager/>}
          {nav==="settings"&&<Settings user={user} onUpdateUser={setUser}/>}
          {nav==="trash"&&<TrashBin trashList={trashList}/>}
        </div>
      </div>
    </div>
  );
}
