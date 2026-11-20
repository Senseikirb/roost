import assert from 'node:assert/strict';
import { connectApp } from './cdp-client.mjs';

const app = await connectApp({ width: 1440, seed: {
  roost_onboarding_v1: { version: 1, completed: true, profile: 'public', data: { news: false } },
  roost_custom_sections_v1: [{ id: 'test-collection', title: 'Test collection' }],
  roost_custom_links_v1: [{ id: 'test-link', sectionId: 'test-collection', title: 'Personal link', url: 'https://example.org/personal' }]
}});
try {
  const result = await app.evaluate(`(() => {
    const pins = () => JSON.parse(localStorage.getItem('kfl_pins_v1') || '[]');
    const favorite = link => link.parentElement.querySelector('.pin-btn').click();
    const first = document.querySelector('#quick-access a.link-card');
    const initialFrames = document.querySelectorAll('.roost-card-frame').length;
    favorite(first);
    document.querySelector('#roost-home-nav [data-home-surface="full"]').click();
    const custom = document.querySelector('.roost-custom-link-card');
    const section = custom.closest('.section');
    if (section.classList.contains('collapsed')) section.querySelector('.section-header').click();
    custom.focus();
    favorite(custom);
    const afterBoth = pins().map(pin => pin.href);
    const savedCopy = [...document.querySelectorAll('#pinned a.link-card')].find(a => a.href === custom.href);
    favorite(savedCopy);
    const afterUnpin = pins().map(pin => pin.href);
    const customUnpinned = !JSON.parse(localStorage.getItem('roost_custom_links_v1'))[0].favorite;
    const recentBefore = localStorage.getItem('kfl_recent_v1');
    first.parentElement.querySelector('.roost-link-tool').click();
    const noteOpened = !!document.getElementById('link-note-body');
    document.getElementById('roost-modal-x').click();
    return { initialFrames, total: document.querySelectorAll('main a.link-card').length, first:first.href, custom:custom.href,
      afterBoth, afterUnpin, customUnpinned, noteOpened, actionsTracked: localStorage.getItem('kfl_recent_v1') !== recentBefore,
      nestedButtons: document.querySelectorAll('a.link-card button').length };
  })()`);
  assert.ok(result.initialFrames > 0 && result.initialFrames < result.total / 2);
  assert.deepEqual(result.afterBoth, [result.custom, result.first]);
  assert.deepEqual(result.afterUnpin, [result.first]);
  assert.equal(result.customUnpinned, true);
  assert.equal(result.noteOpened, true);
  assert.equal(result.actionsTracked, false);
  assert.equal(result.nestedButtons, 0);
  assert.deepEqual(app.errors, []);
  console.log('PASS curated and custom favorites, utility copies, accessible controls and deferred rendering');
} finally { await app.close(); }
