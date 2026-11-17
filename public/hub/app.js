(function(){"use strict";
const STILL=/[?&]still=1/.test(location.search);
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const inr=n=>"₹"+Number(n).toLocaleString("en-IN");
let uid=0;
function ballSVG(){const id="bg"+(++uid),N=34,R=44,ga=Math.PI*(3-Math.sqrt(5));let h="";
  for(let i=0;i<N;i++){const r=R*Math.sqrt((i+.6)/N),th=i*ga,x=50+r*Math.cos(th),y=50+r*Math.sin(th),k=Math.max(.28,Math.sqrt(1-(r/48)**2));
    h+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(3.4*k).toFixed(2)}" ry="3.4" transform="rotate(${(th*180/Math.PI).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`}
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="${id}" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="#F6FF9C"/><stop offset=".55" stop-color="#DDF33B"/><stop offset="1" stop-color="#9FB312"/></radialGradient></defs><circle cx="50" cy="50" r="48" fill="url(#${id})"/><g fill="#7E8F0B" opacity=".6">${h}</g></svg>`}
function courtSVG(){return `<svg viewBox="-7 -7 58 34" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%"><rect x="-7" y="-7" width="58" height="34" fill="#15389C"/><rect width="44" height="20" fill="#1F4FD1"/><rect x="15" width="14" height="20" fill="#2C60E6"/><g fill="none" stroke="#fff" stroke-width=".28"><rect width="44" height="20"/><path d="M15 0V20M29 0V20M0 10H15M29 10H44"/></g><path d="M22 -1V21" stroke="#0A0F1E" stroke-width=".5"/></svg>`}

const I={
 home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/></svg>',
 back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
 chev:'<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
 bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
 play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
 cup:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 21h8"/></svg>',
 grid:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14"/><path d="M12 5v14M3 12h18"/></svg>',
 user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
 users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14a5 5 0 0 1 5.5 5"/></svg>',
 cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
 today:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-linecap="round"/></svg>',
 money:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="12"/><circle cx="12" cy="12" r="2.5"/></svg>',
 gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
 shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
 info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
 tick:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
 plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
 undo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
 time:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>',
 court:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14"/><path d="M12 5v14M8 5v14M16 5v14"/></svg>',
 video:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="m10 9 5 3-5 3z" fill="currentColor"/></svg>',
 key:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3"/></svg>',
 whistle:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><circle cx="9" cy="14" r="5"/><path d="M13 11h8v4h-5M9 9V5"/></svg>',
 move:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9h14l-4-4M19 15H5l4 4"/></svg>',
 flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 21V4h11l-2 4 2 4H5"/></svg>',
 wifi:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>'
};

/* data */
const FLX=window.__FLX||{};
const P=FLX.P||{
 as:{n:"Aarav Sen",c:"Salt Lake",pl:41,w:31,ti:2,r:"4.21",g:"M"}, km:{n:"Kabir Mehta",c:"New Town",pl:37,w:26,ti:1,r:"4.08",g:"M"},
 vr:{n:"Vikram Rao",c:"Ballygunge",pl:44,w:33,ti:3,r:"4.35",g:"M"}, an:{n:"Arjun Nair",c:"Behala",pl:39,w:27,ti:2,r:"4.16",g:"M"},
 rk:{n:"Riya Kapoor",c:"Alipore",pl:36,w:28,ti:2,r:"4.02",g:"F"}, ab:{n:"Ananya Bose",c:"Salt Lake",pl:33,w:23,ti:2,r:"3.96",g:"F"},
 ts:{n:"Tanvi Shah",c:"Park Street",pl:30,w:19,ti:0,r:"3.88",g:"F"}, mi:{n:"Meera Iyer",c:"Rajarhat",pl:28,w:17,ti:0,r:"3.81",g:"F"},
 rd:{n:"Rohan Das",c:"Dum Dum",pl:35,w:24,ti:1,r:"3.94",g:"M"}, dm:{n:"Dev Malhotra",c:"Howrah",pl:31,w:20,ti:0,r:"3.90",g:"M"},
 sq:{n:"Sana Qureshi",c:"Park Circus",pl:26,w:15,ti:0,r:"3.62",g:"F"}, ir:{n:"Ishita Roy",c:"Tollygunge",pl:32,w:22,ti:1,r:"3.74",g:"F"},
 nb:{n:"Neel Banerjee",c:"Lake Town",pl:40,w:30,ti:2,r:"4.11",g:"M"}, pg:{n:"Pooja Gupta",c:"Bhowanipore",pl:24,w:13,ti:0,r:"3.55",g:"F"},
 aj:{n:"Aditya Jain",c:"Salt Lake",pl:29,w:18,ti:0,r:"3.70",g:"M"}, kp:{n:"Kavya Pillai",c:"New Town",pl:27,w:16,ti:0,r:"3.66",g:"F"}
};
const last=id=>P[id].n.split(" ").slice(-1)[0];
const pair=ids=>ids.map(last).join(" / ");
function avatar(id,cls){const n=P[id].n.split(" ");const bg=["var(--court)","var(--green)","#111"][id.charCodeAt(0)%3];return `<span class="av ${cls||""}" style="background:${bg}">${n[0][0]}${n[1][0]}</span>`}
const T=FLX.T||[
 {id:"kol26",name:"Kolkata Open",yr:2026,status:"live",d:"30",mo:"SEP",dates:"28 Sep to 1 Oct",day:"Day 3 of 4",venue:"Flexon Arena, Salt Lake",courts:4,entries:96,
  cats:["Men's doubles open","Women's doubles","Mixed doubles 3.5","Men's singles"],fmt:"Groups, then knockout"},
 {id:"diwali",name:"Diwali Doubles Bash",yr:2026,status:"upcoming",reg:true,d:"24",mo:"OCT",dates:"24 to 25 Oct",venue:"Flexon Arena, Salt Lake",courts:4,entries:58,cap:80,closes:"18 Oct",
  cats:["Men's doubles 3.5","Women's doubles 3.5","Mixed doubles open","Mixed doubles 3.0"],fmt:"Groups, then knockout",fee:1400,unit:"per pair"},
 {id:"league1",name:"Flexon Team League",yr:2026,status:"upcoming",reg:true,d:"7",mo:"NOV",dates:"7 to 15 Nov",venue:"Flexon Arena, Salt Lake",courts:4,entries:5,cap:8,closes:"25 Oct",
  cats:["Teams of 8 players"],fmt:"Round robin, then playoffs",fee:9600,unit:"per team"},
 {id:"summer",name:"Summer Slam",yr:2026,status:"done",d:"12",mo:"JUN",dates:"12 to 14 Jun",venue:"Flexon Arena, Salt Lake",courts:4,entries:84,
  cats:["Men's doubles open","Women's doubles","Mixed doubles open","Men's singles"],fmt:"Groups, then knockout",
  champs:[["Men's doubles open","vr","an"],["Women's doubles","rk","ab"],["Mixed doubles open","rd","ir"],["Men's singles","nb"]]},
 {id:"inv25",name:"Flexon Invitational",yr:2025,status:"done",d:"5",mo:"DEC",dates:"5 to 7 Dec 2025",venue:"Flexon Arena, Salt Lake",courts:3,entries:64,
  cats:["Men's doubles open","Women's doubles","Mixed doubles open"],fmt:"Groups, then knockout",
  champs:[["Men's doubles open","as","km"],["Women's doubles","rk","ab"],["Mixed doubles open","vr","ir"]]}
];
const tById=id=>T.find(t=>t.id===id);
const SO={type:"sideout",to:11,bo:3,dbl:true}, RS={type:"rally",to:15,bo:1,dbl:false};
const M=FLX.M||[
 {id:"m101",t:"kol26",cat:"Men's doubles open",stage:"Quarter-final 1",court:1,time:"11:00 AM",status:"live",A:["as","km"],B:["vr","an"],fmt:SO,seed:11,g:1,x:22,bias:.47,ref:"S. Ghosh"},
 {id:"m102",t:"kol26",cat:"Women's doubles",stage:"Quarter-final 2",court:2,time:"11:00 AM",status:"live",A:["rk","ab"],B:["ts","mi"],fmt:SO,seed:5,g:0,x:17,bias:.56,ref:"P. Dutta"},
 {id:"m103",t:"kol26",cat:"Men's singles",stage:"Group B",court:3,time:"11:20 AM",status:"live",A:["rd"],B:["dm"],fmt:RS,seed:21,g:0,x:19,bias:.52,ref:"A. Paul"},
 {id:"m104",t:"kol26",cat:"Mixed doubles 3.5",stage:"Group A",court:4,time:"12:30 PM",status:"upcoming",A:["aj","kp"],B:["sq","pg"],fmt:SO,ref:"R. Sarkar"},
 {id:"m105",t:"kol26",cat:"Men's doubles open",stage:"Quarter-final 3",court:1,time:"1:15 PM",status:"upcoming",A:["nb","dm"],B:["rd","aj"],fmt:SO,ref:"S. Ghosh"},
 {id:"m106",t:"kol26",cat:"Women's doubles",stage:"Quarter-final 4",court:2,time:"1:15 PM",status:"upcoming",A:["ir","sq"],B:["kp","pg"],fmt:SO,ref:"P. Dutta"},
 {id:"m107",t:"kol26",cat:"Men's singles",stage:"Group B",court:3,time:"2:00 PM",status:"upcoming",A:["nb"],B:["aj"],fmt:RS,ref:"A. Paul"},
 {id:"m090",t:"kol26",cat:"Mixed doubles 3.5",stage:"Group A",court:4,time:"10:00 AM",status:"done",A:["rd","ir"],B:["aj","kp"],fmt:SO,games:[[11,7],[11,9]],ref:"R. Sarkar"},
 {id:"m091",t:"kol26",cat:"Men's doubles open",stage:"Quarter-final 2",court:1,time:"9:30 AM",status:"done",A:["vr","nb"],B:["dm","aj"],fmt:SO,games:[[11,4],[9,11],[11,8]],ref:"S. Ghosh"},
 {id:"m092",t:"kol26",cat:"Women's doubles",stage:"Quarter-final 1",court:2,time:"9:30 AM",status:"done",A:["ir","ab"],B:["sq","pg"],fmt:SO,games:[[11,6],[11,3]],ref:"P. Dutta"},
 {id:"m093",t:"kol26",cat:"Men's singles",stage:"Group B",court:3,time:"10:15 AM",status:"done",A:["nb"],B:["rd"],fmt:RS,games:[[15,12]],ref:"A. Paul"}
];
const mById=id=>M.find(m=>m.id===id);
const GROUP=[["Das / Roy",2,2,0,4,11,4],["Jain / Pillai",3,1,2,-1,-3,2],["Qureshi / Gupta",2,1,1,0,2,2],["Malhotra / Bose",3,1,2,-3,-10,2]];

/* scoring engine: each rally is an event; the score is replayed from the log */
function rng(s){return()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296}}
function replay(m){const f=m.fmt,need=Math.ceil(f.bo/2),start=()=>f.type==="sideout"&&f.dbl?2:1;
  let games=[],sc=[0,0],srv=0,num=start(),gw=[0,0],done=false,winner=null,ev=[];
  for(const e of m.log||[]){if(done)break;const w=e.w;let note;
    if(f.type==="rally"){sc[w]++;if(w!==srv){srv=w;num=1;note="Side out, point"}else note="Point"}
    else{if(w===srv){sc[w]++;note="Point"}else if(f.dbl&&num===1){num=2;note="Second server"}else{srv=1-srv;num=1;note="Side out"}}
    if(Math.max(sc[0],sc[1])>=f.to&&Math.abs(sc[0]-sc[1])>=2){const gwn=sc[0]>sc[1]?0:1;games.push([sc[0],sc[1]]);gw[gwn]++;
      ev.push({w,t:e.t,sc:[...sc],srv,num,ge:gwn,gi:games.length});
      if(gw[gwn]>=need){done=true;winner=gwn}else{sc=[0,0];srv=games.length%2;num=start()}}
    else ev.push({w,t:e.t,sc:[...sc],srv,num,note})}
  return {games,sc,srv,num,gw,done,winner,ev}}
function st(m){if(m.status==="done"){const gw=[0,0];m.games.forEach(x=>gw[x[0]>x[1]?0:1]++);return{games:m.games,sc:[0,0],srv:0,num:1,gw,done:true,winner:gw[0]>gw[1]?0:1,ev:[]}}return replay(m)}
M.forEach(m=>{if(m.status!=="live"||m.log)return;const r=rng(m.seed);m.log=[];let t=0,x=m.x;
  for(let i=0;i<600;i++){const s=replay(m);if(s.done){m.log.pop();break}if(s.games.length>=m.g){if(x--<=0)break}m.log.push({w:r()<m.bias?0:1,t:t+=.4+r()*.5})}});
const clock=(m,t)=>{const [h,rest]=m.time.split(":");let H=(+h%12)+(/PM/.test(m.time)?12:0),mm=+rest.slice(0,2)+Math.round(t);H+=Math.floor(mm/60);mm%=60;return `${((H+11)%12)+1}:${String(mm).padStart(2,"0")} ${H>=12?"PM":"AM"}`};
function callOf(m,s){if(s.done)return"Final";const a=s.sc[s.srv],b=s.sc[1-s.srv];return m.fmt.type==="sideout"&&m.fmt.dbl?`${a}–${b}–${s.num}`:`${a}–${b}`}
function serveLine(m,s){if(s.done)return `${pair(s.winner?m.B:m.A)} won ${s.gw[s.winner]}–${s.gw[1-s.winner]}`;
  return `Game ${s.games.length+1}. ${pair(s.srv?m.B:m.A)} serving${m.fmt.type==="sideout"&&m.fmt.dbl?(s.num===2?", second server":", first server"):""}`}
function fmtText(m){return m.fmt.type==="rally"?`${m.fmt.bo===1?"1 game":"Best of "+m.fmt.bo} to ${m.fmt.to}, rally scoring`:`Best of ${m.fmt.bo} games to ${m.fmt.to}, side-out scoring`}

/* shared renderers */
function mrow(m,href){const s=st(m),live=m.status==="live",done=m.status==="done";href=href||`#/match/${m.id}`;
  if(m.status==="upcoming")return `<a class="mrow up" href="${href}" data-m="${m.id}"><div class="mrow-m"><b>Court ${m.court}</b><span>${esc(m.cat)}, ${esc(m.stage)}</span></div><div class="tm"><span class="nm"><span>${esc(pair(m.A))}</span></span><span class="when">${m.time.replace(" ","&nbsp;")}</span></div><div class="tm"><span class="nm"><span>${esc(pair(m.B))}</span></span><span></span></div></a>`;
  const rows=[0,1].map(i=>{const c=[];for(let k=0;k<3;k++){const g=s.games[k];
      if(g)c.push(`<span class="g ${g[i]>g[1-i]?"won":""}">${g[i]}</span>`);else if(live&&k===s.games.length)c.push(`<span class="g cur">${s.sc[i]}</span>`);else c.push(`<span class="g x">0</span>`)}
    return `<div class="tm ${done&&s.winner===i?"w":""}"><span class="nm">${live&&s.srv===i?'<i class="srv"></i>':""}<span>${esc(pair(i?m.B:m.A))}</span></span>${c.join("")}</div>`}).join("");
  return `<a class="mrow" href="${href}" data-m="${m.id}"><div class="mrow-m">${live?'<span class="st">Live</span>':"<b>Result</b>"}<b>Court ${m.court}</b><span>${esc(m.cat)}, ${esc(m.stage)}</span></div>${rows}</a>`}
function scoreboard(m){const s=st(m);
  const side=i=>{const ids=i?m.B:m.A;return `<div class="side"><div><div class="pl"><span class="tcol" style="background:${i?"#fff":"var(--court-3)"}"></span><span>${ids.map(x=>esc(P[x].n)).join("<br>")}</span>${m.status==="live"&&s.srv===i?'<i class="srv" title="Serving"></i>':""}</div>${s.games.length?`<div class="gms">${s.games.map(g=>`<span class="${g[i]>g[1-i]?"w":""}">${g[i]}</span>`).join("")}</div>`:""}</div><div class="big" style="${m.status==="live"?"color:var(--ball)":""}">${m.status==="upcoming"?"–":m.status==="done"?s.gw[i]:s.sc[i]}</div></div>`};
  return `<div class="sb">${side(0)}${side(1)}</div>${m.status==="live"?`<div class="call"><span>${esc(serveLine(m,s))}</span><b>${callOf(m,s)}</b></div>`:m.status==="done"?`<div class="call"><span>${esc(serveLine(m,s))}</span></div>`:""}`}
function standings(rows,cap){return `<div class="tbl"><table><caption class="sr">${cap}</caption><thead><tr><th>${cap}</th><th>P</th><th>W</th><th>L</th><th>Games</th><th>Points</th><th>Pts</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${i<2?"q":""}"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]>0?"+":""}${r[4]}</td><td>${r[5]>0?"+":""}${r[5]}</td><td class="num" style="font-size:18px">${r[6]}</td></tr>`).join("")}</tbody></table></div>`}
function backLink(href,label){return `<a class="back" href="${href}">${I.back}${esc(label)}</a>`}
function seg(items,cur,base){return `<nav class="seg">${items.map(([k,l])=>`<a href="${base}${k}" ${k===cur?'aria-current="page"':""}>${l}</a>`).join("")}</nav>`}
function tabs(items,cur,base){return `<nav class="tabs">${items.map(([k,l])=>`<a href="${base}${k}" ${k===cur?'aria-current="page"':""}>${l}</a>`).join("")}</nav>`}
function row(o){const tg=o.btn?"button":o.href?"a":"div";return `<${tg} ${o.btn?'type="button"':""} class="row" ${o.href?`href="${o.href}"`:""} ${o.act?`data-act="${o.act}"`:""} ${o.data||""}>${o.left||""}<div><div class="t">${o.t}</div>${o.m?`<div class="m">${o.m}</div>`:""}</div><div class="r">${o.right||""}${o.noChev||tg==="div"?"":I.chev}</div></${tg}>`}

/* shell */
const App={views:{},tabOf:{},home:""};
function parse(){const h=location.hash.replace(/^#\/?/,"");const [path,qs]=h.split("?");const q={};(qs||"").split("&").filter(Boolean).forEach(p=>{const [k,v]=p.split("=");q[k]=decodeURIComponent(v||"")});const parts=(path||"").split("/").filter(Boolean);return{name:parts[0]||App.home,arg:parts[1],q}}
function render(){const r=parse();if($(".scrim"))$("#sheet").innerHTML="";const v=App.views[r.name]||App.views[App.home];
  $("#app").innerHTML=(App.gate&&!App.gate(r))?App.gateView():v(r.q,r.arg);const tab=App.tabOf[r.name]||r.name;
  $$(".tabbar a").forEach(a=>a.dataset.tab===tab?a.setAttribute("aria-current","page"):a.removeAttribute("aria-current"));
  otpWire();App.after&&App.after(r)}
function otpWire(){$$("[data-otp]").forEach((inp,i,all)=>{inp.addEventListener("input",()=>{inp.value=inp.value.replace(/\D/g,"").slice(-1);if(inp.value&&all[i+1])all[i+1].focus()});inp.addEventListener("keydown",e=>{if(e.key==="Backspace"&&!inp.value&&all[i-1])all[i-1].focus()})})}
function otpBoxes(n){return `<div class="otp" style="grid-template-columns:repeat(${n},1fr)">${Array.from({length:n},(_,i)=>`<input inputmode="numeric" maxlength="1" aria-label="Digit ${i+1}" data-otp="${i}">`).join("")}</div>`}
function fillOtp(code){code.split("").forEach((d,i)=>{const x=$$("[data-otp]")[i];if(x)x.value=d})}
function otpFull(){return $$("[data-otp]").every(i=>i.value)}
function toast(msg){const t=$("#toast");t.innerHTML=`<div>${esc(msg)}</div>`;clearTimeout(toast.h);toast.h=setTimeout(()=>t.innerHTML="",2600)}
function sheet(html){$("#sheet").innerHTML=`<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`}
function closeSheet(){$("#sheet").innerHTML=""}
const Acts={close:(a,e)=>{if(e.target===a)closeSheet()},toast:a=>toast(a.dataset.msg),"fill-otp":()=>fillOtp("482913")};
document.addEventListener("click",e=>{const a=e.target.closest("[data-act]");if(!a)return;const f=Acts[a.dataset.act];if(!f)return;if(a.dataset.act==="close"&&e.target!==a)return;e.preventDefault();f(a,e)});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$(".scrim"))closeSheet()});
window.addEventListener("hashchange",()=>{const was=App.lastName;render();const r=parse();if(!(r.name===was&&/(tab|s)=/.test(location.hash)))scrollTo(0,0);App.lastName=r.name;$("#app").focus({preventScroll:true})});
window.FLXApp={App,Acts,M,T,P,render,toast,parse,st,mById:id=>M.find(m=>m.id===id)};
function boot(){$$(".logo i").forEach(el=>el.innerHTML=ballSVG());App.lastName=parse().name;render()}

function courtArt(o){o=o||{};const m=o.m==null?5:o.m,sur=o.sur||"#15389C",play=o.play||"#1F4FD1",kit=o.kit||"#2C60E6",lw=o.lw||.28;
  return `<svg viewBox="${-m} ${-m} ${44+2*m} ${20+2*m}" preserveAspectRatio="${o.par||"xMidYMid slice"}" aria-hidden="true" ${o.abs?'style="position:absolute;inset:0;width:100%;height:100%"':""}><rect x="${-m}" y="${-m}" width="${44+2*m}" height="${20+2*m}" fill="${sur}"/><rect width="44" height="20" fill="${play}"/><rect x="15" width="14" height="20" fill="${kit}"/><g fill="none" stroke="#fff" stroke-width="${lw}"><rect width="44" height="20"/><path d="M15 0V20M29 0V20M0 10H15M29 10H44"/></g><path d="M22 -1.2V21.2" stroke="#0A0F1E" stroke-width="${lw*1.8}" opacity=".85"/></svg>`}
const GREY={sur:"#2A2D2E",play:"#3B3F40",kit:"#484C4D"};
function stripCard(m,href){const s=st(m),live=m.status==="live",done=m.status==="done";
  const rows=[0,1].map(i=>`<div class="sc-t"><span class="nm">${esc(pair(i?m.B:m.A))}${live&&s.srv===i?'<i class="srv"></i>':""}</span><span style="display:flex;gap:6px">${live?s.games.map(g=>`<span class="g">${g[i]}</span>`).join(""):""}</span>${live?`<span class="c">${s.sc[i]}</span>`:done?`<span class="c" style="background:transparent;color:var(--on-slab-2)">${s.gw[i]}</span>`:i?"":`<span class="when">${m.time}</span>`}</div>`).join("");
  return `<a class="sc" href="${href||`#/match/${m.id}`}" data-m="${m.id}" data-k="sc"><div class="sc-h">${live?'<span class="st">Live</span>':done?"<b>Result</b>":"<b>Next</b>"}<span>Court ${m.court}</span><span>${esc(m.cat)}</span></div>${rows}<div class="sc-f">${esc(live||done?serveLine(m,s):m.stage)}</div></a>`}
function tourTile(t,href,foot){const g=t.status==="done"?GREY:{};
  const lbl=t.status==="live"?'<span class="lbl tag" style="background:var(--live);color:#fff">Live now</span>':t.reg?'<span class="lbl tag open">Entries open</span>':t.status==="done"?'<span class="lbl tag">Completed</span>':'<span class="lbl tag">Upcoming</span>';
  return `<a class="tile" href="${href}"><div class="art">${courtArt({...g,m:3,abs:true})}${lbl}<span class="dt">${t.d}<small>${t.mo}</small></span></div><div class="body"><h3>${esc(t.name)} ${t.yr}</h3><div class="meta">${esc(t.dates)}, ${esc(t.venue)}</div>${foot!==undefined?foot:t.reg?`<div class="pbar"><i style="width:${Math.round(t.entries/t.cap*100)}%"></i></div><div class="pbar-l">${t.cap-t.entries} of ${t.cap} places left, closes ${t.closes}</div>`:t.status==="live"?`<div class="pbar-l" style="margin-top:10px">${t.day}, ${t.courts} courts, ${t.entries} entries</div>`:`<div class="pbar-l" style="margin-top:10px">${t.entries} entries, ${t.champs?t.champs.length+" champions":""}</div>`}</div></a>`}
function recCard(t,href){return `<a class="rec" href="${href||`#/t/${t.id}`}"><span class="tag line">${t.mo} ${t.yr}</span><h3>${esc(t.name)}</h3><div class="muted" style="font-size:12.5px">${t.entries} entries</div><ul>${t.champs.slice(0,3).map(c=>`<li><span>${esc(c[0])}</span><b>${esc(pair(c.slice(1)))}</b></li>`).join("")}</ul></a>`}
function pcard(id){const p=P[id];return `<a class="pcard" href="#/p/${id}">${avatar(id)}<b>${esc(p.n)}</b><span>${Math.round(p.w/p.pl*100)}%</span><small>matches won</small></a>`}
function streamBox(m){const s=st(m);return `<button type="button" class="stream" data-act="play" aria-label="Play Court ${m.court} stream">${courtArt({m:7,abs:true})}<span class="rb"></span><span class="yt">Court ${m.court} on YouTube</span><span class="pb">${I.play}</span>${m.status!=="upcoming"?`<span class="bug"><span>${esc(pair(m.A))}</span><b>${s.sc[0]}–${s.sc[1]}</b><span>${esc(pair(m.B))}</span></span>`:""}</button>`}
function crest(name,bg){return `<span class="crest" style="background:${bg}">${name.split(" ").map(w=>w[0]).slice(0,2).join("")}</span>`}

App.home="home";
App.tabOf={match:"matches",t:"sports",enter:"sports",p:"players",tournaments:"sports",pickleball:"sports",formats:"sports",alerts:"home"};
const FM={kol26:["singles","doubles"],diwali:["doubles"],league1:["league"],summer:["singles","doubles"],inv25:["doubles"]};
const followedT={};const alerts=[
 {id:1,unread:1,k:"Schedule change",t:"Quarter-final 3 moved to 3:00 PM, Court 2",m:"Kolkata Open 2026, Men's doubles open",href:"#/match/m105",at:"12:05 PM"},
 {id:2,unread:1,k:"Court change",t:"Group B singles moved to Court 3",m:"Kolkata Open 2026, Men's singles",href:"#/match/m107",at:"11:40 AM"},
 {id:3,unread:0,k:"Entries closing",t:"Diwali Doubles Bash closes on 18 Oct",m:"22 places left",href:"#/t/diwali",at:"Yesterday"}];
const SPORTS=[["Pickleball",1],["Padel",0],["Badminton",0],["Tennis",0],["Table tennis",0],["Squash",0]];
App.views.sports=()=>`<div class="page"><h1 class="title">Sports</h1><p class="sub">Pick a sport to see its tournaments.</p><div class="spg">${SPORTS.map(([n,on])=>on?`<a class="spc on" href="#/pickleball"><span class="spb">${ballSVG()}</span><b>${n}</b><span class="tag open">Live now</span></a>`:`<div class="spc" aria-disabled="true"><span class="spb off"></span><b>${n}</b><span class="tag line">Coming soon</span></div>`).join("")}</div></div>`;
App.views.pickleball=()=>`<div class="page">${backLink("#/sports","Sports")}<h1 class="title">Pickleball</h1><p class="sub">Play in a tournament or practise.</p>
 <a class="bigc" href="#/formats"><div class="art">${courtArt({m:3,abs:true})}</div><div class="bd"><b>Tournaments</b><span>${T.filter(t=>t.status!=="done").length} coming up or live, ${T.filter(t=>t.status==="done").length} past</span></div>${I.chev}</a>
 <div class="bigc off" aria-disabled="true"><div class="art">${courtArt({...GREY,m:3,abs:true})}</div><div class="bd"><b>Practice mode</b><span>Coming soon</span></div></div></div>`;
App.views.formats=()=>`<div class="page">${backLink("#/pickleball","Pickleball")}<h1 class="title">Tournaments</h1><p class="sub">Choose a format.</p>
 ${[["singles","Singles","One player a side"],["doubles","Doubles","Two players a side"],["league","League","Teams play ties across several days"]].map(([f,l,d])=>{const n=T.filter(t=>FM[t.id]&&FM[t.id].includes(f)).length;return `<a class="role" href="#/tournaments?f=${f}"><span class="ri" style="background:${f==="league"?"var(--green)":f==="singles"?"#111":"var(--court)"};font:700 22px/1 var(--display)">${f==="singles"?"1":f==="doubles"?"2":"T"}</span><span><b>${l}</b><small>${d}. ${n} tournament${n===1?"":"s"}</small></span>${I.chev}</a>`}).join("")}
 <p style="margin:6px 0 0"><a class="lnk" href="#/tournaments">See all tournaments</a></p></div>`;
const ADMIN_URL="/admin";
let loginRole=null;
App.views.home=()=>{const live=M.filter(m=>m.status==="live"),next=M.filter(m=>m.status==="upcoming").slice(0,2);
  const top=Object.keys(P).sort((a,b)=>P[b].w/P[b].pl-P[a].w/P[a].pl).slice(0,8);
  return `<section class="hero"><div class="cw">${courtArt({m:4,par:"xMidYMid meet",lw:.22})}</div><div class="ballfly" aria-hidden="true"><i>${ballSVG()}</i><b></b></div>
   <div class="in"><div class="kick"><span class="st">Live</span><span>${T[0].day}, quarter-finals on 4 courts</span></div><h1>Kolkata<br>Open</h1>
   <p>Follow every rally from Flexon Arena, Salt Lake. Scores update the moment the referee taps.</p>
   <div class="cta"><a class="btn img" href="#/matches">Live matches</a><a class="btn ghost" href="#/t/kol26">Tournament page</a></div></div></section>
  <section class="band"><div class="hd"><h2>On court now</h2><a href="#/matches">All matches</a></div><div class="rail">${live.concat(next).map(m=>stripCard(m)).join("")}</div></section>
  <section class="sec"><div class="hd"><h2 class="sh">Tournaments</h2><a href="#/tournaments">See all</a></div><div class="rail">${T.filter(t=>t.status!=="done").sort((a,b)=>(b.reg?1:0)-(a.reg?1:0)).map(t=>tourTile(t,`#/t/${t.id}`)).join("")}</div></section>
  <section class="sec"><div class="hd"><h2 class="sh">Champions</h2><a href="#/tournaments?s=done">Past events</a></div><div class="rail">${T.filter(t=>t.status==="done").map(t=>recCard(t)).join("")}</div></section>
  <section class="sec"><div class="hd"><h2 class="sh">Top players</h2><a href="#/players">All players</a></div><div class="rail">${top.map(pcard).join("")}</div></section>
  <p class="ftr">Organiser, referee or team owner? <a href="#/me">Log in here</a></p>`};
const followed=new Set(); let loggedIn=false; const myEntries=[];
const reg={step:1,cat:null,n:"",p:"",e:""};
let loginMode="phone",loginSent=false;

App.views.matches=(q)=>{const s=q.s||"live";const set={live:M.filter(m=>m.status==="live"),up:M.filter(m=>m.status==="upcoming"),done:M.filter(m=>m.status==="done")}[s];
  return `<div class="page"><h1 class="title">Matches</h1>
  <a class="sub" href="#/t/kol26" style="display:flex;gap:8px;align-items:center"><span class="st">Live</span><span>Kolkata Open 2026, ${T[0].day}</span></a>
  ${seg([["live",`Live (${M.filter(m=>m.status==="live").length})`],["up","Upcoming"],["done","Results"]],s,"#/matches?s=")}
  <div class="list">${set.map(m=>mrow(m)).join("")}</div></div>`};

App.views.match=(q,id)=>{const m=mById(id)||M[0],s=st(m),t=tById(m.t),fol=followed.has(m.id);
  const tab=q.tab||"live";let body="";
  if(m.status==="upcoming")body=`<p class="empty">Starts at ${m.time} on Court ${m.court}. Follow it to get an alert when it begins.</p>`;
  else if(tab==="live"){const last=s.ev.slice(-24),ev=s.ev.slice(-30).reverse();
    body=ev.length?`<div class="mom" aria-label="Last ${last.length} rallies">${last.map(e=>`<i class="${e.w?"b":"a"}"></i>`).join("")}</div>
    <div class="legend"><span><i style="background:var(--court)"></i>${esc(pair(m.A))}</span><span><i style="background:var(--text)"></i>${esc(pair(m.B))}</span><span>Last ${last.length} rallies</span></div>
    <ul class="feed">${ev.map(e=>`<li class="${e.ge!=null?"ge":""}"><span class="s">${e.ge!=null?`${e.sc[0]}–${e.sc[1]}`:(m.fmt.type==="sideout"&&m.fmt.dbl?`${e.sc[e.srv]}–${e.sc[1-e.srv]}–${e.num}`:`${e.sc[e.srv]}–${e.sc[1-e.srv]}`)}</span><span>${e.ge!=null?`<b>Game ${e.gi} to ${esc(pair(e.ge?m.B:m.A))}</b>`:`Rally to ${esc(pair(e.w?m.B:m.A))}. ${e.note}`}</span><span class="t">${clock(m,e.t)}</span></li>`).join("")}</ul>`
    :`<p class="empty">Final result entered by the referee. See the scorecard for game scores.</p>`}
  else if(tab==="card"){const ev=s.ev,sv=[0,0],run=[0,0];let c=-1,l=0;ev.forEach(e=>{if(e.note&&e.note.startsWith("Point"))sv[e.w]++;if(e.w===c)l++;else{c=e.w;l=1}run[e.w]=Math.max(run[e.w],l)});
    const cols=s.games.length+(m.status==="live"?1:0);
    body=`<div class="tbl" style="margin-top:14px"><table><thead><tr><th>Team</th>${Array.from({length:cols},(_,k)=>`<th>Game ${k+1}</th>`).join("")}</tr></thead><tbody>${[0,1].map(i=>`<tr><td>${esc(pair(i?m.B:m.A))}</td>${s.games.map(g=>`<td class="num" style="font-size:18px">${g[i]}</td>`).join("")}${m.status==="live"?`<td class="num" style="font-size:18px"><span style="background:var(--ball);color:#111;padding:0 6px">${s.sc[i]}</span></td>`:""}</tr>`).join("")}</tbody></table></div>
    ${ev.length?`<h2 class="h">Match stats</h2><div class="stats"><div></div><div class="muted" style="font-size:12.5px;text-align:right">${esc(last(m.A[0]))}</div><div class="muted" style="font-size:12.5px;text-align:right">${esc(last(m.B[0]))}</div><div>Points won on serve</div><div class="v">${sv[0]}</div><div class="v">${sv[1]}</div><div>Rallies won</div><div class="v">${ev.filter(e=>e.w===0).length}</div><div class="v">${ev.filter(e=>e.w===1).length}</div><div>Longest run</div><div class="v">${run[0]}</div><div class="v">${run[1]}</div></div>`:""}
    <dl class="kv" style="margin-top:20px"><dt>Format</dt><dd>${fmtText(m)}</dd><dt>Referee</dt><dd>${esc(m.ref)}</dd></dl>`}
  else if(tab==="watch")body=`${streamBox(m)}<p class="muted" style="font-size:13px">Streams live from the court on the Flexon YouTube channel. The score comes from the referee's phone.</p>`;
  return `<section class="slab"><div class="page">${backLink("#/matches","Matches")}
    <div class="meta">${m.status==="live"?'<span class="st">Live</span>':m.status==="done"?"<b>Result</b>":`<b>${m.time}</b>`}<span>Court ${m.court}</span><span>${esc(m.cat)}, ${esc(m.stage)}</span></div>
    ${scoreboard(m)}
    <div class="actions"><button type="button" class="btn sm ${fol?"on":"sec"}" data-act="follow" data-id="${m.id}">${I.bell}${fol?"Following":"Follow"}</button><a class="btn sm sec" href="#/t/${t.id}">${esc(t.name)}</a></div>
    ${m.status!=="upcoming"?tabs([["live","Live"],["card","Scorecard"],["watch","Watch"]],tab,`#/match/${m.id}?tab=`):'<div style="height:16px"></div>'}</div></section>
    <div class="page" style="padding-top:0">${body}</div>`};

App.views.tournaments=(q)=>{const s=q.s||"up",f=q.f||"";const set={up:T.filter(t=>t.status==="upcoming"),live:T.filter(t=>t.status==="live"),done:T.filter(t=>t.status==="done")}[s].filter(t=>!f||(FM[t.id]||[]).includes(f));
  const qs=(k,v)=>`#/tournaments?s=${k==="s"?v:s}${(k==="f"?v:f)?`&f=${k==="f"?v:f}`:""}`;
  return `<div class="page">${backLink("#/formats","Pickleball tournaments")}<h1 class="title">${f?{singles:"Singles",doubles:"Doubles",league:"League"}[f]:"All tournaments"}</h1>
  <div class="chips" style="margin:6px 0 4px">${[["","All"],["singles","Singles"],["doubles","Doubles"],["league","League"]].map(([v,l])=>`<a class="chip" aria-pressed="${v===f}" href="${qs("f",v)}">${l}</a>`).join("")}</div>
  <nav class="seg">${[["up","Upcoming"],["live","Live"],["done","Past"]].map(([k,l])=>`<a href="${qs("s",k)}" ${k===s?'aria-current="page"':""}>${l}</a>`).join("")}</nav>
  <div class="grid two">${set.map(t=>tourTile(t,`#/t/${t.id}`)).join("")||`<p class="empty">No ${s==="done"?"past":s==="live"?"live":"upcoming"} ${f||""} tournaments right now.</p>`}</div></div>`};

App.views.t=(q,id)=>{const t=tById(id)||T[0];const opts=t.status==="upcoming"?[["overview","Overview"],["schedule","Schedule"],["rules","Rules"]]:[["overview","Overview"],["schedule","Schedule"],["table","Standings"],["bracket","Bracket"],["rules","Rules"]];
  const tab=q.tab||"overview";let body="";
  if(tab==="overview"){body=`<dl class="facts"><div><dt>Dates</dt><dd style="font-size:18px">${esc(t.dates)}</dd></div><div><dt>Entries</dt><dd>${t.entries}${t.cap?` <small>of ${t.cap}</small>`:""}</dd></div><div><dt>Courts</dt><dd>${t.courts}</dd></div><div><dt>Format</dt><dd style="font-size:18px">${esc(t.fmt)}</dd></div></dl>`+
    (t.status==="done"?`<h2 class="h">Champions</h2><div class="list">${t.champs.map(c=>row({left:`<span class="ic" style="background:var(--ball);color:#111">${I.cup}</span>`,t:esc(pair(c.slice(1))),m:esc(c[0]),noChev:true,href:`#/p/${c[1]}`})).join("")}</div>`
    :`<h2 class="h">Categories</h2><div class="list">${t.cats.map(c=>`<div class="row" style="grid-template-columns:1fr auto"><div class="t">${esc(c)}</div><div class="m">${t.status==="live"?"In play":t.fee?inr(t.fee)+" "+t.unit:""}</div></div>`).join("")}</div>`)+
    (t.status==="live"?`<p style="margin:18px 0 0"><a class="lnk" href="#/matches">See today's matches</a></p>`:"")}
  if(tab==="schedule")body=t.status==="upcoming"?`<p class="empty">The schedule is published after entries close on ${t.closes}. Follow the tournament to get it the moment it's out.</p>`
   :t.id==="kol26"?`<h2 class="h">Today, 30 Sep</h2><div class="list">${M.filter(m=>m.t===t.id).sort((a,b)=>tmin(a.time)-tmin(b.time)).map(m=>mrow(m)).join("")}</div><h2 class="h">Tomorrow, 1 Oct</h2><div class="list">${[["10:00 AM","Semi-final 1","Court 1"],["10:00 AM","Semi-final 2","Court 2"],["4:00 PM","Final","Court 1"]].map(([a,b,c])=>`<div class="row" style="grid-template-columns:62px 1fr"><span class="num" style="font-size:18px">${a}</span><div><div class="t">Men's doubles open, ${b}</div><div class="m">${c}, players decided today</div></div></div>`).join("")}</div>`
   :`<p class="empty">All ${t.entries} entries played over ${t.dates}. Results are under Standings and Bracket.</p>`;
  if(tab==="table")body=`<div style="margin-top:14px">${standings(GROUP,"Mixed doubles 3.5, Group A")}</div><p class="muted" style="font-size:12.5px">Top 2 go through. Ties split by head to head, then game difference, then point difference.</p>`;
  if(tab==="bracket"){const box=m=>{const s=st(m),lv=m.status==="live";return `<a class="bm" href="#/match/${m.id}" style="${lv?"border-color:var(--live)":""}"><div class="cap">${lv?'<span class="st">Live</span>':m.status==="done"?"Result":m.time}</div>${[0,1].map(i=>`<div class="r ${m.status==="done"&&s.winner===i?"w":""}"><span>${esc(pair(i?m.B:m.A))}</span><b>${m.status==="upcoming"?"":s.games.map(g=>g[i]).concat(lv?[s.sc[i]]:[]).join(" ")}</b></div>`).join("")}</a>`};
    const tbd=(a,b,c)=>`<div class="bm"><div class="cap">${c}</div><div class="r"><span>${a}</span></div><div class="r"><span>${b}</span></div></div>`;
    body=`<div class="brk"><div><h4>Quarter-finals</h4><div class="rnd">${box(mById("m101"))}${box(mById("m091"))}${box(mById("m105"))}${tbd("Mehta / Jain","Banerjee / Roy","2:45 PM")}</div></div><div><h4>Semi-finals</h4><div class="rnd">${tbd("Winner QF1","Rao / Banerjee","Tomorrow, 10:00 AM")}${tbd("Winner QF3","Winner QF4","Tomorrow, 10:00 AM")}</div></div><div><h4>Final</h4><div class="rnd">${tbd("Winner SF1","Winner SF2","Tomorrow, 4:00 PM")}</div></div></div><p class="muted" style="font-size:12.5px">Men's doubles open. Swipe for later rounds.</p>`}
  if(tab==="rules")body=`<dl class="kv" style="margin-top:14px"><dt>Doubles</dt><dd>Best of 3 games to 11, win by 2, side-out scoring</dd><dt>Singles groups</dt><dd>1 game to 15, rally scoring, win by 2</dd><dt>Standings</dt><dd>2 points a win. Ties: head to head, game difference, point difference</dd><dt>Late arrival</dt><dd>Walkover 10 minutes after the call</dd><dt>Paddles</dt><dd>Approved paddles only, checked before play</dd></dl>`;
  return `<div class="tile" style="width:auto"><div class="art" style="height:150px">${courtArt({...(t.status==="done"?GREY:{}),m:3,abs:true})}${t.status==="live"?'<span class="lbl tag" style="background:var(--live);color:#fff">Live now</span>':t.reg?'<span class="lbl tag open">Entries open</span>':t.status==="done"?'<span class="lbl tag">Completed</span>':""}<span class="dt">${t.d}<small>${t.mo}</small></span></div></div><div class="page">${backLink("#/tournaments"+(t.status==="done"?"?s=done":t.status==="live"?"?s=live":""),"Tournaments")}<h1 class="title">${esc(t.name)} ${t.yr}</h1><p class="sub" style="margin-bottom:10px">${esc(t.dates)}, ${esc(t.venue)}</p>
   ${t.reg?`<a class="btn full" href="#/enter/${t.id}">Enter, ${inr(t.fee)} ${t.unit}</a><p class="muted" style="font-size:13px;margin:8px 0 0">${t.cap-t.entries} places left. Entries close ${t.closes}.</p>`:""}
   <div class="actions" style="margin-top:12px"><a class="btn sm" href="/t/${t.id}">Brackets, scores and standings</a><button type="button" class="btn sm ${followedT[t.id]?"":"sec"}" data-act="followt" data-id="${t.id}">${I.bell}${followedT[t.id]?"Following":"Follow tournament"}</button></div>
   ${tabs(opts,tab,`#/t/${t.id}?tab=`)}${body}</div>`};
const tmin=x=>{const [h,r]=x.split(":");return ((+h%12)+(/PM/.test(x)?12:0))*60+ +r.slice(0,2)};
App.views.alerts=()=>`<div class="page">${backLink("#/home","Home")}<h1 class="title">Alerts</h1><p class="sub">Schedule changes and updates for what you follow.</p><div class="list">${alerts.map(a=>row({href:a.href,left:`<span class="ic" style="${a.unread?"background:var(--ball);color:#111":""}">${I.bell}</span>`,t:`${esc(a.t)}`,m:`${a.k}, ${a.at}. ${esc(a.m)}`,data:`data-alert="${a.id}"`})).join("")}</div></div>`;

App.views.enter=(q,id)=>{const t=tById(id)||tById("diwali");const L=["Category","Your details","Verify mobile",t.id==="league1"?"Team":"Partner","Pay"];const s=reg.step;let b="";
  if(s===1)b=t.cats.map((c,i)=>`<label class="opt"><input type="radio" name="cat" value="${esc(c)}" ${(reg.cat||t.cats[0])===c?"checked":""}><span><b>${esc(c)}</b><small>${[18,14,11,7][i]||5} of 20 places taken</small></span><span class="num">${inr(t.fee)}</span></label>`).join("")+`<button class="btn full" data-act="next" style="margin-top:8px">Continue</button>`;
  if(s===2)b=`<div class="field"><label for="f-n">Full name</label><input id="f-n" class="inp" value="${esc(reg.n)}" autocomplete="name"></div><div class="field"><label for="f-p">Mobile number</label><div class="phone"><span>+91</span><input id="f-p" class="inp" inputmode="numeric" maxlength="10" value="${esc(reg.p)}" placeholder="98300 00000" autocomplete="tel-national"></div></div><div class="field"><label for="f-e">Email for your receipt</label><input id="f-e" class="inp" type="email" value="${esc(reg.e)}" placeholder="you@example.com" autocomplete="email"></div><div class="two"><div class="field"><label for="f-b">Date of birth</label><input id="f-b" class="inp" type="date" value="1994-05-12"></div><div class="field"><label for="f-t">T-shirt <span class="muted">(optional)</span></label><select id="f-t" class="inp"><option>M</option><option>S</option><option>L</option><option>XL</option></select></div></div><div class="field"><span class="lab">Gender</span><div class="seg" style="margin:0"><button type="button" aria-pressed="true" data-act="ch">Male</button><button type="button" aria-pressed="false" data-act="ch">Female</button></div></div><div class="field"><label for="f-d">DUPR ID <span class="muted">(optional)</span></label><input id="f-d" class="inp"></div><button class="btn full" data-act="next">Send code</button>`;
  if(s===3)b=`<p class="muted" style="margin:0 0 4px">Enter the 6-digit code sent to +91 ${esc(reg.p||"98300 00000")}.</p>${otpBoxes(6)}<button class="btn full" data-act="next">Verify</button><p style="font-size:14px;margin:12px 0 0"><button class="lnk" data-act="fill-otp">Paste code from message</button></p>`;
  if(s===4&&t.id==="league1")b=`<p class="muted" style="margin:0 0 12px">You become the team owner. Add players now or later in the team owner app.</p><div class="field"><label for="f-tn">Team name</label><input id="f-tn" class="inp" placeholder="e.g. Salt Lake Smashers"></div><div class="field"><label>Players in your team</label><select class="inp"><option>6 to 10 players</option></select></div><button class="btn full" data-act="next" style="margin-top:8px">Continue</button>`;
  else if(s===4)b=`<p class="muted" style="margin:0 0 12px">They get a link to confirm. Your place is held for 48 hours.</p><div class="field"><label for="f-pn">Partner's name</label><input id="f-pn" class="inp"></div><div class="field"><label for="f-pp">Partner's mobile</label><div class="phone"><span>+91</span><input id="f-pp" class="inp" inputmode="numeric" maxlength="10" placeholder="98300 00000"></div></div><label class="opt"><input type="checkbox"><span><b>Find me a partner instead</b><small>We pair players of a similar level</small></span><span></span></label><button class="btn full" data-act="next" style="margin-top:8px">Continue</button>`;
  if(s===5)b=`<div class="sum"><div><span>${esc(reg.cat||t.cats[0])}</span><span>${inr(t.fee)}</span></div><div class="t"><span>Total</span><span>${inr(t.fee)}</span></div></div><label class="opt"><input type="checkbox" id="f-ok"><span><b>I accept the rules and refund policy</b><small>Full refund until entries close on ${t.closes}</small></span><span></span></label><div class="note">${I.shield}<span>Paid through Razorpay by UPI, card or net banking. Your GST invoice comes by email and WhatsApp.</span></div><button class="btn full" data-act="pay" data-amt="${t.fee}">Pay ${inr(t.fee)}</button>`;
  if(s===6)b=`<div class="done"><span class="tick">${I.tick}</span><h2>You're in</h2><p class="muted" style="margin:0">Receipt, invoice and rules are on their way by email and WhatsApp.</p></div><div class="ticket"><div class="h"><span>${esc(t.name)}</span><b>#FX-2471</b></div><div class="b"><div><span>Category</span>${esc(reg.cat||t.cats[0])}</div><div><span>Dates</span>${esc(t.dates)}</div><div><span>Player</span>${esc(reg.n||"Aarav Sen")}</div><div><span>Paid</span>${inr(t.fee)} by UPI</div></div></div><a class="btn full sec" href="#/me">Go to my entries</a>`;
  return `<div class="page" style="max-width:560px">${s<6?backLink(`#/t/${t.id}`,t.name):""}<h1 class="title">${s<6?L[s-1]:"Entry confirmed"}</h1>${s<6?`<div class="steps">${L.map((l,i)=>`<i class="${i<s?"on":""}"></i>`).join("")}</div><div class="step-l">Step ${s} of 5, entering ${esc(t.name)}</div>`:""}${b}</div>`};

App.views.players=()=>`<div class="page"><h1 class="title">Players</h1><label class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span class="sr">Search players</span><input id="pq" type="search" placeholder="Search by name or area" autocomplete="off"></label><div class="list" id="plist">${plist("")}</div></div>`;
function plist(v){const ids=Object.keys(P).filter(k=>(P[k].n+" "+P[k].c).toLowerCase().includes(v)).sort((a,b)=>P[b].w/P[b].pl-P[a].w/P[a].pl);
  return ids.map(id=>row({href:`#/p/${id}`,left:avatar(id),t:esc(P[id].n),m:`${esc(P[id].c)}, ${P[id].ti} title${P[id].ti===1?"":"s"}`,right:`<span class="bignum">${Math.round(P[id].w/P[id].pl*100)}%<small>won</small></span>`})).join("")||`<p class="empty">No player matches "${esc(v)}".</p>`}
App.views.p=(q,id)=>{id=P[id]?id:"as";const p=P[id];const hist=T.filter(t=>t.status!=="upcoming").map(t=>{const c=(t.champs||[]).find(c=>c.includes(id));return[t,c?"Champion":t.status==="live"?"Playing":["Semi-final","Quarter-final","Group stage"][(id.charCodeAt(0)+t.id.length)%3],c?c[0]:t.cats[id.charCodeAt(1)%t.cats.length]]});
  const lv=M.find(m=>m.status==="live"&&(m.A.includes(id)||m.B.includes(id)));
  return `<div class="page">${backLink("#/players","Players")}<div style="display:flex;gap:14px;align-items:center;margin:6px 0 4px">${avatar(id,"xl")}<div><h1 class="title" style="margin:0">${esc(p.n)}</h1><div class="muted" style="font-size:14px">${esc(p.c)}, DUPR ${p.r}</div></div></div>
  ${lv?`<a class="note warn" href="#/match/${lv.id}" style="margin-top:12px">${I.play}<span><b>On court now</b>, Court ${lv.court}. Tap to follow the score.</span></a>`:""}
  <dl class="facts"><div><dt>Matches</dt><dd>${p.pl}</dd></div><div><dt>Won</dt><dd>${p.w}</dd></div><div><dt>Win rate</dt><dd>${Math.round(p.w/p.pl*100)}%</dd></div><div><dt>Titles</dt><dd>${p.ti}</dd></div></dl>
  <div style="display:flex;justify-content:space-between;align-items:center"><b>Last 5 matches</b><span class="form">${[0,1,2,3,4].map(i=>(id.charCodeAt(0)+i)%4===0?'<i class="l">L</i>':"<i>W</i>").join("")}</span></div>
  <h2 class="h">Tournaments played</h2><div class="list">${hist.map(([t,r,c])=>row({href:`#/t/${t.id}`,t:`${esc(t.name)} ${t.yr}`,m:esc(c),right:`<span class="tag ${r==="Champion"?"open":"line"}">${r}</span>`})).join("")}</div></div>`};

App.views.me=()=>{if(!loggedIn&&loginRole!=="player")return `<div class="page" style="max-width:560px"><h1 class="title">Log in</h1><p class="sub">Choose who you are. Each role has its own login.</p>
  <button type="button" class="role" data-act="role" style="width:100%;text-align:left"><span class="ri" style="background:var(--court)">${I.user}</span><span><b>Player</b><small>Your entries, profile and followed matches</small></span>${I.chev}</button>
  <a class="role" href="/owner"><span class="ri" style="background:var(--green)">${I.users}</span><span><b>Team owner</b><small>Next tie, lineup, squad and fixtures. Registered mobile, WhatsApp code</small></span>${I.chev}</a>
  <a class="role" href="${ADMIN_URL}"><span class="ri" style="background:#111">${I.whistle}</span><span><b>Organiser or referee</b><small>Courts, scoring, entries and setup. Opens the organiser app</small></span>${I.chev}</a></div>`;
 if(!loggedIn)return `<div class="page" style="max-width:480px"><button class="back" data-act="unrole">${I.back}All logins</button><h1 class="title">Player log in</h1><p class="sub">We send a 6-digit code. No password needed.</p>
  ${loginSent?`<p class="muted" style="margin:0">Enter the 6-digit code we sent.</p>${otpBoxes(6)}<button class="btn full" data-act="login">Log in</button><p style="font-size:14px;margin:12px 0"><button class="lnk" data-act="fill-otp">Paste code from message</button></p>`:
  `<div class="seg" role="group"><button type="button" aria-pressed="${loginMode==="phone"}" data-act="lmode" data-v="phone">Mobile</button><button type="button" aria-pressed="${loginMode==="email"}" data-act="lmode" data-v="email">Email</button><button type="button" aria-pressed="${loginMode==="pw"}" data-act="lmode" data-v="pw">Password</button></div>
  ${loginMode==="pw"?`<div class="field"><label for="l-e">Email</label><input id="l-e" class="inp" type="email" placeholder="you@example.com" autocomplete="username"></div><div class="field"><label for="l-pw">Password</label><input id="l-pw" class="inp" type="password" autocomplete="current-password"></div><button class="btn full" data-act="pwlogin">Log in</button>`:loginMode==="phone"?`<div class="field"><label for="l-p">Mobile number</label><div class="phone"><span>+91</span><input id="l-p" class="inp" inputmode="numeric" maxlength="10" placeholder="98300 00000"></div></div><div class="field"><span class="lab">Send code by</span><div class="seg" style="margin:0"><button type="button" aria-pressed="true" data-act="ch">WhatsApp</button><button type="button" aria-pressed="false" data-act="ch">SMS</button></div></div>`:`<div class="field"><label for="l-e">Email</label><input id="l-e" class="inp" type="email" placeholder="you@example.com"></div>`}
  ${loginMode==="pw"?"":'<button class="btn full" data-act="send">Send code</button>'}`}</div>`;
  return `<div class="page"><h1 class="title">${esc(reg.n||"Aarav Sen")}</h1><p class="sub">Logged in with +91 ${esc(reg.p||"98300 12345")}</p>
  <div class="list">${row({href:"#/p/as",left:avatar("as"),t:"My player profile",m:"Stats and tournament history"})}</div>
  <h2 class="h">My entries</h2>${myEntries.length?`<div class="list">${myEntries.map(e=>row({href:`#/t/${e.t}`,t:esc(tById(e.t).name),m:`${esc(e.cat)}, entry #FX-2471`,right:'<span class="tag ok">Confirmed</span>'})).join("")}</div>`:`<p class="empty" style="padding:6px 0">No entries yet. <a class="lnk" href="#/tournaments">Find a tournament</a></p>`}
  <h2 class="h">Following</h2>${followed.size?`<div class="list">${[...followed].map(id=>mrow(mById(id))).join("")}</div>`:`<p class="empty" style="padding:6px 0">Tap Follow on any match to get alerts.</p>`}
  <button class="btn sec full" data-act="logout" style="margin-top:22px">Log out</button></div>`};

App.after=()=>{const tl=$(".tabbar [data-tab=me] .tl");if(tl)tl.textContent=loggedIn?"Me":"Log in";const ab=$("#abadge"),un=alerts.filter(a=>a.unread).length;if(ab){ab.textContent=un;ab.style.display=un?"":"none"}$$("[data-alert]").forEach(el=>el.addEventListener("click",()=>{const a=alerts.find(x=>x.id==el.dataset.alert);if(a)a.unread=0}));const pq=$("#pq");if(pq)pq.addEventListener("input",()=>{$("#plist").innerHTML=plist(pq.value.toLowerCase())})};
Object.assign(Acts,{
 follow:a=>{const id=a.dataset.id;if(followed.has(id)){followed.delete(id);toast("Stopped following")}else{followed.add(id);toast("Following. You'll get an alert for each game and the result.")}render()},
 play:a=>{a.classList.toggle("playing")},
 next:()=>{const t=tById(parse().arg)||tById("diwali");const c=$("input[name=cat]:checked");if(c)reg.cat=c.value;if($("#f-n")){reg.n=$("#f-n").value;reg.p=$("#f-p").value;reg.e=$("#f-e").value}
   if(reg.step===3){if(!otpFull()){toast("Enter all 6 digits");return}loggedIn=true}reg.step++;render();scrollTo(0,0)},
 pay:a=>{if(!$("#f-ok").checked){toast("Tick the box to accept the rules");return}sheet(`<div class="rzp-h"><div><b>Flexon Ventures</b><br><span>Razorpay secure checkout</span></div><span class="amt">${inr(a.dataset.amt)}</span></div><div class="list">${[["UPI","Google Pay, PhonePe, Paytm or any UPI app"],["Card","Visa, Mastercard, RuPay"],["Net banking","All major banks"]].map(([l,s])=>row({btn:true,act:"paid",t:l,m:s})).join("")}</div>`)},
 paid:()=>{closeSheet();const t=parse().arg;myEntries.push({t,cat:reg.cat||tById(t).cats[0]});reg.step=6;toast("Payment successful");render();scrollTo(0,0)},
 followt:a=>{const t=tById(a.dataset.id);sheet(`<h3>Follow ${esc(t.name)}</h3><p class="muted" style="margin:0 0 12px">Get schedule changes and results for what you pick.</p>
  <label class="opt"><input type="checkbox" name="fc" value="all" ${!followedT[t.id]||followedT[t.id].includes("all")?"checked":""}><span><b>Whole tournament</b><small>Every schedule change and final</small></span><span></span></label>
  ${t.cats.map(c=>`<label class="opt"><input type="checkbox" name="fc" value="${esc(c)}" ${followedT[t.id]&&followedT[t.id].includes(c)?"checked":""}><span><b>${esc(c)}</b><small>Matches, results and bracket</small></span><span></span></label>`).join("")}
  <div class="two" style="margin-top:6px">${followedT[t.id]?`<button class="btn sec" data-act="unfollowt" data-id="${t.id}">Unfollow</button>`:"<span></span>"}<button class="btn" data-act="followt2" data-id="${t.id}">Save</button></div>`)},
 followt2:a=>{const v=$$("input[name=fc]:checked").map(i=>i.value);if(!v.length){toast("Pick at least one");return}followedT[a.dataset.id]=v;closeSheet();toast("Following. Alerts show under the bell.");render()},
 unfollowt:a=>{delete followedT[a.dataset.id];closeSheet();render()},
 lmode:a=>{loginMode=a.dataset.v;render()},
 ch:a=>{$$("[data-act=ch]").forEach(b=>b.setAttribute("aria-pressed",b===a))},
 send:()=>{loginSent=true;render()},
 pwlogin:()=>{loggedIn=true;toast("Logged in");render()},
 login:()=>{if(!otpFull()){toast("Enter all 6 digits");return}loggedIn=true;loginSent=false;toast("Logged in");render()},
 logout:()=>{loggedIn=false;loginRole=null;render()},
 role:()=>{loginRole="player";render()},
 unrole:()=>{loginRole=null;loginSent=false;render()}
});
window.addEventListener("hashchange",()=>{const r=parse();if(r.name!=="enter"&&reg.step===6){reg.step=1}});
const sp=$("#splash");if(sp){const keep=/[?&]splash=1/.test(location.search);if(STILL&&!keep)sp.remove();else if(!keep){sp.addEventListener("click",()=>sp.remove());setTimeout(()=>{sp.classList.add("out");setTimeout(()=>sp.remove(),450)},1700)}}
boot();
if(!STILL)setInterval(()=>{["m102","m103"].forEach(id=>{if(Math.random()>.55)return;const m=mById(id);m.log.push({w:Math.random()<m.bias?0:1,t:(m.log.at(-1)||{t:0}).t+.5});if(st(m).done){m.log.pop();return}
  const r=parse();if(r.name==="match"&&r.arg===id){const y=scrollY;render();scrollTo(0,y);return}
  $$(`[data-m="${id}"]`).forEach(el=>{const d=document.createElement("div");d.innerHTML=el.classList.contains("sc")?stripCard(m,el.getAttribute("href")):mrow(m,el.getAttribute("href"));const n=d.firstElementChild;n.classList.add("flash");el.replaceWith(n)})})},5200);

})();