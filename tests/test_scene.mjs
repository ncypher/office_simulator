// Exercise the real scene graph with a renderer stub; no GPU or network required.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as Three from '../office/vendor/three.module.js';
import {createPlayback,speakingDuration} from '../office/playback.mjs';
import * as blocking from '../office/blocking.mjs';

function harness(reduced=false,rendererFails=false){
  let now=0,loop,graph,timerId=0;const tasks=new Map(),messages=[];const nodes=new Map(),events=new Map(),errors=[];
  const node=()=>({style:{setProperty(){}},classList:{toggle(){}},dataset:{},textContent:'',scrollTop:0,
    clientWidth:650,clientHeight:460,offsetWidth:62,offsetHeight:48,handlers:{},children:[],
    setAttribute(k,v){this[k]=v;},addEventListener(k,f){this.handlers[k]=f;},prepend(x){this.children.unshift(x);},append(x){this.children.push(x);}});
  const element=k=>{if(!nodes.has(k))nodes.set(k,node());return nodes.get(k);};
  class Renderer{constructor(){if(rendererFails)throw new Error("Test: no WebGL");this.domElement=node();this.shadowMap={};}setPixelRatio(){}setSize(){}setAnimationLoop(f){loop=f;}render(scene){graph=scene;}}
  class Controls{constructor(){this.target=new Three.Vector3();}update(){}}
  class ResizeObserver{constructor(f){this.f=f;}observe(){this.f();}}
  const parent={postMessage(message){messages.push(message);}};
  const source=readFileSync(new URL('../office/scene.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  vm.runInNewContext(source,{THREE:{...Three,WebGLRenderer:Renderer},OrbitControls:Controls,...blocking,speakingDuration,createPlayback:options=>createPlayback({...options,now:()=>now,later:(f,ms)=>{tasks.set(++timerId,{f,time:now+ms});return timerId;},cancel:id=>tasks.delete(id)}),
    document:{querySelector:element,createElement:node,body:{scrollHeight:590},hidden:false},
    window:{parent,devicePixelRatio:1,addEventListener(k,f){events.set(k,f);}},
    matchMedia:()=>({matches:reduced}),performance:{now:()=>now},ResizeObserver,
    requestAnimationFrame:f=>f(),setTimeout:()=>1,clearTimeout(){},console:{error(...e){errors.push(e);}}});
  if(!rendererFails)assert.deepEqual(errors,[]);
  const cast=[{id:'boss',name:'Morgan',color:'#7964ed'},{id:'alex',name:'Alex',color:'#efab44'},{id:'sam',name:'Sam',color:'#32a9a1'}];
  const render=(line,revision=0)=>events.get('message')({source:parent,data:{type:'streamlit:render',args:{cast,human:'observer',scene:1,story_revision:revision,playback_context:'0:observer:1',lines:Array.isArray(line)?line:line?[line]:[]}}});
  return {nodes,events,cast,render,messages,tick(n=1){for(let i=0;i<n;i++){now+=50;loop?.();for(const [id,task] of [...tasks])if(task.time<=now){tasks.delete(id);task.f();}}return graph;},errors};
}
const line={speaker:'alex',name:'Alex',text:'Let me put this on the board.',action:'Sketches on the whiteboard.',emotion:'thoughtful',stance:'neutral',audience:['boss','alex','sam'],playback_id:1};
const actor=(scene,index)=>scene.children.find(c=>c.userData.character===index);

test('scene keeps chairs still, moves the actor, and pauses elapsed motion',()=>{
  const h=harness();h.render(line);let scene=h.tick();const chair=scene.children.find(c=>c.type==='Group'&&c.position.x===-2&&!('character' in c.userData));
  assert.ok(chair);assert.match(h.nodes.get('#blocking').textContent,/whiteboard/);
  h.tick(50);const p=actor(scene,1);assert.notEqual(p.position.x,-2);assert.equal(chair.position.x,-2);assert.equal(chair.position.z,.35);
  h.nodes.get('#pause').handlers.click();const frozen=p.position.clone();h.tick(60);assert.ok(p.position.equals(frozen));
  h.nodes.get('#pause').handlers.click();h.tick(60);assert.ok(!p.position.equals(frozen));
  h.nodes.get('#motion').handlers.click();h.tick();assert.equal(p.position.x,-2);assert.equal(p.position.z,.35);assert.equal(h.nodes.get('#motion')['aria-pressed'],'false');
});

test('replay starts the cue again; replacing story resets other characters',()=>{
  const h=harness();h.render(line);const scene=h.tick(60);const p=actor(scene,1);
  assert.notEqual(p.position.x,-2);
  h.nodes.get('#replay').handlers.click();h.tick();assert.equal(p.position.x,-2);
  h.tick(60);h.render({...line,speaker:'sam',name:'Sam',action:'Stays seated.',playback_id:2},1);h.tick();
  assert.equal(p.position.x,-2);assert.equal(p.position.z,.35);
});

test('reduced motion keeps everyone in their seats but preserves dialogue',()=>{
  const h=harness(true);h.render(line);const scene=h.tick(100);const p=actor(scene,1);
  assert.equal(p.position.x,-2);assert.equal(p.position.z,.35);
  assert.equal(h.nodes.get('#quote').textContent,line.text);
  assert.equal(p.children[0].position.y,0);
});

test('WebGL fallback reveals one turn, pauses, then reveals the next; rerenders do not restart',()=>{
  const h=harness(false,true);
  const lines=[line,{...line,speaker:'sam',name:'Sam',text:'I heard you.',playback_id:2}];
  h.render(lines);
  const reveals=()=>h.messages.filter(m=>m.type==='streamlit:setComponentValue');
  assert.equal(reveals().length,1);assert.equal(reveals()[0].value.playback_id,1);
  h.render(lines);assert.equal(reveals().length,1);
  h.tick(110);assert.match(h.nodes.get('#phase').textContent,/let that land/);
  h.tick(32);assert.match(h.nodes.get('#phase').textContent,/considering/);
  assert.equal(reveals().length,1);
  h.tick(40);assert.equal(reveals().length,2);assert.equal(h.nodes.get('#quote').textContent,'I heard you.');
  h.tick(142);assert.equal(reveals().at(-1).value.complete,true);
});
