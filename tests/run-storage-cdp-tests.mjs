import assert from 'node:assert/strict';
import { connectApp } from './cdp-client.mjs';

// Use a separate localhost origin, so this suite cannot overwrite another
// journey's storage or a user's installed Roost state.
const appUrl = new URL(process.env.ROOST_APP_URL || 'http://127.0.0.1:8765/index.html');
appUrl.hostname = 'storage.localhost';
const app = await connectApp({ url: appUrl.href, width: 360, seed: `
  if (!sessionStorage.getItem('roost_storage_test_seeded')) {
    localStorage.clear(); sessionStorage.setItem('roost_storage_test_seeded', '1');
  }
` });
const results = {};
try {
  results.fresh = await app.evaluate(`({
    firstRun: !roostTestHooks.onboardingState().completed,
    launcher: !!document.getElementById('search-input'),
    libraryAvailable: document.querySelectorAll('a.link-card').length >= 785
  })`);
  // Seed valid old progress alongside badly typed independent subsystems.
  await app.evaluate(`(() => {
    const profile = roostTestHooks.onboardingState();
    profile.completed = true; profile.layoutApplied = true; profile.data.news = false;
    profile.data.modules = {wire:true,today:true,missionExample:true,workbench:true,diagrams:true,kidZone:true};
    localStorage.setItem('roost_onboarding_v1', JSON.stringify(profile));
    Object.entries({
      kfl_pins_v1: '{}', kfl_recent_v1: '[null]', roost_settings_v1: 'null',
      roost_custom_sections_v1: '[null]', roost_custom_links_v1: '[null]',
      roost_readlater_v1: '{}', roost_boards_v1: '[null]', roost_views_v1: '{"custom":[null]}',
      roost_custom_feeds_v1: '{"feeds":[null]}', roost_workbench_v1: 'null',
      roost_recent_commands_v1: '{}', roost_achievements_v1: 'null',
      roost_mission_v1: '{"completed":{"w1_a0":{"t":"2026-01-01"}},"notes":[],"resourceStatus":[],"missionStatement":42}'
    }).forEach(([key,value]) => localStorage.setItem(key,value));
    return true;
  })()`);
  await app.navigate();
  results.corrupt = await app.evaluate(`(() => {
    const raw = localStorage.getItem('roost_mission_v1');
    return {
      ready: !!document.getElementById('roost-dock'),
      linksIsolated: roostTestHooks.customLinks().length === 0 && roostTestHooks.customSections().length === 0,
      readLaterIsolated: roostTestHooks.readLaterItems().length === 0,
      progressPreserved: JSON.parse(raw).completed.w1_a0.t === '2026-01-01',
      malformedBytesPreserved: localStorage.getItem('roost_readlater_v1') === '{}' && localStorage.getItem('roost_custom_links_v1') === '[null]'
    };
  })()`);
  await app.evaluate(`(() => {
    localStorage.setItem('roost_custom_links_v1', '[{"id":"orphan","title":"Keep my reference","url":"https://example.com/recover","sectionId":"original-section","favorite":false}]');
    return true;
  })()`);
  await app.navigate();
  results.customRecovery = await app.evaluate(`({
    sectionsPreserved: localStorage.getItem('roost_custom_sections_v1') === '[null]',
    linkReferencesPreserved: localStorage.getItem('roost_custom_links_v1') === '[{"id":"orphan","title":"Keep my reference","url":"https://example.com/recover","sectionId":"original-section","favorite":false}]',
    linkAvailable: !!document.querySelector('.roost-custom-recovery a[href="https://example.com/recover"]'),
    recoveryExplained: /original data is unchanged/.test(document.querySelector('.roost-custom-recovery').textContent)
  })`);
  // Repeat initialization through reload and verify another subsystem cannot
  // prevent access to the recovery panel.
  await app.navigate();
  results.restore = await app.evaluate(`(() => {
    document.querySelector('#roost-dock [data-action="backup"]').click();
    const text = document.getElementById('backup-text');
    const confirmBefore = window.confirm; window.confirm = () => true;
    const original = '{ "headlines": false }';
    localStorage.setItem('roost_settings_v1', original);
    text.value = JSON.stringify({schema:'the-roost.localStorage.v1',data:{roost_settings_v1:'null'}});
    document.getElementById('backup-restore').click();
    const rejectsInvalid = /expected an object/.test(document.getElementById('backup-restore-status').textContent) && localStorage.getItem('roost_settings_v1') === original;
    text.value = JSON.stringify({schema:'the-roost.localStorage.v1',exportedAt:'2026-01-01',data:{roost_settings_v1:'{"headlines":true}',roost_storage_test_extension:'opaque'}});
    document.getElementById('backup-preview').click();
    const preview = document.getElementById('backup-preview-box').textContent;
    const usefulPreview = /1 new, 1 replaced, 0 unchanged/.test(preview) && /Preferences and layout/.test(preview);
    document.getElementById('backup-restore').click();
    const restored = localStorage.getItem('roost_settings_v1') === '{"headlines":true}' && !document.getElementById('backup-undo-restore').disabled;
    document.getElementById('backup-undo-restore').click();
    const exactUndo = localStorage.getItem('roost_settings_v1') === original && localStorage.getItem('roost_storage_test_extension') === null;
    const pack = document.getElementById('pack-text');
    localStorage.setItem('roost_boards_v1', '[{"name":"My board","links":[]}]');
    pack.value = JSON.stringify({schema:'the-roost.config-pack.v1',data:{roost_boards_v1:'[]'}});
    document.getElementById('pack-apply').click();
    const packApplied = localStorage.getItem('roost_boards_v1') === '[]' && !document.getElementById('backup-undo-restore').disabled;
    document.getElementById('backup-undo-restore').click();
    const packUndo = JSON.parse(localStorage.getItem('roost_boards_v1'))[0].name === 'My board';
    const labelledInputs = !!text.getAttribute('aria-label') && !!pack.getAttribute('aria-label');
    window.confirm = confirmBefore;
    return {rejectsInvalid,usefulPreview,restored,exactUndo,packApplied,packUndo,labelledInputs};
  })()`);
  await app.evaluate(`(() => {
    localStorage.removeItem('roost_mission_v1');
    localStorage.setItem('missionControlRPG_v3', JSON.stringify({activities:{w1_a0:{completed:true,note:'legacy note',completedAt:'2025-01-01'}},rpg:{missionStatement:'legacy statement'}}));
    return true;
  })()`);
  await app.navigate();
  results.legacy = await app.evaluate(`(() => {
    const state = JSON.parse(localStorage.getItem('roost_mission_v1'));
    return {migrated:state.completed.w1_a0.t === '2025-01-01' && state.notes.w1_a0 === 'legacy note' && state.missionStatement === 'legacy statement',legacyRetained:!!localStorage.getItem('missionControlRPG_v3')};
  })()`);
  console.log(JSON.stringify({ results, runtimeErrors: app.errors }, null, 2));
  for (const [journey, result] of Object.entries(results)) for (const [check, passed] of Object.entries(result)) assert.equal(passed, true, `${journey}: ${check}`);
  assert.deepEqual(app.errors, [], 'runtime errors');
  console.log('Storage CDP journeys passed; failed: [].');
} finally { await app.close(); }
