import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseBlocking,makeBlocking,sampleBlocking,SEATS,BLOCKING_LABELS} from '../office/blocking.mjs';

test('explicit stage directions override mood; old saves fall back safely',()=>{
  for(const [action,kind] of [
    ['Stays seated, despite the tension.','seated'],['Storms toward the door.','storm'],
    ['Sketches an idea on the whiteboard.','board'],['Looks out the window.','window'],
    ['Gets a coffee and takes a sip.','coffee'],['Gets up and paces beside the table.','pace'],
    ['Stands to make a point.','stand']])assert.equal(chooseBlocking({action,emotion:'tense'}),kind);
  assert.equal(chooseBlocking({emotion:'tense'}),'pace');
  assert.equal(chooseBlocking({emotion:'thoughtful',stance:'deflect'}),'window');
  assert.equal(chooseBlocking({}),'seated');
  assert.equal(chooseBlocking({text:'I wish the coffee machine worked.'}),'seated');
  assert.equal(chooseBlocking({action:'Sets the coffee mug down.'}),'seated');
});

test('every character completes each action and returns to their own chair',()=>{
  for(let i=0;i<3;i++)for(const kind of Object.keys(BLOCKING_LABELS)){
    const plan=makeBlocking(kind,i);
    const final=sampleBlocking(plan,plan.duration+1);
    assert.equal(final.x,SEATS[i].x);assert.equal(final.z,SEATS[i].z);
    assert.equal(final.stand,0);assert.equal(final.yaw,SEATS[i].yaw);assert.equal(final.done,true);
    for(let t=0;t<plan.duration;t+=.02){
      const p=sampleBlocking(plan,t);
      for(const k of ['x','z','stand','yaw'])assert.ok(Number.isFinite(p[k]),`${kind}: ${k}`);
      assert.ok(p.stand>=0&&p.stand<=1);
      assert.ok(Math.abs(p.x)<=3.5 && p.z>=-2.1 && p.z<=2.3);
      // Table top occupies x +/-1.76 and z -0.9..1.4. Bodies stay in aisles.
      assert.ok(!(Math.abs(p.x)<1.82 && p.z>-.99 && p.z<1.48),`${kind} crossed table at ${p.x},${p.z}`);
    }
  }
});

test('destinations are reached standing; sampling freezes without elapsed time',()=>{
  for(const kind of ['coffee','board','window','storm']){
    const plan=makeBlocking(kind,1);
    const hold=plan.frames.find(f=>f.activity===1);
    const p=sampleBlocking(plan,hold.time-.2);
    assert.equal(p.stand,1);assert.equal(p.moving,false);assert.equal(p.activity,1);
    assert.deepEqual(sampleBlocking(plan,2),sampleBlocking(plan,2));
  }
});
