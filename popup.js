const ALL_TAGS = [
  'Platinum','MOTY','SectionMod','Donator','Verified','Moderator','Admin',
  'HeadAdmin','CommunityMod','Trusted','Owner','Wop','Kej','Founder',
  'Middleman','Silver','Clown','Gold','Banned','MarketBan','God','Diamond',
  'VIP','MVP','BetaMember','verifiedArtist','Authorofthemonth','sysadmin',
  'Author','Investigation','MMRequired','leakedBanned'
];

let equippedOrder = [];

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('bannerCheckboxes');

  const data = await chrome.storage.sync.get(['enabled', 'targetStyleClass', 'customBannerEnabled', 'customBannerUrl', 'bannerTags']);

  if (data.bannerTags) {
    equippedOrder = data.bannerTags.split(',').filter(Boolean);
  }

  function renderTags() {
    grid.innerHTML = '';

    equippedOrder.forEach(tag => {
      if (ALL_TAGS.includes(tag)) createTagElement(tag, true);
    });

    // unselect tags
    ALL_TAGS.forEach(tag => {
      if (!equippedOrder.includes(tag)) createTagElement(tag, false);
    });
  }

  function createTagElement(tag, checked) {
    const displayText = (tag === "Platinum") ? "Champion" : tag;
    
    const label = document.createElement('label');
    label.className = 'tag-item';
    label.innerHTML = `
      <input type="checkbox" value="${tag}" ${checked ? 'checked' : ''}>
      <span class="tag-check"></span>
      <span class="tag-label">${displayText}</span>
    `;
    grid.appendChild(label);
  }

  renderTags();
  
  document.getElementById('enabled').checked = data.enabled ?? true;
  document.getElementById('styleSelect').value = data.targetStyleClass || 'username--style10';
  document.getElementById('customBannerEnabled').checked = data.customBannerEnabled ?? false;
  document.getElementById('customBannerUrl').value = data.customBannerUrl || '';

  const urlInput = document.getElementById('customBannerUrl');
  urlInput.disabled = !document.getElementById('customBannerEnabled').checked;

  async function saveAndApply() {
    const currentlyChecked = Array.from(grid.querySelectorAll('input:checked'))
      .map(cb => cb.value);

    const newOrder = equippedOrder.filter(tag => currentlyChecked.includes(tag));

    currentlyChecked.forEach(tag => {
      if (!newOrder.includes(tag)) newOrder.push(tag);
    });

    equippedOrder = newOrder;

    const payload = {
      enabled:             document.getElementById('enabled').checked,
      targetStyleClass:    document.getElementById('styleSelect').value,
      customBannerEnabled: document.getElementById('customBannerEnabled').checked,
      customBannerUrl:     urlInput.value.trim(),
      bannerTags:          equippedOrder.join(',')
    };

    await chrome.storage.sync.set(payload);
    renderTags();                    // refresh list

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'updateAll', ...payload });
    }

    const status = document.getElementById('status');
    status.textContent = '✓ Saved & Applied';
    setTimeout(() => status.textContent = '@b9na 🎸', 1400);
  }

  grid.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
      saveAndApply();
    }
  });

  document.querySelectorAll('input:not(#bannerCheckboxes input), select').forEach(el => {
    el.addEventListener('change', saveAndApply);
  });

  let timeout;
  urlInput.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(saveAndApply, 400);
  });
});
