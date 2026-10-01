import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayback,speakingDuration} from '../office/playback.mjs';
function harness(){
 let now=0,id=0;const tasks=new Map(),reveals=[],phases=[];
 const player=createPlayback({onLine:l=>reveals.push(l?.name),onPhase:p=>phases.push(p),duration:()=>6000,
   now:()=>now,later:(f,ms)=>{tasks.set(++id,{f,time:now+ms});return id;},cancel:i=>tasks.delete(i)});
 return {player,reveals,phases,advance(ms){const end=now+ms;while(true){const task=[...tasks].sort((a,b)=>a[1].time-b[1].time)[0];if(!task||task[1].time>end)break;now=task[1].time;tasks.delete(task[0]);task[1].f();}now=end;}};
}
const lines=[{name:'Morgan'},{name:'Alex',emotion:'tense'},{name:'Sam'}];
test('each response follows speech, listening, and thinking, never reveals early',()=>{
 const h=harness();h.player.play(lines);assert.deepEqual(h.reveals,['Morgan']);
 h.advance(6000);assert.equal(h.phases.at(-1).phase,'listening');
 h.advance(1600);assert.equal(h.phases.at(-1).phase,'thinking');assert.deepEqual(h.reveals,['Morgan']);
 h.advance(2399);assert.deepEqual(h.reveals,['Morgan']);h.advance(1);assert.deepEqual(h.reveals,['Morgan','Alex']);
 h.advance(9600);assert.deepEqual(h.reveals,['Morgan','Alex','Sam']);
 h.advance(7600);assert.equal(h.phases.at(-1).phase,'idle');
});
test('pause preserves the remaining thinking beat; replay cancels the previous batch',()=>{
 const h=harness();h.player.play(lines);h.advance(8000);h.player.toggle();h.advance(30000);
 assert.deepEqual(h.reveals,['Morgan']);h.player.toggle();h.advance(1999);assert.deepEqual(h.reveals,['Morgan']);
 h.advance(1);assert.deepEqual(h.reveals,['Morgan','Alex']);
 h.player.play([{name:'New meeting'}]);h.advance(20000);assert.equal(h.reveals.at(-1),'New meeting');assert.equal(h.phases.at(-1).phase,'idle');
});
test('reading time scales with word count and remains bounded',()=>{
 assert.equal(speakingDuration({text:'Short line.'}),5500);
 assert.ok(speakingDuration({text:'word '.repeat(40)})>15000);
 assert.equal(speakingDuration({text:'word '.repeat(500)}),26000);
});
