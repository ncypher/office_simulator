// Timed presentation of already-generated turns. No network calls.
export function speakingDuration(line={}) {
  const words=String(line.text||'').trim().split(/\s+/).filter(Boolean).length;
  return Math.min(26000,Math.max(5500,words/2.5*1000+900));
}
export function createPlayback({onLine,onPhase,duration=speakingDuration,
  now=()=>performance.now(),later=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}) {
  let lines=[],index=0,phase='idle',paused=false,timer=null,deadline=0,remaining=0,generation=0;
  const notify=()=>onPhase({phase,paused,index,total:lines.length,current:lines[index],next:lines[index+1]});
  function arm(ms){
    remaining=ms;deadline=now()+ms;const token=generation;
    timer=later(()=>{if(token!==generation||paused)return;advance();},ms);
  }
  function enter(next,ms){phase=next;notify();if(ms!=null)arm(ms);}
  function speak(){onLine(lines[index]);enter('speaking',duration(lines[index]));}
  function advance(){
    if(phase==='speaking')enter('listening',1600);
    else if(phase==='listening'){
      if(index+1<lines.length)enter('thinking',lines[index+1].emotion==='tense'?2400:2000);
      else enter('idle');
    }else if(phase==='thinking'){index++;speak();}
  }
  return {
    play(next){cancel(timer);generation++;lines=next;index=0;paused=false;
      if(lines.length)speak();else{onLine(null);enter('idle');}},
    toggle(){if(phase==='idle')return;paused=!paused;
      if(paused){remaining=Math.max(0,deadline-now());cancel(timer);generation++;notify();}
      else{notify();arm(remaining);}},
    dispose(){cancel(timer);generation++;},
  };
}
