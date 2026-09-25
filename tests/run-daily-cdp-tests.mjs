import assert from 'node:assert/strict';
import { connectApp } from './cdp-client.mjs';

const seed = {
  roost_onboarding_v1: { version:1, profile:'public', completed:true, step:4, layoutApplied:true, data:{ modules:{today:true,wire:true,missionExample:false,workbench:true,diagrams:true,kidZone:true},news:false,density:'comfort',visualMode:'default',starterSections:['quick-access'] } },
  roost_settings_v1: { headlines:false,searchScope:'all',todayCollapsed:false },
  roost_session_v1: { version:1,status:'active',goal:'Resume this session',timebox:'25' },
  roost_workbench_v1: [{id:'pinned-fixture',title:'Pinned thinking',body:'A saved thought',pinned:true,t:'2026-09-24T12:00:00Z'}],
  roost_readlater_v1: [{link:'https://example.com/priority',title:'Priority reading',status:'reading',priority:'high',savedAt:'2026-09-24T12:00:00Z'}],
  roost_boards_v1: [{id:'board-fixture',name:'Project board',links:[{href:'https://example.com',title:'Resource'}]}]
};

const report=[];
for (const width of [360,390,768,1440]) {
  const app=await connectApp({width,seed});
  try {
    const before=await app.evaluate(`(() => {
      const points=roostTestHooks.todayResumePoints();
      const desk=document.getElementById('roost-today');
      return {kinds:points.map(p=>p.kind),closed:!desk.querySelector('details').open,count:desk.querySelectorAll('[data-resume-point]').length,overflow:document.documentElement.scrollWidth>innerWidth,smallTargets:[...desk.querySelectorAll('[data-resume-point], .roost-daily-desk > .roost-mini-actions button')].some(b=>b.getBoundingClientRect().height<44),height:Math.round(desk.getBoundingClientRect().height)};
    })()`);
    assert.deepEqual(before.kinds,['session','workbench','readlater']);
    assert.equal(before.closed,true);assert.equal(before.count,3);assert.equal(before.overflow,false);assert.equal(before.smallTargets,false);
    const journey=await app.evaluate(`(() => {
      document.querySelector('[data-resume-point="0"]').click();
      const session=document.getElementById('session-goal').value;
      document.getElementById('session-complete').click();
      document.getElementById('roost-modal-x').click();
      const completedGone=!roostTestHooks.todayResumePoints().some(p=>p.kind==='session');
      document.querySelector('[data-resume-point="0"]').click();
      const note=document.getElementById('wb-text').value;
      document.getElementById('wb-text').value='Updated thought';
      document.getElementById('wb-save').click();
      const notes=JSON.parse(localStorage.getItem('roost_workbench_v1'));
      const updatedInPlace=notes.length===1 && notes[0].id==='pinned-fixture' && notes[0].pinned && notes[0].body==='Updated thought';
      document.getElementById('roost-modal-x').click();
      const details=document.querySelector('#roost-today details');details.open=true;
      roostTestHooks.renderTodayDashboard();
      return {session,note,updatedInPlace,completedGone,detailsPreserved:document.querySelector('#roost-today details').open,deepTools:!!document.querySelector('#roost-today [data-open-tool="boards"]')};
    })()`);
    assert.equal(journey.session,'Resume this session');assert.equal(journey.note,'A saved thought');assert.equal(journey.updatedInPlace,true);assert.equal(journey.completedGone,true);assert.equal(journey.detailsPreserved,true);assert.equal(journey.deepTools,true);
    const library=await app.evaluate(`(() => {
      const state=roostTestHooks.layoutState();state.hidden['command-center']=true;
      localStorage.setItem('roost_layout_v1',JSON.stringify(state));roostTestHooks.applyLayoutState();
      const stored=localStorage.getItem('roost_layout_v1');
      document.querySelector('#roost-today [data-browse-library]').click();
      return {visible:document.getElementById('command-center').getBoundingClientRect().height>0,preserved:stored===localStorage.getItem('roost_layout_v1'),focusInside:document.getElementById('command-center').contains(document.activeElement)};
    })()`);
    assert.equal(library.visible,true);assert.equal(library.preserved,true);assert.equal(library.focusInside,true);
    const empty=await app.evaluate(`(() => {
      ['roost_session_v1','roost_workbench_v1','roost_readlater_v1','roost_boards_v1'].forEach(k=>localStorage.removeItem(k));roostTestHooks.renderTodayDashboard();
      return {count:roostTestHooks.todayResumePoints().length,empty:!!document.querySelector('.roost-today-empty'),tools:!!document.querySelector('#roost-today [data-open-tool="session"]')};
    })()`);
    assert.equal(empty.count,0);assert.equal(empty.empty,true);assert.equal(empty.tools,true);
    assert.deepEqual(app.errors,[]);report.push({width,...before,journeys:'passed'});
  } finally {await app.close();}
}
console.log(JSON.stringify({dailyJourneys:report,failed:[]},null,2));
