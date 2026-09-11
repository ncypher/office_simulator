import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

const stage = document.querySelector('#stage');
const send = (type, rest={}) => window.parent.postMessage({isStreamlitMessage:true,type,...rest}, '*');
let state={cast:[{id:'boss',name:'Morgan',color:'#7964ed'},{id:'alex',name:'Alex',color:'#efab44'},{id:'sam',name:'Sam',color:'#32a9a1'}],line:null,human:'observer',scene:1};
let applyState = () => {};
window.addEventListener('message', event => {
  if (event.source !== window.parent || event.data?.type !== 'streamlit:render') return;
  state=event.data.args;
  applyState();
  send('streamlit:setFrameHeight', {height:stage.clientHeight});
});
send('streamlit:componentReady', {apiVersion:1});
send('streamlit:setFrameHeight', {height:stage.clientHeight});

try {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  stage.prepend(renderer.domElement);
  const camera=new THREE.PerspectiveCamera(36,1,.1,100);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true; controls.enablePan=false;
  controls.minDistance=8; controls.maxDistance=18;
  controls.minPolarAngle=.35; controls.maxPolarAngle=Math.PI/2.3;
  const home=()=>{camera.position.set(9,9,12);controls.target.set(0,.6,0);controls.update();};
  home();document.querySelector('#home').addEventListener('click',home);
  scene.add(new THREE.HemisphereLight(0xd4d7ff,0x4e416e,2.1));
  const sun=new THREE.DirectionalLight(0xffdeb7,2.8);
  sun.position.set(-3,10,7);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-8;sun.shadow.camera.right=8;
  sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;sun.shadow.normalBias=.035;scene.add(sun);
  const rim=new THREE.DirectionalLight(0x65cdd1,2);rim.position.set(5,4,-2);scene.add(rim);
  const mat=(color,roughness=.75)=>new THREE.MeshStandardMaterial({color,roughness});
  const cream=mat('#f5f0e9'),wood=mat('#d6af85'),ink=mat('#35364e'),metal=mat('#868ba3'),paper=mat('#fffdf6');
  function box(parent,x,y,z,w,h,d,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function sphere(parent,x,y,z,r,material,sx=1,sy=1,sz=1){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;parent.add(mesh);return mesh;}
  function cylinder(parent,x,y,z,r1,r2,h,material){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,32),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function plant(x,z,scale=1){const p=new THREE.Group();p.position.set(x,0,z);p.scale.setScalar(scale);scene.add(p);cylinder(p,0,.28,0,.25,.19,.56,mat('#cb7862'));cylinder(p,0,.57,0,.21,.21,.04,mat('#63543d'));for(let i=0;i<8;i++){const angle=i*2.4;const leaf=sphere(p,Math.sin(angle)*.22,.87+(i%3)*.14,Math.cos(angle)*.22,.28,mat(i%2?'#4a9673':'#317a60'),.5,1.9,.45);leaf.rotation.z=Math.sin(angle)*.7;}}
  // The open front and low side wall keep all three characters readable.
  box(scene,0,-.22,0,8.5,.4,6.5,mat('#c6cadd'));
  box(scene,0,.005,0,8.3,.05,6.3,mat('#e8ddd0'));
  for(let x=-4;x<=4;x+=.55)box(scene,x,.039,0,.012,.006,6.2,mat('#d7cabc'));
  box(scene,0,1.65,-3.2,8.5,3.7,.16,mat('#b9c4e7'));
  box(scene,-4.15,.55,0,.16,1.5,6.3,mat('#c9d2ec'));
  box(scene,0,.18,-3.08,8.2,.12,.09,cream);
  // Window and stylized skyline.
  box(scene,-1.95,2.05,-3.07,2.8,2,.09,cream);
  box(scene,-1.95,2.05,-3.005,2.58,1.78,.05,mat('#99c9e0'));
  for(let i=0;i<8;i++)box(scene,-3.05+i*.32,1.52,-2.965,.24,.35+(i%3)*.17,.015,mat('#819dc3'));
  box(scene,-1.95,2.05,-2.93,.065,1.8,.07,cream);box(scene,-1.95,2.05,-2.93,2.6,.065,.07,cream);
  // Whiteboard with harmless geometric notes.
  box(scene,1.45,2,-3.06,2.35,1.35,.1,metal);box(scene,1.45,2,-2.99,2.22,1.22,.06,paper);
  for(let i=0;i<3;i++){box(scene,.85+i*.5,2.27,-2.94,.3,.25,.025,mat(['#efab44','#7964ed','#32a9a1'][i]));box(scene,.85+i*.5,1.97,-2.945,.3,.02,.026,metal);}
  box(scene,1.35,1.76,-2.94,1.5,.025,.02,metal);
  // Credenza, files, lamp, and plants.
  box(scene,2.75,.52,-2.5,1.75,1,.64,wood);box(scene,2.75,.57,-2.15,.025,.82,.02,metal);
  plant(-3.4,-2.3,1.2);plant(3.35,1.9,.95);
  for(let i=0;i<4;i++)box(scene,2.25+i*.15,1.25,-2.5,.1,.43,.3,mat(['#7964ed','#efab44','#f5f0e9','#32a9a1'][i]));
  // Meeting table: oval top, two sturdy legs.
  cylinder(scene,0,1.05,.25,1.6,1.6,.14,wood).scale.set(1.1,1,.72);
  for(const x of [-.95,.95])box(scene,x,.5,.25,.13,1,.55,ink);
  function mug(x,z,color){cylinder(scene,x,1.22,z,.09,.08,.18,mat(color));cylinder(scene,x,1.315,z,.068,.068,.008,mat('#644438'));const handle=new THREE.Mesh(new THREE.TorusGeometry(.066,.02,8,16),mat(color));handle.position.set(x+.095,1.23,z);scene.add(handle);}
  mug(-.9,.48,'#fffaf2');mug(.9,.35,'#efab44');mug(0,-.48,'#7964ed');
  box(scene,-.8,1.14,.03,.4,.025,.5,mat('#32a9a1')).rotation.y=.2;
  box(scene,.66,1.14,.0,.4,.022,.48,paper).rotation.y=-.2;
  const people=[];
  function person(index,x,z,rotation){
    const root=new THREE.Group();root.position.set(x,0,z);root.rotation.y=rotation;scene.add(root);
    const body=new THREE.Group();root.add(body);
    const shirt=mat(state.cast[index].color),skin=mat(['#dba681','#f1c4a1','#97694f'][index]),hair=mat(['#473637','#70472f','#292a38'][index]);
    // Chairs.
    box(root,0,.53,0,.74,.13,.65,ink);box(root,0,.93,-.28,.7,.78,.13,ink);
    cylinder(root,0,.25,0,.07,.07,.5,metal);
    for(let j=0;j<4;j++){const foot=box(root,0,.06,0,.7,.05,.08,metal);foot.rotation.y=j*Math.PI/4;}
    sphere(body,0,.98,0,.42,shirt,.85,1.1,.65);
    for(const dx of [-.18,.18]){box(body,dx,.5,.23,.18,.52,.2,ink);sphere(body,dx,.26,.35,.14,ink,1,.65,1.7);}
    cylinder(body,0,1.39,0,.105,.105,.19,skin);
    const head=new THREE.Group();head.position.y=1.72;body.add(head);
    sphere(head,0,0,0,.34,skin,1,1.1,.95);
    sphere(head,0,.18,-.025,.33,hair,1, .65,1);
    if(index===2){for(let i=0;i<8;i++)sphere(head,Math.sin(i)*.25,.18+Math.cos(i)*.08,-.09,.13,hair);}
    const brows=[];
    for(const dx of [-.115,.115]){
      sphere(head,dx,.01,.292,.044,paper,1,1.3,.5);sphere(head,dx,.01,.314,.022,ink,.8,1.1,.5);
      const brow=box(head,dx,.105,.29,.10,.022,.02,hair);brow.rotation.z=dx*(index===2?1.5:-.8);brows.push(brow);
      sphere(head,dx*2.95,-.025,0,.064,skin,.6,1,.7);
    }
    sphere(head,0,-.055,.325,.046,skin,.8,.8,1);
    const mouth=box(head,0,-.155,.294,.1,.018,.025,ink);
    if(index===0){box(head,-.12,.025,.331,.19,.13,.024,ink);box(head,.12,.025,.331,.19,.13,.024,ink);for(const dx of [-.12,.12])box(head,dx,.025,.348,.15,.09,.01,mat('#d3c4be'));box(head,0,.04,.339,.05,.02,.02,ink);box(body,0,1.1,.27,.065,.3,.035,mat('#ece4fa'));}
    const arms=[];
    for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.32,1.2,0);body.add(arm);sphere(arm,side*.075,-.16,.04,.17,shirt,.7,1.55,.8);sphere(arm,side*.075,-.39,.07,.105,skin);arms.push(arm);}
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.52,.028,8,48),mat(state.cast[index].color));ring.rotation.x=Math.PI/2;ring.position.y=.06;root.add(ring);
    const label=document.createElement('div');label.className='tag';stage.append(label);
    root.traverse(o=>{o.userData.character=index;});
    people.push({root,body,head,mouth,arms,ring,label,index,brows});
  }
  person(0,0,-1.35,0);person(1,-2,.35,Math.PI/2);person(2,1.95,.55,-Math.PI/2);
  let displayedLine=null, talkingUntil=0, timer=null, queue=[], beat=0, paused=false, signature='',lastSeen=-1,seat='';
  const replay=document.querySelector('#replay'),pause=document.querySelector('#pause');
  function showLine(line){
    displayedLine=line;
    talkingUntil=performance.now()+Math.min(9000,Math.max(3500,(line?.text.length||0)*35));
    const c=state.cast.find(c=>c.id===line?.speaker);
    people.forEach((p,i)=>{
      const speaking=line?.speaker===state.cast[i].id;
      p.label.textContent=state.cast[i].name+(state.human===state.cast[i].id?' · You':'')+(speaking?` · ${line.emotion||'neutral'}`:'');
      p.label.style.borderColor=speaking?state.cast[i].color:'transparent';
      const tense=speaking&&line.emotion==='tense';
      p.brows.forEach((b,j)=>{b.rotation.z=(j===0?1:-1)*(tense?-.3: .12);});
    });
    document.querySelector('#speaker').textContent=c?`${line.name} ${line.audience?.length===2?'· Private exchange':''}`:'The room is yours.';
    document.querySelector('#speaker').style.color=c?.color||'#d8ceff';
    document.querySelector('#quote').textContent=line?.text||'Three coffees. One conversation waiting to happen.';
  }
  function schedule(){
    clearTimeout(timer);
    pause.disabled=queue.length<1;
    pause.textContent=paused?'Resume':'Pause';
    document.querySelector('#beat').textContent=queue.length?`${paused?'Paused · ':''}${beat+1} / ${queue.length}`:'Waiting for a turn';
    if(paused)return;
    timer=setTimeout(()=>{
      if(beat+1<queue.length){beat++;showLine(queue[beat]);schedule();}
      else{pause.disabled=true;document.querySelector('#beat').textContent='Your move';}
    },Math.max(3500,talkingUntil-performance.now()));
  }
  function play(lines){clearTimeout(timer);queue=lines;beat=0;paused=false;showLine(queue[0]||null);schedule();}
  replay.addEventListener('click',()=>play(state.lines||[]));
  pause.addEventListener('click',()=>{paused=!paused;if(paused)talkingUntil=0;else talkingUntil=performance.now()+4500;schedule();});
  window.addEventListener('pagehide',()=>clearTimeout(timer));
  applyState=()=>{
    document.querySelector('#room').textContent=`CONFERENCE ROOM · SCENE ${String(state.scene).padStart(2,'0')}`;
    const lines=state.lines||[];
    const nextSignature=JSON.stringify([state.human,state.scene,lines.map(l=>l.playback_id)]);
    replay.disabled=lines.length===0;
    if(nextSignature!==signature){
      const newSeat=`${state.human}:${state.scene}`;
      const fresh=newSeat===seat?lines.filter(l=>l.playback_id>lastSeen):lines;
      seat=newSeat;lastSeen=lines.at(-1)?.playback_id??-1;signature=nextSignature;
      play(fresh.length?fresh:lines);
    }else{
      people.forEach((p,i)=>{p.label.textContent=state.cast[i].name+(state.human===state.cast[i].id?' · You':'');});
    }
  };
  applyState();
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let start;
  renderer.domElement.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY];});
  renderer.domElement.addEventListener('pointerup',e=>{
    if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;
    const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);
    const hit=ray.intersectObjects(people.map(p=>p.root),true)[0];if(hit){const p=people[hit.object.userData.character];controls.target.set(p.root.position.x,1,p.root.position.z);}
  });
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();send('streamlit:setFrameHeight',{height:h});}
  new ResizeObserver(resize).observe(stage);resize();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clock=new THREE.Clock(),position=new THREE.Vector3();
  renderer.setAnimationLoop(()=>{
    const t=clock.getElapsedTime();
    people.forEach(p=>{
      const active=displayedLine?.speaker===state.cast[p.index].id;
      const talking=active&&!paused&&performance.now()<talkingUntil;
      if(!reduced.matches){
        p.body.position.y=Math.sin(t*1.8+p.index)*.015;
        p.head.rotation.z=Math.sin(t*1.2+p.index)*.035;
        p.head.rotation.x=active&&displayedLine?.emotion==='thoughtful' ? .12 : 0;
        p.arms[0].rotation.x=talking?-.25+Math.sin(t*3)*.15:0;
        p.arms[1].rotation.z=active&&displayedLine?.emotion==='tense'?-.25:0;
        p.mouth.scale.y=talking?1.3+Math.sin(t*9)*.65:1;
      }else{p.body.position.y=0;p.head.rotation.set(0,0,0);p.arms.forEach(a=>a.rotation.set(0,0,0));p.mouth.scale.y=1;}
      p.ring.visible=active||state.human===state.cast[p.index].id;
      position.copy(p.root.position);position.y=2.5;position.project(camera);p.label.style.left=`${(position.x*.5+.5)*stage.clientWidth}px`;p.label.style.top=`${(-position.y*.5+.5)*stage.clientHeight}px`;
    });
    controls.update();renderer.render(scene,camera);
  });
}catch(error){document.querySelector('#error').style.display='block';console.error('Office scene failed',error);}
