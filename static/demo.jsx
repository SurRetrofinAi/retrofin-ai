
const { useState, useRef, useEffect } = React;

const C = {
  deep:"#0a4a3a",mid:"#1a7a5e",bright:"#2db87a",
  pale:"#f0faf6",border:"#c8e8dc",text:"#0d1f1a",muted:"#6b8a80",
  white:"#fff",bg:"#e8f3ec",
  gold:"#d4890a",goldL:"#fef3e2",goldB:"#f5c97a",
  red:"#e05252",redL:"#fdeaea",
  purple:"#7c5cbf",purpleL:"#ede8f8",purpleB:"#c9b8f0",
  teal:"#0e8c8c",tealL:"#e0f4f4",
};

const AI_SYSTEM = `You are RetroFin AI, a specialist assistant helping Spanish building communities with building retrofit financing.
Building: Carrer de Balmes 42, Barcelona. 24 apartments, built 1978, EPC E, 8 floors.
Annual income: €67,695. Reserve fund: €31,375. No bank debt. 22/24 owners current. Green Loan Score: 78/100.
Package A: windows only €38,600. Package B (RECOMMENDED): windows+facade €98,000 net ~€9,200 after subsidies. Package C: +solar €148,000.
Subsidies: Plan Estatal 60% up to €72k, Generalitat Catalunya +40% up to €30k, ICO Verde -0.30% rate.
Net monthly benefit Package B: +€117/apt from day one.
Respond in the same language the user writes in. Be concise and practical.`;

const WORKFLOW_STEPS = [
  {id:1,icon:"📋",label:"Datos"},
  {id:2,icon:"🤖",label:"Analysis"},
  {id:3,icon:"🏛",label:"Architect"},
  {id:4,icon:"💶",label:"Proposal"},
  {id:5,icon:"🗳",label:"Vote"},
];

const SCORE_BREAKDOWN = [
  {label:"Debt/income ratio",val:95,color:C.bright},
  {label:"Reserve fund (€31,375)",val:82,color:C.bright},
  {label:"Income stability",val:88,color:C.bright},
  {label:"Documentation ITE/IEE",val:40,color:C.gold},
];

const SCENARIOS = [
  {id:"A",title:"Window Replacement",tag:"Entry level",hBg:C.mid,items:["Triple glazing · 24 units","PVC frames"],cost:"€38k",saving:"−22%",payback:"6 yrs",bill:"−€30",planEur:"€19,000",planPct:49,loanEur:"€12,100",loanPct:32,commEur:"€7,500",commPct:19,perApt:"€313/apt",votes0:0,rec:false},
  {id:"B",title:"Windows + Facade",tag:"⭐ Recommended",hBg:C.purple,items:["Triple glazing","Facade SATE","Roof insulation"],cost:"€98k",saving:"−48%",payback:"8.5 yrs",bill:"−€202",planEur:"€58,800",planPct:60,loanEur:"€25,200",loanPct:26,commEur:"€14,000",commPct:14,perApt:"€583/apt",votes0:8,rec:true,why:"Maximises subsidy at 60%. Community contribution below €600/apt. Loan €85/apt < saving €202/apt → +€117/month net."},
  {id:"C",title:"Windows + Facade + Solar",tag:"Maximum impact",hBg:C.gold,items:["Triple glazing","Facade+Roof","Heat pump","Solar PV 15kWp"],cost:"€148k",saving:"−65%",payback:"9 yrs",bill:"−€273",planEur:"€72,000",planPct:49,loanEur:"€54,500",loanPct:37,commEur:"€21,500",commPct:14,perApt:"€896/apt",votes0:2,rec:false},
];

const FIRMS = [
  {id:"vidal",name:"Empresa Vidal",price:"€149,800",warn:true,status:"⚠ spec issues",votes0:0,notes:["⚠ Double glazing — spec requires triple","⚠ 40% upfront required","✓ Fastest: 12 weeks"]},
  {id:"buildgreen",name:"BuildGreen BCN",price:"€153,000",leading:true,status:"✓ spec compliant",votes0:8,notes:["✓ Triple glazing · correct spec","✓ SATE certified · 30% upfront","✓ 10yr warranty"]},
  {id:"rehabipro",name:"RehabiPro",price:"€157,500",status:"✓ spec compliant",votes0:0,notes:["✓ Triple glazing correct","✓ Premium SATE A-rated","~ 15–18 week timeline"]},
];

function ScoreBar({label,val,color}){
  return <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
    <div style={{flex:1,fontSize:11,color:C.text}}>{label}</div>
    <div style={{width:80,height:5,background:"#e4e4e4",borderRadius:3,overflow:"hidden"}}>
      <div style={{width:`${val}%`,height:"100%",background:color,borderRadius:3}}/>
    </div>
    <div style={{fontSize:10,fontWeight:700,color,minWidth:36,textAlign:"right"}}>{val}/100</div>
  </div>;
}

function Step1({uploadState,onUpload,onNext}){
  const FORM = [
    ["Address","C/ de Balmes, 42","District","Eixample, Barcelona"],
    ["Year built","1978 (est)","No. of floors","8"],
    ["No. of units","24 + 1 local","Surface area","1.840 m² (IA)"],
    ["EPC Rating","E (est)","Heating","Centralised gas"],
    ["Administrator","Gestiones Balmes S.L.","CIF","H-08-123456"],
  ];
  const [addrState, setAddrState] = useState("idle"); // idle | searching | done
  const [addrVal, setAddrVal] = useState("Carrer de Balmes, 42, 08007 Barcelona");
  const [ieeState, setIeeState] = useState("idle"); // idle | uploading | parsing | done

  function handleCatastro(){
    if(addrState==="done") return;
    setAddrState("searching");
    setTimeout(()=>setAddrState("done"), 2000);
  }

  function handleIeeUpload(){
    if(ieeState!=="idle") return;
    setIeeState("uploading");
    setTimeout(()=>setIeeState("parsing"), 900);
    setTimeout(()=>setIeeState("done"), 2800);
  }

  return <div>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:C.mid,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:13,flexShrink:0}}>1</div>
      <div style={{fontWeight:700,fontSize:15,color:C.deep}}>Building information</div>
    </div>

    {/* Address search bar */}
    <div style={{background:C.white,border:`1.5px solid ${addrState==="done"?C.bright:C.border}`,borderRadius:12,padding:"12px 14px",marginBottom:14,transition:"border-color .3s"}}>
      <div style={{fontSize:9.5,fontWeight:600,color:C.deep,marginBottom:6}}>BUILDING ADDRESS</div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <div style={{position:"relative",flex:1}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:14}}>📍</span>
          <input
            value={addrVal}
            onChange={e=>{ setAddrVal(e.target.value); setAddrState("idle"); }}
            style={{width:"100%",height:36,background:C.pale,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px 0 32px",fontSize:12,color:C.text,fontFamily:"inherit",outline:"none"}}
          />
        </div>
        <button
          onClick={handleCatastro}
          disabled={addrState==="searching"}
          style={{height:36,padding:"0 14px",borderRadius:8,background:addrState==="done"?C.pale:C.deep,color:addrState==="done"?C.mid:"#fff",border:`1.5px solid ${addrState==="done"?C.bright:C.deep}`,fontSize:11,fontWeight:700,cursor:addrState==="searching"?"not-allowed":"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6,transition:"all .3s"}}>
          {addrState==="searching" && <span style={{width:12,height:12,borderRadius:"50%",border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",animation:"spin .7s linear infinite",display:"inline-block"}}/>}
          {addrState==="idle" && "🏛 Search Cadastre →"}
          {addrState==="searching" && "Searching…"}
          {addrState==="done" && "✓ Data loaded"}
        </button>
      </div>
      {addrState==="searching" && <div style={{fontSize:10,color:C.muted,marginTop:8,display:"flex",alignItems:"center",gap:6}}>
        <span style={{width:8,height:8,borderRadius:"50%",border:`1.5px solid ${C.border}`,borderTopColor:C.bright,animation:"spin .7s linear infinite",display:"inline-block"}}/>
        Querying Cadastre database…
      </div>}
      {addrState==="done" && <div style={{fontSize:10,color:C.mid,marginTop:8,display:"flex",alignItems:"center",gap:5}}>
        <span>✓</span> Cadastral ref: <strong>9872023VH5997S0001WX</strong> · Data verified via Cadastre API
      </div>}
    </div>

    {/* Building info grid — always visible, highlighted after catastro lookup */}
    <div style={{background:C.white,border:`1px solid ${addrState==="done"?C.bright:C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:16,transition:"border-color .3s",position:"relative"}}>
      {addrState==="done" && <div style={{position:"absolute",top:-9,right:14,background:C.bright,color:"#fff",fontSize:9,fontWeight:700,padding:"2px 10px",borderRadius:100,letterSpacing:".4px"}}>CADASTRE + AI</div>}
      {addrState==="idle" && <div style={{position:"absolute",top:-9,right:14,background:C.pale,color:C.muted,fontSize:9,fontWeight:700,padding:"2px 10px",borderRadius:100,border:`1px solid ${C.border}`,letterSpacing:".4px"}}>PRE-LOADED DATA</div>}
      {addrState==="searching" && <div style={{position:"absolute",top:-9,right:14,background:C.goldL,color:C.gold,fontSize:9,fontWeight:700,padding:"2px 10px",borderRadius:100,border:`1px solid ${C.goldB}`,letterSpacing:".4px"}}>UPDATING…</div>}
      {FORM.map(([l1,v1,l2,v2],i)=><div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:9}}>
        {[[l1,v1],[l2,v2]].map(([l,v],j)=><div key={j}>
          <div style={{fontSize:9.5,fontWeight:600,color:C.deep,marginBottom:3}}>{l}</div>
          <div style={{height:29,background:addrState==="done"?"#edfdf5":C.pale,border:`1.5px solid ${addrState==="done"?C.bright:C.border}`,borderRadius:7,padding:"0 10px",fontSize:11,color:addrState==="done"?C.mid:"transparent",display:"flex",alignItems:"center",fontWeight:500,transition:"all .4s"}}>{addrState==="done"?v:"–"}</div>
        </div>)}
      </div>)}
    </div>

    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:C.mid,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:13,flexShrink:0}}>2</div>
      <div style={{fontWeight:700,fontSize:15,color:C.deep}}>Documentation</div>
    </div>

    {/* IEE Report upload */}
    {ieeState==="idle" && <div onClick={handleIeeUpload} style={{border:`2px dashed ${C.border}`,borderRadius:10,background:C.pale,padding:"18px 16px",textAlign:"center",cursor:"pointer",marginBottom:10}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.bright} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
      <div style={{fontSize:28,marginBottom:6}}>📋</div>
      <div style={{fontWeight:600,fontSize:12,color:C.deep,marginBottom:3}}>Upload IEE / ITE Report</div>
      <div style={{fontSize:10,color:C.muted,marginBottom:12}}>PDF · Building inspection report</div>
      <div style={{display:"inline-flex",alignItems:"center",gap:7,background:C.mid,color:"#fff",fontSize:11,fontWeight:600,padding:"7px 18px",borderRadius:100}}>📋 Demo: load IEE_Balmes42_2019.pdf</div>
    </div>}

    {ieeState==="uploading" && <div style={{border:`1.5px solid ${C.border}`,borderRadius:10,background:C.pale,padding:14,textAlign:"center",marginBottom:10}}>
      <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Uploading IEE report…</div>
      <div style={{height:5,background:"#ddd",borderRadius:3,overflow:"hidden"}}><div style={{width:"60%",height:"100%",background:C.mid}}/></div>
    </div>}

    {(ieeState==="parsing"||ieeState==="done") && <div style={{border:`1.5px solid ${ieeState==="done"?C.bright:C.goldB}`,borderRadius:10,background:ieeState==="done"?"#edfdf5":C.goldL,marginBottom:10,overflow:"hidden",transition:"all .4s"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px"}}>
        <div style={{width:32,height:32,borderRadius:7,background:ieeState==="done"?"#dff2e7":C.goldL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
          {ieeState==="parsing"?<span style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${C.goldB}`,borderTopColor:C.gold,animation:"spin .7s linear infinite",display:"inline-block"}}/>:"📋"}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:500,color:C.text}}>IEE_Balmes42_2019.pdf</div>
          <div style={{fontSize:10,color:C.muted}}>1.2 MB · ITE/IEE Report 2019</div>
        </div>
        <div style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:100,background:ieeState==="parsing"?C.goldL:C.pale,color:ieeState==="parsing"?C.gold:C.mid,border:`1px solid ${ieeState==="parsing"?C.goldB:C.border}`}}>
          {ieeState==="parsing"?"⏳ Parsing…":"✓ Parsed"}
        </div>
      </div>

      {ieeState==="done" && <div style={{borderTop:`1px solid ${C.border}`,padding:"10px 14px",background:"#f8fdfb"}}>
        <div style={{fontSize:9,fontWeight:700,color:C.deep,textTransform:"uppercase",letterSpacing:".4px",marginBottom:8}}>🤖 AI extracted · IEE 2019</div>
        {[
          {icon:"🏗",label:"Structural",finding:"Hairline cracks in ground floor slab — monitoring required",status:"⚠ Action needed",sc:C.gold},
          {icon:"♿",label:"Accessibility",finding:"No entrance ramp — RD 505/2007 non-compliant",status:"⚠ Mandatory",sc:C.gold},
          {icon:"🔥",label:"Fire safety",finding:"BIE hose reels out of service life — CTE DB-SI",status:"⚠ Mandatory",sc:C.gold},
          {icon:"🌡",label:"Thermal envelope",finding:"Uninsulated facade · original single-pane windows · EPC E",status:"ℹ Upgrade eligible",sc:C.mid},
          {icon:"🔧",label:"Common services",finding:"Centralised gas boiler 22 years old — within service life",status:"✓ OK",sc:C.bright},
        ].map((r,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 0",borderTop:i>0?`1px solid ${C.border}20`:"none"}}>
          <span style={{fontSize:13,flexShrink:0,marginTop:1}}>{r.icon}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:10,fontWeight:700,color:C.deep}}>{r.label}</div>
            <div style={{fontSize:9.5,color:C.muted,lineHeight:1.4}}>{r.finding}</div>
          </div>
          <div style={{fontSize:9,fontWeight:700,color:r.sc,flexShrink:0,marginTop:2}}>{r.status}</div>
        </div>)}
        <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:9,color:C.muted}}>3 mandatory · 1 upgrade · 1 OK</div>
          <div style={{fontSize:9,fontWeight:700,color:C.gold}}>~€15,700 mandatory works</div>
        </div>
      </div>}
    </div>}

    {uploadState==="idle" && <div onClick={onUpload} style={{border:`2px dashed ${C.border}`,borderRadius:10,background:C.pale,padding:"24px 16px",textAlign:"center",cursor:"pointer",marginBottom:10}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.bright} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
      <div style={{fontSize:36,marginBottom:8}}>📎</div>
      <div style={{fontWeight:600,fontSize:13,color:C.deep,marginBottom:4}}>Attach documentation</div>
      <div style={{fontSize:11,color:C.muted,marginBottom:14}}>PDF, Excel · Annual accounts, ITE/IEE, Energy certificate</div>
      <div style={{display:"inline-flex",alignItems:"center",gap:7,background:C.deep,color:"#fff",fontSize:11,fontWeight:600,padding:"8px 20px",borderRadius:100}}>📊 Demo: load cuentas_comunidad_2023.xlsx</div>
    </div>}

    {uploadState==="uploading" && <div style={{border:`1.5px solid ${C.border}`,borderRadius:10,background:C.pale,padding:18,textAlign:"center",marginBottom:10}}>
      <div style={{fontSize:12,color:C.muted,marginBottom:10}}>Uploading file…</div>
      <div style={{height:6,background:"#ddd",borderRadius:3,overflow:"hidden"}}><div style={{width:"45%",height:"100%",background:C.bright}}/></div>
    </div>}

    {(uploadState==="analyzing"||uploadState==="done") && <>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:9,border:`1px solid ${C.border}`,background:C.white,marginBottom:8}}>
        <div style={{width:32,height:32,borderRadius:7,background:"#dff2e7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>📊</div>
        <div style={{flex:1}}><div style={{fontSize:12,fontWeight:500,color:C.text}}>cuentas_comunidad_2023.xlsx</div><div style={{fontSize:10,color:C.muted}}>28 KB · Ejercicio 2023</div></div>
        <div style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:100,background:uploadState==="analyzing"?C.goldL:C.pale,color:uploadState==="analyzing"?C.gold:C.mid,border:`1px solid ${uploadState==="analyzing"?C.goldB:C.border}`}}>{uploadState==="analyzing"?"⏳ Analysing…":"✓ Analysed"}</div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:9,border:`1.5px solid ${uploadState==="done"?C.bright:C.border}`,background:uploadState==="done"?"#edfdf5":C.pale,marginBottom:8,transition:"all .5s"}}>
        <div style={{width:32,height:32,borderRadius:7,background:uploadState==="done"?"#0066cc15":"#eee",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
          {uploadState==="done"?"🏦":"⏳"}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:C.muted,marginBottom:1}}>Community bank</div>
          {uploadState==="analyzing"
            ? <div style={{fontSize:11,color:C.gold,fontWeight:600}}>Detecting bank from file…</div>
            : <div style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{fontSize:12,fontWeight:700,color:C.deep}}>CaixaBank</div>
                <div style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:100,background:"#0066cc15",color:"#0066cc",border:"1px solid #0066cc30"}}>DETECTED AUTOMATICALLY</div>
              </div>
          }
          {uploadState==="done" && <div style={{fontSize:10,color:C.mid,marginTop:2}}>Current account · IBAN ES76 2100 XXXX XX · Direct debit active</div>}
        </div>
        {uploadState==="done" && <div style={{flexShrink:0,textAlign:"right"}}>
          <div style={{fontSize:9,color:C.bright,fontWeight:700,marginBottom:2}}>✓ ICO partner bank</div>
          <div style={{fontSize:9,color:C.muted}}>Direct ICO Verde processing</div>
        </div>}
      </div>

      <div style={{display:"flex",gap:6,background:C.redL,border:`1px solid #f0b0b0`,borderRadius:8,padding:"9px 12px",fontSize:11,color:C.red,lineHeight:1.5,marginBottom:12}}>
        <span>⚠️</span><span>Pending documents: <strong>Energy Performance Certificate</strong>. IEE uploaded ✓ · The architect can handle the EPC.</span>
      </div>
    </>}

    {uploadState==="analyzing" && <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"22px 20px",textAlign:"center"}}>
      <div style={{width:30,height:30,borderRadius:"50%",border:`3px solid ${C.border}`,borderTopColor:C.bright,animation:"spin .8s linear infinite",margin:"0 auto 12px"}}/>
      <div style={{fontWeight:700,fontSize:15,color:C.deep,marginBottom:5}}>Analysing annual accounts…</div>
      <div style={{fontSize:11,color:C.muted}}>Extracting data · Calculating score · Generating packages</div>
    </div>}

    {uploadState==="done" && <div style={{animation:"fadeIn .5s ease"}}>

      {/* Mandatory repairs — detected from IEE */}
      <div style={{background:"#fffbeb",border:`1.5px solid ${C.goldB}`,borderRadius:12,padding:"12px 14px",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
          <span style={{fontSize:16}}>⚠️</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:12,color:"#92400e"}}>Mandatory repairs detected · ITE 2019</div>
            <div style={{fontSize:10,color:C.gold}}>Required regardless of chosen scenario</div>
          </div>
          <div style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:100,background:C.goldL,border:`1px solid ${C.goldB}`,color:C.gold,flexShrink:0}}>MANDATORY BASE</div>
        </div>
        {[
          {icon:"🏗",item:"Ground floor slab crack repair",base:"Art. 10 Ley 8/2013",coste:"~€8.400",urgency:"URGENT"},
          {icon:"♿",item:"Accessibility ramp installation at entrance",base:"RD 505/2007",coste:"~€4.200",urgency:"MANDATORY"},
          {icon:"🔥",item:"Fire safety system upgrade (hose reels)",base:"CTE DB-SI",coste:"~€3.100",urgency:"MANDATORY"},
        ].map((r,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 0",borderTop:i>0?`1px solid ${C.goldB}20`:"none"}}>
          <span style={{fontSize:14,flexShrink:0,marginTop:1}}>{r.icon}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:10.5,fontWeight:600,color:C.deep}}>{r.item}</div>
            <div style={{fontSize:9,color:C.muted}}>{r.base}</div>
          </div>
          <div style={{flexShrink:0,textAlign:"right"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#92400e"}}>{r.coste}</div>
            <div style={{fontSize:8,fontWeight:700,color:C.gold}}>{r.urgency}</div>
          </div>
        </div>)}
        <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.goldB}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:10,color:C.muted}}>Total mandatory works cost</div>
          <div style={{fontWeight:700,fontSize:13,color:"#92400e"}}>~€15.700 <span style={{fontSize:9,color:C.muted,fontWeight:400}}>included in all scenarios</span></div>
        </div>
      </div>
      <div style={{background:C.white,border:`1.5px solid ${C.border}`,borderRadius:14,overflow:"hidden",marginBottom:12}}>
        <div style={{background:C.pale,borderBottom:`1px solid ${C.border}`,padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:10.5,fontWeight:700,color:C.deep,textTransform:"uppercase",letterSpacing:".5px"}}>🤖 Green Loan Readiness Score</div>
        </div>
        <div style={{padding:"16px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:14}}>
            <div style={{textAlign:"center",flexShrink:0}}>
              <div style={{fontWeight:800,fontSize:52,color:C.mid,lineHeight:1}}>78</div>
              <div style={{fontSize:10,color:C.muted}}>/ 100</div>
            </div>
            <div style={{flex:1}}>
              <div style={{height:10,background:"#e4e4e4",borderRadius:5,overflow:"hidden",marginBottom:6}}><div style={{width:"78%",height:"100%",background:`linear-gradient(90deg,${C.bright},${C.mid})`,borderRadius:5}}/></div>
              <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.pale,border:`1.5px solid ${C.border}`,borderRadius:100,padding:"5px 14px",fontSize:11,fontWeight:600,color:C.mid}}>✓ Good prospects — likely eligible</div>
            </div>
          </div>
          {SCORE_BREAKDOWN.map((r,i)=><ScoreBar key={i} {...r}/>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <button onClick={onNext} style={{padding:"11px",borderRadius:9,background:C.deep,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}>📊 View full analysis →</button>
        <button style={{padding:"11px",borderRadius:9,background:C.white,color:C.muted,border:`1.5px dashed ${C.border}`,fontSize:12,fontWeight:600,cursor:"not-allowed"}}>📅 Request ITE/IEE</button>
      </div>
    </div>}
  </div>;
}

function Step2({onNext}){
  const [expandedScen, setExpandedScen] = useState(null);
  return <div>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:C.mid,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:13}}>2</div>
      <div style={{fontWeight:700,fontSize:15,color:C.deep}}>Analysis financiero completo <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:100,background:`${C.mid}25`,border:`1px solid ${C.mid}60`,color:C.mid,marginLeft:4}}>IA AUTOMÁTICO</span></div>
    </div>
    <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:14}}>
      <div style={{background:C.pale,borderBottom:`1px solid ${C.border}`,padding:"10px 16px",fontSize:11,fontWeight:700,color:C.deep,textTransform:"uppercase"}}>📊 Datos financieros — Ejercicio 2023</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
        {[["Annual income","€67.695"],["Annual expenses","€29.577"],["Surplus","€38.118"],["Reserve fund","€31.375 ✓"],["Bank debt","None ✓"],["Pending levies","€1.200",true],["Monthly fee","€200/mes"],["Owners current","22 of 24 ✓"]].map(([l,v,w],i)=><div key={i} style={{padding:"11px 16px",borderBottom:`1px solid ${C.border}`,borderRight:i%2===0?`1px solid ${C.border}`:"none"}}>
          <div style={{fontSize:10.5,color:C.muted,marginBottom:2}}>{l}</div>
          <div style={{fontWeight:700,fontSize:15,color:w?C.gold:C.mid}}>{v}</div>
        </div>)}
      </div>
    </div>
    <div style={{background:C.pale,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 16px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
        <span style={{fontSize:14}}>🤖</span>
        <div style={{fontWeight:700,fontSize:12,color:C.deep}}>Archetype Analysis · AI</div>
        <div style={{marginLeft:"auto",fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:100,background:`${C.mid}20`,border:`1px solid ${C.mid}50`,color:C.mid}}>BALMES 42 · 1978 · EPC E</div>
      </div>
      <div style={{fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:12}}>
        Pre-1980 Mediterranean multifamily building with uninsulated facade and original windows. Profile matches <strong style={{color:C.deep}}>arquetipo B3-Med</strong> — high envelope heat loss. Three subsidy-eligible scenarios based on investment capacity:
      </div>
      {[
        {id:"A", icon:"🪟", label:"Scenario A — Windows", tag:"Entry level", desc:"Window replacement with triple glazing. Improves comfort and reduces infiltration.", epc:"E → C", saving:"−22%", net:"−€9/apt/mo", netC:C.gold, sub:"49% subsidised", warn:true, warnTxt:"Cost exceeds savings — not recommended without additional works",
          details:{
            obras:["PVC triple glazing windows — 24 unidades","Sellado perimetral y rotura de puente térmico","Eliminación carpintería original (aluminio sin RPT)"],
            financiero:[["Gross cost","€38.600"],["Plan Estatal 49%","−€18.900"],["Generalitat","−€0 (no elegible aislamiento)"],["Net community cost","~€19.700"],["Contribution per unit","€821 (una vez)"],["ICO Verde instalment/apt/mo","€30"],["Energy saving/apt/mo","€21"],["Net balance","−€9/apt/mo ⚠"]],
            plazo:"8–10 semanas · Sin obras en zonas comunes",
            riesgo:"Bajo impacto sin intervención en fachada. Pérdidas por puente térmico persisten. Solo recomendado si la comunidad no puede acometer fachada.",
          }
        },
        {id:"B", icon:"🧱", label:"Scenario B — Windows + SATE Facade", tag:"⭐ Optimal", desc:"External facade insulation + windows. Maximum subsidy available, positive return from day 1.", epc:"E → B", saving:"−48%", net:"+€117/apt/mes", netC:C.bright, sub:"80% subsidised",
          details:{
            obras:["PVC triple glazing windows — 24 unidades","Sistema SATE fachada principal + posterior (1.840 m²)","Aislamiento cubierta plana (EPS 10cm)","Window sill and drip ledge renewal"],
            financiero:[["Gross cost","€98.000"],["Plan Estatal 60%","−€58.800"],["Generalitat +40%","−€30.000"],["Net community cost","~€9.200"],["Contribution per unit","€383 (una vez)"],["ICO Verde instalment/apt/mo","€85"],["Energy saving/apt/mo","€202"],["Net balance","+€117/apt/mes ✅"]],
            plazo:"14–18 semanas · Andamiaje en fachada 10 semanas",
            riesgo:"Riesgo bajo. Obras en exterior — mínima afectación a vecinos. Subvención máxima garantizada con perfil actual.",
          }
        },
        {id:"C", icon:"☀️", label:"Scenario C — Full Retrofit + Solar", tag:"Maximum impact", desc:"B + heat pump + 15kWp photovoltaic. Higher long-term savings, higher upfront contribution.", epc:"E → A", saving:"−65%", net:"+€133/apt/mes", netC:C.bright, sub:"69% subsidised",
          details:{
            obras:["Todo lo incluido en Escenario B","Instalación fotovoltaica 15kWp en cubierta","Centralised heat pump (sustitución caldera gas)","Contadores individuales de energía renovable"],
            financiero:[["Gross cost","€148.000"],["Plan Estatal 60%","−€72.000 (límite)"],["Generalitat +40%","−€30.000"],["Net community cost","~€46.000"],["Contribution per unit","€1.917 (una vez)"],["ICO Verde instalment/apt/mo","€93"],["Energy saving/apt/mo","€226"],["Net balance","+€133/apt/mes ✅"]],
            plazo:"20–24 semanas · Requiere licencia solar municipal",
            riesgo:"Higher upfront contribution. Requires reinforced majority (3/5) for photovoltaic installation. Higher return over 10 years.",
          }
        },
      ].map(s=>{
        const open = expandedScen===s.id;
        return <div key={s.id} style={{background:C.white,border:`1.5px solid ${open||s.id==="B"?C.bright:C.border}`,borderRadius:10,marginBottom:8,transition:"border-color .2s"}}>
          {/* Header row — always visible, clickable */}
          <div onClick={()=>setExpandedScen(open?null:s.id)} style={{padding:"11px 14px",cursor:"pointer",display:"flex",alignItems:"flex-start",gap:10}}>
            <span style={{fontSize:22,flexShrink:0,marginTop:1}}>{s.icon}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                <div style={{fontWeight:700,fontSize:12,color:C.deep}}>{s.label}</div>
                {s.tag && <div style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:100,background:s.id==="B"?C.bright:C.pale,color:s.id==="B"?"#fff":C.muted,border:`1px solid ${s.id==="B"?C.bright:C.border}`,whiteSpace:"nowrap",flexShrink:0}}>{s.tag}</div>}
              </div>
              <div style={{fontSize:10.5,color:C.muted,lineHeight:1.5,marginBottom:6}}>{s.desc}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <span style={{fontSize:10,background:C.pale,border:`1px solid ${C.border}`,borderRadius:100,padding:"2px 8px",color:C.mid,fontWeight:600}}>EPC {s.epc}</span>
                <span style={{fontSize:10,background:C.pale,border:`1px solid ${C.border}`,borderRadius:100,padding:"2px 8px",color:C.mid,fontWeight:600}}>Consumo {s.saving}</span>
                <span style={{fontSize:10,background:C.pale,border:`1px solid ${C.border}`,borderRadius:100,padding:"2px 8px",color:C.muted,fontWeight:600}}>{s.sub}</span>
              </div>
              {s.warn && <div style={{marginTop:6,fontSize:10,color:C.gold,display:"flex",gap:5,alignItems:"center"}}><span>⚠️</span>{s.warnTxt}</div>}
            </div>
            <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,marginLeft:10}}>
              <span style={{fontSize:13,fontWeight:800,color:s.netC,whiteSpace:"nowrap"}}>{s.net}</span>
              <span style={{fontSize:13,color:C.muted,transition:"transform .2s",transform:open?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
            </div>
          </div>
          {/* Expanded detail panel */}
          {open && <div style={{borderTop:`1px solid ${C.border}`,padding:"12px 14px",background:"#f8fdfb",animation:"fadeIn .2s ease"}}>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:700,color:C.deep,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>🔧 Works included</div>
              {s.details.obras.map((o,i)=><div key={i} style={{fontSize:10.5,color:C.muted,marginBottom:3,display:"flex",gap:6}}><span style={{color:C.bright,flexShrink:0}}>✓</span>{o}</div>)}
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:700,color:C.deep,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>💶 Financial breakdown</div>
              <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
                {s.details.financiero.map(([l,v],i)=>{
                  const isLast=i===s.details.financiero.length-1;
                  return <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 10px",borderBottom:isLast?"none":`1px solid ${C.border}`,background:isLast?C.pale:"transparent"}}>
                    <span style={{fontSize:10.5,color:isLast?C.deep:C.muted,fontWeight:isLast?700:400}}>{l}</span>
                    <span style={{fontSize:10.5,fontWeight:700,color:isLast?(v.includes("−")||v.includes("⚠")?C.gold:C.bright):v.startsWith("−")?C.mid:C.muted}}>{v}</span>
                  </div>;
                })}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px"}}>
                <div style={{fontSize:9,fontWeight:700,color:C.deep,textTransform:"uppercase",marginBottom:3}}>⏱ Timeline</div>
                <div style={{fontSize:10.5,color:C.muted,lineHeight:1.4}}>{s.details.plazo}</div>
              </div>
              <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px"}}>
                <div style={{fontSize:9,fontWeight:700,color:C.deep,textTransform:"uppercase",marginBottom:3}}>⚡ Considerations</div>
                <div style={{fontSize:10.5,color:C.muted,lineHeight:1.4}}>{s.details.riesgo}</div>
              </div>
            </div>
          </div>}
        </div>;
      })}
    </div>
    <button onClick={onNext} style={{width:"100%",padding:"13px",borderRadius:9,background:C.deep,color:"#fff",border:"none",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>🏛 Request quotes for all 3 scenarios →</button>
  </div>;
}

function Step3({onNext}){
  const [booked,setBooked]=useState(false);
  const [propState,setPropState]=useState("idle"); // idle | uploading | parsing | done
  const PROPOSALS=[
    {name:"Presupuesto_BuildGreen_BCN.pdf",firm:"BuildGreen BCN",size:"312 KB",stars:"⭐⭐⭐⭐⭐",price:"€94.800",warranty:"10 years",note:"✓ Full SATE · Extended warranty",delay:1200},
    {name:"Presupuesto_ArqRehab_Barcelona.pdf",firm:"ArqRehab Barcelona",size:"287 KB",stars:"⭐⭐⭐⭐",price:"€98.200",warranty:"7 years",note:"✓ Passivhaus · Timeline +3 weeks",delay:2000},
    {name:"Presupuesto_EmpresaVidal.pdf",firm:"Empresa Vidal Obras",size:"198 KB",stars:"⭐⭐⭐",price:"€89.500",warranty:"5 years",note:"⚠ SATE non-compliant · 40% upfront",warn:true,delay:2700},
  ];
  const [parsed,setParsed]=useState([]);

  function handleUploadProposals(){
    if(propState!=="idle") return;
    setPropState("uploading");
    setTimeout(()=>setPropState("parsing"),800);
    PROPOSALS.forEach(p=>{
      setTimeout(()=>{
        setParsed(prev=>[...prev,p]);
      }, p.delay);
    });
    setTimeout(()=>setPropState("done"),3200);
  }

  return <div>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:C.mid,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:13}}>3</div>
      <div style={{fontWeight:700,fontSize:15,color:C.deep}}>Technical validation <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:100,background:`${C.gold}25`,border:`1px solid ${C.gold}60`,color:C.gold,marginLeft:4}}>HUMAN STEP</span></div>
    </div>

    {/* Architect booking */}
    {!booked ? <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"20px 16px"}}>
      <div style={{textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:32,marginBottom:8}}>🏛</div>
        <div style={{fontWeight:700,fontSize:16,color:C.deep,marginBottom:4}}>Book technical visits</div>
        <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>Each firm will conduct an independent visit to certify scope and deliver a quote under the same technical specification.</div>
      </div>
      {[
        {firm:"BuildGreen BCN",icon:"🧱",status:"✓ Spec compliant",slots:["Mon 9 Jun, 10:00","Tue 10 Jun, 10:00","Thu 12 Jun, 10:00 ✓"],confirm:2},
        {firm:"ArqRehab Barcelona",icon:"🏗",status:"✓ Spec compliant",slots:["Tue 10 Jun, 11:00","Wed 11 Jun, 09:00","Thu 12 Jun, 12:00 ✓"],confirm:2},
        {firm:"Empresa Vidal Obras",icon:"⚠️",status:"⚠ Review SATE spec",warn:true,slots:["Mon 9 Jun, 16:00","Wed 11 Jun, 16:00","Fri 13 Jun, 10:00 ✓"],confirm:2},
      ].map((f,fi)=><div key={fi} style={{border:`1.5px solid ${f.warn?C.goldB:C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:8,background:f.warn?C.goldL:C.white}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{fontSize:18}}>{f.icon}</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:12,color:C.deep}}>{f.firm}</div>
            <div style={{fontSize:10,color:f.warn?C.gold:C.muted}}>{f.status}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {f.slots.map((slot,si)=><button key={si}
            style={{padding:"6px 12px",borderRadius:7,border:`1.5px solid ${si===f.confirm?C.bright:C.border}`,background:si===f.confirm?C.pale:C.white,color:si===f.confirm?C.mid:C.muted,fontSize:10,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{slot}</button>)}
        </div>
      </div>)}
      <button onClick={()=>setBooked(true)} style={{width:"100%",marginTop:4,padding:"12px",borderRadius:9,background:C.deep,color:"#fff",border:"none",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>📅 Confirm 3 visits →</button>
    </div> :

    /* Proposal upload & parsing */
    <div style={{animation:"fadeIn .4s ease"}}>
      <div style={{marginBottom:14}}>
        {[
          {firm:"BuildGreen BCN",date:"Thu 12 Jun, 10:00"},
          {firm:"ArqRehab Barcelona",date:"Thu 12 Jun, 12:00"},
          {firm:"Empresa Vidal Obras",date:"Fri 13 Jun, 10:00"},
        ].map((v,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:C.pale,border:`1px solid ${C.border}`,borderRadius:9,marginBottom:6}}>
          <span style={{fontSize:18}}>✅</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:12,color:C.deep}}>{v.firm}</div>
            <div style={{fontSize:10,color:C.muted}}>Visit confirmed · {v.date}</div>
          </div>
          <div style={{fontSize:9,fontWeight:700,color:C.mid,background:C.white,border:`1px solid ${C.border}`,padding:"2px 8px",borderRadius:100}}>CONFIRMED</div>
        </div>)}
      </div>

      {/* Upload proposals area */}
      {propState==="idle" && <div onClick={handleUploadProposals} style={{border:`2px dashed ${C.border}`,borderRadius:10,background:C.pale,padding:"22px 16px",textAlign:"center",cursor:"pointer",marginBottom:12}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.bright} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
        <div style={{fontSize:32,marginBottom:8}}>📨</div>
        <div style={{fontWeight:600,fontSize:13,color:C.deep,marginBottom:4}}>Upload received quotes</div>
        <div style={{fontSize:11,color:C.muted,marginBottom:14}}>PDF · The architect sent 3 quotes by email</div>
        <div style={{display:"inline-flex",alignItems:"center",gap:7,background:C.deep,color:"#fff",fontSize:11,fontWeight:600,padding:"8px 20px",borderRadius:100}}>📎 Demo: load 3 PDF quotes</div>
      </div>}

      {(propState==="uploading"||propState==="parsing"||propState==="done") && <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <span style={{fontSize:13}}>🤖</span>
          <div style={{fontWeight:700,fontSize:12,color:C.deep}}>Analysing quotes…</div>
          {propState==="done" && <div style={{marginLeft:"auto",fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:100,background:C.pale,border:`1px solid ${C.border}`,color:C.mid}}>3/3 PROCESSED</div>}
          {propState==="parsing" && <div style={{marginLeft:"auto",fontSize:9,color:C.gold,fontWeight:600}}>{parsed.length}/3 processed…</div>}
        </div>

        {PROPOSALS.map((p,i)=>{
          const isParsed=parsed.find(x=>x.name===p.name);
          const isLoading=propState==="parsing"&&!isParsed&&parsed.length===i;
          return <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,border:`1px solid ${isParsed?(p.warn?C.goldB:C.border):C.border}`,background:isParsed?(p.warn?C.goldL:"#f8fdfb"):C.pale,marginBottom:6,transition:"all .4s",animation:isParsed?"fadeIn .3s ease":"none"}}>
            <div style={{width:28,height:28,borderRadius:6,background:isParsed?(p.warn?"#fef3e2":"#dff2e7"):"#eee",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
              {isParsed?(p.warn?"⚠️":"📄"):(isLoading?<span style={{width:12,height:12,borderRadius:"50%",border:`2px solid ${C.border}`,borderTopColor:C.bright,animation:"spin .7s linear infinite",display:"inline-block"}}/>:"📄")}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:600,color:C.deep,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
              <div style={{fontSize:10,color:C.muted}}>{p.size}{isParsed?` · Empresa: ${p.firm}`:""}</div>
            </div>
            {isParsed && <div style={{flexShrink:0,textAlign:"right"}}>
              <div style={{fontWeight:700,fontSize:13,color:p.warn?C.gold:C.deep}}>{p.price}</div>
              <div style={{fontSize:9,color:C.muted}}>Warranty {p.warranty}</div>
            </div>}
            {!isParsed && !isLoading && <div style={{fontSize:10,color:C.muted}}>En cola…</div>}
          </div>;
        })}
      </div>}

      {/* AI comparison table — only after all parsed */}
      {propState==="done" && <div style={{background:C.pale,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:12,animation:"fadeIn .5s ease"}}>
        <div style={{fontSize:10,fontWeight:700,color:C.deep,textTransform:"uppercase",letterSpacing:".4px",marginBottom:10}}>🤖 Analysis comparativo · IA</div>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden",marginBottom:8}}>
          {[["",          "BuildGreen BCN",   "ArqRehab BCN",  "Empresa Vidal"],
            ["Precio",    "€94.800 ✅",        "€98.200",       "€89.500"],
            ["Spec SATE", "✅ Compliant",        "✅ Compliant",    "⚠️ Non-compliant"],
            ["Warranty",  "10 years ✅",         "7 years",        "5 years"],
            ["Anticipo",  "30%",               "25%",           "40% ⚠️"],
            ["Timeline",     "14 sem",            "17 sem",        "12 sem"],
          ].map(([l,...vals],i)=><div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1.2fr 1.2fr 1.2fr",borderBottom:i===5?"none":`1px solid ${C.border}`,background:i===0?C.pale:"transparent"}}>
            <div style={{padding:"6px 10px",fontSize:10,fontWeight:i===0?700:400,color:i===0?C.deep:C.muted,borderRight:`1px solid ${C.border}`}}>{l}</div>
            {vals.map((v,j)=><div key={j} style={{padding:"6px 10px",fontSize:10,fontWeight:i===0?700:400,color:i===0?C.deep:v.includes("✅")?"#1a7a5e":v.includes("⚠")?"#d4890a":C.muted,borderRight:j<2?`1px solid ${C.border}`:"none",background:i===0&&j===0?"#edfdf5":"transparent"}}>{v}</div>)}
          </div>)}
        </div>
        <div style={{fontSize:10.5,color:C.mid,lineHeight:1.5}}>
          <strong>Recomendación:</strong> BuildGreen BCN — mejor relación calidad/precio con spec completa y garantía extendida. Empresa Vidal descartada por SATE no conforme.
        </div>
      </div>}

      {propState==="done" && <button onClick={onNext} style={{width:"100%",padding:"12px",borderRadius:9,background:C.deep,color:"#fff",border:"none",fontSize:12.5,fontWeight:600,cursor:"pointer",animation:"fadeIn .5s ease"}}>💶 Generate financing proposal →</button>}
    </div>}
  </div>;
}

function Step4({onNext}){
  const [pScen,setPScen]=useState(null);
  const [pFirm,setPFirm]=useState(null);
  const sVotes=SCENARIOS.reduce((a,s)=>({...a,[s.id]:s.votes0+(pScen===s.id?1:0)}),{});
  const fVotes=FIRMS.reduce((a,f)=>({...a,[f.id]:f.votes0+(pFirm===f.id?1:0)}),{});
  const canConfirm=pScen&&pFirm;

  const MANDATORY_WORKS=[
    {icon:"🏗",label:"Slab crack repair"},
    {icon:"♿",label:"Entrance accessibility ramp"},
    {icon:"🔥",label:"Fire safety upgrade"},
  ];

  const SCEN_SIMPLE=[
    {id:"A",icon:"🪟",label:"Windows Only",tag:null,
     coste:"€38.600",subPct:49,subEur:"€18.900",loanEur:"€12.100",commEur:"€7.600",
     cuota:30,ahorro:21,net:-9,netPos:false,aportacion:"€821",epc:"E→C",
     works:[
       {group:"Mandatory works (ITE)",color:C.gold,items:["Slab crack repair","Entrance accessibility ramp","Fire safety upgrade"]},
       {group:"Energy upgrade",color:C.mid,items:["PVC triple glazing windows — 24 units","Perimeter sealing and thermal bridge break"]},
     ]},
    {id:"B",icon:"🧱",label:"Windows + Facade",tag:"⭐ Recommended",
     coste:"€98.000",subPct:80,subEur:"€88.800",loanEur:"€25.200",commEur:"€9.200",
     cuota:85,ahorro:202,net:117,netPos:true,aportacion:"€383",epc:"E→B",
     works:[
       {group:"Mandatory works (ITE)",color:C.gold,items:["Slab crack repair","Entrance accessibility ramp","Fire safety upgrade"]},
       {group:"Energy upgrade",color:C.mid,items:["PVC triple glazing windows","SATE facade insulation (1,840 m²)","Flat roof insulation EPS 10cm","Window sill and drip ledge renewal"]},
     ]},
    {id:"C",icon:"☀️",label:"Full Retrofit + Solar",tag:"Maximum savings",
     coste:"€148.000",subPct:69,subEur:"€102.000",loanEur:"€54.500",commEur:"€46.000",
     cuota:93,ahorro:226,net:133,netPos:true,aportacion:"€1.917",epc:"E→A",
     works:[
       {group:"Mandatory works (ITE)",color:C.gold,items:["Slab crack repair","Entrance accessibility ramp","Fire safety upgrade"]},
       {group:"Energy upgrade",color:C.mid,items:["PVC triple glazing windows","SATE facade insulation (1,840 m²)","Flat roof insulation EPS 10cm"]},
       {group:"Installations",color:C.teal,items:["Centralised heat pump","15kWp rooftop photovoltaic","Renewable energy meters"]},
     ]},
  ];

  return <div>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:C.mid,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:13}}>4</div>
      <div style={{fontWeight:700,fontSize:15,color:C.deep}}>Financial Proposals <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:100,background:`${C.purple}20`,border:`1px solid ${C.purple}50`,color:C.purple,marginLeft:4}}>VOTACIÓN</span></div>
    </div>

    {/* Subsidy banner — light bg for visibility */}
    <div style={{background:C.white,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{fontSize:10,fontWeight:700,color:C.deep,textTransform:"uppercase",letterSpacing:".5px"}}>🏛 Available subsidies · Balmes 42</div>
        <div style={{display:"flex",alignItems:"center",gap:6,background:"#0d1f2d",borderRadius:100,padding:"4px 12px"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:C.bright,animation:"pulse 2s ease-in-out infinite",flexShrink:0}}/>
          <span style={{fontSize:10,color:"rgba(255,255,255,.7)",fontWeight:600}}>Euribor 12M</span>
          <span style={{fontSize:13,fontWeight:800,color:"#fff"}}>2.89%</span>
          <span style={{fontSize:10,color:C.bright,fontWeight:700}}>→ 3.09%</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[
          {name:"Plan Estatal 2026–2030",pct:"60%",max:"hasta €72.000",bg:"#edfdf5",border:C.bright,pctColor:C.mid,icon:"🏛"},
          {name:"Generalitat Catalunya",pct:"+40%",max:"hasta €30.000",bg:"#e0f4f4",border:C.teal,pctColor:C.teal,icon:"🏴"},
          {name:"ICO Verde · CaixaBank",pct:"3.09%",max:"Euribor + 0.20%",bg:"#ede8f8",border:"#7c5cbf",pctColor:"#7c5cbf",icon:"🏦"},
        ].map((s,i)=><div key={i} style={{background:s.bg,borderRadius:8,padding:"10px 12px",border:`1.5px solid ${s.border}30`}}>
          <div style={{fontSize:14,marginBottom:4}}>{s.icon}</div>
          <div style={{fontSize:20,fontWeight:900,color:s.pctColor,marginBottom:2}}>{s.pct}</div>
          <div style={{fontSize:10,fontWeight:700,color:C.deep,marginBottom:2}}>{s.name}</div>
          <div style={{fontSize:9,color:C.muted}}>{s.max}</div>
        </div>)}
      </div>
    </div>

    {/* Scenario cards */}
    <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>What does it cost me and what do I save each month?</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
      {SCEN_SIMPLE.map(s=>{
        const selected=pScen===s.id;
        return <div key={s.id} onClick={()=>setPScen(s.id)} style={{borderRadius:12,border:`2px solid ${selected?C.bright:s.id==="B"?"#a8dfc8":C.border}`,background:selected?"#edfdf5":C.white,cursor:"pointer",overflow:"hidden",transition:"all .2s",boxShadow:selected?"0 4px 16px rgba(45,184,122,.2)":"none"}}>
          {s.tag && <div style={{background:s.id==="B"?C.bright:"#555",color:"#fff",fontSize:9,fontWeight:700,textAlign:"center",padding:"4px 0",letterSpacing:".3px"}}>{s.tag}</div>}
          <div style={{padding:"10px 10px 8px",textAlign:"center"}}>
            <div style={{fontSize:20,marginBottom:3}}>{s.icon}</div>
            <div style={{fontSize:11,fontWeight:700,color:C.deep,marginBottom:10,lineHeight:1.3}}>{s.label}</div>

            {/* Financing stack */}
            <div style={{background:"#f7f9f8",borderRadius:8,padding:"8px",marginBottom:8,textAlign:"left"}}>
              <div style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".3px",marginBottom:6}}>Total cost: {s.coste}</div>
              {[
                {label:"Subsidies",val:s.subEur,pct:s.subPct,color:C.bright},
                {label:"ICO Loan",val:s.loanEur,pct:100-s.subPct-Math.round((parseInt(s.commEur.replace(/\D/g,""))/parseInt(s.coste.replace(/\D/g,"")))*100),color:"#7c5cbf"},
                {label:"Community",val:s.commEur,pct:Math.round((parseInt(s.commEur.replace(/\D/g,""))/parseInt(s.coste.replace(/\D/g,"")))*100),color:C.gold},
              ].map((r,i)=><div key={i} style={{marginBottom:i<2?5:0}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontSize:9,color:C.muted}}>{r.label}</span>
                  <span style={{fontSize:9,fontWeight:700,color:r.color}}>{r.val}</span>
                </div>
                <div style={{height:4,background:"#e8e8e8",borderRadius:2,overflow:"hidden"}}>
                  <div style={{width:`${r.pct}%`,height:"100%",background:r.color,borderRadius:2}}/>
                </div>
              </div>)}
            </div>

            {/* Monthly numbers */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:6}}>
              <div style={{background:"#fff3e8",borderRadius:7,padding:"6px 4px",textAlign:"center",border:"1px solid #f5c97a44"}}>
                <div style={{fontSize:8,color:C.muted,marginBottom:1}}>Instalment/mo</div>
                <div style={{fontSize:18,fontWeight:800,color:C.deep}}>€{s.cuota}</div>
              </div>
              <div style={{background:"#edfdf5",borderRadius:7,padding:"6px 4px",textAlign:"center",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:8,color:C.muted,marginBottom:1}}>Saving/mo</div>
                <div style={{fontSize:18,fontWeight:800,color:C.mid}}>€{s.ahorro}</div>
              </div>
            </div>

            {/* Net balance */}
            <div style={{background:s.netPos?C.bright:C.gold,borderRadius:8,padding:"7px 6px",marginBottom:8}}>
              <div style={{fontSize:8,color:"rgba(255,255,255,.8)",marginBottom:1}}>Net benefit/mo</div>
              <div style={{fontSize:22,fontWeight:900,color:"#fff",lineHeight:1}}>{s.net<0?"−€"+Math.abs(s.net):"+€"+s.net}</div>
              <div style={{fontSize:8,color:"rgba(255,255,255,.7)"}}>per unit · from day 1</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:6}}>
              <div style={{background:C.pale,borderRadius:6,padding:"4px",textAlign:"center"}}>
                <div style={{fontSize:13,fontWeight:800,color:C.mid}}>{s.subPct}%</div>
                <div style={{fontSize:8,color:C.muted}}>subsidised</div>
              </div>
              <div style={{background:C.pale,borderRadius:6,padding:"4px",textAlign:"center"}}>
                <div style={{fontSize:11,fontWeight:800,color:C.deep}}>{s.epc}</div>
                <div style={{fontSize:8,color:C.muted}}>rating</div>
              </div>
            </div>
            <div style={{fontSize:8,color:C.muted,marginBottom:8}}>One-off contribution: <strong style={{color:C.deep}}>{s.aportacion}</strong></div>

            {/* Grouped works */}
            <div style={{textAlign:"left",marginBottom:8}}>
              {s.works.map((g,gi)=><div key={gi} style={{marginBottom:6}}>
                <div style={{fontSize:8,fontWeight:700,color:g.color,textTransform:"uppercase",letterSpacing:".3px",marginBottom:3,display:"flex",alignItems:"center",gap:4}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:g.color,flexShrink:0}}/>
                  {g.group}
                </div>
                {g.items.map((item,ii)=><div key={ii} style={{fontSize:9,color:C.muted,marginBottom:2,paddingLeft:10,display:"flex",gap:4}}>
                  <span style={{color:g.color,flexShrink:0}}>·</span>{item}
                </div>)}
              </div>)}
            </div>

            <div style={{padding:"7px",borderRadius:7,background:selected?C.deep:s.id==="B"?C.bright:C.pale,color:selected||s.id==="B"?"#fff":C.muted,fontSize:10,fontWeight:700,transition:"all .2s"}}>
              {selected?`✓ ${sVotes[s.id]} votos`:`Votar · ${sVotes[s.id]} votos`}
            </div>
          </div>
        </div>;
      })}
    </div>

    {/* Firm selector */}
    <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:".4px"}}>Rehabilitation firm</div>
    <div style={{background:C.white,border:`1.5px solid ${C.border}`,borderRadius:10,overflow:"hidden",marginBottom:14}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
        {FIRMS.map((f,i)=><div key={f.id} style={{padding:"11px 10px",borderRight:i<2?`1px solid ${C.border}`:"none",background:pFirm===f.id?C.pale:f.warn?C.goldL:f.leading?"#f0fff6":C.white}}>
          <div style={{fontSize:11,fontWeight:700,color:f.leading?C.mid:C.text,marginBottom:4}}>{f.name}</div>
          <div style={{fontSize:9,color:f.warn?C.gold:C.muted,marginBottom:6}}>{f.status}</div>
          <div style={{fontWeight:700,fontSize:17,color:C.deep,marginBottom:8}}>{f.price}</div>
          {f.notes.map((n,j)=><div key={j} style={{fontSize:9.5,marginBottom:3,color:C.text}}>{n}</div>)}
          <button onClick={()=>!f.warn&&setPFirm(f.id)} disabled={f.warn}
            style={{width:"100%",marginTop:8,padding:"7px",borderRadius:7,border:`1.5px solid ${pFirm===f.id?C.deep:f.warn?C.goldB:f.leading?C.bright:C.border}`,background:pFirm===f.id?C.deep:f.leading?C.pale:"#fff",color:pFirm===f.id?"#fff":f.warn?C.gold:f.leading?C.mid:C.muted,fontSize:10,fontWeight:700,cursor:f.warn?"not-allowed":"pointer"}}>
            {pFirm===f.id?`✓ Voted · ${fVotes[f.id]}`:f.leading?`${fVotes[f.id]} votes ✓`:"Vote"}
          </button>
        </div>)}
      </div>
      <div style={{padding:"8px 14px",background:C.goldL,borderTop:`1px solid ${C.goldB}`,fontSize:10.5}}>
        <span style={{color:C.gold,fontWeight:700}}>🤖 IA:</span> Empresa Vidal offered double glazing — spec requires triple. BuildGreen BCN and RehabiPro comply.
      </div>
    </div>

    <button onClick={onNext} disabled={!canConfirm} style={{width:"100%",padding:"14px",borderRadius:10,border:"none",background:canConfirm?C.bright:"#c8e8dc",color:"#fff",fontSize:13,fontWeight:700,cursor:canConfirm?"pointer":"not-allowed",transition:"background .2s"}}>
      {canConfirm?`✓ Confirm Scenario ${pScen} · ${FIRMS.find(f=>f.id===pFirm)?.name} →`:"Vote on a scenario and a firm to continue →"}
    </button>
  </div>;
}

function Step5(){
  const [vStep,setVStep]=useState(1);
  const [pkg,setPkg]=useState(null);
  const [cont,setCont]=useState(null);
  const [done,setDone]=useState(false);
  const PKGS=[{id:"A",label:"Paquete A",tag:"Básico",desc:"Ventanas + cumplimiento",saving:"+€42"},
    {id:"B",label:"Paquete B",tag:"⭐ Recommended",desc:"A + fachada SATE",saving:"+€117",rec:true},
    {id:"C",label:"Paquete C",tag:"Completo",desc:"B + paneles solares",saving:"+€156"}];
  const CONTS=[{id:"bg",name:"BuildGreen BCN",price:"€94.800",votes:8,note:"Full spec · ICO Verde"},
    {id:"ar",name:"ArqRehab Barcelona",price:"€98.200",votes:5,note:"Passivhaus · +3 semanas"},
    {id:"ev",name:"Empresa Vidal Obras",price:"€89.500",votes:1,note:"⚠ SATE non-compliant",warn:true}];

  if(done) return <div style={{textAlign:"center",padding:"20px 0",animation:"fadeIn .5s ease"}}>
    <div style={{fontSize:58,marginBottom:14}}>🎉</div>
    <div style={{fontWeight:700,fontSize:26,color:C.deep,marginBottom:8}}>¡Vote completada!</div>
    <div style={{fontSize:13,color:C.muted,marginBottom:22}}>Package B approved · BuildGreen BCN · 9/11 votes</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16,textAlign:"left"}}>
      {[["📄","Meeting minutes","PDF generated"],["📋","Plan Estatal application","Draft ready"],["🏦","ICO Verde application","Sent to CaixaBank"],["📤","Neighbour link","Share summary"]].map(([icon,label,desc],i)=><div key={i} style={{padding:"12px 14px",borderRadius:9,border:`1px solid ${C.border}`,background:C.white,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:22}}>{icon}</span><div><div style={{fontWeight:600,fontSize:12,color:C.deep}}>{label}</div><div style={{fontSize:10.5,color:C.muted}}>{desc}</div></div>
      </div>)}
    </div>
    <div style={{background:C.pale,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"12px 18px",fontSize:12,color:C.muted,fontStyle:"italic"}}>
      🔒 Project financed · Net cost: ~€9,200 · +€117/mo · Subsidy: €88,800
    </div>
  </div>;

  return <div>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:C.mid,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:13}}>5</div>
      <div style={{fontWeight:700,fontSize:15,color:C.deep}}>Community vote <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:100,background:`${C.teal}25`,border:`1px solid ${C.teal}60`,color:C.teal,marginLeft:4}}>AI + COMMUNITY</span></div>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16}}>
      {[{id:1,label:"① Paquete de obras"},{id:2,label:"② Rehabilitation firm"}].map(t=><div key={t.id} onClick={()=>setVStep(t.id)} style={{flex:1,padding:"10px",borderRadius:9,border:`1.5px solid ${vStep===t.id?C.bright:C.border}`,background:vStep===t.id?C.pale:C.white,cursor:"pointer",textAlign:"center",fontSize:12,fontWeight:600,color:vStep===t.id?C.mid:C.muted}}>
        {t.label}{t.id===1&&pkg?" ✓":""}
      </div>)}
    </div>
    {vStep===1 && <div>
      {PKGS.map((p,i)=><div key={i} onClick={()=>setPkg(p.id)} style={{padding:"12px 16px",borderRadius:10,border:`1.5px solid ${pkg===p.id?C.bright:C.border}`,background:pkg===p.id?C.pale:C.white,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",gap:14}}>
        <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:C.deep}}>{p.label} — {p.tag}</div><div style={{fontSize:11,color:C.muted}}>{p.desc} · <span style={{color:C.bright,fontWeight:600}}>{p.saving}/mes</span></div></div>
      </div>)}
      <button onClick={()=>pkg&&setVStep(2)} disabled={!pkg} style={{width:"100%",marginTop:8,padding:"11px",borderRadius:9,background:pkg?C.deep:"#e0e0e0",color:pkg?"#fff":C.muted,border:"none",fontSize:12,fontWeight:600,cursor:pkg?"pointer":"not-allowed"}}>Siguiente: votar empresa →</button>
    </div>}
    {vStep===2 && <div>
      {CONTS.map((c,i)=><div key={i} onClick={()=>!c.warn&&setCont(c.id)} style={{padding:"12px 16px",borderRadius:10,border:`1.5px solid ${cont===c.id?C.bright:c.warn?C.goldB:C.border}`,background:cont===c.id?C.pale:c.warn?C.goldL:C.white,cursor:c.warn?"not-allowed":"pointer",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
        <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:C.deep}}>{c.name}</div><div style={{fontSize:11,color:c.warn?C.gold:C.muted,marginTop:3}}>{c.note} · {c.votes} votos</div></div>
        <div style={{fontWeight:800,fontSize:18,color:C.deep}}>{c.price}</div>
      </div>)}
      <button onClick={()=>cont&&setDone(true)} disabled={!cont} style={{width:"100%",padding:"11px",borderRadius:9,background:cont?C.deep:"#e0e0e0",color:cont?"#fff":C.muted,border:"none",fontSize:12,fontWeight:600,cursor:cont?"pointer":"not-allowed"}}>✅ Confirmar → Exportar acta</button>
    </div>}
  </div>;
}

function App(){
  const [step,setStep]=useState(1);
  const [uploadState,setUploadState]=useState("idle");
  const [msgs,setMsgs]=useState([{role:"assistant",text:"¡Hola! Soy RetroFin AI 👋\n\nEstoy aquí para guiarte en la rehabilitación de Balmes 42.\n\n¿En qué puedo ayudarte hoy?"}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const endRef=useRef(null);

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"})},[msgs,loading]);

  const handleUpload=()=>{
    if(uploadState!=="idle") return;
    setUploadState("uploading");
    setTimeout(()=>setUploadState("analyzing"),700);
    setTimeout(()=>{
      setUploadState("done");
      setMsgs(prev=>[...prev,{role:"assistant",text:"✅ **2023 accounts analysed.**\n\nIncome: €67,695 · Reserve fund: €31,375 ✓ · No debt ✓\n\n**Score: 78/100** 🟢 — Good prospects for the ICO Verde loan."}]);
    },3300);
  };

  const CANNED = [
    {k:["plan estatal","plan nacional","subvenci","ayuda","60%"],r:"**Plan Estatal 2026–2030** cubre el **60% del coste** hasta €72.000 por edificio.\n\nPara Balmes 42 con el Paquete B (€98k), eso supone **€58.800 de subvención directa**. Sin necesidad de devolución — es una subvención a fondo perdido gestionada a través de la Community Autónoma.\n\n✓ Actualmente vigente · Timeline: abierto"},
    {k:["ico verde","ico","banco","préstamo","financiaci","loan"],r:"**ICO Verde** is the Instituto de Crédito Oficial financing line for building energy retrofit.\n\nFor Balmes 42:\n• Interest rate: Euribor 12M (2.89%) + 0.20% = **3.09%**\n• Term: up to 20 years\n• Estimated instalment: **€85/apt/mo**\n• Energy saving: €202/apt/mo\n• **Net benefit from day 1: +€117/apt/mo** ✅\n\nCaixaBank is an ICO partner bank — direct processing from your account."},
    {k:["sate","fachada","aislamiento","exterior"],r:"**SATE** (External Thermal Insulation Composite System) is the facade insulation system included in Package B.\n\nIt consists of insulation panels bonded to the building exterior with a continuous render finish. For Balmes 42:\n• Reduces facade heat loss by **~40%**\n• No impact on interior space\n• Improves EPC rating from E → B\n• Included in BuildGreen BCN and RehabiPro spec ✓\n\n⚠️ Empresa Vidal does not include certified SATE — out of spec."},
    {k:["next step","siguiente","qué hago","cómo empez","proceso","pasos"],r:"Next steps for Balmes 42:\n\n**1. Confirm the community vote** — Package B + BuildGreen BCN ✓\n**2. Generate meeting minutes** — RetroFin prepares these automatically\n**3. Apply for Plan Estatal subsidy** — draft ready to sign\n**4. Open ICO Verde file at CaixaBank** — existing relationship, fast processing\n**5. Contract with BuildGreen BCN** — works start in ~6 weeks\n\nAll paperwork is generated from this platform. Where would you like to start?"},
    {k:["epc","certificado energético","calificaci","eficiencia"],r:"La **rating EPC** (Energy Performance Certificate) mide la eficiencia energética del edificio de A (mejor) a G (peor).\n\nBalmes 42 actualmente está en **E (estimado)**. Con el Paquete B:\n• Ventanas + fachada SATE → **EPC B** ✅\n• Reducción del consumo energético: ~48%\n• Factura energética media: de €420/mes → **€218/mes**\n\nEl certificado actualizado lo emite el arquitecto técnico tras las obras — es requisito para la subvención."},
    {k:["buildgreen","empresa","contratist","rehabilitador","vidal","rehabipro"],r:"Los tres presupuestos recibidos para Paquete B:\n\n✅ **BuildGreen BCN** — €94.800 · Spec completa · Warranty 10 years · 8/10 votos\n✅ **RehabiPro** — €102.500 · Spec completa · Timeline 15–18 semanas\n⚠️ **Empresa Vidal** — €149.800 · Doble acristalamiento (spec requiere triple) · 40% anticipo\n\n**Recomendación: BuildGreen BCN** — mejor precio, spec correcta, empresa con mayor respaldo de la comunidad."},
    {k:["coste","cuánto","precio","€","euro","dinero"],r:"Financial summary of **recommended Package B**:\n\n• Total works cost: **€98,000**\n• Plan Estatal subsidy (60%): **−€58,800**\n• Generalitat Catalunya (+40%): **−€30,000**\n• ICO Verde loan: **€25,200** → €85/apt/mo\n• Community contribution: ~**€600/apt** (one-off)\n\n**Monthly saving: €202/apt · Loan instalment: €85/apt**\n→ **Net benefit: +€117/apt from day 1** ✅"},
  ];

  const sendChat=async(text)=>{
    const msg=(text||input).trim();
    if(!msg||loading) return;
    setInput("");
    setMsgs(prev=>[...prev,{role:"user",text:msg}]);
    setLoading(true);
    const msgLower=msg.toLowerCase();
    const match=CANNED.find(c=>c.k.some(k=>msgLower.includes(k)));
    const reply=match?match.r:"Good question. For Balmes 42, Package B (Windows + SATE Facade) is the recommended option: **€98k total, 80% subsidised, +€117/apt/mo net from day 1**. Would you like me to go deeper on any aspect — subsidies, financing, or the voting process?";
    setTimeout(()=>{
      setMsgs(prev=>[...prev,{role:"assistant",text:reply}]);
      setLoading(false);
    }, 900 + Math.random()*500);
  };

  const SUGG=["What subsidies does the Plan Estatal offer?","How does the ICO Verde work?","What is SATE insulation?","What are the next steps?"];

  return <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:C.bg,height:"100vh",display:"flex",flexDirection:"column"}}>
    {/* HEADER */}
    <div style={{background:C.deep,height:54,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",flexShrink:0,boxShadow:"0 2px 16px rgba(0,0,0,.25)"}}>
      <span style={{fontWeight:700,fontSize:18,color:"#fff"}}>🏢 Retro<em style={{color:C.bright,fontStyle:"normal"}}>Fin</em> <span style={{fontSize:11,fontWeight:300,color:"rgba(255,255,255,.55)"}}>AI</span></span>
      <div style={{display:"flex",alignItems:"center",gap:2}}>
        {WORKFLOW_STEPS.map((s,i)=><div key={s.id} style={{display:"flex",alignItems:"center"}}>
          <button onClick={()=>setStep(s.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:100,border:"none",background:step===s.id?"rgba(45,184,122,.18)":"transparent",color:step===s.id?C.bright:s.id<step?"rgba(255,255,255,.65)":"rgba(255,255,255,.3)",fontSize:11,fontWeight:600,cursor:"pointer",outline:step===s.id?`1.5px solid ${C.bright}`:"none"}}>
            {s.icon} {s.label} {s.id<step?"✓":""}
          </button>
          {i<4&&<div style={{width:14,height:1,background:"rgba(255,255,255,.1)"}}/>}
        </div>)}
      </div>
      <span style={{fontSize:10,color:"rgba(255,255,255,.4)",fontStyle:"italic"}}>Balmes 42 · Barcelona · Demo</span>
    </div>

    {/* BODY */}
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      <div style={{flex:1,overflowY:"auto",padding:"18px 20px 48px"}}>
        {step===1&&<Step1 uploadState={uploadState} onUpload={handleUpload} onNext={()=>setStep(2)}/>}
        {step===2&&<Step2 onNext={()=>setStep(3)}/>}
        {step===3&&<Step3 onNext={()=>setStep(4)}/>}
        {step===4&&<Step4 onNext={()=>setStep(5)}/>}
        {step===5&&<Step5/>}
      </div>

      {/* AI CHAT */}
      <div style={{width:300,background:"#f7fbf9",borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:C.deep,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🤖</div>
          <div><div style={{fontWeight:700,fontSize:13,color:C.deep}}>RetroFin AI Assistant</div><div style={{fontSize:10,color:C.bright}}>● Online · Pregúntame lo que quieras</div></div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"12px",display:"flex",flexDirection:"column",gap:10}}>
          {msgs.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:7}}>
            {m.role==="assistant"&&<div style={{width:20,height:20,borderRadius:"50%",background:C.mid,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0,marginTop:2}}>🤖</div>}
            <div style={{maxWidth:"88%",padding:"8px 11px",borderRadius:m.role==="user"?"10px 2px 10px 10px":"2px 10px 10px 10px",background:m.role==="user"?C.deep:C.white,border:m.role==="user"?"none":`1px solid ${C.border}`,color:m.role==="user"?"#fff":C.text,fontSize:11,lineHeight:1.55,whiteSpace:"pre-wrap"}}>{m.text}</div>
          </div>)}
          {loading&&<div style={{display:"flex",gap:7}}><div style={{width:20,height:20,borderRadius:"50%",background:C.mid,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>🤖</div><div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:"2px 10px 10px 10px",padding:"10px 14px",display:"flex",gap:4}}>{[0,160,320].map(d=><span key={d} style={{width:6,height:6,borderRadius:"50%",background:C.bright,display:"inline-block",animation:`dotBounce 1.2s ease-in-out ${d}ms infinite`}}/>)}</div></div>}
          <div ref={endRef}/>
        </div>
        <div style={{padding:"8px 12px 6px",borderTop:`1px solid ${C.border}`}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {SUGG.map((s,i)=><button key={i} onClick={()=>sendChat(s)} style={{fontSize:10,padding:"4px 9px",borderRadius:100,background:C.pale,border:`1px solid ${C.border}`,color:C.mid,cursor:"pointer",fontWeight:500}}>{s}</button>)}
          </div>
        </div>
        <div style={{padding:"10px 12px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,alignItems:"center"}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),sendChat())}
            placeholder="Ask about the process…"
            style={{flex:1,height:36,borderRadius:100,border:`1.5px solid ${C.border}`,padding:"0 12px",fontSize:11,outline:"none",color:C.text,background:C.white}}/>
          <button onClick={()=>sendChat()} disabled={!input.trim()||loading}
            style={{width:36,height:36,borderRadius:"50%",background:input.trim()&&!loading?C.mid:C.border,border:"none",color:"#fff",fontSize:13,cursor:input.trim()&&!loading?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>➤</button>
        </div>
      </div>
    </div>
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
