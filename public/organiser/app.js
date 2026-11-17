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

App.home="today";
const PUBLIC_URL="/";
let adminIn=false,refMode=false,gateMode="org",gateSent=false,refCourt=1;
function gate(){document.body.classList.add("locked");
 return `<section class="gate"><div class="cwg">${courtArt({m:2,par:"none",lw:.16})}</div><div class="page" style="max-width:480px;padding-top:28px">
 <h1 class="title" style="font-size:52px;line-height:.9">Organiser<br>and referee</h1><p class="sub">Log in to run courts, scores and entries.</p>
 <div class="seg" role="group"><button type="button" aria-pressed="${gateMode==="org"}" data-act="gmode" data-v="org">Organiser</button><button type="button" aria-pressed="${gateMode==="ref"}" data-act="gmode" data-v="ref">Referee</button></div>
 ${gateMode==="org"?(gateSent?`<p class="muted" style="margin:0">Enter the 6-digit code sent to your email.</p>${otpBoxes(6)}<button class="btn full" data-act="gin">Log in</button><p style="font-size:14px;margin:12px 0"><button class="lnk" data-act="fill-otp">Paste code from message</button></p>`
   :`<div class="field"><label for="g-e">Work email</label><input id="g-e" class="inp" type="email" value="ops@flexonventures.in" autocomplete="username"></div><div class="field"><label for="g-pw">Password <span class="muted">(or use a login code)</span></label><input id="g-pw" class="inp" type="password" autocomplete="current-password"></div><button class="btn full" data-act="gpw">Log in with password</button><p style="margin:12px 0 0"><button class="lnk" data-act="gsend">Send login code instead</button></p>`)
 :`<div class="field"><span class="lab">Your court</span><div class="chips">${[1,2,3,4].map(c=>`<button type="button" class="chip" aria-pressed="${c===refCourt}" data-act="rcourt" data-v="${c}">Court ${c}</button>`).join("")}</div></div>
   <div class="field"><span class="lab">Court PIN from the organiser</span>${otpBoxes(4).replace("repeat(4,1fr)","repeat(4,64px)")}</div><button class="btn full" data-act="rin">Start scoring</button>
   <p class="muted" style="font-size:13px;margin:12px 0 0">Referees only see the scoring screen for their court.</p>`}
 <p class="muted" style="font-size:13px;margin:34px 0 0">Looking for scores? <a class="lnk" href="${PUBLIC_URL}">Flexon Sports Hub</a></p></div></section>`}
App.gate=r=>{if(refMode&&r.name!=="score"&&!adminIn)refMode=false;const ok=adminIn||(refMode&&r.name==="score");document.body.classList.toggle("locked",!ok);return ok};App.gateView=gate;
App.tabOf={cm:"today",score:"today",at:"tournaments",new:"tournaments",courts:"setup",streams:"setup",logins:"setup",payments:"setup"};
let offline=false,queue=0,synced=false;
const reviews=FLX.reviews||[{id:1,t:"Pooja Gupta and Kavya Pillai",m:"Diwali Doubles Bash, Women's doubles 3.5",amt:1400},{id:2,t:"Howrah Heat",m:"Flexon Team League, 8 players",amt:9600},{id:4,t:"Salt Lake Smashers lineup",m:"Team League tie v New Town Dinks, submitted by the owner",amt:0},{id:3,t:"Neel Banerjee and Ishita Roy",m:"Diwali Doubles Bash, Mixed doubles open",amt:1400}];
const confirmed=FLX.confirmed||[["Aarav Sen and Kabir Mehta","Diwali Doubles Bash, Men's doubles 3.5",1400],["Salt Lake Smashers","Flexon Team League",9600],["Riya Kapoor and Ananya Bose","Diwali Doubles Bash, Women's doubles 3.5",1400],["New Town Dinks","Flexon Team League",9600]];
const refunds=FLX.refunds||[{id:9,t:"Dev Malhotra",m:"Diwali Doubles Bash, injury",amt:1400,done:false}];

function courtCard(c){const m=M.find(x=>x.court===c&&x.status==="live")||M.find(x=>x.court===c&&x.status==="upcoming");const lv=m&&m.status==="live",s=m&&st(m);
  if(!m)return `<div class="cc idle"><div class="top"><b>Court ${c}</b><span class="tag line" style="color:var(--on-slab-2)">Free</span></div><div class="mid muted">Nothing scheduled</div></div>`;
  return `<div class="cc ${lv?"":"idle"}" data-m="${m.id}" data-k="cc"><div class="top"><b>Court ${c}</b>${lv?'<span class="st">Live</span>':`<span style="font:700 18px/1 var(--display)">Next ${m.time}</span>`}</div>
   <div class="mid">${[0,1].map(i=>`<div class="sc-t" style="margin-bottom:4px"><span class="nm">${esc(pair(i?m.B:m.A))}${lv&&s.srv===i?'<i class="srv"></i>':""}</span><span style="display:flex;gap:6px">${lv?s.games.map(g=>`<span class="g">${g[i]}</span>`).join(""):""}</span>${lv?`<span class="c">${s.sc[i]}</span>`:"<span></span>"}</div>`).join("")}
   <div class="sc-f">${esc(m.cat)}, ${esc(m.stage)}<br>Referee ${esc(m.ref)}${c<4?", stream on":""}</div></div>
   <div class="foot">${lv?`<a href="#/score/${m.id}">Score</a>`:`<button data-act="start" data-id="${m.id}">Start</button>`}<a href="#/cm/${m.id}">Manage</a></div></div>`}
App.views.today=(()=>{const shown=new Set([1,2,3,4].map(c=>(M.find(x=>x.court===c&&x.status==="live")||M.find(x=>x.court===c&&x.status==="upcoming")||{}).id));
  const later=M.filter(m=>m.status==="upcoming"&&!shown.has(m.id));
  return `<div class="page" style="padding-bottom:0"><h1 class="title">Today</h1><p class="sub" style="margin:0">Kolkata Open 2026, ${T[0].day}</p>
  <dl class="kpis"><div><dt>Played</dt><dd>${M.filter(m=>m.status==="done").length+15} <small>of 42</small></dd></div><div><dt>On court</dt><dd>${M.filter(m=>m.status==="live").length} <small>of 4</small></dd></div><div><dt>Next start</dt><dd>12:30 <small>PM</small></dd></div><div><dt>Schedule</dt><dd style="color:var(--green)">On time</dd></div></dl></div>
  <section class="sec"><div class="hd"><h2 class="sh">Courts</h2><span class="muted" style="font-size:13px">Swipe</span></div><div class="rail">${[1,2,3,4].map(courtCard).join("")}</div></section>
  <div class="page"><h2 class="h" style="margin-top:6px">Later today</h2><div class="list">${later.map(m=>mrow(m,`#/cm/${m.id}`)).join("")||'<p class="empty">Nothing else scheduled.</p>'}</div></div>`});
App.views.cm=(q,id)=>{const m=mById(id)||M[0];const lv=m.status==="live",up=m.status==="upcoming";
  const acts=[];
  if(lv)acts.push(row({href:`#/score/${m.id}`,left:`<span class="ic">${I.whistle}</span>`,t:"Score this match",m:"Opens the referee's tap scoring"}));
  if(up)acts.push(row({btn:true,act:"start",data:`data-id="${m.id}"`,left:`<span class="ic">${I.whistle}</span>`,t:"Start match and score",m:"Marks it live for viewers"}));
  if(!m.status.startsWith("d"))acts.push(row({btn:true,act:"move",data:`data-id="${m.id}"`,left:`<span class="ic">${I.move}</span>`,t:"Move match",m:"New time or court. Players and followers are told"}),row({btn:true,act:"walkover",data:`data-id="${m.id}"`,left:`<span class="ic">${I.flag}</span>`,t:"Award walkover",m:"When a team doesn't turn up"}));
  else acts.push(row({btn:true,act:"toast",data:'data-msg="Correction opened. Every change is logged."',left:`<span class="ic">${I.undo}</span>`,t:"Correct the result",m:"Changes are logged"}));
  return `<section class="slab"><div class="page" style="padding-bottom:16px">${backLink("#/today","Today")}<div class="meta">${lv?'<span class="st">Live</span>':up?`<b>${m.time}</b>`:"<b>Result</b>"}<span>Court ${m.court}</span><span>${esc(m.cat)}, ${esc(m.stage)}</span><span>Referee ${esc(m.ref)}</span></div>${scoreboard(m)}</div></section>
  <div class="page"><div class="stat3">${["Scheduled","Live, scoring open","Completed, locked"].map((l,i)=>`<span class="${i===(up?0:lv?1:2)?"on":i<(up?0:lv?1:2)?"done":""}">${l}</span>`).join("")}</div><div class="list">${acts.join("")}</div></div>`};

App.views.score=(q,id)=>"";
function scorer(id){const m=mById(id);const s=st(m);const need=Math.ceil(m.fmt.bo/2);
  const half=i=>{const ids=i?m.B:m.A,k=i?7:15,c=i?"M10 7V22":"M10 0V15",net=i?0:22;return `<button type="button" class="half ${i?"b":"a"} ${s.srv===i&&!s.done?"serving":""}" data-act="rally" data-w="${i}" ${s.done?"disabled":""} aria-label="Rally won by ${esc(pair(ids))}"><span class="lines"><svg viewBox="0 0 20 22" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width="2"><path vector-effect="non-scaling-stroke" d="M0 ${k}H20${c}"/><rect vector-effect="non-scaling-stroke" width="20" height="22"/></g><path d="M0 ${net}H20" stroke="#fff" stroke-width="6" vector-effect="non-scaling-stroke"/></svg></span><span class="tapl">Tap if they won the rally</span><span class="who">${ids.map(x=>esc(P[x].n)).join("<br>")}${s.srv===i&&!s.done?`<small>Serving${m.fmt.dbl&&m.fmt.type==="sideout"?`, ${s.num===2?"second":"first"} server`:""}</small>`:""}<span class="gw">${Array.from({length:need},(_,j)=>`<i class="${j<s.gw[i]?"on":""}"></i>`).join("")}</span></span><span class="pts">${s.sc[i]}</span></button>`};
  return `<div class="scorer" role="dialog" aria-label="Referee scoring"><div class="sc-top"><a class="xb" href="${refMode&&!adminIn?"#/today":`#/cm/${m.id}`}" aria-label="Close scoring"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></a><div class="t"><b>Court ${m.court}: ${esc(m.cat)}</b><span>${esc(m.stage)}${s.games.length?`, earlier games ${s.games.map(g=>g.join("–")).join(", ")}`:""}</span></div><button class="net ${offline?"off":""}" data-act="net">${offline?"Offline":"Online"}</button></div>
   <div class="sc-call"><b>${callOf(m,s)}</b><span>${s.done?esc(serveLine(m,s)):"Score call"}</span></div>
   <div class="halves">${half(0)}${half(1)}</div>
   <div class="q-note">${offline?`${queue} ${queue===1?"rally":"rallies"} saved on this phone. They send when the signal is back.`:synced?"Synced. Viewers see the latest score.":""}</div>
   <div class="sc-ctl"><button data-act="undo">${I.undo}Undo</button><button data-act="toast" data-msg="Timeout started, 60 seconds">${I.time}Timeout</button>${s.done?`<button data-act="lock" data-id="${m.id}" style="background:var(--ball);color:#111;border:0">${I.tick}Confirm result</button>`:`<button data-act="toast" data-msg="Only confirm once the match is over" style="opacity:.5">${I.tick}Confirm</button>`}</div></div>`}

App.views.entries=(q)=>{const s=q.s||"review";const pending=reviews.length,ref=refunds.filter(r=>!r.done).length;let list="";
  if(s==="review")list=reviews.length?reviews.map(r=>`<div class="row rv"><div><div class="t">${esc(r.t)}</div><div class="m">${esc(r.m)}${r.amt?`. Paid ${inr(r.amt)}`:""}</div></div><div class="r" style="gap:6px"><button class="btn sm sec" data-act="reject" data-id="${r.id}">Reject</button><button class="btn sm" data-act="approve" data-id="${r.id}">Approve</button></div></div>`).join(""):'<p class="empty">All caught up.</p>';
  if(s==="ok")list=confirmed.map(c=>`<div class="row" style="grid-template-columns:1fr auto"><div><div class="t">${esc(c[0])}</div><div class="m">${esc(c[1])}</div></div><div class="r"><span class="bignum" style="font-size:18px">${inr(c[2])}</span></div></div>`).join("");
  if(s==="refund")list=refunds.map(r=>`<div class="row" style="grid-template-columns:1fr auto"><div><div class="t">${esc(r.t)}</div><div class="m">${esc(r.m)}. ${inr(r.amt)}</div></div><div class="r">${r.done?'<span class="tag ok">Refunded</span>':`<button class="btn sm sec" data-act="refund" data-id="${r.id}">Refund</button>`}</div></div>`).join("");
  return `<div class="page"><h1 class="title">Entries</h1><p class="sub">Every payment comes in through Razorpay.</p>
  <dl class="facts" style="grid-template-columns:1fr 1fr 1fr"><div><dt>Collected</dt><dd>₹1.34L</dd></div><div><dt>Razorpay fees</dt><dd>₹3,172</dd></div><div><dt>Refunded</dt><dd>${inr(refunds.filter(r=>r.done).length*1400)}</dd></div></dl>
  <h2 class="h" style="margin-top:6px">Places taken</h2><div class="bars">${[["Men's doubles 3.5",18,20],["Women's doubles 3.5",14,20],["Mixed doubles open",11,20],["Mixed doubles 3.0",7,20],["Team League",5,8]].map(([l,n,c])=>`<div><span>${l}</span><i style="width:${Math.round(n/c*100)}%"></i><b>${n}/${c}</b></div>`).join("")}</div><div style="height:14px"></div>${seg([["review",`To review${pending?` (${pending})`:""}`],["ok","Confirmed"],["refund",`Refunds${ref?` (${ref})`:""}`]],s,"#/entries?s=")}<div class="list">${list}</div></div>`};

App.views.setup=()=>`<div class="page"><h1 class="title">Setup</h1><p class="sub">Set once, change any time.</p><div class="list"><a class="row" href="/console"><span class="ic">${I.gear}</span><div><div class="t">Flexon Console</div><div class="m">Every format, draws, live control, users and logins</div></div><div class="r">${I.chev}</div></a>
  ${row({href:"#/courts",left:`<span class="ic">${I.court}</span>`,t:"Courts and referees",m:"4 courts, referee PINs"})}
  ${row({href:"#/streams",left:`<span class="ic">${I.video}</span>`,t:"Live streams",m:"YouTube link for each court"})}
  ${row({href:"#/logins",left:`<span class="ic">${I.key}</span>`,t:"Login codes",m:"Email, WhatsApp or SMS"})}
  ${row({href:"#/payments",left:`<span class="ic">${I.money}</span>`,t:"Payments",m:"Razorpay account"})}</div><button class="btn sec full" data-act="logout" style="margin-top:22px">Log out</button></div>`;
App.views.courts=()=>`<div class="page">${backLink("#/setup","Setup")}<h1 class="title">Courts and referees</h1><p class="sub">Referees open scoring with their court's PIN. No account needed.</p><div class="list">${[1,2,3,4].map(c=>{const r=["S. Ghosh","P. Dutta","A. Paul","R. Sarkar"][c-1];return `<div class="row"><span class="date" style="padding:10px 0"><b>${c}</b><span>COURT</span></span><div><div class="t">${r}</div><div class="m">PIN •••• set this morning</div></div><div class="r"><button class="btn sm sec" data-act="toast" data-msg="New PIN sent to ${r} by WhatsApp">New PIN</button></div></div>`}).join("")}</div></div>`;
App.views.streams=()=>`<div class="page">${backLink("#/setup","Setup")}<h1 class="title">Live streams</h1><p class="sub">Paste each court's YouTube live link. Viewers watch it inside the match page.</p>${[1,2,3,4].map(c=>`<div class="field"><label for="yt${c}">Court ${c}</label><input id="yt${c}" class="inp" value="${c<4?"youtube.com/live/flexon-court-"+c:""}" placeholder="Paste the live link"></div>`).join("")}<button class="btn full" data-act="toast" data-msg="Stream links saved">Save links</button></div>`;
App.views.logins=()=>`<div class="page">${backLink("#/setup","Setup")}<h1 class="title">Login codes</h1><p class="sub">Choose how players and team owners get their 6-digit login code.</p>
  ${[["Email code","Free",true,""],["WhatsApp code","About ₹0.12 a code",true,"Needs Meta business verification"],["SMS code","₹0.15 to ₹0.25 a code",false,"Needs one-time DLT registration"]].map(([a,b,on,n])=>`<label class="opt"><input type="checkbox" ${on?"checked":""}><span><b>${a}</b><small>${n||"No per-code cost"}</small></span><span class="num" style="font-size:17px">${b}</span></label>`).join("")}
  <button class="btn full" data-act="toast" data-msg="Login options saved" style="margin-top:8px">Save</button></div>`;
App.views.payments=()=>`<div class="page">${backLink("#/setup","Setup")}<h1 class="title">Payments</h1><p class="sub">Entry fees go straight to Flexon's Razorpay account.</p><dl class="kv"><dt>Gateway</dt><dd>Razorpay, connected</dd><dt>Account</dt><dd>Flexon Ventures</dd><dt>Fee</dt><dd>2% + GST a payment, UPI included</dd><dt>Invoices</dt><dd>GST invoice sent by email and WhatsApp</dd><dt>Refunds</dt><dd>From the Entries tab</dd></dl></div>`;

App.after=r=>{const bd=$(".tabbar [data-tab=entries] .badge");if(bd){bd.textContent=reviews.length;bd.style.display=reviews.length?"":"none"}if(r.name==="score"){$("#sheet").innerHTML=scorer(r.arg)}else if($(".scorer"))$("#sheet").innerHTML=""};
function rescore(){const r=parse();$("#sheet").innerHTML=scorer(r.arg)}
Object.assign(Acts,{
 rally:a=>{const m=mById(parse().arg);m.log.push({w:+a.dataset.w,t:(m.log.at(-1)||{t:0}).t+.6});synced=false;if(offline)queue++;rescore();if(navigator.vibrate)navigator.vibrate(12)},
 undo:()=>{const m=mById(parse().arg);if(m.log.length){m.log.pop();if(offline&&queue)queue--;rescore();toast("Last rally removed")}},
 net:()=>{offline=!offline;if(!offline&&queue){toast(`Sent ${queue} saved ${queue===1?"rally":"rallies"}`);queue=0;synced=true}rescore()},
 lock:a=>{const m=mById(a.dataset.id);m.games=st(m).games;m.status="done";toast("Result confirmed. Standings updated.");location.hash=refMode&&!adminIn?"#/today":`#/cm/${m.id}`},
 start:a=>{const m=mById(a.dataset.id);m.status="live";m.log=[];location.hash=`#/score/${m.id}`},
 move:a=>{const m=mById(a.dataset.id);sheet(`<h3>Move match</h3><p class="muted" style="margin:0 0 12px">${esc(pair(m.A))} v ${esc(pair(m.B))}. Now ${m.time}, Court ${m.court}.</p>
   <div class="field"><label for="mv-t">New time</label><select id="mv-t" class="inp">${["12:30 PM","1:00 PM","1:30 PM","2:00 PM","3:00 PM"].map(x=>`<option ${x==="3:00 PM"?"selected":""}>${x}</option>`).join("")}</select></div>
   <div class="field"><label for="mv-c">Court</label><select id="mv-c" class="inp">${[1,2,3,4].map(c=>`<option ${c===m.court?"selected":""}>Court ${c}</option>`).join("")}</select></div>
   <div class="note warn" id="mv-n">${I.info}<span>Team lineup window moves to 2:30 to 3:00 PM. Players, team owners and followers get an alert.</span></div>
   <button class="btn full" data-act="moved" data-id="${m.id}">Move and tell everyone</button>`);
   $("#mv-t").addEventListener("change",e=>{const t=e.target.value,[h,mm]=t.split(":"),ap=t.slice(-2);let H=+h,m2=+mm.slice(0,2)-30;if(m2<0){m2+=60;H=H===1?12:H-1}$("#mv-n span").textContent=`Team lineup window moves to ${H}:${String(m2).padStart(2,"0")} to ${t.replace(" "+ap,"")} ${ap}. Players, team owners and followers get an alert.`})},
 moved:a=>{const m=mById(a.dataset.id);m.time=$("#mv-t").value;m.court=+$("#mv-c").value.replace(/\D/g,"");closeSheet();toast("Moved. Everyone affected has been told.");render()},
 walkover:a=>{const m=mById(a.dataset.id);sheet(`<h3>Award walkover</h3><p class="muted" style="margin:0 0 12px">Who gets the match?</p><div class="list">${[0,1].map(i=>row({btn:true,act:"wo",data:`data-id="${m.id}" data-w="${i}"`,t:esc(pair(i?m.B:m.A)),m:"Wins by walkover"})).join("")}</div>`)},
 wo:a=>{const m=mById(a.dataset.id);const w=+a.dataset.w;m.status="done";m.games=[w?[0,11]:[11,0],w?[0,11]:[11,0]];closeSheet();toast("Walkover recorded");render()},
 approve:a=>{const i=reviews.findIndex(r=>r.id==a.dataset.id);const r=reviews.splice(i,1)[0];confirmed.unshift([r.t,r.m,r.amt]);toast("Approved. Confirmation sent on WhatsApp.");render()},
 gmode:a=>{gateMode=a.dataset.v;gateSent=false;render()},
 gsend:()=>{gateSent=true;render()},
 gpw:()=>{adminIn=true;$(".appbar .who").textContent="S. Mukherjee";location.hash="#/today";render()},
 gin:()=>{if(!otpFull()){toast("Enter all 6 digits");return}adminIn=true;gateSent=false;$(".appbar .who").textContent="S. Mukherjee";location.hash="#/today";render()},
 rcourt:a=>{refCourt=+a.dataset.v;$$("[data-act=rcourt]").forEach(b=>b.setAttribute("aria-pressed",b===a))},
 rin:()=>{if(!otpFull()){toast("Enter the 4-digit court PIN");return}const m=M.find(x=>x.court===refCourt&&x.status==="live")||M.find(x=>x.court===refCourt&&x.status==="upcoming");if(!m){toast("Nothing to score on this court");return}if(m.status==="upcoming"){toast(`Court ${refCourt} opens for scoring when the organiser starts the ${m.time} match`);return}refMode=true;location.hash=`#/score/${m.id}`},
 logout:()=>{adminIn=false;$(".appbar .who").textContent="";location.hash="#/today";render()},
 reject:a=>{const i=reviews.findIndex(r=>r.id==a.dataset.id);reviews.splice(i,1);toast("Rejected. The player is told and refunded.");render()},
 refund:a=>{const r=refunds.find(x=>x.id==a.dataset.id);r.done=true;toast("Refund sent through Razorpay");render()}
});

/* ---------- tournament setup (admin) ---------- */
const STEPS=["Published","Entries open","Close entries","Make the draw","Publish the schedule","Results published"];
const prog={diwali:2,league1:2,kol26:5,summer:6,inv25:6};
function defaultForm(type){return [
 {k:"name",l:"Full name",s:"req",lock:1},{k:"mobile",l:"Mobile number, verified by OTP",s:"req",lock:1},{k:"email",l:"Email",s:"req"},
 {k:"dob",l:"Date of birth",s:"opt"},{k:"gender",l:"Gender",s:"req"},{k:"dupr",l:"DUPR ID",s:"opt"},{k:"tshirt",l:"T-shirt size",s:"opt"},
 {k:"club",l:"Club or academy",s:"off"},{k:"emerg",l:"Emergency contact",s:"off"},{k:"photo",l:"Photo",s:"off"},
 ...(type==="doubles"?[{k:"partner",l:"Partner name and mobile",s:"req",lock:1}]:[]),
 ...(type==="league"?[{k:"team",l:"Team name",s:"req",lock:1},{k:"owner",l:"Team owner name and mobile",s:"req",lock:1},{k:"roster",l:"Player list",s:"opt"}]:[]),
 {k:"rules",l:"Accepts rules and refund policy",s:"req",lock:1}]}
function defaultCats(type){return type==="singles"?[{n:"Men's singles",on:1,max:32,fee:800},{n:"Women's singles",on:1,max:16,fee:800}]
 :type==="league"?[{n:"Team league",on:1,max:8,fee:9600}]
 :[{n:"Men's doubles",on:1,max:24,fee:1400},{n:"Women's doubles",on:1,max:16,fee:1400},{n:"Mixed doubles",on:1,max:24,fee:1400}]}
const CFG={
 diwali:{type:"doubles",form:defaultForm("doubles"),custom:["Preferred playing time"],open:"2026-10-01",close:"2026-10-18",approval:"manual",full:"waitlist",pay:1,refunds:"until",findp:1,stage:"groups",groups:2,adv:2,scoring:"sideout",to:11,bo:3,len:30,ppw:2,drawn:0,sched:0,catSel:0,
  cats:[{n:"Men's doubles 3.5",on:1,max:20,fee:1400,taken:18},{n:"Women's doubles 3.5",on:1,max:20,fee:1400,taken:14},{n:"Mixed doubles open",on:1,max:20,fee:1400,taken:11},{n:"Mixed doubles 3.0",on:1,max:20,fee:1400,taken:7}]},
 league1:{type:"league",form:defaultForm("league"),custom:[],open:"2026-10-01",close:"2026-10-25",approval:"manual",full:"close",pay:1,refunds:"org",stage:"rr",groups:1,adv:4,scoring:"sideout",to:11,bo:1,len:40,ppw:2,drawn:0,sched:0,teams:8,pmin:6,pmax:10,tie:["Men's doubles","Women's doubles","Mixed doubles"],
  cats:[{n:"Team league",on:1,max:8,fee:9600,taken:5}]},
 kol26:{type:"doubles",form:defaultForm("doubles"),custom:[],open:"2026-08-20",close:"2026-09-20",approval:"auto",full:"waitlist",pay:1,refunds:"until",findp:1,stage:"groups",groups:4,adv:2,scoring:"sideout",to:11,bo:3,len:30,ppw:2,drawn:1,sched:1,catSel:0,
  cats:T[0].cats.map((n,i)=>({n,on:1,max:24,fee:1400,taken:[24,24,24,24][i]}))}
};
["summer","inv25"].forEach(id=>CFG[id]={...CFG.kol26,form:defaultForm("doubles"),cats:tById(id).cats.map(n=>({n,on:1,max:24,fee:1400,taken:20}))});
const OWNERS={"Salt Lake Smashers":["Aarav Sen","98300 12345",1],"New Town Dinks":["Kabir Mehta","98300 22211",1],"Ballygunge Blasters":["Vikram Rao","98310 44556",1],"Howrah Heat":["Dev Malhotra","98311 77788",0],"Park Street Picklers":["","",0]};
const PAIRS=["Sen / Mehta","Rao / Nair","Das / Jain","Banerjee / Malhotra","Kapoor / Bose","Shah / Iyer","Roy / Qureshi","Gupta / Pillai","Ghosh / Dutta","Paul / Sarkar","Mitra / Sen","Basu / Kar","Chatterjee / Dey","Sinha / Nag","Bhatt / Lal","Saha / Pal","Ray / Bose","Dasgupta / Roy"];
const draws={};
const esel=(id,opts,cur,act,extra)=>`<select class="inp sm" ${id?`id="${id}"`:""} ${act?`data-chg="${act}"`:""} ${extra||""}>${opts.map(([v,l])=>`<option value="${v}" ${String(v)===String(cur)?"selected":""}>${l}</option>`).join("")}</select>`;
const segb=(act,opts,cur,extra)=>`<div class="seg sm" role="group">${opts.map(([v,l])=>`<button type="button" aria-pressed="${String(v)===String(cur)}" data-act="${act}" data-v="${v}" ${extra||""}>${l}</button>`).join("")}</div>`;
const fmtDate=d=>{if(!d)return "";const [y,m,dd]=d.split("-");return `${+dd} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m-1]}`};
const STAGE={rr:"Round robin",ko:"Knockout",groups:"Groups, then knockout"};
const REF={until:"Full refund until entries close",org:"Organiser decides each case",none:"No refunds"};

/* registration form builder, shared by the wizard and the tournament page */
function formBuilder(c,ctx){return `<h2 class="h">Fields players fill in</h2><div class="list">${c.form.map((f,i)=>`<div class="ff"><span>${esc(f.l)}</span>${f.lock?'<span class="tag line">Always required</span>':esel("",[["req","Required"],["opt","Optional"],["off","Not asked"]],f.s,"field",`data-i="${i}" data-ctx="${ctx}" aria-label="${esc(f.l)}"`)}</div>`).join("")}
 ${c.custom.map((q,i)=>`<div class="ff"><span>${esc(q)} <small class="muted">Your question</small></span><button type="button" class="btn sm sec" data-act="rmq" data-i="${i}" data-ctx="${ctx}">Remove</button></div>`).join("")}</div>
 <button type="button" class="btn sec full" data-act="addq" data-ctx="${ctx}" style="margin-top:12px">${I.plus}Add your own question</button>
 <h2 class="h">Entry controls</h2>
 <div class="two"><div class="field"><label>Entries open</label><input class="inp" type="date" value="${c.open}" data-chg="open" data-ctx="${ctx}"></div><div class="field"><label>Entries close</label><input class="inp" type="date" value="${c.close}" data-chg="close" data-ctx="${ctx}"></div></div>
 ${c.close<c.open?'<p class="err">Entries must close after they open.</p>':""}
 <div class="field"><span class="lab">Who confirms an entry</span>${segb("appr",[["auto","Automatic on payment"],["manual","I approve each"]],c.approval,`data-ctx="${ctx}"`)}</div>
 <div class="field"><span class="lab">When a category is full</span>${segb("full",[["waitlist","Start a waitlist"],["close","Close it"]],c.full,`data-ctx="${ctx}"`)}</div>
 <label class="opt"><input type="checkbox" ${c.pay?"checked":""} data-chg="pay" data-ctx="${ctx}"><span><b>Collect the fee with Razorpay</b><small>Players pay by UPI, card or net banking when they enter</small></span><span></span></label>
 ${c.type==="doubles"?`<label class="opt"><input type="checkbox" ${c.findp?"checked":""} data-chg="findp" data-ctx="${ctx}"><span><b>Let players ask for a partner</b><small>You pair them before the draw</small></span><span></span></label>`:""}
 <div class="field"><label>Refunds</label>${esel("",Object.entries(REF),c.refunds,"refunds",`data-ctx="${ctx}"`)}</div>`}
function formPreview(c,name){const f=c.form.filter(x=>x.s!=="off");return `<h3>Entry form preview</h3><p class="muted" style="margin:0 0 12px">What a player sees when entering ${esc(name)}.</p>
 ${f.map(x=>`<div class="field"><label>${esc(x.l)}${x.s==="opt"?' <span class="muted">(optional)</span>':""}</label>${x.k==="rules"?`<label class="opt"><input type="checkbox"><span><b>I accept the rules</b><small>${REF[c.refunds]}</small></span><span></span></label>`:x.k==="gender"?segb("noop",[["m","Male"],["f","Female"]],"m"):`<input class="inp" disabled placeholder="${x.k==="mobile"?"+91, then a 6-digit code":""}">`}</div>`).join("")}
 ${c.custom.map(q=>`<div class="field"><label>${esc(q)}</label><input class="inp" disabled></div>`).join("")}
 ${c.pay?`<button class="btn full" disabled>Pay ${inr(c.cats.find(x=>x.on)?.fee||0)}</button>`:""}`}

App.views.tournaments=(q)=>{const s=q.s||"live";const set={live:T.filter(t=>t.status==="live"),up:T.filter(t=>t.status==="upcoming"),done:T.filter(t=>t.status==="done")}[s];
  return `<div class="page"><div class="tbar"><h1 class="title">Tournaments</h1><a class="btn sm" href="#/new">${I.plus}New</a></div>
  ${seg([["live","Live"],["up","Upcoming"],["done","Past"]],s,"#/tournaments?s=")}
  <div class="grid two">${set.map(t=>{const p=prog[t.id]??1;return tourTile(t,`#/at/${t.id}`,`<div class="pbar"><i style="width:${Math.round(p/6*100)}%;background:${p>=6?"var(--green)":"var(--text)"}"></i></div><div class="pbar-l">${p>=6?"All steps done":`Step ${p+1} of 6: ${STEPS[p]}`}</div>`)}).join("")||'<p class="empty">Nothing here yet.</p>'}</div></div>`};

App.views.at=(q,id)=>{const t=tById(id)||T[0],c=CFG[t.id],p=prog[t.id]??1,tab=q.tab||"overview";const done=t.status==="done";let body="";
 if(tab==="overview"){const stepRow=(l,i)=>{const dn=i<p,cur=i===p;let m="";
    if(i===1)m=`${t.entries} of ${t.cap||t.entries} places taken`;if(i===5&&t.status==="live")m=`In play, ${t.day}`;
    const act=!cur?"":i===2?`<button class="btn sm" data-act="closeent" data-id="${t.id}">Close entries</button>`:i===3?`<a class="btn sm" href="#/at/${t.id}?tab=draw">Open draw</a>`:i===4?`<a class="btn sm" href="#/at/${t.id}?tab=schedule">Open schedule</a>`:"";
    return `<div class="row step ${dn?"dn":cur?"cur":"todo"}"><span class="dot">${dn?I.tick:i+1}</span><div><div class="t">${l}</div>${m?`<div class="m">${m}</div>`:""}</div><div class="r">${act}</div></div>`};
  body=`<h2 class="h">Progress</h2><div class="list">${STEPS.map(stepRow).join("")}</div>
  <h2 class="h">Set-up</h2><dl class="kv"><dt>Type</dt><dd>${c.type==="league"?"League (teams)":c.type==="singles"?"Singles":"Doubles"}</dd><dt>Stage</dt><dd>${STAGE[c.stage]}${c.stage==="groups"?`, ${c.groups} groups, top ${c.adv} go through`:""}</dd><dt>Scoring</dt><dd>${c.bo===1?"1 game":"Best of "+c.bo} to ${c.to}, ${c.scoring==="rally"?"rally":"side-out"} scoring</dd><dt>Standings</dt><dd>${c.ppw} points a win. Head to head, then game and point difference</dd><dt>Courts</dt><dd>${t.courts}, ${c.len} minutes a match</dd></dl>`}
 if(tab==="reg"){const tk=c.cats.reduce((a,x)=>a+(x.taken||0),0),mx=c.cats.reduce((a,x)=>a+x.max,0);
  body=`<div class="regstat"><div><span class="tag ${p<=1&&t.reg?"open":"line"}">${p<=1&&t.reg?"Entries open":"Entries closed"}</span><div class="num" style="font-size:34px;margin-top:8px">${tk} <small class="muted" style="font:500 14px var(--ui)">of ${mx} places</small></div><div class="pbar"><i style="width:${Math.round(tk/mx*100)}%"></i></div><div class="pbar-l">Opens ${fmtDate(c.open)}, closes ${fmtDate(c.close)}</div></div></div>
  <div class="two" style="margin-top:12px"><button class="btn sec" data-act="preview" data-id="${t.id}">Preview form</button><button class="btn sec" data-act="toast" data-msg="Entry link copied">Copy entry link</button></div>
  ${formBuilder(c,t.id)}<button class="btn full" data-act="savereg" style="margin-top:8px">Save changes</button>`}
 if(tab==="players"){if(c.type==="league"){body=`<div class="tbar" style="margin-top:14px"><h2 class="h" style="margin:0">Teams <span class="muted" style="font:500 14px var(--ui)">${Object.keys(OWNERS).length} of ${c.teams}</span></h2><button class="btn sm" data-act="addteam">${I.plus}Add team</button></div>
   <div class="list" style="margin-top:10px">${Object.entries(OWNERS).map(([tn,o])=>`<div class="row team"><div><div class="t">${esc(tn)}</div><div class="m">${o[0]?`Owner ${esc(o[0])}, +91 ${o[1]}`:"No owner assigned yet"}</div></div><div class="r">${o[0]?`<label class="sw" title="Owner access"><input type="checkbox" ${o[2]?"checked":""} data-chg="access" data-team="${esc(tn)}"><i></i><span>Access</span></label>`:`<button class="btn sm" data-act="owner" data-team="${esc(tn)}">Assign owner</button>`}</div></div>`).join("")}</div>
   <p class="muted" style="font-size:13px">Owners log in with this mobile number and can only manage their own team.</p>`}
  else{const cs=c.cats.filter(x=>x.on);const ci=Math.min(c.catSel||0,cs.length-1);const n=Math.min(cs[ci].taken||8,PAIRS.length);
   body=`<div class="chips" style="margin:14px 0 4px">${cs.map((x,i)=>`<button type="button" class="chip" aria-pressed="${i===ci}" data-act="pcat" data-i="${i}" data-id="${t.id}">${esc(x.n)}</button>`).join("")}</div>
   <div class="tbar" style="margin-top:10px"><span class="muted" style="font-size:13.5px">${n} entries</span><button class="btn sm" data-act="addentry" data-id="${t.id}">${I.plus}Add entry</button></div>
   <div class="list" style="margin-top:8px">${PAIRS.slice(0,n).map((x,i)=>`<div class="row ent"><span class="num seed">${i+1}</span><div><div class="t">${x}</div><div class="m">${i%7===3?"Waiting for partner to confirm":"Confirmed, paid"}</div></div><div class="r"><button class="btn sm sec" data-act="pairing" data-p="${x}">Edit</button></div></div>`).join("")}</div>`}}
 if(tab==="draw"){const d=draws[t.id];
  if(t.status!=="upcoming"||c.drawn)body=`<p class="note" style="margin-top:14px">${I.tick}<span>Draw confirmed${t.status==="upcoming"?"":" and in use"}. Results move winners on automatically.</span></p>${drawView(t.id,false)}`;
  else if(p<3)body=`<p class="empty">The draw opens once entries close. <button class="lnk" data-act="closeent" data-id="${t.id}">Close entries now</button></p>`;
  else body=`<div class="field" style="margin-top:14px"><span class="lab">Groups</span>${segb("groups",[[1,"1 group"],[2,"2 groups"],[4,"4 groups"]],c.groups,`data-id="${t.id}"`)}</div>
   <div class="field"><span class="lab">Go through to the knockout</span>${segb("adv",[[1,"Top 1"],[2,"Top 2"]],c.adv,`data-id="${t.id}"`)}</div>
   <div class="two"><button class="btn" data-act="gendraw" data-id="${t.id}">${d?"Generate again":"Generate draw"}</button>${d?`<button class="btn ${editSwap?"ball":"sec"}" data-act="swapmode">${editSwap?"Done editing":"Edit matchups"}</button>`:"<span></span>"}</div>
   ${d?`${editSwap?'<p class="note warn" style="margin-top:12px">'+I.info+'<span>Tap one entry, then another, to swap them.</span></p>':""}${drawView(t.id,true)}<button class="btn full" data-act="confdraw" data-id="${t.id}" style="margin-top:16px">Confirm draw</button>`:""}`}
 if(tab==="schedule"){if(t.status!=="upcoming")body=`<p class="note" style="margin-top:14px">${I.tick}<span>Schedule published. Moving a match tells players, team owners and followers.</span></p><div class="list">${M.filter(m=>m.t===t.id).sort((a,b)=>tmin(a.time)-tmin(b.time)).map(m=>`<div class="row sch"><span class="num tm2">${m.time.replace(" ","<br>")}</span><div><div class="t">${esc(pair(m.A))} v ${esc(pair(m.B))}</div><div class="m">Court ${m.court}, ${esc(m.cat)}</div></div><div class="r">${m.status==="upcoming"?`<button class="btn sm sec" data-act="move" data-id="${m.id}">Move</button>`:`<span class="tag ${m.status==="live"?"open":"line"}">${m.status==="live"?"Live":"Done"}</span>`}</div></div>`).join("")}</div>`;
  else if(!c.drawn)body=`<p class="empty">Confirm the draw first. <a class="lnk" href="#/at/${t.id}?tab=draw">Go to the draw</a></p>`;
  else{const sl=schedSlots(t.id);body=`<div class="two" style="margin-top:14px"><div class="field"><label>First match</label>${esel("sch-s",[["9:00","9:00 AM"],["10:00","10:00 AM"],["11:00","11:00 AM"]],c.first||"9:00","first",`data-ctx="${t.id}"`)}</div><div class="field"><label>Match length</label>${esel("sch-l",[[20,"20 minutes"],[30,"30 minutes"],[40,"40 minutes"]],c.len,"len",`data-ctx="${t.id}"`)}</div></div>
   <p class="muted" style="font-size:13px;margin:0 0 10px">${t.courts} courts. ${sl.length} matches fit into ${Math.ceil(sl.length/t.courts)} rounds.</p>
   <div class="list">${sl.slice(0,12).map(x=>`<div class="row sch"><span class="num tm2">${x.time.replace(" ","<br>")}</span><div><div class="t">${x.a} v ${x.b}</div><div class="m">Court ${x.court}, ${x.cat}</div></div><div class="r"><button class="btn sm sec" data-act="toast" data-msg="Drag to another slot in the full schedule">Move</button></div></div>`).join("")}</div>
   <p class="muted" style="font-size:13px">Showing the first 12 of ${sl.length} matches.</p><button class="btn full" data-act="pubsched" data-id="${t.id}" ${c.sched?"disabled":""}>${c.sched?"Schedule published":"Publish schedule"}</button>`}}
 const tabs2=[["overview","Overview"],["reg","Registration"],["players",c.type==="league"?"Teams":"Players"],["draw","Draw"],["schedule","Schedule"]];
 return `<div class="tile" style="width:auto"><div class="art" style="height:120px">${courtArt({...(done?GREY:{}),m:3,abs:true})}<span class="dt">${t.d}<small>${t.mo}</small></span></div></div><div class="page">${backLink("#/tournaments"+(done?"?s=done":t.status==="upcoming"?"?s=up":""),"Tournaments")}<h1 class="title">${esc(t.name)} ${t.yr}</h1><p class="sub" style="margin:0">${esc(t.dates)}, ${esc(t.venue)}</p>
  ${tabs(tabs2,tab,`#/at/${t.id}?tab=`)}${body}</div>`};
const tmin=s=>{const [h,r]=s.split(":");return ((+h%12)+(/PM/.test(s)?12:0))*60+ +r.slice(0,2)};
let editSwap=false,swapA=null;
function drawView(id,editable){const t=tById(id),c=CFG[id];
 if(t.status!=="upcoming")return `<h2 class="h">Mixed doubles 3.5, Group A</h2>${standings(GROUP,"Group A")}<h2 class="h">Men's doubles open, knockout</h2><div class="list">${[["m101","Quarter-final 1"],["m091","Quarter-final 2"],["m105","Quarter-final 3"]].map(([mid,l])=>{const m=mById(mid);return `<div class="row"><span class="num seed">QF</span><div><div class="t">${esc(pair(m.A))} v ${esc(pair(m.B))}</div><div class="m">${l}</div></div><div class="r"><span class="tag ${m.status==="live"?"open":"line"}">${m.status==="live"?"Live":m.status==="done"?"Done":m.time}</span></div></div>`}).join("")}</div>`;
 const d=draws[id];
 return `<div class="groups">${d.groups.map((g,gi)=>`<div class="gcard"><b>Group ${"ABCD"[gi]}</b>${g.map((x,xi)=>`<button type="button" class="gi ${swapA&&swapA[0]===gi&&swapA[1]===xi?"sel":""} ${xi<c.adv?"adv":""}" data-act="swap" data-g="${gi}" data-x="${xi}" ${editable&&editSwap?"":"disabled"}>${x}</button>`).join("")}</div>`).join("")}</div>
 <p class="muted" style="font-size:12.5px;margin:6px 0 0">Green edge: goes through. Knockout seeding: group winners meet runners-up from another group.</p>`}
function makeDraw(id){const c=CFG[id],n=Math.min(c.cats[c.catSel||0].taken||16,PAIRS.length),ents=PAIRS.slice(0,n);const G=Array.from({length:c.groups},()=>[]);ents.forEach((e,i)=>{const r=Math.floor(i/c.groups),gi=r%2?c.groups-1-i%c.groups:i%c.groups;G[gi].push(e)});draws[id]={groups:G}}
function schedSlots(id){const c=CFG[id],t=tById(id),d=draws[id]||{groups:[PAIRS.slice(0,8)]};const out=[];let slot=0;const [h0]=(c.first||"9:00").split(":");
 d.groups.forEach((g,gi)=>{for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++){const mins=+h0*60+Math.floor(slot/t.courts)*c.len,H=Math.floor(mins/60),Mn=mins%60;out.push({a:g[i],b:g[j],court:slot%t.courts+1,cat:`${c.cats[c.catSel||0].n}, Group ${"ABCD"[gi]}`,time:`${((H+11)%12)+1}:${String(Mn).padStart(2,"0")} ${H>=12?"PM":"AM"}`});slot++}});return out}

/* new tournament wizard */
const WL=["Type","Details","Categories","Format and scoring","Registration form","Review"];
const nt={step:1,type:"doubles",name:"",start:"2026-12-13",end:"2026-12-14",venue:"Flexon Arena, Salt Lake",courts:4,cats:defaultCats("doubles"),stage:"groups",groups:2,adv:2,scoring:"sideout",to:11,bo:3,len:30,ppw:2,form:defaultForm("doubles"),custom:[],open:"2026-10-20",close:"2026-12-06",approval:"manual",full:"waitlist",pay:1,refunds:"until",findp:1,teams:8,pmin:6,pmax:10,tie:["Men's doubles","Women's doubles","Mixed doubles"],err:""};
App.views.new=()=>{const s=nt.step;let b="";
 if(s===1)b=[["singles","Singles","One player per entry"],["doubles","Doubles","Pairs. Players invite their partner"],["league","League","Teams with owners and lineup windows. Only organisers can create leagues"]].map(([v,l,d])=>`<label class="opt big"><input type="radio" name="ty" value="${v}" ${nt.type===v?"checked":""} data-chg="type"><span><b>${l}</b><small>${d}</small></span><span></span></label>`).join("");
 if(s===2)b=`<div class="field"><label for="n-n">Tournament name</label><input id="n-n" class="inp" value="${esc(nt.name)}" placeholder="e.g. Winter Open" data-chg="name"></div>${nt.err?`<p class="err">${nt.err}</p>`:""}
  <div class="two"><div class="field"><label>Starts</label><input class="inp" type="date" value="${nt.start}" data-chg="start"></div><div class="field"><label>Ends</label><input class="inp" type="date" value="${nt.end}" data-chg="end"></div></div>
  <div class="field"><label for="n-v">Venue</label><input id="n-v" class="inp" value="${esc(nt.venue)}" data-chg="venue"></div><div class="field"><label>Courts</label>${esel("",[[2,"2 courts"],[3,"3 courts"],[4,"4 courts"],[6,"6 courts"]],nt.courts,"courts")}</div>`;
 if(s===3)b=nt.type==="league"?`<div class="two"><div class="field"><label>Number of teams</label>${esel("",[[4,"4 teams"],[6,"6 teams"],[8,"8 teams"]],nt.teams,"teams")}</div><div class="field"><label>Fee per team</label><input class="inp" inputmode="numeric" value="${nt.cats[0].fee}" data-chg="lfee"></div></div>
  <div class="two"><div class="field"><label>Players per team, at least</label><input class="inp" inputmode="numeric" value="${nt.pmin}" data-chg="pmin"></div><div class="field"><label>At most</label><input class="inp" inputmode="numeric" value="${nt.pmax}" data-chg="pmax"></div></div>
  <div class="field"><span class="lab">Matches in each tie</span><div class="chips">${["Men's doubles","Women's doubles","Mixed doubles","Men's singles","Women's singles"].map(x=>`<button type="button" class="chip" aria-pressed="${nt.tie.includes(x)}" data-act="tie" data-v="${x}">${x}</button>`).join("")}</div></div>`
  :`${nt.cats.map((x,i)=>`<div class="catrow"><label class="ck"><input type="checkbox" ${x.on?"checked":""} data-chg="con" data-i="${i}"><b>${esc(x.n)}</b></label><div class="two"><div class="field"><label>Max ${nt.type==="singles"?"players":"pairs"}</label><input class="inp" inputmode="numeric" value="${x.max}" data-chg="cmax" data-i="${i}"></div><div class="field"><label>Fee (₹)</label><input class="inp" inputmode="numeric" value="${x.fee}" data-chg="cfee" data-i="${i}"></div></div></div>`).join("")}
  ${nt.err?`<p class="err">${nt.err}</p>`:""}<button type="button" class="btn sec full" data-act="addcat">${I.plus}Add a category</button>`;
 if(s===4)b=`<div class="field"><span class="lab">Stage</span>${segb("nstage",nt.type==="league"?[["rr","Round robin"],["groups","Round robin, then playoffs"]]:[["rr","Round robin"],["ko","Knockout"],["groups","Groups, then KO"]],nt.stage)}</div>
  ${nt.stage==="groups"&&nt.type!=="league"?`<div class="two"><div class="field"><span class="lab">Groups</span>${segb("ngroups",[[1,"1"],[2,"2"],[4,"4"]],nt.groups)}</div><div class="field"><span class="lab">Top N go through</span>${segb("nadv",[[1,"1"],[2,"2"]],nt.adv)}</div></div>`:""}
  <div class="field"><span class="lab">Scoring</span>${segb("nscore",[["sideout","Side-out"],["rally","Rally"]],nt.scoring)}</div>
  <div class="two"><div class="field"><span class="lab">Games to</span>${segb("nto",[[11,"11"],[15,"15"],[21,"21"]],nt.to)}</div><div class="field"><span class="lab">Best of</span>${segb("nbo",[[1,"1"],[3,"3"]],nt.bo)}</div></div>
  <div class="two"><div class="field"><label>Match length</label>${esel("",[[20,"20 minutes"],[30,"30 minutes"],[40,"40 minutes"]],nt.len,"nlen")}</div><div class="field"><label>Points for a win</label>${esel("",[[1,"1 point"],[2,"2 points"],[3,"3 points"]],nt.ppw,"nppw")}</div></div>
  <p class="note">${I.info}<span>Ties in the points table are split by head to head, then game difference, then point difference. Every game is won by 2.</span></p>`;
 if(s===5)b=`<p class="sub" style="margin:0">Choose what players fill in and how entries are handled.</p>${formBuilder(nt,"new")}<button type="button" class="btn sec full" data-act="preview" data-id="new" style="margin-top:4px">Preview the form</button>`;
 if(s===6){const on=nt.cats.filter(x=>x.on);b=`<dl class="kv"><dt>Name</dt><dd>${esc(nt.name||"Winter Open")} <button class="lnk" data-act="goto" data-v="2">Edit</button></dd><dt>Type</dt><dd>${{singles:"Singles",doubles:"Doubles",league:"League"}[nt.type]} <button class="lnk" data-act="goto" data-v="1">Edit</button></dd><dt>Dates</dt><dd>${fmtDate(nt.start)} to ${fmtDate(nt.end)}</dd><dt>Categories</dt><dd>${nt.type==="league"?`${nt.teams} teams, ${inr(nt.cats[0].fee)} each`:on.map(x=>`${esc(x.n)}, ${inr(x.fee)}`).join("<br>")} <button class="lnk" data-act="goto" data-v="3">Edit</button></dd><dt>Format</dt><dd>${STAGE[nt.stage]}, ${nt.bo===1?"1 game":"best of "+nt.bo} to ${nt.to}, ${nt.scoring==="rally"?"rally":"side-out"} <button class="lnk" data-act="goto" data-v="4">Edit</button></dd><dt>Entry form</dt><dd>${nt.form.filter(f=>f.s!=="off").length+nt.custom.length} fields, ${nt.approval==="manual"?"you approve each":"automatic"}, entries ${fmtDate(nt.open)} to ${fmtDate(nt.close)} <button class="lnk" data-act="goto" data-v="5">Edit</button></dd></dl>
  <p class="note" style="margin-top:14px">${I.info}<span>Publishing lists it on Flexon Sports Hub and opens entries on ${fmtDate(nt.open)}.</span></p>`}
 return `<div class="page" style="max-width:600px">${backLink("#/tournaments","Tournaments")}<h1 class="title">${WL[s-1]}</h1><div class="steps">${WL.map((l,i)=>`<i class="${i<s?"on":""}"></i>`).join("")}</div><div class="step-l">Step ${s} of ${WL.length}, new tournament</div>${b}
  <div class="navb">${s>1?`<button class="btn sec" data-act="nprev">Back</button>`:"<span></span>"}${s<6?`<button class="btn" data-act="nnext">Continue</button>`:`<button class="btn" data-act="publish">Publish</button>`}</div></div>`};

const cfgOf=ctx=>ctx==="new"?nt:CFG[ctx];
document.addEventListener("change",e=>{const el=e.target.closest("[data-chg]");if(!el)return;const k=el.dataset.chg,c=cfgOf(el.dataset.ctx||"new"),v=el.type==="checkbox"?(el.checked?1:0):el.value;
 const re=()=>render();
 switch(k){case"field":c.form[+el.dataset.i].s=v;break;case"open":c.open=v;re();break;case"close":c.close=v;re();break;case"pay":c.pay=v;break;case"findp":c.findp=v;break;case"refunds":c.refunds=v;break;
  case"type":nt.type=v;nt.cats=defaultCats(v);nt.form=defaultForm(v);nt.stage=v==="league"?"rr":"groups";break;
  case"name":nt.name=v;break;case"start":nt.start=v;break;case"end":nt.end=v;break;case"venue":nt.venue=v;break;case"courts":nt.courts=+v;break;
  case"con":nt.cats[+el.dataset.i].on=v;break;case"cmax":nt.cats[+el.dataset.i].max=+v||0;break;case"cfee":nt.cats[+el.dataset.i].fee=+v||0;break;
  case"teams":nt.teams=+v;break;case"lfee":nt.cats[0].fee=+v||0;break;case"pmin":nt.pmin=+v;break;case"pmax":nt.pmax=+v;break;case"nlen":nt.len=+v;break;case"nppw":nt.ppw=+v;break;
  case"first":CFG[el.dataset.ctx].first=v;re();break;case"len":CFG[el.dataset.ctx].len=+v;re();break;
  case"access":OWNERS[el.dataset.team][2]=v;toast(v?"Owner can manage the team again":"Owner access paused");break}});
const segSet=(key)=>a=>{nt[key]=isNaN(+a.dataset.v)?a.dataset.v:+a.dataset.v;render()};
Object.assign(Acts,{
 nnext:()=>{nt.err="";if(nt.step===2&&!nt.name.trim()){nt.err="Give the tournament a name.";render();return}
  if(nt.step===3&&nt.type!=="league"&&!nt.cats.some(x=>x.on)){nt.err="Pick at least one category.";render();return}
  if(nt.step===5&&nt.close<nt.open){toast("Entries must close after they open");return}
  nt.step++;render();scrollTo(0,0)},
 nprev:()=>{nt.step--;nt.err="";render();scrollTo(0,0)},
 goto:a=>{nt.step=+a.dataset.v;render();scrollTo(0,0)},
 nstage:segSet("stage"),ngroups:segSet("groups"),nadv:segSet("adv"),nscore:segSet("scoring"),nto:segSet("to"),nbo:segSet("bo"),
 tie:a=>{const i=nt.tie.indexOf(a.dataset.v);i>=0?nt.tie.splice(i,1):nt.tie.push(a.dataset.v);render()},
 addcat:()=>sheet(`<h3>Add a category</h3><div class="field"><label for="c-n">Category name</label><input id="c-n" class="inp" placeholder="e.g. Men's doubles 4.0"></div><button class="btn full" data-act="addcat2">Add</button>`),
 addcat2:()=>{const n=$("#c-n").value.trim();if(!n){toast("Type a name");return}nt.cats.push({n,on:1,max:16,fee:nt.cats[0]?.fee||1400});closeSheet();render()},
 addq:a=>sheet(`<h3>Your own question</h3><div class="field"><label for="q-t">Question</label><input id="q-t" class="inp" placeholder="e.g. Which club do you train at?"></div><div class="field"><span class="lab">Answer type</span>${segb("noop",[["t","Short answer"],["c","Pick from a list"]],"t")}</div><button class="btn full" data-act="addq2" data-ctx="${a.dataset.ctx}">Add question</button>`),
 addq2:a=>{const q=$("#q-t").value.trim();if(!q){toast("Type the question");return}cfgOf(a.dataset.ctx).custom.push(q);closeSheet();render()},
 rmq:a=>{cfgOf(a.dataset.ctx).custom.splice(+a.dataset.i,1);render()},
 noop:a=>{a.parentElement.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b===a))},
 appr:a=>{cfgOf(a.dataset.ctx).approval=a.dataset.v;render()},
 full:a=>{cfgOf(a.dataset.ctx).full=a.dataset.v;render()},
 preview:a=>{const id=a.dataset.id;sheet(formPreview(cfgOf(id),id==="new"?(nt.name||"your tournament"):tById(id).name))},
 savereg:()=>toast("Entry form saved. Changes show on the site straight away."),
 publish:()=>{const id="t"+Date.now(),[y,mo,d]=nt.start.split("-");const on=nt.cats.filter(x=>x.on);
  T.push({id,name:nt.name||"Winter Open",yr:+y,status:"upcoming",reg:true,d:String(+d),mo:["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][+mo-1],dates:`${fmtDate(nt.start)} to ${fmtDate(nt.end)}`,venue:nt.venue,courts:nt.courts,entries:0,cap:nt.type==="league"?nt.teams:on.reduce((a,x)=>a+x.max,0),closes:fmtDate(nt.close),cats:nt.type==="league"?["Teams"]:on.map(x=>x.n),fmt:STAGE[nt.stage],fee:on[0]?.fee||0,unit:nt.type==="league"?"per team":nt.type==="singles"?"per player":"per pair"});
  CFG[id]={...JSON.parse(JSON.stringify(nt)),cats:nt.type==="league"?[{n:"Team league",on:1,max:nt.teams,fee:nt.cats[0].fee,taken:0}]:on.map(x=>({...x,taken:0})),drawn:0,sched:0,catSel:0};prog[id]=1;
  Object.assign(nt,{step:1,name:"",err:""});toast("Published. Entries open on "+fmtDate(CFG[id].open));location.hash=`#/at/${id}?tab=reg`},
 closeent:a=>{prog[a.dataset.id]=Math.max(prog[a.dataset.id],3);const t=tById(a.dataset.id);t.reg=false;toast("Entries closed. You can make the draw now.");render()},
 pcat:a=>{CFG[a.dataset.id].catSel=+a.dataset.i;render()},
 addentry:a=>{const c=CFG[a.dataset.id];sheet(`<h3>Add an entry</h3><p class="muted" style="margin:0 0 12px">For players who entered at the desk. They get a WhatsApp confirmation.</p><div class="field"><label>Category</label>${esel("",c.cats.filter(x=>x.on).map((x,i)=>[i,x.n]),c.catSel||0)}</div><div class="field"><label for="e-1">Player 1 name</label><input id="e-1" class="inp"></div><div class="field"><label for="e-1m">Player 1 mobile</label><div class="phone"><span>+91</span><input id="e-1m" class="inp" inputmode="numeric" maxlength="10"></div></div>${c.type==="doubles"?`<div class="field"><label for="e-2">Player 2 name</label><input id="e-2" class="inp"></div><div class="field"><label for="e-2m">Player 2 mobile</label><div class="phone"><span>+91</span><input id="e-2m" class="inp" inputmode="numeric" maxlength="10"></div></div>`:""}<label class="opt"><input type="checkbox" checked><span><b>Paid at the desk</b><small>Skip online payment for this entry</small></span><span></span></label><button class="btn full" data-act="addentry2" data-id="${a.dataset.id}">Add entry</button>`)},
 addentry2:a=>{const c=CFG[a.dataset.id],cat=c.cats[c.catSel||0];const n1=($("#e-1").value.trim()||"New Player").split(" ").pop(),n2=($("#e-2")?.value.trim()||"Partner").split(" ").pop();PAIRS.splice(Math.min(cat.taken,PAIRS.length),0,`${n1} / ${n2}`);cat.taken++;closeSheet();toast("Entry added");render()},
 pairing:a=>sheet(`<h3>Edit entry</h3><p class="muted" style="margin:0 0 12px">${esc(a.dataset.p)}</p><div class="field"><label>Change partner to</label>${esel("",[["","Keep the same partner"],...Object.keys(P).slice(0,8).map(k=>[k,P[k].n])],"")}</div><div class="field"><label>Status</label>${esel("",[["c","Confirmed"],["w","Waitlist"],["x","Withdrawn, refund"]],"c")}</div><button class="btn full" data-act="toast" data-msg="Entry updated. Both players are told.">Save</button>`),
 owner:a=>sheet(`<h3>Assign owner</h3><p class="muted" style="margin:0 0 12px">${esc(a.dataset.team)}</p><div class="field"><label for="o-n">Owner's name</label><input id="o-n" class="inp"></div><div class="field"><label for="o-m">Owner's mobile</label><div class="phone"><span>+91</span><input id="o-m" class="inp" inputmode="numeric" maxlength="10"></div></div><p class="muted" style="font-size:13px">They log in to the team owner app with this number and can only manage this team.</p><button class="btn full" data-act="owner2" data-team="${esc(a.dataset.team)}">Assign and send invite</button>`),
 owner2:a=>{const n=$("#o-n").value.trim()||"Riya Kapoor",m=$("#o-m").value.trim()||"98300 55512";OWNERS[a.dataset.team]=[n,m,1];closeSheet();toast("Owner assigned. Invite sent on WhatsApp.");render()},
 addteam:()=>sheet(`<h3>Add a team</h3><div class="field"><label for="tm-n">Team name</label><input id="tm-n" class="inp"></div><button class="btn full" data-act="addteam2">Add team</button>`),
 addteam2:()=>{const n=$("#tm-n").value.trim();if(!n){toast("Type a team name");return}OWNERS[n]=["","",0];closeSheet();render()},
 groups:a=>{CFG[a.dataset.id].groups=+a.dataset.v;delete draws[a.dataset.id];render()},
 adv:a=>{CFG[a.dataset.id].adv=+a.dataset.v;render()},
 gendraw:a=>{makeDraw(a.dataset.id);editSwap=false;swapA=null;toast("Draw made. Seeds are spread across groups.");render()},
 swapmode:()=>{editSwap=!editSwap;swapA=null;render()},
 swap:a=>{const id=parse().arg,g=+a.dataset.g,x=+a.dataset.x,d=draws[id];if(!swapA){swapA=[g,x];render();return}const [g0,x0]=swapA;[d.groups[g0][x0],d.groups[g][x]]=[d.groups[g][x],d.groups[g0][x0]];swapA=null;toast("Swapped");render()},
 confdraw:a=>{const c=CFG[a.dataset.id];c.drawn=1;editSwap=false;prog[a.dataset.id]=Math.max(prog[a.dataset.id],4);toast("Draw confirmed. Next: the schedule.");location.hash=`#/at/${a.dataset.id}?tab=schedule`},
 pubsched:a=>{CFG[a.dataset.id].sched=1;prog[a.dataset.id]=Math.max(prog[a.dataset.id],5);toast("Schedule published. Players and followers are told.");render()}
});


boot();
if(!STILL)setInterval(()=>{["m102","m103"].forEach(id=>{if(Math.random()>.55)return;const m=mById(id);if(m.status!=="live")return;const r=parse();if(r.name==="score"&&r.arg===id)return;m.log.push({w:Math.random()<m.bias?0:1,t:(m.log.at(-1)||{t:0}).t+.5});if(st(m).done){m.log.pop();return}
  if(r.name==="cm"&&r.arg===id){const y=scrollY;render();scrollTo(0,y);return}
  $$(`[data-m="${id}"][data-k="cc"]`).forEach(el=>{const c=+el.querySelector(".top b").textContent.replace(/\D/g,"");const d=document.createElement("div");d.innerHTML=courtCard(c);const n=d.firstElementChild;n.classList.add("flash");el.replaceWith(n)})})},5200);

})();