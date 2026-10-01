// Small, deterministic stage directions. No model call and no story mutation.
export const SEATS = [
  {x:0,z:-1.35,yaw:0,exit:{x:0,z:-2.05}},
  {x:-2,z:.35,yaw:Math.PI/2,exit:{x:-2.75,z:.35}},
  {x:1.95,z:.55,yaw:-Math.PI/2,exit:{x:2.65,z:.55}},
];
export function chooseBlocking(line={}) {
  const action=String(line.action||'').toLowerCase();
  if (/\b(sits?|seated|settles? back|stays? seated)\b/.test(action)) return 'seated';
  if (/\b(storms?|storming|walks? out|door|leaves? the room)\b/.test(action)) return 'storm';
  if (/\b(whiteboard|board|writes?|sketches?|draws?)\b/.test(action)) return 'board';
  if (/\b(window|looks? outside|gazes? out)\b/.test(action)) return 'window';
  if (/\b(coffee machine|refills?|gets? (?:a |some )?coffee|grabs? (?:a |the )?(?:mug|coffee)|takes? a sip|sips?)\b/.test(action)) return 'coffee';
  if (/\b(paces?|pacing)\b/.test(action)) return 'pace';
  if (/\b(stands?|rises?|gets? up)\b/.test(action)) return 'stand';
  if (line.emotion==='tense') return 'pace';
  if (line.emotion==='thoughtful' && line.stance==='deflect') return 'window';
  return 'seated';
}
export const BLOCKING_LABELS = {
  seated:'At the table',stand:'Stands to make a point',pace:'Paces through the disagreement',
  storm:'Takes a breather by the door',coffee:'A coffee break',window:'Collects their thoughts by the window',board:'Takes the idea to the whiteboard',
};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const ease=t=>t*t*(3-2*t);
// Movement follows perimeter aisles, never a straight line through the table.
export function makeBlocking(kind,index) {
  const seat=SEATS[index];
  if (!seat || !BLOCKING_LABELS[kind]) throw new Error('Unknown blocking or character');
  const frames=[{time:0,x:seat?.x,z:seat?.z,stand:0,yaw:seat?.yaw,activity:0}];
  if (kind==='seated') return {kind,frames,duration:0};
  let time=.65;
  frames.push({...frames[0],time,stand:1});
  let current=frames.at(-1);
  const go=(point,yaw=null)=>{
    const d=distance(current,point);
    if (d<.001) return;
    const heading=Math.atan2(point.x-current.x,point.z-current.z);
    time+=d/(kind==='storm'?1.55:1.25);
    current={time,x:point.x,z:point.z,stand:1,yaw:yaw??heading,activity:0};frames.push(current);
  };
  const hold=(seconds,yaw,activity=1)=>{
    time+=seconds;current={...current,time,yaw,activity};frames.push(current);
  };
  if (kind==='stand') {
    hold(2.7,seat.yaw);
  } else {
    go(seat.exit);
    const route=[];
    const point=p=>{route.push(p);go(p);};
    if (kind==='pace'||kind==='storm') {
      if(index===0)point({x:-2.75,z:-2.05});
      point({x:seat.exit.x || -2.75,z:2.25});
      if(kind==='storm'){
        point({x:2.5,z:2.25});point({x:3.45,z:.75});hold(1.8,Math.PI/2);
      }else{
        point({x:index===2?-.7:.7,z:2.25});hold(.5,0);
      }
    } else {
      if(index!==0){
        point({x:seat.exit.x,z:-1.95});
      }
      // Keep coffee users to the right of the table and clear of the cabinet.
      const target=kind==='coffee'?{x:3.15,z:-1.5}:kind==='window'?{x:-1.9+index*.25,z:-2.05}:{x:.75+index*.35,z:-2.05};
      if(kind==='coffee' && index!==2)point({x:2.65,z:-1.95});
      point(target);hold(2,kind==='coffee'?Math.PI:Math.PI);
    }
    // Retrace the exact outward route to the chair.
    for(const p of route.slice(0,-1).reverse())go(p);
    go(seat.exit);go(seat,seat.yaw);
  }
  time+=.65;frames.push({time,x:seat.x,z:seat.z,stand:0,yaw:seat.yaw,activity:0});
  return {kind,frames,duration:time};
}
export function sampleBlocking(plan,elapsed) {
  const frames=plan.frames;
  if(elapsed<=0)return {...frames[0],moving:false,done:plan.duration===0};
  if(elapsed>=plan.duration)return {...frames.at(-1),moving:false,done:true};
  const i=frames.findIndex(f=>f.time>=elapsed),a=frames[i-1],b=frames[i];
  const raw=(elapsed-a.time)/(b.time-a.time),t=ease(raw);
  const angle=Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw));
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,stand:a.stand+(b.stand-a.stand)*t,
    yaw:a.yaw+angle*t,activity:b.activity,moving:distance(a,b)>.01,done:false};
}
