/* === Traffic Sim Core Engine === */
const canvas = document.getElementById('intersection');
const ctx = canvas.getContext('2d');
canvas.width = 600; canvas.height = 320;
const W = 600, H = 320, cx = W/2, cy = H/2;

const CAR_W = 12, CAR_H = 18, CAR_GAP = 10;
const CAR_SPACING = CAR_H + CAR_GAP;
const MAX_SPEED = 90, ACCEL = 55, DECEL = 120;

const LANE_DEFS = {
  NS_S: { fx: cx-20, axis:'y', dir:1,  spawn:-30,  stop:cy-52, exit:H+50 },
  NS_N: { fx: cx+20, axis:'y', dir:-1, spawn:H+30, stop:cy+52, exit:-50  },
  EW_E: { fy: cy-16, axis:'x', dir:1,  spawn:-30,  stop:cx-58, exit:W+50 },
  EW_W: { fy: cy+16, axis:'x', dir:-1, spawn:W+30, stop:cx+58, exit:-50  }
};

let running=false, animFrame=null, simTime=0, lastTs=null;
let phase='NS_GREEN', phaseTimer=0;
let passed=0, passedInWindow=[];
let histNS=[], histEW=[], histLabels=[];
let totalWaitNS=0, cntNS=0, totalWaitEW=0, cntEW=0;
let chartTimer=0, vId=0;
let lanes = { NS_S:[], NS_N:[], EW_E:[], EW_W:[] };
let spawnT = { NS_S:2, NS_N:2.5, EW_E:3, EW_W:3.5 };
let spawnLog = [];

const SCENARIOS = {
  normal:    {rateNS:8, rateEW:6, greenNS:30,greenEW:25,yellow:4},
  rush:      {rateNS:18,rateEW:16,greenNS:45,greenEW:40,yellow:3},
  low:       {rateNS:3, rateEW:2, greenNS:20,greenEW:15,yellow:5},
  emergency: {rateNS:8, rateEW:6, greenNS:10,greenEW:10,yellow:2}
};
const carColors=['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#e91e63'];
function rndColor(){ return carColors[Math.floor(Math.random()*carColors.length)]; }

function isNS(ln){ return ln==='NS_S'||ln==='NS_N'; }
function greenFor(ln){
  if(isNS(ln)) return phase==='NS_GREEN'||phase==='NS_YELLOW';
  return phase==='EW_GREEN'||phase==='EW_YELLOW';
}

function getParams(){
  return {
    greenNS:+document.getElementById('greenNS').value,
    greenEW:+document.getElementById('greenEW').value,
    yellow:+document.getElementById('yellowT').value,
    rateNS:+document.getElementById('rateNS').value,
    rateEW:+document.getElementById('rateEW').value
  };
}

/* --- Spawning --- */
const LANE_LABELS={NS_S:'N→S',NS_N:'S→N',EW_E:'W→E',EW_W:'E→W'};
function spawnVehicle(ln, ld, interval){
  const col=rndColor();
  const v={id:vId++,lane:ln,pos:ld.spawn,speed:MAX_SPEED,color:col,
    arrivalTime:simTime,waitStart:null,hasPassed:false,counted:false};
  lanes[ln].push(v);
  spawnLog.unshift({id:v.id,color:col,lane:ln,label:LANE_LABELS[ln],time:Math.round(simTime)});
  if(spawnLog.length>40) spawnLog.length=40;
  spawnT[ln]=interval*(0.5+Math.random());
}
function spawnVehicles(dt, p){
  const intNS=120/p.rateNS, intEW=120/p.rateEW;
  ['NS_S','NS_N'].forEach(ln=>{ spawnT[ln]-=dt; if(spawnT[ln]<=0) spawnVehicle(ln,LANE_DEFS[ln],intNS); });
  ['EW_E','EW_W'].forEach(ln=>{ spawnT[ln]-=dt; if(spawnT[ln]<=0) spawnVehicle(ln,LANE_DEFS[ln],intEW); });
}

/* --- Phase --- */
function updatePhase(dt, p){
  phaseTimer+=dt;
  if(phase==='NS_GREEN'&&phaseTimer>=p.greenNS){phase='NS_YELLOW';phaseTimer=0;addLog('N/S → yellow','warn');}
  else if(phase==='NS_YELLOW'&&phaseTimer>=p.yellow){phase='EW_GREEN';phaseTimer=0;addLog('E/W → green','pass');}
  else if(phase==='EW_GREEN'&&phaseTimer>=p.greenEW){phase='EW_YELLOW';phaseTimer=0;addLog('E/W → yellow','warn');}
  else if(phase==='EW_YELLOW'&&phaseTimer>=p.yellow){phase='NS_GREEN';phaseTimer=0;addLog('N/S → green','pass');}
}

/* --- Vehicle Physics (sequential acceleration model) --- */
function updateAllVehicles(dt){
  for(const [ln, vehs] of Object.entries(lanes)){
    const ld = LANE_DEFS[ln];
    const d = ld.dir;
    const green = greenFor(ln);

    // Sort: frontmost first (closest to exit)
    vehs.sort((a,b)=> d===1 ? b.pos-a.pos : a.pos-b.pos);

    for(let i=0;i<vehs.length;i++){
      const v = vehs[i];
      const pastStop = d===1 ? v.pos>ld.stop : v.pos<ld.stop;

      // 1. Red-light hard stop position
      let redStop = null;
      if(!pastStop && !green){
        redStop = ld.stop - d*(CAR_H/2+4);
      }

      // 2. Car-following gap analysis
      let gap = Infinity, aheadSpeed = MAX_SPEED, followStop = null;
      if(i>0){
        const ah = vehs[i-1];
        gap = (ah.pos - v.pos)*d - CAR_H; // bumper-to-bumper
        aheadSpeed = ah.speed;
        followStop = ah.pos - d*CAR_SPACING;
      }

      // 3. Pick most restrictive hard stop
      let hardStop = null;
      if(redStop!==null && followStop!==null)
        hardStop = d===1 ? Math.min(redStop,followStop) : Math.max(redStop,followStop);
      else hardStop = redStop!==null ? redStop : followStop;

      // 4. Compute motion
      if(hardStop!==null){
        const dist = (hardStop - v.pos)*d;

        if(dist<=0.5){
          // At stop point: match ahead car speed or full stop
          if(redStop!==null && (followStop===null || (d===1?redStop<=followStop:redStop>=followStop))){
            v.speed=0; // Hard red-light stop
          } else {
            v.speed = Math.max(0, Math.min(v.speed, aheadSpeed));
          }
          if(dist<=0) v.pos=hardStop;
        } else {
          const bd = v.speed*v.speed/(2*DECEL);
          if(bd >= dist*0.8){
            // Must brake
            v.speed = Math.max(0, v.speed - DECEL*dt);
          } else if(gap!==Infinity && gap < CAR_GAP*2.5){
            // Close following: accelerate up to ahead car speed
            v.speed = Math.min(Math.max(aheadSpeed, v.speed), v.speed + ACCEL*dt);
            v.speed = Math.min(MAX_SPEED, v.speed);
          } else {
            // Free to accelerate
            v.speed = Math.min(MAX_SPEED, v.speed + ACCEL*dt);
          }
        }
      } else {
        // No constraints
        v.speed = Math.min(MAX_SPEED, v.speed + ACCEL*dt);
      }

      // Track waiting
      if(v.speed<0.5 && !v.waitStart) v.waitStart=simTime;

      // Track passing
      if(pastStop && !v.hasPassed){
        v.hasPassed=true;
        if(v.waitStart && !v.counted){
          const wt=Math.round(simTime-v.waitStart);
          if(isNS(ln)){totalWaitNS+=wt;cntNS++;}
          else{totalWaitEW+=wt;cntEW++;}
          v.counted=true;
        }
        passed++; passedInWindow.push(simTime);
      }

      v.pos += v.speed*d*dt;
    }

    // Cull exited
    lanes[ln]=vehs.filter(v=> d===1? v.pos<ld.exit : v.pos>ld.exit);
  }
}

/* --- Metrics --- */
function getQueueCount(laneNames){
  let c=0;
  laneNames.forEach(ln=> lanes[ln].forEach(v=>{ if(v.speed<1&&!v.hasPassed) c++; }));
  return c;
}
function updateMetrics(){
  const aw=cntNS>0?Math.round(totalWaitNS/cntNS):0;
  const ae=cntEW>0?Math.round(totalWaitEW/cntEW):0;
  document.getElementById('waitNS').textContent=aw;
  document.getElementById('waitEW').textContent=ae;
  document.getElementById('queueNS').textContent=getQueueCount(['NS_S','NS_N']);
  document.getElementById('queueEW').textContent=getQueueCount(['EW_E','EW_W']);
  document.getElementById('simTime').textContent=Math.round(simTime);
  passedInWindow=passedInWindow.filter(t=>t>simTime-60);
  document.getElementById('throughput').textContent=passedInWindow.length;

  const nb=document.getElementById('ns-badge'),eb=document.getElementById('ew-badge'),tb=document.getElementById('timer-badge');
  tb.textContent='T: '+Math.round(phaseTimer)+'s';
  if(phase==='NS_GREEN'){nb.className='phase-badge phase-ns-green';nb.textContent='N/S green';eb.className='phase-badge phase-red';eb.textContent='E/W red';}
  else if(phase==='NS_YELLOW'){nb.className='phase-badge phase-ns-yellow';nb.textContent='N/S yellow';eb.className='phase-badge phase-red';eb.textContent='E/W red';}
  else if(phase==='EW_GREEN'){nb.className='phase-badge phase-red';nb.textContent='N/S red';eb.className='phase-badge phase-ew-green';eb.textContent='E/W green';}
  else{nb.className='phase-badge phase-red';nb.textContent='N/S red';eb.className='phase-badge phase-ew-yellow';eb.textContent='E/W yellow';}
}

/* --- Log --- */
let logThrottle={};
function addLog(msg,type){
  const key=msg.substring(0,20);
  const now=simTime;
  if(logThrottle[key]&&now-logThrottle[key]<2) return;
  logThrottle[key]=now;
  const t=Math.round(simTime);
  const line=document.createElement('div');
  line.className='log-line';
  line.style.color=type==='warn'?'var(--color-text-warning)':type==='pass'?'var(--color-text-success)':'var(--color-text-secondary)';
  line.textContent='['+t+'s] '+msg;
  const box=document.getElementById('logBox');
  box.insertBefore(line,box.firstChild);
  if(box.children.length>30) box.removeChild(box.lastChild);
}
