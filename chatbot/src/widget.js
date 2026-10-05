/**
 * Disha Chatbot Widget — embeddable, framework-free, Shadow DOM isolated.
 *
 * Usage (host page needs nothing else — no React/Node/build step):
 *   <script src="https://chatbot-domain.com/widget.js"
 *           data-api-base="https://api.disha-estate.example/api/v1"></script>
 *
 * Branding is config, not code — set window.DishaChatbotConfig BEFORE this
 * script tag to reskin for a different project (blueprint § Module
 * architecture: "Branding / theme" module).
 */
(function () {
  'use strict';

  const scriptTag = document.currentScript;
  const NAME_MAX_LENGTH = 50; // must match backend nameValidationService

  const DEFAULTS = {
    apiBase: 'https://chat.dishaestate.com/api/v1',
    botName: 'Property Advisor',
    tagline: 'Instant Support',
    welcomeText: 'Hello! Welcome to our Property Portal.',
    // Disha brand palette, sampled from the marketing site's home page
    // (warm coral accent on a cream ground, deep maroon header/footer).
    // Branding is config, not code — see the module note above to reskin.
    primaryColor: 'linear-gradient(90deg, #e9161f, #b10e16);',
    primaryDark: '#2A0905',
    accentColor: '#EB161F',
    accentHover: '#C93420',
    position: 'bottom-right',
  };

  const config = Object.assign(
    {},
    DEFAULTS,
    {
      apiBase: scriptTag?.dataset.apiBase || DEFAULTS.apiBase,
      botName: scriptTag?.dataset.botName || DEFAULTS.botName,
    },
    window.DishaChatbotConfig || {}
  );

  // Mobile regions offered in the country-code picker. `len` = digits in the
  // national number (without the leading 0), `re` = valid mobile pattern.
  // Must match COUNTRIES in backend/src/services/mobileService.js.
  const COUNTRIES = [
    { dial: '+91', label: 'IN +91', len: 10, re: /^[6-9]\d{9}$/ },
    { dial: '+1', label: 'US/CA +1', len: 10, re: /^[2-9]\d{2}[2-9]\d{6}$/ },
    { dial: '+44', label: 'UK +44', len: 10, re: /^7\d{9}$/ },
    { dial: '+61', label: 'AU +61', len: 9, re: /^4\d{8}$/ },
    { dial: '+971', label: 'AE +971', len: 9, re: /^5[024568]\d{7}$/ },
    { dial: '+974', label: 'QA +974', len: 8, re: /^[3567]\d{7}$/ },
  ];

  // ---- Chat persistence -------------------------------------------------
  // The session id lives in a first-party cookie on the host site for 24h
  // from when the chat started, so a refresh, or opening the chatbot on
  // another page of the same site (e.g. after following the results link),
  // continues the same conversation. The cookie is set on the site's parent
  // domain when possible, so dishaestate.com and uat.dishaestate.com share it.
  const SESSION_COOKIE = 'disha_chat_session';
  const SESSION_TTL_SECONDS = 24 * 60 * 60; // backend SESSION_RESUME_TTL_SECONDS

  function readSessionCookie() {
    const hit = document.cookie.split('; ').find((c) => c.startsWith(`${SESSION_COOKIE}=`));
    return hit ? decodeURIComponent(hit.slice(SESSION_COOKIE.length + 1)) : null;
  }

  // Candidate cookie domains, broadest first: ["example.com", "uat.example.com"].
  // IPs and localhost get none (host-only cookie).
  function cookieDomains() {
    const host = location.hostname;
    if (!host || !host.includes('.') || /^[\d.]+$/.test(host)) return [];
    const parts = host.split('.');
    const out = [];
    for (let i = parts.length - 2; i >= 0; i -= 1) out.push(parts.slice(i).join('.'));
    return out;
  }

  function writeSessionCookie(value) {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    const base = `${SESSION_COOKIE}=${encodeURIComponent(value)}; Max-Age=${SESSION_TTL_SECONDS}; Path=/; SameSite=Lax${secure}`;
    // Browsers silently refuse public suffixes (e.g. "co.in"), so the first
    // domain that actually sticks is the site's own parent domain.
    for (const domain of cookieDomains()) {
      document.cookie = `${base}; Domain=.${domain}`;
      if (readSessionCookie() === value) return;
    }
    document.cookie = base;
  }

  function clearSessionCookie() {
    const expired = `${SESSION_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    cookieDomains().forEach((domain) => { document.cookie = `${expired}; Domain=.${domain}`; });
    document.cookie = expired;
  }

  const STYLES = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .toggle {
      position: fixed; bottom: 24px; right: 24px; background: ${config.accentColor}; color: #fff;
      width: 58px; height: 58px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 10px 25px rgba(226,64,43,.35); border: none; z-index: 999999;
      transition: transform .2s ease, background-color .2s ease;
    }
    .toggle:hover { transform: scale(1.05); background: ${config.accentHover}; }
    .window {
      position: fixed; bottom: 96px; right: 24px; width: 380px; max-width: calc(100vw - 48px); height: 560px;
      background: #fff; border-radius: 16px; box-shadow: 0 18px 40px rgba(0,0,0,.18); display: flex;
      flex-direction: column; overflow: hidden; z-index: 999999; transition: opacity .25s ease, transform .25s ease;
    }
    .window.hidden { opacity: 0; pointer-events: none; transform: translateY(16px); }
    .header { background: ${config.primaryColor}; color: #fff; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; }
    .header-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .header-avatar { width: 36px; height: 36px; flex: none; border-radius: 50%; background: rgba(255,255,255,.12); color: #fff; display: grid; place-items: center; }
    .header-avatar svg { width: 24px; height: 24px; display: block; }
    .header .title { font-size: 1rem; font-weight: 600; }
    .header .tag { font-size: .72rem; color: rgba(255,255,255,.72); margin-top: 2px; }
    .header-actions { display: flex; align-items: center; gap: 10px; }
    .close-btn { background: transparent; border: none; color: rgba(255,255,255,.72); cursor: pointer; font-size: 1.25rem; line-height: 1; }
    .close-btn:hover { color: #fff; }
    .body { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background: #fff; }
    .row { display: flex; width: 100%; }
    .row.bot { justify-content: flex-start; }
    .row.user { justify-content: flex-end; }
    .bubble { max-width: 80%; padding: 10px 14px; font-size: .88rem; line-height: 1.4; border-radius: 12px; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
    .row.bot .bubble { background: #F5E9DE; color: #241C18; border-bottom-left-radius: 2px; }
    .row.user .bubble { background: ${config.accentColor}; color: #fff; border-bottom-right-radius: 2px; }
    .bubble a { color: ${config.accentColor}; font-weight: 600; text-decoration: underline; overflow-wrap: anywhere; word-break: break-all; }
    .row.user .bubble a { color: #fff; }
    .options { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px; }
    .chip { background: #fff; border: 1px solid #E8D9C9; color: #241C18; padding: 7px 12px; border-radius: 20px; font-size: .8rem; font-weight: 500; cursor: pointer; }
    .otp-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .otp-actions .chip:disabled { opacity: .55; cursor: not-allowed; border-color: #E8D9C9; color: #8A7B72; background: #fff; }
    .chip.back { color: #6B5A50; border-style: dashed; }
    .chip:hover { border-color: ${config.accentColor}; color: ${config.accentColor}; background: #FDECEA; }
    .footer { padding: 12px; background: #fff; border-top: 1px solid #F0E4D8; display: flex; gap: 8px; }
    .footer.hidden { display: none; }
    .footer select { flex: none; padding: 0 8px; border: 1px solid #E8D9C9; border-radius: 20px; font-size: .8rem; background: #fff; color: #241C18; outline: none; cursor: pointer; }
    .footer select:focus { border-color: ${config.accentColor}; }
    .footer select.hidden { display: none; }
    .footer input { flex: 1; padding: 10px 14px; border: 1px solid #E8D9C9; border-radius: 20px; font-size: .88rem; outline: none; min-width: 0; }
    .footer input:focus { border-color: ${config.accentColor}; }
    .footer button { background: ${config.accentColor}; color: #fff; border: none; border-radius: 20px; padding: 0 16px; font-size: .88rem; font-weight: 500; cursor: pointer; }
    .footer button:disabled { opacity: .5; cursor: not-allowed; }
    .typing { display: inline-flex; gap: 4px; align-items: center; padding: 8px 12px; }
    .typing span { width: 6px; height: 6px; background: #C9B8A8; border-radius: 50%; animation: blink 1.2s infinite ease-in-out; }
    .typing span:nth-child(2) { animation-delay: .2s; }
    .typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes blink { 0%, 80%, 100% { opacity: .3; transform: scale(.8); } 40% { opacity: 1; transform: scale(1.1); } }
  `;

  const MARKUP = `
    <button class="toggle" id="toggle" aria-label="Open chat">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>
    <div class="window hidden" id="window">
      <header class="header">
        <div class="header-brand">
          <div class="header-avatar"><svg viewBox="0 0 128 128" fill="currentColor" aria-hidden="true"><path d="M71,75.82045c0,5.03314,3.07471,8.97552,7,8.97552s7-3.94237,7-8.97552-3.07471-8.97552-7-8.97552S71,70.7873,71,75.82045Zm10,0c0,2.93827-1.58105,4.9864-3,4.9864s-3-2.04812-3-4.9864,1.58105-4.9864,3-4.9864S81,72.88217,81,75.82045Z"/><path d="M43,75.82045c0,5.03314,3.07471,8.97552,7,8.97552s7-3.94237,7-8.97552-3.07471-8.97552-7-8.97552S43,70.7873,43,75.82045Zm10,0c0,2.93827-1.58105,4.9864-3,4.9864s-3-2.04812-3-4.9864,1.58105-4.9864,3-4.9864S53,72.88217,53,75.82045Z"/><path d="M81.93384,111.03067A14.05354,14.05354,0,0,1,75.67218,118a40.72732,40.72732,0,0,0,22.76544-17.33333,86.23218,86.23218,0,0,1-9.97247,5.67537A36.67357,36.67357,0,0,1,81.93384,111.03067Z"/><path d="M46.04767,111.02063A37.52231,37.52231,0,0,1,28.183,87.38412a13.05723,13.05723,0,0,1-3.13745,3.58641,41.0774,41.0774,0,0,0,27.24988,27.02028A14.05467,14.05467,0,0,1,46.04767,111.02063Z"/><path d="M26,66.84493a8.99021,8.99021,0,0,0-6.95642-8.7332C19.95148,33.62647,39.76343,13.98912,64,13.98912c22.89893,0,41.84424,17.53146,44.63293,40.11694a12.19675,12.19675,0,0,1,4.01636-.1095C109.78516,29.258,89.06689,10,64,10,37.56628,10,15.96753,31.41406,15.04425,58.08915a9.00861,9.00861,0,0,0-6.82269,6.80054,8.96725,8.96725,0,0,0,0,17.87239A8.9994,8.9994,0,0,0,26,80.80684ZM8,78.71149a4.98363,4.98363,0,0,1,0-9.7712Z"/><path d="M100.82184,88.84814a76.53546,76.53546,0,0,1-22.53143,13.22327A10.009,10.009,0,0,0,69,95.766H59a9.97283,9.97283,0,1,0,0,19.94559H69a9.99216,9.99216,0,0,0,9.9834-9.6455,80.77363,80.77363,0,0,0,24.78552-14.49239A13.08529,13.08529,0,0,1,100.82184,88.84814Z"/><path d="M119.77844,64.88969A8.9994,8.9994,0,0,0,102,66.84493V80.80684a8.9994,8.9994,0,0,0,17.77844,1.95524,8.96725,8.96725,0,0,0,0-17.87239ZM120,78.71149v-9.7712a4.98363,4.98363,0,0,1,0,9.7712Z"/><path d="M98,66.84473a12.981,12.981,0,0,1,6.82886-11.41437A43.86941,43.86941,0,0,0,98.772,42.11548a22.0195,22.0195,0,0,0-4.3916-4.87146,21.19639,21.19639,0,0,0-3.39844-2.25555,14.68543,14.68543,0,0,0-1.41309-.63306,5.31756,5.31756,0,0,1-1.55908-.81226c-7.0332-6.77838-15.1626-9.72931-26.2915-9.57544-14.519.20258-25.36328,5.91553-33.15283,17.46509a38.254,38.254,0,0,0-4.83862,10.61542c-.20514,1.12177-.37549,2.25684-.49243,3.40979A12.90467,12.90467,0,0,1,30,66.84473V77.24384c1.28967-2.63049,2.72412-5.61487,3.54688-7.51715,2.2915-5.3,7.12842-8.93848,12.32275-9.26862a41.23306,41.23306,0,0,1,7.62988.45575,43.42422,43.42422,0,0,0,8.90234.44214,43.85363,43.85363,0,0,0,16.31836-4.55688c1.769,1.28363,6.18115,4.52966,8.938,6.9566A54.87121,54.87121,0,0,1,97.0127,74.83679c.24408.41724.59741,1.11792.9873,1.92847Z"/></svg></div>
          <div>
            <div class="title">${config.botName}</div>
            <div class="tag">${config.tagline}</div>
          </div>
        </div>
        <div class="header-actions">
          <button class="close-btn" id="closeBtn">&times;</button>
        </div>
      </header>
      <div class="body" id="body"></div>
      <form class="footer" id="form">
        <select id="country" class="hidden" aria-label="Country code">
          ${COUNTRIES.map((c) => `<option value="${c.dial}">${c.label}</option>`).join('')}
        </select>
        <input type="text" id="input" placeholder="Type here..." autocomplete="off" />
        <button type="submit" id="sendBtn">Send</button>
      </form>
    </div>
  `;

  class DishaChatbot {
    constructor(root) {
      this.shadow = root.attachShadow({ mode: 'open' });
      this.shadow.innerHTML = `<style>${STYLES}</style>${MARKUP}`;
      this.el = {
        toggle: this.shadow.getElementById('toggle'),
        window: this.shadow.getElementById('window'),
        close: this.shadow.getElementById('closeBtn'),
        body: this.shadow.getElementById('body'),
        country: this.shadow.getElementById('country'),
        form: this.shadow.getElementById('form'),
        input: this.shadow.getElementById('input'),
        send: this.shadow.getElementById('sendBtn'),
      };
      this.sessionId = null;
      this.mode = 'text'; // 'text' | 'options' | 'locked'
      this._bind();
    }

    _bind() {
      this.el.toggle.addEventListener('click', () => this._toggleWindow());
      this.el.close.addEventListener('click', () => this.el.window.classList.add('hidden'));
      this.el.form.addEventListener('submit', (e) => this._onSubmit(e));
      this.el.input.addEventListener('input', () => this._filterInput());
      this.el.country.addEventListener('change', () => {
        this._applyCountry();
        this.el.input.focus();
      });
    }

    // Digits-only fields (mobile number, OTP): strip anything that isn't a
    // digit as the user types or pastes, and cap the length. A pasted
    // "+91 98765 43210" / "09876543210" is reduced to the 10-digit number.
    _filterInput() {
      const f = this._inputFilter;
      if (!f) return;
      let digits = this.el.input.value.replace(/\D/g, '');
      if (f === 'name') {
        // Letters, spaces and . ' - only; no leading spaces; max NAME_MAX_LENGTH.
        const cleaned = this.el.input.value.replace(/[^a-zA-Z\s.'-]/g, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ').slice(0, NAME_MAX_LENGTH);
        if (cleaned !== this.el.input.value) this.el.input.value = cleaned;
        return;
      }
      if (f === 'mobile') {
        // Pasted with the country code or a trunk "0" in front → keep the national part.
        const c = this._country();
        const cc = c.dial.slice(1);
        if (digits.length === c.len + cc.length && digits.startsWith(cc)) digits = digits.slice(cc.length);
        // No supported region has a mobile number starting with 0 once the
        // trunk prefix is dropped (050… → 50…, 07911… → 7911…).
        digits = digits.replace(/^0+/, '');
      }
      digits = digits.slice(0, this.el.input.maxLength > 0 ? this.el.input.maxLength : undefined);
      if (digits !== this.el.input.value) this.el.input.value = digits;
    }

    _country() {
      return COUNTRIES.find((c) => c.dial === this.el.country.value) || COUNTRIES[0];
    }

    // Length limit + placeholder follow the selected country.
    _applyCountry() {
      const c = this._country();
      this.el.input.maxLength = c.len;
      this.el.input.placeholder = `${c.len}-digit mobile number`;
      this._filterInput();
    }

    // "Resend OTP" (with a countdown) + "Change number" under the OTP prompt.
    // resendAfter: seconds until resend is allowed; null = resend unavailable
    // (per-session limit reached), only "Change number" is offered.
    _renderOtpActions(resendAfter) {
      this._clearOtpActions();
      const row = document.createElement('div');
      row.className = 'otp-actions';

      if (resendAfter !== null) {
        const resend = document.createElement('button');
        resend.type = 'button';
        resend.className = 'chip';
        let left = Math.max(0, Number(resendAfter) || 0);
        const paint = () => {
          resend.disabled = left > 0;
          resend.textContent = left > 0 ? `Resend OTP in ${left}s` : 'Resend OTP';
        };
        paint();
        if (left > 0) {
          this._otpTimer = setInterval(() => {
            left -= 1;
            paint();
            if (left <= 0) { clearInterval(this._otpTimer); this._otpTimer = null; }
          }, 1000);
        }
        resend.addEventListener('click', () => this._resendOtp());
        row.appendChild(resend);
      }

      const change = document.createElement('button');
      change.type = 'button';
      change.className = 'chip';
      change.textContent = 'Change number';
      change.addEventListener('click', () => this._changeMobile());
      row.appendChild(change);

      this._otpActionsEl = row;
      this.el.body.appendChild(row);
      this.el.body.scrollTop = this.el.body.scrollHeight;
    }

    _clearOtpActions() {
      if (this._otpTimer) { clearInterval(this._otpTimer); this._otpTimer = null; }
      if (this._otpActionsEl) { this._otpActionsEl.remove(); this._otpActionsEl = null; }
    }

    // Keeps the OTP buttons as the last thing in the chat after new messages.
    _keepOtpActionsLast() {
      if (this._otpActionsEl) {
        this.el.body.appendChild(this._otpActionsEl);
        this.el.body.scrollTop = this.el.body.scrollHeight;
      }
    }

    async _resendOtp() {
      if (!this.sessionId || this._busy) return;
      this._busy = true;
      this._clearOtpActions();
      this._addMessage('Resend OTP', 'user');
      try {
        await this._handleReply(await this._api(`/chat/session/${this.sessionId}/otp/resend`, { method: 'POST' }));
      } catch (err) {
        this._addMessage(err.message, 'bot');
        this._renderOtpActions(0);
      } finally {
        this._busy = false;
      }
    }

    async _changeMobile() {
      if (!this.sessionId || this._busy) return;
      this._busy = true;
      this._clearOtpActions();
      this._addMessage('Change number', 'user');
      try {
        await this._handleReply(await this._api(`/chat/session/${this.sessionId}/mobile/change`, { method: 'POST' }));
      } catch (err) {
        this._addMessage(err.message, 'bot');
      } finally {
        this._busy = false;
      }
    }

    async _toggleWindow() {
      const wasHidden = this.el.window.classList.contains('hidden');
      this.el.window.classList.toggle('hidden');
      if (wasHidden && !this.sessionId && !this._opening) {
        this._opening = true;
        try {
          if (!(await this._resume())) await this._start();
        } finally {
          this._opening = false;
        }
      }
    }

    async _api(path, options) {
      const res = await fetch(`${config.apiBase}${path}`, {
        method: options?.method || 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || `Request to ${path} failed.`);
      }
      return json.data;
    }

    _addMessage(text, sender) {
      const row = document.createElement('div');
      row.className = `row ${sender}`;
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.textContent = text;
      row.appendChild(bubble);
      this.el.body.appendChild(row);
      this.el.body.scrollTop = this.el.body.scrollHeight;
    }

    _addLinkMessage(url, label) {
      const row = document.createElement('div');
      row.className = 'row bot';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = label || url;
      bubble.appendChild(link);
      row.appendChild(bubble);
      this.el.body.appendChild(row);
      this.el.body.scrollTop = this.el.body.scrollHeight;
    }

    // { withBack: true } appends a "Back" chip that steps the workflow back one
    // step (server-side BACK_MAP) — shown from sub-category selection onwards.
    _addOptions(options, onSelect, { withBack = false } = {}) {
      const container = document.createElement('div');
      container.className = 'options';
      if (withBack) {
        const back = document.createElement('button');
        back.type = 'button';
        back.className = 'chip back';
        back.textContent = '\u2039 Back';
        back.addEventListener('click', () => {
          container.remove();
          this._addMessage('Back', 'user');
          this._back();
        });
        // appended after the real options below
        container._backChip = back;
      }
      (options || []).forEach((opt) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.textContent = opt.label;
        chip.addEventListener('click', () => {
          container.remove();
          this._addMessage(opt.label, 'user');
          onSelect(opt);
        });
        container.appendChild(chip);
      });
      if (container._backChip) container.appendChild(container._backChip);
      this.el.body.appendChild(container);
      this.el.body.scrollTop = this.el.body.scrollHeight;
    }

    async _typingDelay(ms = 450) {
      const row = document.createElement('div');
      row.className = 'row bot';
      row.innerHTML = '<div class="bubble typing"><span></span><span></span><span></span></div>';
      this.el.body.appendChild(row);
      this.el.body.scrollTop = this.el.body.scrollHeight;
      await new Promise((resolve) => setTimeout(resolve, ms));
      row.remove();
    }

    _setInputMode({
      placeholder = 'Type here...', type = 'text', disabled = false, hidden = false,
      filter = null, maxLength = null, inputMode = 'text', autocomplete = 'off', showCountry = false,
    } = {}) {
      this.el.country.classList.toggle('hidden', !showCountry);
      this._inputFilter = filter; // null | 'mobile' | 'digits'
      this.el.input.value = '';
      this.el.input.placeholder = placeholder;
      this.el.input.type = type;
      this.el.input.inputMode = inputMode;
      this.el.input.autocomplete = autocomplete;
      if (maxLength) this.el.input.maxLength = maxLength; else this.el.input.removeAttribute('maxlength');
      this.el.input.disabled = disabled;
      this.el.send.disabled = disabled;
      this.el.form.classList.toggle('hidden', hidden);
    }

    // Rebuilds a chat started within the last 24h (cookie) — history plus the
    // current step's buttons/input. Returns false if there's nothing to resume.
    async _resume() {
      const savedId = readSessionCookie();
      if (!savedId) return false;
      let data;
      try {
        data = await this._api(`/chat/session/${encodeURIComponent(savedId)}`);
      } catch (_err) {
        clearSessionCookie(); // expired (24h) or no longer exists — start fresh
        return false;
      }
      this.sessionId = data.session.sessionId;
      (data.history || []).forEach((m) => this._addMessage(m.text, m.sender));
      await this._handleReply({ session: data.session, reply: data.reply || {} }, { silent: true });
      return true;
    }

    async _start() {
      await this._typingDelay(300);
      const { session, reply } = await this._api('/chat/session', { method: 'POST' });
      this.sessionId = session.sessionId;
      writeSessionCookie(session.sessionId);
      this._lastKnownState = session.state;
      this._addMessage(config.welcomeText, 'bot');
      await this._typingDelay(300);
      this._addMessage(reply.text, 'bot');
      // startSession() always lands on COLLECT_NAME (free text, no chips).
      this._setInputMode({ placeholder: 'Your full name', filter: 'name', maxLength: NAME_MAX_LENGTH, autocomplete: 'name' });
    }

    async _onSubmit(e) {
      e.preventDefault();
      const value = this.el.input.value.trim();
      if (!value || this.mode === 'locked') return;
      this.el.input.value = '';

      const state = this._lastKnownState;
      try {
        if (state === 'COLLECT_NAME' || !state) {
          if (value.length < 2 || value.length > NAME_MAX_LENGTH) {
            this.el.input.value = value;
            this._addMessage(`Please enter your name (2 to ${NAME_MAX_LENGTH} characters).`, 'bot');
            return;
          }
          this._addMessage(value, 'user');
          await this._handleReply(await this._api(`/chat/session/${this.sessionId}/name`, { method: 'POST', body: { name: value } }));
        } else if (state === 'COLLECT_MOBILE') {
          const c = this._country();
          if (!c.re.test(value)) {
            this.el.input.value = value;
            this._addMessage(`Please enter a valid ${c.len}-digit mobile number for ${c.dial}.`, 'bot');
            return;
          }
          this._addMessage(`${c.dial} ${value}`, 'user');
          await this._handleReply(await this._api(`/chat/session/${this.sessionId}/mobile`, { method: 'POST', body: { mobileNumber: `${c.dial}${value}` } }));
        } else if (state === 'VERIFY_OTP') {
          const len = this._otpLength || 4;
          if (!new RegExp(`^\\d{${len}}$`).test(value)) {
            this.el.input.value = value;
            this._addMessage(`Please enter the ${len}-digit code (numbers only).`, 'bot');
            this._keepOtpActionsLast();
            return;
          }
          this._addMessage('\u2022'.repeat(len), 'user');
          await this._handleReply(await this._api(`/chat/session/${this.sessionId}/otp/verify`, { method: 'POST', body: { code: value } }));
        } else if (state === 'LOCATION' || state === 'LOCATION_UNSERVICEABLE') {
          await this._typingDelay(300);
          await this._handleReply(await this._api(`/chat/session/${this.sessionId}/location`, { method: 'POST', body: { locationText: value } }));
        }
      } catch (err) {
        this._addMessage(err.message || 'Something went wrong. Please try again.', 'bot');
        this._keepOtpActionsLast();
      }
    }

    // silent: redraw the current step's UI without a new bot message (used
    // when resuming a saved chat — the message is already in the history).
    async _handleReply(data, { silent = false } = {}) {
      this._clearOtpActions();
      // Option chips from an earlier step must not stay clickable once the
      // conversation has moved on (e.g. after Back to main menu).
      this.el.body.querySelectorAll('.options').forEach((el) => el.remove());
      this._lastKnownState = data.session.state;
      if (!silent) {
        await this._typingDelay(350);
        this._addMessage(data.reply.text, 'bot');
      }

      switch (data.session.state) {
        case 'COLLECT_NAME':
          this._setInputMode({ placeholder: 'Your full name', filter: 'name', maxLength: NAME_MAX_LENGTH, autocomplete: 'name' });
          break;
        case 'COLLECT_MOBILE':
          this._setInputMode({ type: 'tel', filter: 'mobile', inputMode: 'numeric', autocomplete: 'tel-national', showCountry: true });
          this._applyCountry();
          break;
        case 'VERIFY_OTP': {
          this._otpLength = data.reply.otpLength || this._otpLength || 4;
          this._setInputMode({ placeholder: `Enter ${this._otpLength}-digit OTP`, type: 'text', filter: 'digits', maxLength: this._otpLength, inputMode: 'numeric', autocomplete: 'one-time-code' });
          this._renderOtpActions(data.reply.resendAfterSeconds === undefined ? 30 : data.reply.resendAfterSeconds);
          break;
        }
        case 'PROPERTY_CATEGORY':
        case 'PROPERTY_SUBCATEGORY':
          this._setInputMode({ hidden: true });
          this._addOptions(data.reply.options, (opt) => this._selectTaxonomy(data.session.state, opt),
            { withBack: data.session.state === 'PROPERTY_SUBCATEGORY' });
          break;
        case 'LOCATION':
          // Chips only until the user picks "Other" — _selectLocation reveals
          // the text input at that point.
          this._setInputMode({ hidden: true });
          this._addOptions(data.reply.options, (opt) => this._selectLocation(opt), { withBack: true });
          break;
        case 'LOCATION_UNSERVICEABLE':
          this._setInputMode({ hidden: true });
          this._addOptions(data.reply.options, () => this._backToLocation());
          break;
        case 'NO_MATCH':
          this._setInputMode({ hidden: true });
          this._addOptions(data.reply.options, () => this._mainMenu());
          break;
        case 'SHOW_RESULTS':
          this._setInputMode({ hidden: true });
          this._addOptions(data.reply.options, (opt) => this._onResult(opt, data.reply.resultUrl));
          break;
        default:
          this._setInputMode();
      }
    }

    async _selectTaxonomy(state, opt) {
      try {
        const path = state === 'PROPERTY_CATEGORY' ? 'category' : 'subcategory';
        const bodyKey = state === 'PROPERTY_CATEGORY' ? 'categoryId' : 'subcategoryId';
        await this._handleReply(await this._api(`/chat/session/${this.sessionId}/${path}`, { method: 'POST', body: { [bodyKey]: opt.id } }));
      } catch (err) {
        this._addMessage(err.message, 'bot');
      }
    }

    async _selectLocation(opt) {
      try {
        if (opt.id === null && opt.label === 'Other') {
          this._setInputMode({ placeholder: 'Type your locality...' });
          this._addMessage('Please type your preferred locality below.', 'bot');
          return;
        }
        await this._typingDelay(300);
        await this._handleReply(await this._api(`/chat/session/${this.sessionId}/location`, { method: 'POST', body: { serviceSectorId: opt.id } }));
      } catch (err) {
        this._addMessage(err.message, 'bot');
      }
    }

    async _backToLocation() {
      try {
        await this._handleReply(await this._api(`/chat/session/${this.sessionId}/back`, { method: 'POST' }));
      } catch (err) {
        this._addMessage(err.message, 'bot');
      }
    }

    _onResult(opt, resultUrl) {
      if (!resultUrl) return;
      if (opt.id === 'open') {
        window.open(resultUrl, '_blank', 'noopener');
        this._addMessage('Your results are open in a new tab. What would you like to do next?', 'bot');
      } else {
        this._addLinkMessage(resultUrl, 'Open your results \u2197');
        this._addMessage('What would you like to do next?', 'bot');
      }
      // Navigation after the results: previous menu = location step,
      // main menu = category selection (verified details are kept).
      this._addOptions([
        { id: 'previous', label: '\u2039 Back to previous menu' },
        { id: 'main', label: 'Back to main menu' },
      ], (nav) => (nav.id === 'previous' ? this._back() : this._mainMenu()));
    }

    async _back() {
      if (!this.sessionId) return;
      try {
        await this._handleReply(await this._api(`/chat/session/${this.sessionId}/back`, { method: 'POST' }));
      } catch (err) {
        this._addMessage(err.message, 'bot');
      }
    }

    // "Back to main menu": keeps the verified name/mobile, returns to
    // category selection with preferences cleared.
    async _mainMenu() {
      if (!this.sessionId) return;
      try {
        await this._handleReply(await this._api(`/chat/session/${this.sessionId}/main-menu`, { method: 'POST' }));
      } catch (err) {
        this._addMessage(err.message, 'bot');
      }
    }
  }

  function mount() {
    const host = document.createElement('div');
    host.id = 'disha-chatbot-host';
    document.body.appendChild(host);
    // eslint-disable-next-line no-new
    new DishaChatbot(host);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
