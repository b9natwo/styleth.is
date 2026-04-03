// content.js

class MainClass {
  constructor() {
    this.myUsername = null;
    this.myUserId = null;
    this.enabled = true;
    this.targetStyleClass = 'username--style10';
    this.customBannerEnabled = false;
    this.customBannerUrl = '';
    this.avatarDecoration = '';
    this.bannerTags = [];
    this._observer = null;
    this.init();
  }

  async init() {
    const data = await chrome.storage.sync.get([
      'enabled', 'targetStyleClass',
      'customBannerEnabled', 'customBannerUrl',
      'avatarDecoration', 'bannerTags'
    ]);
    this.enabled = data.enabled ?? true;
    this.targetStyleClass = data.targetStyleClass || 'username--style10';
    this.customBannerEnabled = data.customBannerEnabled ?? false;
    this.customBannerUrl = data.customBannerUrl || '';
    this.avatarDecoration = data.avatarDecoration || '';
    this.bannerTags = data.bannerTags ? data.bannerTags.split(',').filter(Boolean) : [];
    this.detectMyUsername();
    this.detectMyUserId();
    if (this.myUsername && this.enabled) {
      this.applyAll();
      this.startObserver();
    }
  }

  updateFromData(message) {
    this.enabled = message.enabled ?? this.enabled;
    this.targetStyleClass = message.targetStyleClass ?? this.targetStyleClass;
    this.customBannerEnabled = message.customBannerEnabled ?? this.customBannerEnabled;
    this.customBannerUrl = message.customBannerUrl ?? this.customBannerUrl;
    this.avatarDecoration = message.avatarDecoration ?? this.avatarDecoration;
    this.bannerTags = message.bannerTags != null
      ? message.bannerTags.split(',').filter(Boolean)
      : this.bannerTags;
    if (this.enabled) {
      this.startObserver();
    } else {
      this.stopObserver();
    }
  }

  startObserver() {
    if (this._observer) return;
    this._observer = new MutationObserver((mutations) => {
      const externalChange = mutations.some(m =>
        Array.from(m.addedNodes).some(n =>
          n.nodeType === 1 &&
          !n.hasAttribute?.('data-styleThis') &&
          !n.id?.startsWith('styleThis')
        )
      );
      if (!externalChange) return;
      this._observer.disconnect();
      this._observer = null;
      this.applyAll();
      requestAnimationFrame(() => this.startObserver());
    });
    this._observer.observe(document.body, { childList: true, subtree: true });
  }

  stopObserver() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }

  detectMyUsername() {
    const accountLink = document.querySelector('a.p-navgroup-link--user[title]');
    if (accountLink) {
      const title = accountLink.getAttribute('title');
      if (title && !title.includes('menu')) {
        this.myUsername = title.trim();
        return;
      }
    }
    const avatarImg = document.querySelector('a.p-navgroup-link--user img.avatar');
    if (avatarImg) {
      this.myUsername = avatarImg.getAttribute('alt')?.trim();
    }
  }

  detectMyUserId() {
    const avatar = document.querySelector('a.p-navgroup-link--user img.avatar');
    if (avatar) {
      this.myUserId = avatar.getAttribute('data-user-id') || null;
    }
    if (!this.myUserId) {
      const profileAvatar = document.querySelector('.memberHeader-avatar img.avatar');
      if (profileAvatar) {
        this.myUserId = profileAvatar.getAttribute('data-user-id') || null;
      }
    }
  }

  applyAll() {
    if (!this.enabled) return;
    this.mirrorUsernameStyles();
    this.applyCustomBanner();
    this.applyAvatarDecoration();
    this.applyBannerTags();
    this.applyPostBanners();
  }

  mirrorUsernameStyles() {
    if (!this.myUsername) return;
    const usernameSpans = document.querySelectorAll('span[class*="username--style"], span.username');
    usernameSpans.forEach(span => {
      if (span.textContent.trim().toLowerCase() === this.myUsername.toLowerCase()) {
        span.className = span.className.replace(/username--style\d+/g, '').trim();
        if (this.targetStyleClass) {
          span.classList.add(this.targetStyleClass);
        }
      }
    });
  }

  applyCustomBanner() {
    if (!this.customBannerEnabled || !this.customBannerUrl || !this.myUsername) return;
    const banners = document.querySelectorAll('.memberProfileBanner');
    banners.forEach(banner => {
      const profileName = banner.querySelector(
        '.memberHeader-name .username, .memberTooltip-name .username'
      );
      const hasYourName = profileName &&
        profileName.textContent.trim().toLowerCase() === this.myUsername.toLowerCase();
      const hasYourId = this.myUserId &&
        banner.querySelector(`[data-user-id="${this.myUserId}"]`);
      if (hasYourName || hasYourId) {
        banner.style.backgroundImage = `url(${this.customBannerUrl})`;
        banner.style.backgroundSize = 'cover';
        banner.style.backgroundPositionX = 'center';
        banner.style.backgroundRepeat = 'no-repeat';
        if (!banner.closest('.memberTooltip')) {
          banner.style.backgroundPositionY = '32%';
          banner.style.height = '155px';
        }
      }
    });
  }

  applyBannerTags() {
    document.querySelectorAll('[data-styleThis]').forEach(el => el.remove());
    if (this.bannerTags.length === 0 || !this.myUsername) return;
    const profileContent = document.querySelector('.memberHeader-content--info');
    if (profileContent) {
      const usernameEl = profileContent.querySelector('h1.memberHeader-name .username');
      const isMyProfile = usernameEl && usernameEl.textContent.trim().toLowerCase() === this.myUsername.toLowerCase();
      const isMyId = this.myUserId && profileContent.querySelector(`[data-user-id="${this.myUserId}"]`);
      if (isMyProfile || isMyId) {
        let bannersDiv = profileContent.querySelector('.memberHeader-banners');
        if (!bannersDiv) {
          bannersDiv = document.createElement('div');
          bannersDiv.className = 'memberHeader-banners';
        }
        bannersDiv.setAttribute('data-styleThis', '1');
        const nameH1 = profileContent.querySelector('h1.memberHeader-name');
        if (nameH1) {
          nameH1.insertAdjacentElement('afterend', bannersDiv);
        } else {
          profileContent.appendChild(bannersDiv);
        }
        this.bannerTags.forEach(tag => {
          const em = document.createElement('em');
          em.className = `userBanner userBanner ${tag}`;
          em.setAttribute('data-styleThis', '1');
          em.innerHTML = `<span class="userBanner-before"></span><strong>${MainClass.TAG_LABELS[tag] || tag}</strong><span class="userBanner-after"></span>`;
          bannersDiv.appendChild(em);
          bannersDiv.appendChild(document.createTextNode(' '));
        });
      }
    }
    document.querySelectorAll('.memberTooltip-headerInfo').forEach(headerInfo => {
      const nameEl = headerInfo.querySelector('.memberTooltip-name .username');
      if (!nameEl || nameEl.textContent.trim().toLowerCase() !== this.myUsername.toLowerCase()) return;
      let bannersDiv = headerInfo.querySelector('.memberTooltip-banners');
      if (!bannersDiv) {
        bannersDiv = document.createElement('div');
        bannersDiv.className = 'memberTooltip-banners';
        bannersDiv.setAttribute('data-styleThis', '1');
        const nameH4 = headerInfo.querySelector('h4.memberTooltip-name');
        if (nameH4) {
          nameH4.insertAdjacentElement('afterend', bannersDiv);
        } else {
          headerInfo.appendChild(bannersDiv);
        }
      }
      this.bannerTags.forEach(tag => {
        const em = document.createElement('em');
        em.className = `userBanner userBanner ${tag}`;
        em.setAttribute('data-styleThis', '1');
        em.innerHTML = `<span class="userBanner-before"></span><strong>${MainClass.TAG_LABELS[tag] || tag}</strong><span class="userBanner-after"></span>`;
        bannersDiv.appendChild(em);
        bannersDiv.appendChild(document.createTextNode(' '));
      });
    });
  }

  applyPostBanners() {
    document.querySelectorAll('.message-userDetails [data-styleThis]').forEach(el => el.remove());
    if (this.bannerTags.length === 0 || !this.myUsername) return;
    document.querySelectorAll('.message-userDetails').forEach(details => {
      const nameLink = details.querySelector('h4.message-name a.username');
      if (!nameLink) return;
      const nameMatch = nameLink.textContent.trim().toLowerCase() === this.myUsername.toLowerCase();
      const idMatch = this.myUserId && nameLink.getAttribute('data-user-id') === this.myUserId;
      if (!nameMatch && !idMatch) return;
      const anchor = details.querySelector('h5.message-userTitle') || details.querySelector('h4.message-name');
      if (!anchor) return;
      const toInsert = this.bannerTags.map(tag => {
        const div = document.createElement('div');
        div.className = `userBanner userBanner ${tag} message-userBanner`;
        div.setAttribute('itemprop', 'jobTitle');
        div.setAttribute('data-styleThis', '1');
        div.innerHTML = `<span class="userBanner-before"></span><strong>${MainClass.TAG_LABELS[tag] || tag}</strong><span class="userBanner-after"></span>`;
        return div;
      });
      toInsert.reverse().forEach(div => anchor.insertAdjacentElement('afterend', div));
    });
  }

  applyAvatarDecoration() {
    const oldStyle = document.getElementById('styleThis-avatar-style');
    if (oldStyle) oldStyle.remove();
    if (!this.avatarDecoration || !this.myUserId || !this.myUsername) return;
    const style = document.createElement('style');
    style.id = 'styleThis-avatar-style';
    let css = '';
    if (this.avatarDecoration === 'offset') {
      css = `
        .avatar[data-user-id="${this.myUserId}"] {
          position: relative;
          overflow: visible;
          border: solid medium #16a2f2 !important;
        }
        .avatar[data-user-id="${this.myUserId}"].avatar--xxs {
          border-width: thin !important;
        }
        .avatar[data-user-id="${this.myUserId}"]::before {
          content: "";
          display: block;
          background-image: url(https://c.tenor.com/mdlO9myizPIAAAAi/get-real.gif);
          background-size: 100% 100%;
          background-repeat: no-repeat;
          position: absolute;
          height: 100%;
          width: 100%;
          top: -66%;
          z-index: -1;
        }
        .username[data-user-id="${this.myUserId}"] {
          background: url(https://media4.giphy.com/media/VEnowpvl0yo7TJRY9v/giphy.gif) center/cover no-repeat;
        }
        .block--messages .message[data-author="${this.myUsername}"] {
          border: solid thin #16a2f2 !important;
        }
      `;
    }
    if (css) {
      style.textContent = css;
      document.head.appendChild(style);
    }
    if (this.myUserId) {
      document.querySelectorAll(`.avatar[data-user-id="${this.myUserId}"]`).forEach(el => {
        el.style.display = 'none';
        void el.offsetHeight;
        el.style.display = '';
      });
    }
  }
}

MainClass.TAG_LABELS = {
  Platinum: 'Champion',
  SectionMod: 'Section Moderator',
  MOTY: 'MOTY',
  Donator: 'Donator',
  Verified: 'Verified',
  Moderator: 'Moderator',
  Admin: 'Admin',
  HeadAdmin: 'Head Admin',
  CommunityMod: 'Community Mod',
  Trusted: 'Trusted',
  Owner: 'Owner',
  Wop: 'Wop',
  Kej: 'Kej',
  Founder: 'Founder',
  Middleman: 'Middleman',
  Silver: 'Silver',
  Clown: 'Clown',
  Gold: 'Gold',
  Banned: 'Banned',
  MarketBan: 'Market Ban',
  God: 'God',
  Diamond: 'Diamond',
  VIP: 'VIP',
  MVP: 'MVP',
  BetaMember: 'Beta Member',
  verifiedArtist: 'Verified Artist',
  Authorofthemonth: 'Author of the Month',
  sysadmin: 'Sysadmin',
  Author: 'Author',
  Investigation: 'Investigation',
  MMRequired: 'MM Required',
  leakedBanned: 'Leaked Banned',
};

const mirror = new MainClass();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateAll') {
    mirror.updateFromData(message);
    mirror.applyAll();
    sendResponse({ status: 'updated' });
  }
});