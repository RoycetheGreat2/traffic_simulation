/* === Rendering, Chart, Controls === */

/* --- Chart --- */
let qChart = null;
function initChart(){
  if(qChart) qChart.destroy();
  qChart = new Chart(document.getElementById('qChart'),{
    type:'line',
    data:{labels:[],datasets:[
      {label:'N/S queue',data:[],borderColor:'#5eda5e',backgroundColor:'rgba(94,218,94,0.1)',tension:.3,pointRadius:0,fill:true,borderWidth:1.5},
      {label:'E/W queue',data:[],borderColor:'#5eb8da',backgroundColor:'rgba(94,184,218,0.1)',tension:.3,pointRadius:0,fill:true,borderWidth:1.5}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{display:false},y:{display:true,ticks:{font:{size:10}},grid:{color:'rgba(128,128,128,0.1)'},min:0}},animation:false}
  });
}
function updateChart(){
  if(!qChart) return;
  qChart.data.labels=histLabels.slice(-40);
  qChart.data.datasets[0].data=histNS.slice(-40);
  qChart.data.datasets[1].data=histEW.slice(-40);
  qChart.update('none');
}

/* --- Drawing --- */
function drawIntersection(){
  const isDark = document.documentElement.getAttribute('data-theme')==='dark';
  const roadCol = isDark?'#2a2a2a':'#4a4a4a';
  const bgCol = isDark?'#1a1a1a':'#d4edaa';
  const markCol = isDark?'#666':'#999';

  ctx.fillStyle=bgCol; ctx.fillRect(0,0,W,H);

  // Roads
  ctx.fillStyle=roadCol;
  ctx.fillRect(cx-55,0,110,H);
  ctx.fillRect(0,cy-45,W,90);

  // Center lane dividers
  ctx.setLineDash([18,10]); ctx.strokeStyle=markCol; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(cx,cy-50); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx,cy+50); ctx.lineTo(cx,H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(cx-55,cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+55,cy); ctx.lineTo(W,cy); ctx.stroke();
  ctx.setLineDash([]);

  // Intersection box
  ctx.fillStyle=isDark?'#333':'#5a5a5a';
  ctx.fillRect(cx-55,cy-45,110,90);

  // Stop lines
  ctx.strokeStyle='#fff'; ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(cx-54,cy-50);ctx.lineTo(cx+54,cy-50);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx-54,cy+50);ctx.lineTo(cx+54,cy+50);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx-56,cy-44);ctx.lineTo(cx-56,cy+44);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx+56,cy-44);ctx.lineTo(cx+56,cy+44);ctx.stroke();

  // Traffic lights
  drawLight(cx-38, cy-82, 'NS', isDark);   // Top, left of center
  drawLight(cx+22, cy+68, 'NS', isDark);   // Bottom, right of center
  drawLight(cx-110, cy-28, 'EW', isDark);  // Left side
  drawLight(cx+85, cy+8, 'EW', isDark);    // Right side

  // Draw all vehicles in all lanes
  for(const [ln, vehs] of Object.entries(lanes)){
    const ld = LANE_DEFS[ln];
    vehs.forEach(v=>{
      let sx, sy, orient;
      if(ld.axis==='y'){
        sx = ld.fx; sy = v.pos;
        orient = ld.dir===1 ? 0 : Math.PI;
      } else {
        sx = v.pos; sy = ld.fy;
        orient = ld.dir===1 ? Math.PI/2 : -Math.PI/2;
      }
      // Fade in/out at edges
      let alpha = 1;
      if(ld.dir===1){
        if(v.pos < ld.spawn+30) alpha = Math.max(0,(v.pos-ld.spawn)/30);
        if(v.pos > ld.exit-40) alpha = Math.max(0,(ld.exit-v.pos)/40);
      } else {
        if(v.pos > ld.spawn-30) alpha = Math.max(0,(ld.spawn-v.pos)/30);
        if(v.pos < ld.exit+40) alpha = Math.max(0,(v.pos-ld.exit)/40);
      }
      ctx.globalAlpha = Math.min(1,Math.max(0,alpha));
      drawCar(sx, sy, orient, v.color);
      ctx.globalAlpha = 1;
    });
  }

  // Direction labels
  ctx.fillStyle=isDark?'rgba(255,255,255,0.4)':'rgba(0,0,0,0.35)';
  ctx.font='11px var(--font-sans)';
  ctx.textAlign='center'; ctx.fillText('N',cx,14); ctx.fillText('S',cx,H-4);
  ctx.textAlign='left'; ctx.fillText('W',4,cy+4);
  ctx.textAlign='right'; ctx.fillText('E',W-4,cy+4);
  ctx.textAlign='left';
}

function drawLight(x,y,dir,isDark){
  ctx.fillStyle=isDark?'#222':'#333';
  ctx.beginPath(); ctx.roundRect(x,y,18,48,5); ctx.fill();
  const isN=dir==='NS';
  const red=isN?(phase==='EW_GREEN'||phase==='EW_YELLOW'):(phase==='NS_GREEN'||phase==='NS_YELLOW');
  const yel=isN?phase==='NS_YELLOW':phase==='EW_YELLOW';
  const grn=isN?phase==='NS_GREEN':phase==='EW_GREEN';
  ctx.beginPath();ctx.arc(x+9,y+10,6,0,Math.PI*2);ctx.fillStyle=red?'#ff3333':(isDark?'#3a1a1a':'#6b2222');ctx.fill();
  ctx.beginPath();ctx.arc(x+9,y+24,6,0,Math.PI*2);ctx.fillStyle=yel?'#fcd34d':(isDark?'#3a2a00':'#6b5000');ctx.fill();
  ctx.beginPath();ctx.arc(x+9,y+38,6,0,Math.PI*2);ctx.fillStyle=grn?'#22c55e':(isDark?'#0a2a1a':'#1a4a2a');ctx.fill();
}

function drawCar(x,y,rot,color){
  ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
  ctx.fillStyle=color;
  ctx.beginPath(); ctx.roundRect(-CAR_W/2,-CAR_H/2,CAR_W,CAR_H,2); ctx.fill();
  ctx.fillStyle='rgba(180,220,255,0.7)';
  ctx.fillRect(-CAR_W/2+2,-CAR_H/2+2,CAR_W-4,5);
  ctx.restore();
}

/* --- Spawn Log Renderer --- */
let lastLogLen = 0;
function renderSpawnLog(){
  if(spawnLog.length === lastLogLen) return;
  lastLogLen = spawnLog.length;
  const el = document.getElementById('vehLog');
  if(!el) return;
  el.innerHTML = '';
  spawnLog.forEach(s=>{
    const row = document.createElement('div');
    row.className = 'veh-entry';
    row.innerHTML = '<span class="veh-dot" style="background:'+s.color+'"></span>'+
      '<span class="veh-dir">'+s.label+'</span>'+
      '<span class="veh-id">#'+s.id+'</span>'+
      '<span class="veh-time">'+s.time+'s</span>';
    el.appendChild(row);
  });
}

/* --- Main Loop --- */
function tick(ts){
  if(!running) return;
  if(!lastTs) lastTs=ts;
  const dt=Math.min((ts-lastTs)/1000,0.1);
  lastTs=ts;
  simTime+=dt;
  const p=getParams();
  spawnVehicles(dt,p);
  updatePhase(dt,p);
  updateAllVehicles(dt);
  updateMetrics();
  drawIntersection();
  renderSpawnLog();
  chartTimer+=dt;
  if(chartTimer>=3){
    chartTimer=0;
    histLabels.push(Math.round(simTime));
    histNS.push(getQueueCount(['NS_S','NS_N']));
    histEW.push(getQueueCount(['EW_E','EW_W']));
    updateChart();
  }
  animFrame=requestAnimationFrame(tick);
}

/* --- UI Controls --- */
function setSlider(id,valId,val,unit){
  document.getElementById(id).value=val;
  document.getElementById(valId).textContent=val+unit;
}
function updateSlider(id,valId,display){
  document.getElementById(valId).textContent=display;
}
function setScenario(name,btn){
  document.querySelectorAll('.scenario-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const s=SCENARIOS[name];
  setSlider('greenNS','greenNSVal',s.greenNS,'s');
  setSlider('greenEW','greenEWVal',s.greenEW,'s');
  setSlider('yellowT','yellowTVal',s.yellow,'s');
  setSlider('rateNS','rateNSVal',s.rateNS,'/min');
  setSlider('rateEW','rateEWVal',s.rateEW,'/min');
  if(name==='emergency') addLog('\u26A1 Emergency mode','warn');
  else addLog('Scenario: '+name);
}
function toggleSim(){
  running=!running;
  const btn=document.getElementById('startBtn'),lbl=document.getElementById('startLabel'),ico=btn.querySelector('i');
  if(running){btn.classList.add('running');lbl.textContent='Stop simulation';ico.className='ti ti-player-pause';lastTs=null;addLog('Started');animFrame=requestAnimationFrame(tick);}
  else{btn.classList.remove('running');lbl.textContent='Start simulation';ico.className='ti ti-player-play';if(animFrame)cancelAnimationFrame(animFrame);addLog('Paused');}
}
function resetSim(){
  running=false; if(animFrame)cancelAnimationFrame(animFrame);
  simTime=0;phaseTimer=0;phase='NS_GREEN';
  lanes={NS_S:[],NS_N:[],EW_E:[],EW_W:[]};
  passed=0;passedInWindow=[];
  totalWaitNS=0;cntNS=0;totalWaitEW=0;cntEW=0;
  histNS=[];histEW=[];histLabels=[];
  chartTimer=0;logThrottle={};
  spawnT={NS_S:2,NS_N:2.5,EW_E:3,EW_W:3.5};
  spawnLog=[];lastLogLen=0;
  const btn=document.getElementById('startBtn');
  btn.classList.remove('running');
  document.getElementById('startLabel').textContent='Start simulation';
  btn.querySelector('i').className='ti ti-player-play';
  ['waitNS','waitEW','queueNS','queueEW','throughput','simTime'].forEach(id=>document.getElementById(id).textContent='0');
  initChart(); drawIntersection();
  const box=document.getElementById('logBox');
  box.innerHTML='<div class="log-line" style="color:var(--color-text-tertiary)">Simulation reset. Press Start to begin.</div>';
  document.getElementById('vehLog').innerHTML='<div class="veh-entry" style="color:var(--color-text-tertiary);justify-content:center">No vehicles yet</div>';
  addLog('Ready');
}
function toggleTheme(){
  const html=document.documentElement;
  const next=html.getAttribute('data-theme')==='dark'?'light':'dark';
  html.setAttribute('data-theme',next);
  localStorage.setItem('theme',next);
  document.getElementById('themeIcon').className=next==='dark'?'ti ti-sun':'ti ti-moon';
  drawIntersection();
}

/* --- Init --- */
(function(){
  const saved=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
  document.documentElement.setAttribute('data-theme',saved);
  const ico=document.getElementById('themeIcon');
  if(ico) ico.className=saved==='dark'?'ti ti-sun':'ti ti-moon';
  initChart(); drawIntersection();
})();
