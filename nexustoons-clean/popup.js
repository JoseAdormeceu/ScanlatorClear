const DEFAULTS = { enabled: true, debug: false };
const stateText = document.getElementById('stateText');
const dot = document.getElementById('dot');
const toggle = document.getElementById('toggle');
const apply = document.getElementById('apply');
const debug = document.getElementById('debug');

let state = { ...DEFAULTS };

function render() {
  stateText.textContent = state.enabled ? 'ON' : 'OFF';
  dot.classList.toggle('on', state.enabled);
  toggle.textContent = state.enabled ? 'Turn OFF' : 'Turn ON';
  debug.checked = state.debug;
}

async function save(next) {
  state = { ...state, ...next };
  await chrome.storage.local.set(state);
  render();
}

async function applyToActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https:\/\/(www\.)?nexustoons\.com\//.test(tab.url || '')) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'NEXUS_CLEAN_APPLY' });
  } catch (_error) {
    // The page may need a reload before the content script is available.
  }
}

chrome.storage.local.get(DEFAULTS, (items) => {
  state = { ...DEFAULTS, ...items };
  render();
});

toggle.addEventListener('click', async () => {
  await save({ enabled: !state.enabled });
  await applyToActiveTab();
});

apply.addEventListener('click', applyToActiveTab);
debug.addEventListener('change', () => save({ debug: debug.checked }));
