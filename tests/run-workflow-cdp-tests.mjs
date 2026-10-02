import assert from 'node:assert/strict';
import { connectApp } from './cdp-client.mjs';

const url = process.env.ROOST_WORKFLOW_APP_URL || 'http://workflow.localhost:8765/index.html';
const seed = {
  roost_onboarding_v1: {version:1,profile:'public',completed:true,layoutApplied:true,data:{modules:{today:true,wire:true,missionExample:true,workbench:true,diagrams:true,kidZone:true},news:false,density:'comfort',visualMode:'default',starterSections:['quick-access']}},
  roost_settings_v1: {headlines:false,searchScope:'all'},
  roost_workbench_v1: [{id:'keep-note',title:'Project thinking',body:'Original writing',method:'Brainstorm',t:'2026-10-01T12:00:00Z',pinned:true}],
  roost_session_v1: {version:1,status:'active',goal:'Finish the workshop plan',timebox:'25',note:'Keep this context'}
};
const results = [];
for (const width of [360,390,768,1440]) {
  const app = await connectApp({url,width,seed});
  try {
    const desk = await app.evaluate(`(() => {
      const visible = [...document.querySelectorAll('main .section')].filter(el=>el.getBoundingClientRect().height>0).map(el=>el.id);
      return {mode:document.body.dataset.homeSurface,visible,cards:document.querySelectorAll('main .section:not(#pinned):not(#recent) .link-card').length,height:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth};
    })()`);
    assert.equal(desk.mode,'desk'); assert.equal(desk.cards,785); assert.equal(desk.overflow,false);
    assert.ok(desk.visible.every(id=>['quick-access','pinned','recent'].includes(id)), JSON.stringify(desk));
    const library = await app.evaluate(`(() => {
      document.querySelector('[data-home-surface="library"]').click();
      const fits=document.documentElement.scrollWidth<=innerWidth;
      const readingOrder=!!(document.getElementById('roost-library-controls').compareDocumentPosition(document.getElementById('v3-viewbar')) & Node.DOCUMENT_POSITION_FOLLOWING);
      const targets=[...document.querySelectorAll('#roost-home-nav button,.v3-section-jump,.v3-viewbar button')].filter(el=>el.getBoundingClientRect().height>0).every(el=>el.getBoundingClientRect().height>=44);
      const filter=document.getElementById('roost-library-filter');filter.value='philosophy';filter.dispatchEvent(new Event('input',{bubbles:true}));
      const matches=[...document.querySelectorAll('.v3-section-launcher a')].filter(el=>!el.hidden).map(el=>el.getAttribute('href'));
      filter.value='';filter.dispatchEvent(new Event('input',{bubbles:true}));
      document.querySelector('[data-v3-view="code"]').click();
      document.querySelector('.v3-section-launcher a[href="#rf"]').click();
      const selected=[...document.querySelectorAll('main .section')].filter(el=>el.getBoundingClientRect().height>0).map(el=>el.id);
      const focus=document.getElementById('rf').contains(document.activeElement);
      const directoryHidden=document.getElementById('command-center').getBoundingClientRect().height===0;
      const input=document.getElementById('search-input');input.value='Zillow';input.dispatchEvent(new Event('input',{bubbles:true}));
      const globalHit=roostTestHooks.buildCommandLauncherGroups('Zillow').some(group=>group.items.some(item=>item.title==='Zillow'));
      const unmatchedHidden=document.getElementById('rf').getBoundingClientRect().height===0;
      document.querySelector('#roost-library-context button').click();
      const back=document.activeElement.id==='command-center-heading';
      const toolsDisclosed=!document.getElementById('roost-library-options').open;
      document.querySelector('#roost-library-options summary').click();
      document.getElementById('v3-random-link').click();
      const randomVisible=document.activeElement.classList.contains('link-card') && document.activeElement.getBoundingClientRect().height>0;
      document.querySelector('#roost-library-context button').click();
      roostTestHooks.installHomeSurface();roostTestHooks.installHomeSurface();
      return {matches,selected,focus,directoryHidden,globalHit,unmatchedHidden,back,toolsDisclosed,randomVisible,fits,targets,readingOrder,navCount:document.querySelectorAll('#roost-home-nav').length};
    })()`);
    assert.deepEqual(library.matches,['#philosophy']); assert.deepEqual(library.selected,['rf']);
    for(const key of ['focus','directoryHidden','globalHit','unmatchedHidden','back','toolsDisclosed','randomVisible','fits','targets','readingOrder']) assert.equal(library[key],true,key);
    assert.equal(library.navCount,1);
    const layout = await app.evaluate(`(() => {
      const state=roostTestHooks.layoutState();state.hidden['philosophy']=true;
      localStorage.setItem('roost_layout_v1',JSON.stringify(state));roostTestHooks.applyLayoutState();
      const prior=localStorage.getItem('roost_layout_v1');
      roostTestHooks.navigateRoostSection('philosophy');
      const revealed=document.getElementById('philosophy').getBoundingClientRect().height>0;
      roostTestHooks.setHomeSurface('full');
      return {revealed,preserved:prior===localStorage.getItem('roost_layout_v1'),hiddenAgain:document.getElementById('philosophy').getBoundingClientRect().height===0,mode:document.body.dataset.homeSurface};
    })()`);
    assert.deepEqual(layout,{revealed:true,preserved:true,hiddenAgain:true,mode:'full'});
    const writing = await app.evaluate(`(() => {
      roostTestHooks.openSavedLauncherItem({kind:'workbench',id:'keep-note'});
      const text=document.getElementById('wb-text');text.value='Unsaved draft';text.dispatchEvent(new Event('input',{bubbles:true}));
      const originalConfirm=window.confirm, originalSet=Storage.prototype.setItem;
      let prompts=0; window.confirm=()=>{prompts++;return false;};
      document.getElementById('roost-modal-x').click();
      roostTestHooks.openSavedLauncherItem({kind:'board',id:'missing'});
      const guarded=prompts===2 && document.getElementById('wb-text')===text && text.value==='Unsaved draft';
      text.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
      const escapeGuarded=prompts===3 && text.value==='Unsaved draft' && !!document.querySelector('.roost-modal.open');
      const template=document.querySelector('.wb-tab.on').dataset.m;
      document.querySelector('.wb-tab:not(.on)').click();
      const templateGuarded=document.querySelector('.wb-tab.on').dataset.m===template && text.value==='Unsaved draft';
      const unload=new Event('beforeunload',{cancelable:true});window.dispatchEvent(unload);
      const unloadGuarded=unload.defaultPrevented;
      Storage.prototype.setItem=function(key,value){if(key==='roost_workbench_v1')throw new DOMException('Full','QuotaExceededError');return originalSet.call(this,key,value);};
      document.getElementById('wb-save').click();
      const failure=/Not saved/.test(document.getElementById('wb-status').textContent) && JSON.parse(localStorage.getItem('roost_workbench_v1'))[0].body==='Original writing' && text.value==='Unsaved draft';
      Storage.prototype.setItem=originalSet;
      document.getElementById('wb-save').click();
      const saved=JSON.parse(localStorage.getItem('roost_workbench_v1'))[0].body==='Unsaved draft';
      const before=prompts; document.getElementById('roost-modal-x').click();
      window.confirm=originalConfirm;
      return {guarded,escapeGuarded,templateGuarded,unloadGuarded,failure,saved,cleanClose:prompts===before && !document.querySelector('.roost-modal.open')};
    })()`);
    for(const [key,value] of Object.entries(writing)) assert.equal(value,true,`writing ${key}`);
    const conflicts = await app.evaluate(`(() => {
      roostTestHooks.openSavedLauncherItem({kind:'workbench',id:'keep-note'});
      document.getElementById('wb-text').value='This tab draft';
      const notes=JSON.parse(localStorage.getItem('roost_workbench_v1'));notes[0].body='Newer writing from another tab';localStorage.setItem('roost_workbench_v1',JSON.stringify(notes));
      document.getElementById('wb-save').click();
      const guarded=JSON.parse(localStorage.getItem('roost_workbench_v1'))[0].body==='Newer writing from another tab' && document.getElementById('wb-text').value==='This tab draft' && /another tab/.test(document.getElementById('wb-status').textContent);
      const confirm=window.confirm;window.confirm=()=>true;document.getElementById('roost-modal-x').click();window.confirm=confirm;
      return guarded;
    })()`);
    assert.equal(conflicts,true);
    const session = await app.evaluate(`(() => {
      document.querySelector('#roost-today [data-open-tool="session"]').click();
      document.getElementById('session-goal').value='Retain my unsaved goal';
      const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='roost_session_v1')throw new Error('Full');return set.call(this,key,value);};
      document.getElementById('session-save').click();
      const failure=document.getElementById('session-goal').value==='Retain my unsaved goal' && /Not saved/.test(document.getElementById('session-status').textContent) && JSON.parse(localStorage.getItem('roost_session_v1')).goal==='Finish the workshop plan';
      Storage.prototype.setItem=set;document.getElementById('session-save').click();
      const saved=JSON.parse(localStorage.getItem('roost_session_v1')).goal==='Retain my unsaved goal';
      const newer=JSON.parse(localStorage.getItem('roost_session_v1'));newer.goal='Another tab session';localStorage.setItem('roost_session_v1',JSON.stringify(newer));
      document.getElementById('session-save').click();
      const conflict=/another tab/.test(document.getElementById('session-status').textContent) && JSON.parse(localStorage.getItem('roost_session_v1')).goal==='Another tab session';
      document.getElementById('roost-modal-x').click();
      return {failure,saved,conflict};
    })()`);
    assert.deepEqual(session,{failure:true,saved:true,conflict:true});
    const note = await app.evaluate(`(() => {
      document.querySelector('#quick-access .roost-link-tool').click();
      document.getElementById('link-note-body').value='Keep my annotation';
      const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='roost_link_notes_v1')throw new Error('Full');return set.call(this,key,value);};
      document.getElementById('link-note-save').click();
      const failure=document.getElementById('link-note-body').value==='Keep my annotation' && /Not saved/.test(document.getElementById('link-note-message').textContent);
      Storage.prototype.setItem=set;document.getElementById('link-note-save').click();
      const saved=/Keep my annotation/.test(localStorage.getItem('roost_link_notes_v1'));
      const newer=JSON.parse(localStorage.getItem('roost_link_notes_v1'));const href=Object.keys(newer)[0];newer[href].note='Another tab annotation';localStorage.setItem('roost_link_notes_v1',JSON.stringify(newer));
      document.getElementById('link-note-save').click();
      const conflict=/another tab/.test(document.getElementById('link-note-message').textContent) && /Another tab annotation/.test(localStorage.getItem('roost_link_notes_v1'));
      document.getElementById('roost-modal-x').click();
      return {failure,saved,conflict};
    })()`);
    assert.deepEqual(note,{failure:true,saved:true,conflict:true});
    assert.deepEqual(app.errors,[]);
    results.push({width,desk,library,layout,writing,conflicts,session,note,runtimeErrors:app.errors});
  } finally {await app.close();}
}
// Missing preference must respect an existing layout; no destructive schema migration.
const legacy=await connectApp({url,seed:{...seed,roost_onboarding_v1:{...seed.roost_onboarding_v1,data:{...seed.roost_onboarding_v1.data,modules:{...seed.roost_onboarding_v1.data.modules,missionExample:false}}},roost_layout_v1:{version:1,preset:'Custom',topOrder:['launcher','wire','today'],sectionOrder:[],hidden:{},sizes:{}}}});
try {
  assert.equal(await legacy.evaluate('document.body.dataset.homeSurface'),'full');
  assert.equal(await legacy.evaluate(`(() => {const intro=document.getElementById('roost-mission-intro');roostTestHooks.setHomeSurface('library');const hidden=intro.getBoundingClientRect().height===0;roostTestHooks.setHomeSurface('desk');return hidden && intro.getBoundingClientRect().height>0;})()`),true);
}
finally {await legacy.close();}
const grouped=await connectApp({url,seed:`localStorage.clear();Object.entries(${JSON.stringify(seed)}).forEach(([key,value])=>localStorage.setItem(key,JSON.stringify(value)));localStorage.setItem('kfl_v3_view','code');`});
try {
  assert.equal(await grouped.evaluate('document.body.dataset.homeSurface'),'full');
  assert.equal(await grouped.evaluate(`(() => {document.querySelector('[data-v3-view="all"]').click();return [...document.querySelectorAll('#philosophy .link-card')].every(card=>card.getBoundingClientRect().height>0);})()`),true);
  assert.equal(await grouped.evaluate(`(() => {const input=document.getElementById('search-input');input.value='Zillow';input.dispatchEvent(new Event('input',{bubbles:true}));input.value='';input.dispatchEvent(new Event('search',{bubbles:true}));return document.getElementById('philosophy').getBoundingClientRect().height>0;})()`),true);
  assert.deepEqual(grouped.errors,[]);
} finally {await grouped.close();}
const persistent=await connectApp({url,seed:`if(!sessionStorage.workflowSeeded){localStorage.clear();Object.entries(${JSON.stringify(seed)}).forEach(([key,value])=>localStorage.setItem(key,JSON.stringify(value)));sessionStorage.workflowSeeded='1';}`});
try {
  await persistent.evaluate(`roostTestHooks.navigateRoostSection('philosophy');roostTestHooks.setHomeSurface('desk');`);
  assert.equal(await persistent.evaluate('location.hash'),'');
  assert.equal(await persistent.evaluate(`document.getElementById('search-input').getAttribute('aria-expanded')`),'false');
  await persistent.navigate();
  assert.equal(await persistent.evaluate('document.body.dataset.homeSurface'),'desk');
  await persistent.navigate(url+'?deep-link=1#philosophy');
  assert.equal(await persistent.evaluate(`document.getElementById('philosophy').getBoundingClientRect().height>0 && document.body.dataset.homeSurface==='library'`),true);
  await persistent.evaluate(`document.querySelector('#roost-library-context button').click()`);
  assert.equal(await persistent.evaluate('location.hash'),'');
  await persistent.navigate();
  assert.equal(await persistent.evaluate(`document.body.dataset.homeSurface==='library' && document.getElementById('command-center').getBoundingClientRect().height>0`),true);
  assert.deepEqual(persistent.errors,[]);
} finally {await persistent.close();}
console.log(JSON.stringify({results,legacyLayoutPreserved:true,surfacePersistence:true,failed:[]},null,2));
