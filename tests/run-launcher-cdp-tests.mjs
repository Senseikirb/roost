import assert from 'node:assert/strict';
import { connectApp } from './cdp-client.mjs';

const seed = {
  roost_onboarding_v1: {
    version: 1, completed: true, profile: 'launcher-test', layoutApplied: true,
    data: { modules: { wire: false, today: true, missionExample: false, workbench: true, diagrams: true, kidZone: true }, news: false, density: 'comfort', visualMode: 'default', starterSections: ['quick-access'] }
  },
  roost_settings_v1: { headlines: false, searchScope: 'all' },
  roost_workbench_v1: [{ id: 'launch-note', title: 'Field research notebook', body: 'Needlewords retained offline', method: 'Cornell Notes', pinned: true, t: '2026-09-25T00:00:00Z' }],
  roost_readlater_v1: [{ title: 'Orbital reading archive', link: 'https://example.com/launch-article', source: 'Local fixture', note: 'Needlewords in article notes', status: 'archived', savedAt: '2026-09-25T00:00:00Z' }],
  roost_boards_v1: [{ id: 'launch-board', name: 'Satellite research board', links: [{ title: 'Needlewords link', href: 'https://example.com/board-link' }] }]
};

const app = await connectApp({ seed });
const checks = {};
async function key(key, code, modifiers = 0) {
  await app.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers });
  await app.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers });
}
try {
  checks.ranking = await app.evaluate(`(() => {
    const hooks = window.roostTestHooks;
    const input = document.getElementById('search-input');
    const query = (q) => { input.focus(); input.value = q; input.dispatchEvent(new Event('input', {bubbles:true})); return [...document.querySelectorAll('.roost-command-item strong')].map(el => el.textContent); };
    const github = query('GitHub');
    const imports = query('import');
    const tokens = query('space nasa');
    const links = hooks.buildCommandLauncherGroups('GitHub').flatMap(group => group.items).filter(item => item.kind === 'Link');
    return { exactTitleWins: github[0] === 'GitHub', specificCommandWins: imports[0] === 'Import Bookmarks', multiTokenSearch: tokens.length > 0, utilityCopiesDeduped: links.filter(item => item.title === 'GitHub').length === 1 };
  })()`);
  Object.values(checks.ranking).forEach(value => assert.equal(value, true, 'launcher ranking'));

  checks.duplicateTitleRanking = await app.evaluate(`(() => {
    const card = document.querySelector('#quick-access .link-card');
    const original = card.getAttribute('data-desc-search');
    card.setAttribute('data-desc-search', (original || '') + ' Duplicate destination exact');
    const duplicate = card.cloneNode(true);
    duplicate.querySelector('.card-label').textContent = 'Duplicate destination exact';
    card.parentElement.appendChild(duplicate);
    const best = window.roostTestHooks.buildCommandLauncherGroups('Duplicate destination exact')[0].items[0];
    duplicate.remove(); card.setAttribute('data-desc-search', original || '');
    return best.title === 'Duplicate destination exact';
  })()`);
  assert.equal(checks.duplicateTitleRanking, true, 'later exact title wins before duplicate destinations are combined');

  checks.indexInvalidation = await app.evaluate(`(() => {
    const hooks = window.roostTestHooks;
    const find = (title) => hooks.buildCommandLauncherGroups(title).flatMap(group => group.items).some(item => item.title === title && item.kind === 'Link');
    const input = document.getElementById('search-input'); input.value = 'import'; input.dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('.roost-command-item').click();
    document.getElementById('custom-import-text').value = 'title,url,description,section,tags\\nLauncher cache fixture,https://example.com/launcher-cache,Local import,Launcher fixtures,test';
    document.getElementById('custom-preview-import').click();
    document.getElementById('custom-apply-import').click();
    const importedImmediately = find('Launcher cache fixture');
    const confirm = window.confirm; window.confirm = () => true;
    document.getElementById('custom-undo-import').click(); window.confirm = confirm;
    const removedImmediately = !find('Launcher cache fixture');
    document.getElementById('roost-modal-x').click();
    return { importedImmediately, removedImmediately };
  })()`);
  Object.values(checks.indexInvalidation).forEach(value => assert.equal(value, true, 'import/undo refresh the search index immediately: ' + JSON.stringify(checks.indexInvalidation)));

  await app.evaluate(`(() => { const input = document.getElementById('search-input'); input.value = 'import'; input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await key('Enter', 'Enter');
  checks.importJourney = await app.evaluate(`(() => { const ok = document.querySelector('.roost-modal.open') && !!document.getElementById('custom-import-file'); document.getElementById('roost-modal-x').click(); return !!ok; })()`);
  assert.equal(checks.importJourney, true, 'Enter opens the import tab directly');

  checks.saved = await app.evaluate(`(() => {
    const input = document.getElementById('search-input');
    document.querySelector('[data-search-scope="saved"]').click();
    input.value = 'Needlewords'; input.dispatchEvent(new Event('input',{bubbles:true}));
    const items = window.roostTestHooks.buildCommandLauncherGroups('Needlewords').flatMap(group => group.items);
    return { note: items.some(item => item.kind === 'Note'), article: items.some(item => item.kind === 'Article'), board: items.some(item => item.kind === 'Board'), noDeadEnd: !document.getElementById('no-results').classList.contains('visible') };
  })()`);
  Object.values(checks.saved).forEach(value => assert.equal(value, true, 'actionable saved search'));
  checks.savedJourneys = await app.evaluate(`(() => {
    const open = window.roostTestHooks.openSavedLauncherItem;
    open({kind:'workbench',id:'launch-note'});
    const noteLoaded = document.getElementById('wb-text').value === 'Needlewords retained offline' && document.activeElement.id === 'wb-text';
    open({kind:'readlater',id:'https://example.com/launch-article'});
    const archivedArticleReached = document.activeElement.href === 'https://example.com/launch-article';
    open({kind:'board',id:'launch-board'});
    const boardReached = document.activeElement.textContent.includes('Satellite research board');
    document.getElementById('roost-modal-x').click();
    const backgroundRecovered = ![...document.body.children].some(el => el.inert);
    return {noteLoaded, archivedArticleReached, boardReached, backgroundRecovered};
  })()`);
  Object.values(checks.savedJourneys).forEach(value => assert.equal(value, true, 'saved item journey / modal re-entry'));

  await app.evaluate(`(() => {
    document.querySelector('[data-search-scope="all"]').click();
    const input = document.getElementById('search-input'); input.focus(); input.value = 'GitHub'; input.dispatchEvent(new Event('input',{bubbles:true}));
  })()`);
  await key('ArrowDown', 'ArrowDown');
  const selectedAfterArrow = await app.evaluate(`document.getElementById('search-input').getAttribute('aria-activedescendant')`);
  assert.equal(selectedAfterArrow, 'roost-command-option-1', 'ArrowDown advances the active result');
  await key('Tab', 'Tab');
  checks.tabCloses = await app.evaluate(`document.getElementById('search-input').getAttribute('aria-expanded') === 'false'`);
  assert.equal(checks.tabCloses, true, 'Tab closes the popup without trapping focus');

  await app.evaluate(`(() => { window.roostTestHooks.openSavedLauncherItem({kind:'workbench',id:'launch-note'}); })()`);
  await key('k', 'KeyK', 2);
  checks.modalShortcut = await app.evaluate(`document.activeElement.id === 'wb-text' && document.getElementById('search-input').getAttribute('aria-expanded') === 'false'`);
  assert.equal(checks.modalShortcut, true, 'Ctrl+K preserves the active editor');
  checks.slashEditable = await app.evaluate(`(() => { const input = document.getElementById('wb-text'); const event = new KeyboardEvent('keydown',{key:'/',code:'Slash',bubbles:true,cancelable:true}); input.dispatchEvent(event); return !event.defaultPrevented && document.activeElement === input; })()`);
  assert.equal(checks.slashEditable, true, 'slash remains a character in an editor');
  await key('Escape', 'Escape');
  checks.modalRecovery = await app.evaluate(`![...document.body.children].some(el => el.inert) && !document.querySelector('.roost-modal.open')`);
  assert.equal(checks.modalRecovery, true, 'Escape releases the modal background');

  checks.rebuiltTodayFocus = await app.evaluate(`(() => {
    const hooks = window.roostTestHooks;
    hooks.saveSessionState({goal:'Focus restoration fixture',status:'active',timebox:'25'});
    const trigger = document.querySelector('#roost-today [data-open-tool="session"]');
    trigger.focus(); trigger.click();
    document.getElementById('session-goal').value = 'Updated local session';
    document.getElementById('session-save').click();
    document.getElementById('roost-modal-x').click();
    return !trigger.isConnected && document.activeElement.id === 'search-input';
  })()`);
  assert.equal(checks.rebuiltTodayFocus, true, 'closing after Today rerenders restores usable keyboard focus');

  checks.localRankingAndReads = await app.evaluate(`(() => {
    const hooks = window.roostTestHooks;
    const card = [...document.querySelectorAll('main .section:not(#pinned):not(#recent) .link-card')].find(card => card.querySelector('.card-label').textContent === 'GitHub');
    const other = [...document.querySelectorAll('main .section:not(#pinned):not(#recent) .link-card')].find(item => item.href !== card.href);
    const otherTitle = other.querySelector('.card-label').textContent;
    const notes = {}; notes[card.href] = {tags:['launcher-tiebreak']}; notes[other.href] = {tags:['launcher-tiebreak']};
    hooks.saveLinkNotes(notes);
    localStorage.setItem('kfl_pins_v1', JSON.stringify([{href:other.href,label:otherTitle}]));
    const tiebreak = hooks.buildCommandLauncherGroups('launcher-tiebreak')[0].items[0];
    const input = document.getElementById('search-input'); input.focus();
    const original = Storage.prototype.getItem;
    let noteReads = 0;
    Storage.prototype.getItem = function(key) { if (key === 'roost_link_notes_v1') noteReads++; return original.call(this,key); };
    const durations = [];
    try { for (const q of ['GitHub', 'space nasa', 'launcher-tiebreak']) { input.value = q; const start = performance.now(); input.dispatchEvent(new Event('input',{bubbles:true})); durations.push(performance.now()-start); } }
    finally { Storage.prototype.getItem = original; }
    return { favoriteBreaksTie: tiebreak.title === otherTitle && /Favorite/.test(tiebreak.meta), noteReads, durationsMs: durations.map(value => Math.round(value*10)/10) };
  })()`);
  assert.equal(checks.localRankingAndReads.favoriteBreaksTie, true, 'favorite breaks a relevance tie');
  assert.ok(checks.localRankingAndReads.noteReads <= 6, `expected bounded annotation reads, got ${checks.localRankingAndReads.noteReads}`);

  checks.widths = [];
  for (const width of [360, 390, 768, 1440]) {
    await app.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    const result = await app.evaluate(`(() => {
      const input = document.getElementById('search-input'); input.focus(); input.value = 'board'; input.dispatchEvent(new Event('input',{bubbles:true}));
      const popup = document.getElementById('roost-command-panel').getBoundingClientRect();
      return {width:innerWidth, fits:popup.left >= -1 && popup.right <= innerWidth+1, overflow:document.documentElement.scrollWidth-innerWidth};
    })()`);
    assert.equal(result.fits, true, `launcher fits ${width}`);
    assert.ok(result.overflow <= 2, `no horizontal overflow ${width}`);
    checks.widths.push(result);
  }
  assert.deepEqual(app.errors, [], 'no runtime exceptions');
  console.log(JSON.stringify({ checks, runtimeErrors: app.errors, failed: [] }, null, 2));
} finally {
  await app.close();
}
