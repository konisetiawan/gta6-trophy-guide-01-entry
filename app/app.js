const byId = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const kindNames = ["story","crime","activities","side","misc","money","collectibles","world","completion","platinum"];
const tasks = [
  {label:"Main story chapters",current:0,total:4},{label:"Final story mission",current:0,total:1},{label:"Stranger mission strands",current:0,total:8},
  {label:"Collectible card sets",current:15,total:18},{label:"Challenges for 100%",current:70,total:80},{label:"Vehicles scanned",current:200,total:277},
  {label:"Animals studied",current:100,total:255},{label:"Stunts logged",current:300,total:397},{label:"Bank vaults robbed",current:0,total:5},
  {label:"Gang illegal operations",current:0,total:null},{label:"Bank jobs",current:0,total:null},{label:"Payday jobs",current:0,total:null},
  {label:"Different races won",current:0,total:20},{label:"Top Fun drone race locations",current:0,total:null},{label:"Shooting Range gold medals",current:0,total:null},
  {label:"Activity types sampled",current:0,total:null},{label:"Cal fishing challenge",current:0,total:1},{label:"Arcade games completed",current:0,total:1},
  {label:"Meditation spots",current:0,total:null},{label:"WAiNK locations",current:0,total:100},{label:"Shops robbed in one run",current:0,total:3},
  {label:"Combat Focus takedowns",current:0,total:5},{label:"Armored truck escapes",current:0,total:1},{label:"Undetected jewelry robberies",current:0,total:1},
  {label:"Garage properties",current:0,total:null},{label:"Shop spending ($)",current:0,total:100000},{label:"Marked Bills laundered ($)",current:0,total:250000},
  {label:"Scooter Bros registrations",current:0,total:10},{label:"Leonida exploration areas",current:0,total:null},{label:"Ocean Beach cocktail",current:0,total:1},
  {label:"Vehicle showroom escape",current:0,total:1},{label:"Kolt bowling alley follow-through",current:0,total:1},{label:"Story choice moments",current:0,total:null},
  {label:"Distinct 250-stunt milestone",current:0,total:250},{label:"50-challenge trophy milestone",current:0,total:50}
];
const taskDefault = tasks.map((t) => ({current:t.current,done:false}));
let trophies=[], roadmap={}, sources=[], activeTab="checklist", selectedId=14, spoiler=false, loaded=false;
let earned=new Set(), taskState=taskDefault;
let filters={search:"",kind:"all",grade:"all",status:"all"};
const readJson = (key,fallback) => { try { const x=JSON.parse(localStorage.getItem(key)); return x ?? fallback; } catch { return fallback; } };
const params=new URLSearchParams(location.search);
const seedValue=params.get("seed");
try {
  const [t,r,s]=await Promise.all([fetch("./data/trophies.json"),fetch("./data/roadmap.json"),fetch("./data/sources.json")]);
  if(!t.ok||!r.ok||!s.ok) throw new Error("A local data file could not be loaded.");
  [trophies,roadmap,sources]=await Promise.all([t.json(),r.json(),s.json()]);
  spoiler=readJson("ledger-spoiler",false);
  taskState=readJson("ledger-completion",taskDefault);
  if(seedValue!==null){
    const n=Math.max(0,Math.min(trophies.length,Number.parseInt(seedValue,10)||0));
    earned=new Set(trophies.filter(x=>x.id!==1).slice(0,n).map(x=>x.id));
    selectedId=trophies.find(x=>!earned.has(x.id)&&x.id!==1)?.id ?? 14;
    document.body.classList.add("seeded-view");
  } else {
    earned=new Set(readJson("ledger-earned",[]).filter(id=>trophies.some(trophy=>trophy.id===id)));
  }
  loaded=true;
} catch(error) {
  byId("view").innerHTML='<div class="loading-card">'+esc(error.message)+" Check that this folder is being served over HTTP from the app directory."+'</div>';
}

const trophyById=(id)=>trophies.find(t=>t.id===Number(id));
const srcByNo=(n)=>sources.find(s=>s.number===n);
const citeButtons=(numbers)=>numbers.map(n=>'<button class="cite-chip" data-open-source="'+n+'" title="Open source '+n+'">['+n+']</button>').join("");
const isWatch=(t)=>t.id===25;
const isMissable=(t)=>t.missable_status==="possibly missable";
const unconfirmed=(t)=>t.confirm_status==="unconfirmed";
const disagree=(t)=>Boolean(t.disagree);
function renderAudit(){
  const grades={platinum:0,gold:0,silver:0,bronze:0};
  trophies.forEach(t=>grades[t.grade]=(grades[t.grade]||0)+1);
  const guides=trophies.filter(t=>Array.isArray(t.sources)&&t.sources.length>0).length;
  const stepCount=trophies.reduce((n,t)=>n+t.steps.length,0), cited=trophies.reduce((n,t)=>n+t.steps.filter(s=>s.cites?.length>0).length,0);
  const read=sources.filter(s=>s.read&&s.read_date).length;
  const single=trophies.filter(t=>t.sources.length===1).length;
  byId("auditStrip").innerHTML='<b>'+trophies.length+' official</b> · '+grades.platinum+'P '+grades.gold+'G '+grades.silver+'S '+grades.bronze+'B · '+trophies.filter(t=>t.hidden).length+' hidden · '+guides+'/'+trophies.length+' guides cite a source · '+cited+'/'+stepCount+' steps cited · '+read+'/'+sources.length+' sources fetched · '+trophies.filter(isMissable).length+' possibly missable · '+trophies.filter(isWatch).length+' watch · '+trophies.filter(unconfirmed).length+' unconfirmed · '+single+' single-source · '+trophies.filter(disagree).length+' disagree';
}
function renderOverview(){
  const count=earned.size,pct=Math.round(count/trophies.length*100);
  byId("progressRing").style.setProperty("--progress",(pct*3.6)+"deg");
  byId("progressRing").setAttribute("aria-label",pct+" percent of trophies earned");
  byId("progressPercent").textContent=pct+"%";byId("earnedCount").textContent=count+" / "+trophies.length+" earned";
  const next=trophies.filter(t=>!earned.has(t.id)&&t.id!==1).sort((a,b)=>a.stage-b.stage||({bronze:0,silver:1,gold:2,platinum:3}[a.grade]-{bronze:0,silver:1,gold:2,platinum:3}[b.grade])||a.id-b.id)[0];
  byId("nextSuggestion").textContent=next?"Next up · Stage "+next.stage+" / "+next.name+" — "+next.description:"Ledger complete. The platinum is yours.";
}
function sourceCard(s){return '<article class="source-card"><span class="source-no">SOURCE '+s.number+'</span><strong>'+esc(s.name)+'</strong><p>'+esc(s.note)+'</p><p class="read-state">'+(s.read_date?"Read "+esc(s.read_date):"Not fetched in this session")+' · coverage '+esc(s.coverage_count)+'</p><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.url)+'</a></article>';}
function getFiltered(){
  const q=filters.search.trim().toLowerCase();
  const kind=filters.kind,grade=filters.grade,status=filters.status;
  return trophies.filter(t=>{
    if(spoiler&&t.kind==="story"&&!earned.has(t.id))return false;
    if(kind!=="all"&&t.kind!==kind)return false;if(grade!=="all"&&t.grade!==grade)return false;
    if(status==="earned"&&!earned.has(t.id))return false;if(status==="unearned"&&earned.has(t.id))return false;
    if(status==="missable"&&!isMissable(t))return false;if(status==="watch"&&!isWatch(t))return false;
    if(status==="unconfirmed"&&!unconfirmed(t))return false;if(status==="disagree"&&!disagree(t))return false;
    return !q||(t.name+" "+t.description+" "+t.guide).toLowerCase().includes(q);
  });
}
function trophyRow(t){
 return '<div class="trophy-row '+(earned.has(t.id)?"earned ":"")+(selectedId===t.id?"selected":"")+'" data-select="'+t.id+'" role="button" tabindex="0" aria-label="Open '+esc(t.name)+' guide"><button class="check-toggle" data-earned="'+t.id+'" aria-label="Mark '+esc(t.name)+' '+(earned.has(t.id)?"unearned":"earned")+'" aria-pressed="'+earned.has(t.id)+'">✓</button><span><span class="row-name">'+esc(t.name)+'</span><span class="row-desc">'+esc(t.description)+'</span></span><span class="row-meta"><span class="grade grade-'+esc(t.grade)+'">'+esc(t.grade)+'</span>'+(isMissable(t)?'<span class="flag">!</span>':"")+'</span></div>';
}
function detailHtml(t){
 if(!t)return '<div class="panel detail-panel"><div class="empty">Select a trophy to open its guide.</div></div>';
 const flags=[];if(isMissable(t))flags.push('<span class="flag miss">Possibly missable</span>');if(isWatch(t))flags.push('<span class="flag watch">Watch</span>');if(unconfirmed(t))flags.push('<span class="flag unconfirmed">Method unconfirmed</span>');if(disagree(t))flags.push('<span class="flag disagree">Disagreement · neither version selected</span>');
 const steps=t.steps.map((s,i)=>'<li>'+esc(s.text)+'<div class="step-cites">Sources '+citeButtons(s.cites)+'</div></li>').join("");
 const versions=t.disagree?'<div class="disagreement"><strong>OPEN DISAGREEMENT · NO VERSION PICKED</strong><p>'+esc(t.disagree.note)+'</p>'+t.disagree.versions.map(v=>'<div class="version">Source ['+v.source+'] says: '+esc(v.text)+'</div>').join("")+'</div>':"";
 return '<article class="panel detail-panel"><div class="detail-top"><div><span class="detail-id">TROPHY '+String(t.id).padStart(2,"0")+' / 55</span><h2>'+esc(t.name)+'</h2></div><span class="grade grade-'+esc(t.grade)+'">'+esc(t.grade)+'</span></div><p class="official-desc">'+esc(t.description)+'</p><div class="flag-row">'+flags.join("")+'</div><div class="column-kicker">FIELD GUIDE</div><p class="guide-copy">'+esc(t.guide)+'</p><h3 class="steps-title">ROUTE NOTES · EACH STEP HAS A SOURCE</h3><ol class="steps">'+steps+'</ol>'+versions+'</article>';
}
function checklistHtml(){
 const t=trophyById(selectedId);const visible=getFiltered();
 const filtersHtml='<div class="filter-box"><input class="search" id="searchBox" type="search" placeholder="Search trophies, hints…" aria-label="Search trophies" value="'+esc(filters.search)+'"><select id="kindFilter" aria-label="Filter by kind"><option value="all">All kinds</option>'+kindNames.map(k=>'<option value="'+k+'" '+(filters.kind===k?"selected":"")+'>'+k[0].toUpperCase()+k.slice(1)+'</option>').join("")+'</select><select id="gradeFilter" aria-label="Filter by grade"><option value="all">All grades</option>'+["platinum","gold","silver","bronze"].map(g=>'<option value="'+g+'" '+(filters.grade===g?"selected":"")+'>'+g[0].toUpperCase()+g.slice(1)+'</option>').join("")+'</select><select id="statusFilter" aria-label="Filter by status"><option value="all" '+(filters.status==="all"?"selected":"")+'>All status</option><option value="earned" '+(filters.status==="earned"?"selected":"")+'>Earned</option><option value="unearned" '+(filters.status==="unearned"?"selected":"")+'>Unearned</option><option value="missable" '+(filters.status==="missable"?"selected":"")+'>Possibly missable</option><option value="watch" '+(filters.status==="watch"?"selected":"")+'>Watch</option><option value="unconfirmed" '+(filters.status==="unconfirmed"?"selected":"")+'>Unconfirmed</option><option value="disagree" '+(filters.status==="disagree"?"selected":"")+'>Disagree</option></select><label class="spoiler"><input id="spoilerToggle" type="checkbox" '+(spoiler?"checked":"")+'> Hide unearned story trophies (spoiler guard)</label></div>';
 const related=[...new Set([...(t?.sources||[]),...(t?.steps||[]).flatMap(s=>s.cites||[])])].map(srcByNo).filter(Boolean);
 return '<div class="check-grid"><section class="panel trophy-panel"><div class="panel-head"><h2>Trophy checklist</h2><small>'+visible.length+' shown · click circle to track</small></div>'+filtersHtml+'<div class="trophy-list">'+(visible.length?visible.map(trophyRow).join(""):'<div class="empty">No trophies match these filters.</div>')+'</div></section>'+detailHtml(t)+'<aside class="panel source-panel"><div class="panel-head"><h2>Guide sources</h2><small>for selected trophy</small></div><div class="source-list">'+(related.length?related.map(sourceCard).join(""):'<div class="empty">No source linked yet.</div>')+'</div></aside></div>';
}
function completionCount(){return taskState.reduce((n,state,i)=>n+((tasks[i].total!==null?state.current>=tasks[i].total:state.done)?1:0),0);}
function tasksHtml(compact=false){return '<div class="task-grid">'+tasks.map((t,i)=>{const st=taskState[i]||{current:t.current,done:false};const checked=t.total!==null?st.current>=t.total:st.done;return '<div class="task-row"><input class="task-check" type="checkbox" data-task-done="'+i+'" '+(checked?'checked':'')+' aria-label="Mark '+esc(t.label)+' complete"><span class="task-label">'+esc(t.label)+'</span><span class="task-count"><strong>'+Number(st.current||0)+'</strong>'+(t.total!==null?' / '+t.total:' logged')+'<span class="stepper"><button data-task-step="'+i+'" data-delta="-1" aria-label="Decrease '+esc(t.label)+'">−</button><button data-task-step="'+i+'" data-delta="1" aria-label="Increase '+esc(t.label)+'">+</button></span></span></div>';}).join("")+'</div>';}
function roadmapHtml(){
 const stageCards=roadmap.stages.map(st=>'<article class="stage-card"><div class="stage-num">0'+st.id+'</div><div><h3>'+esc(st.title)+'</h3><p>'+st.trophy_ids.length+' trophy targets · '+esc(st.hours)+' h estimate</p><div class="stage-trophies">'+st.trophy_ids.map(id=>{const t=trophyById(id);return t?'<span class="mini-trophy '+(isMissable(t)?"is-missable":"")+'">'+(isMissable(t)?'⚑ ':'')+esc(t.name)+(earned.has(id)?' ✓':'')+'</span>':""}).join("")+'</div></div><span class="stage-hours">'+esc(st.hours)+'h</span></article>').join("");
 return '<div class="two-col"><section class="panel"><div class="panel-head"><h2>Seven-stage route to platinum</h2><small>~'+esc(roadmap.estimated_hours)+' hours · '+esc(roadmap.difficulty)+'/10</small></div><div class="roadmap-list">'+stageCards+'</div></section><section class="panel"><div class="completion-head"><h3>100% completion checklist</h3><span>'+completionCount()+' / 35 categories complete</span></div><div class="completion-tools">Starting counters are guide planning notes. Use +/− to track your own run; unknown totals stay open ended.</div><div class="compact-check">'+tasksHtml(true)+'</div></section></div>';
}
function completionHtml(){return '<section class="panel full-completion"><div class="completion-head"><h3>100% completion · field checklist</h3><span>'+completionCount()+' / 35 tasks complete</span></div><div class="completion-tools">The five published planning counters are prefilled: 15/18 card sets · 70/80 challenges · 200/277 vehicles · 100/255 animals · 300/397 stunts. Your edits save in this browser.</div><div class="compact-check">'+tasksHtml()+'</div></section>';}
function missablesHtml(){
 const groups=[{title:"Possibly missable",items:trophies.filter(isMissable),copy:"The guide brief flags the Chapter 1 balcony meditation as the only possible missable."},{title:"Watch",items:trophies.filter(isWatch),copy:"Stranger strand eligibility is still being checked. Race Yago as soon as he appears in Chapter 3."},{title:"Unconfirmed methods",items:trophies.filter(unconfirmed),copy:"These method triggers remain unconfirmed; log attempts and avoid treating a guess as settled."},{title:"Open disagreements",items:trophies.filter(disagree),copy:"Both reported versions are shown on each trophy. The ledger selects neither version."}];
 return '<div class="flag-groups">'+groups.map(g=>'<section class="panel flag-card"><h3>'+esc(g.title)+' · '+g.items.length+'</h3><p>'+esc(g.copy)+'</p>'+g.items.map(t=>'<p><button class="flag-link" data-select="'+t.id+'">'+esc(t.name)+' — '+esc(t.guide)+'</button></p>').join("")+'</section>').join("")+'</div>';
}
const caveat="Trophy names, descriptions, grades and hidden flags come from the PlayStation 5 list supplied in this bounty kit and identified there as mirrored by Exophase and PSNProfiles. Rockstar Games has published no trophy list of its own according to the supplied brief. Guide steps are original task-oriented notes based on the trophy wording and brief; the named launch-day guides (PowerPyx, Push Square, Insider Gaming, KeenGamer, OutputLag, GTA-Zone) could not be fetched in this session, and we have not played the game. Treat methods, source disagreements, counts and locations as unverified until those pages and player reports can be checked. The brief dates its counts and locations 20 Nov 2026.";
function sourcesHtml(){return '<section class="panel"><div class="panel-head"><h2>Source matrix</h2><small>'+sources.filter(s=>s.read).length+' / '+sources.length+' fetched this session</small></div><div style="overflow:auto"><table class="source-matrix"><thead><tr><th>#</th><th>Source</th><th>Coverage</th><th>Read date</th><th>Access note</th></tr></thead><tbody>'+sources.map(s=>'<tr><td>'+s.number+'</td><td><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.name)+'</a><br><small>'+esc(s.url)+'</small></td><td class="coverage">'+esc(s.coverage_count)+' trophies</td><td>'+esc(s.read_date||"Not read")+'</td><td>'+esc(s.note)+'</td></tr>').join("")+'</tbody></table></div><p class="caveat">'+esc(caveat)+'</p></section>';}
function render(){
 renderAudit();renderOverview();
 document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===activeTab));
 byId("view").innerHTML=activeTab==="checklist"?checklistHtml():activeTab==="roadmap"?roadmapHtml():activeTab==="missables"?missablesHtml():activeTab==="sources"?sourcesHtml():completionHtml();
}
function persist(){if(params.has("seed"))return;localStorage.setItem("ledger-earned",JSON.stringify([...earned]));}
function setEarned(id,value){if(value)earned.add(Number(id));else earned.delete(Number(id));persist();render();}
function saveTasks(){localStorage.setItem("ledger-completion",JSON.stringify(taskState));render();}
document.addEventListener("click",(event)=>{
 const tab=event.target.closest(".tab");if(tab){activeTab=tab.dataset.tab;render();return;}
 const earn=event.target.closest("[data-earned]");if(earn){event.stopPropagation();const id=Number(earn.dataset.earned);setEarned(id,!earned.has(id));return;}
 const select=event.target.closest("[data-select]");if(select){selectedId=Number(select.dataset.select);if(activeTab!=="checklist")activeTab="checklist";render();return;}
 const cite=event.target.closest("[data-open-source]");if(cite){activeTab="sources";render();return;}
 const step=event.target.closest("[data-task-step]");if(step){const i=Number(step.dataset.taskStep),d=Number(step.dataset.delta),task=tasks[i];taskState[i]=taskState[i]||{current:task.current,done:false};taskState[i].current=Math.max(0,Number(taskState[i].current||0)+d);if(task.total!==null)taskState[i].current=Math.min(task.total,taskState[i].current);taskState[i].done=task.total!==null&&taskState[i].current>=task.total;saveTasks();return;}
});
document.addEventListener("change",(event)=>{
 if(event.target.id==="spoilerToggle"){spoiler=event.target.checked;localStorage.setItem("ledger-spoiler",JSON.stringify(spoiler));render();return;}
 if(event.target.matches("[data-task-done]")){const i=Number(event.target.dataset.taskDone),task=tasks[i];taskState[i]=taskState[i]||{current:task.current,done:false};taskState[i].done=event.target.checked;if(event.target.checked&&task.total!==null)taskState[i].current=task.total;if(!event.target.checked&&task.total!==null&&taskState[i].current>=task.total)taskState[i].current=Math.max(0,task.total-1);saveTasks();return;}
 if(["kindFilter","gradeFilter","statusFilter"].includes(event.target.id)){filters[event.target.id==="kindFilter"?"kind":event.target.id==="gradeFilter"?"grade":"status"]=event.target.value;render();}
});
document.addEventListener("input",(event)=>{if(event.target.id==="searchBox"){const pos=event.target.selectionStart;filters.search=event.target.value;render();const next=byId("searchBox");next.focus();next.setSelectionRange(pos,pos);}});
if(loaded)render();
byId("exportProgress").addEventListener("click",()=>{
 const payload={format:"leonida-ledger-progress",version:1,earned_trophy_ids:[...earned].sort((a,b)=>a-b),completion:taskState,exported_at:new Date().toISOString()};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="leonida-ledger-progress.json";a.click();URL.revokeObjectURL(url);
});
byId("importFile").addEventListener("change",async(event)=>{
 const file=event.target.files?.[0];if(!file)return;
 try{const value=JSON.parse(await file.text());const ids=value.earned_trophy_ids??value.earned;if(!Array.isArray(ids))throw new Error("Progress file needs an earned_trophy_ids array.");earned=new Set(ids.map(Number).filter(id=>trophyById(id)));if(Array.isArray(value.completion))taskState=tasks.map((t,i)=>({current:Math.max(0,Number(value.completion[i]?.current??t.current)),done:Boolean(value.completion[i]?.done)}));persist();localStorage.setItem("ledger-completion",JSON.stringify(taskState));render();}catch(error){window.alert("Could not import progress: "+error.message);}event.target.value="";
});
