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

  const DEFAULTS = {
    apiBase: 'https://chat.dishaestate.com/api/v1',
    botName: 'Property Advisor',
    tagline: 'Instant Support',
    welcomeText: 'Hello! Welcome to our Property Portal.',
    // Disha brand palette, sampled from the marketing site's home page
    // (warm coral accent on a cream ground, deep maroon header/footer).
    // Branding is config, not code — see the module note above to reskin.
    primaryColor: '#3A0D08',
    primaryDark: '#2A0905',
    accentColor: '#E2402B',
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
    .header .title { font-size: 1rem; font-weight: 600; }
    .header .tag { font-size: .72rem; color: rgba(255,255,255,.72); margin-top: 2px; }
    .header-actions { display: flex; align-items: center; gap: 10px; }
    .header-actions button { background: transparent; border: none; color: rgba(255,255,255,.72); cursor: pointer; font-size: .72rem; font-weight: 600; }
    .header-actions button:hover { color: #fff; }
    .close-btn { background: transparent; border: none; color: rgba(255,255,255,.72); cursor: pointer; font-size: 1.25rem; line-height: 1; }
    .body { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background: #FBF3EC; }
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
    .chip:hover { border-color: ${config.accentColor}; color: ${config.accentColor}; background: #FDECEA; }
    .footer { padding: 12px; background: #fff; border-top: 1px solid #F0E4D8; display: flex; gap: 8px; }
    .footer.hidden { display: none; }
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
        <div>
          <div class="title">${config.botName}</div>
          <div class="tag">${config.tagline}</div>
        </div>
        <div class="header-actions">
          <button id="backBtn" title="Back">‹ Back</button>
          <button id="resetBtn" title="Start over">Start over</button>
          <button class="close-btn" id="closeBtn">&times;</button>
        </div>
      </header>
      <div class="body" id="body"></div>
      <form class="footer" id="form">
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
        back: this.shadow.getElementById('backBtn'),
        reset: this.shadow.getElementById('resetBtn'),
        body: this.shadow.getElementById('body'),
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
      this.el.back.addEventListener('click', () => this._back());
      this.el.reset.addEventListener('click', () => this._reset());
      this.el.form.addEventListener('submit', (e) => this._onSubmit(e));
    }

    async _toggleWindow() {
      const wasHidden = this.el.window.classList.contains('hidden');
      this.el.window.classList.toggle('hidden');
      if (wasHidden && !this.sessionId) {
        await this._start();
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

    _addOptions(options, onSelect) {
      const container = document.createElement('div');
      container.className = 'options';
      options.forEach((opt) => {
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

    _setInputMode({ placeholder = 'Type here...', type = 'text', disabled = false, hidden = false } = {}) {
      this.el.input.placeholder = placeholder;
      this.el.input.type = type;
      this.el.input.disabled = disabled;
      this.el.send.disabled = disabled;
      this.el.form.classList.toggle('hidden', hidden);
    }

    async _start() {
      await this._typingDelay(300);
      const { session, reply } = await this._api('/chat/session', { method: 'POST' });
      this.sessionId = session.sessionId;
      this._lastKnownState = session.state;
      this._addMessage(config.welcomeText, 'bot');
      await this._typingDelay(300);
      this._addMessage(reply.text, 'bot');
      // startSession() always lands on COLLECT_NAME (free text, no chips).
      this._setInputMode({ placeholder: 'Your full name' });
    }

    async _onSubmit(e) {
      e.preventDefault();
      const value = this.el.input.value.trim();
      if (!value || this.mode === 'locked') return;
      this.el.input.value = '';

      const state = this._lastKnownState;
      try {
        if (state === 'COLLECT_NAME' || !state) {
          this._addMessage(value, 'user');
          await this._handleReply(await this._api(`/chat/session/${this.sessionId}/name`, { method: 'POST', body: { name: value } }));
        } else if (state === 'COLLECT_MOBILE') {
          this._addMessage(value, 'user');
          await this._handleReply(await this._api(`/chat/session/${this.sessionId}/mobile`, { method: 'POST', body: { mobileNumber: value } }));
        } else if (state === 'VERIFY_OTP') {
          this._addMessage('••••', 'user');
          await this._handleReply(await this._api(`/chat/session/${this.sessionId}/otp/verify`, { method: 'POST', body: { code: value } }));
        } else if (state === 'LOCATION' || state === 'LOCATION_UNSERVICEABLE') {
          await this._typingDelay(300);
          await this._handleReply(await this._api(`/chat/session/${this.sessionId}/location`, { method: 'POST', body: { locationText: value } }));
        }
      } catch (err) {
        this._addMessage(err.message || 'Something went wrong. Please try again.', 'bot');
      }
    }

    async _handleReply(data) {
      this._lastKnownState = data.session.state;
      await this._typingDelay(350);
      this._addMessage(data.reply.text, 'bot');

      switch (data.session.state) {
        case 'COLLECT_NAME':
          this._setInputMode({ placeholder: 'Your full name' });
          break;
        case 'COLLECT_MOBILE':
          this._setInputMode({ placeholder: 'e.g., 9876543210', type: 'tel' });
          break;
        case 'VERIFY_OTP':
          this._setInputMode({ placeholder: 'Enter 4-digit OTP', type: 'text' });
          break;
        case 'PROPERTY_CATEGORY':
        case 'PROPERTY_SUBCATEGORY':
          this._setInputMode({ hidden: true });
          this._addOptions(data.reply.options, (opt) => this._selectTaxonomy(data.session.state, opt));
          break;
        case 'LOCATION':
          // Chips only until the user picks "Other" — _selectLocation reveals
          // the text input at that point.
          this._setInputMode({ hidden: true });
          this._addOptions(data.reply.options, (opt) => this._selectLocation(opt));
          break;
        case 'LOCATION_UNSERVICEABLE':
          this._setInputMode({ hidden: true });
          this._addOptions(data.reply.options, () => this._backToLocation());
          break;
        case 'NO_MATCH':
          this._setInputMode({ hidden: true });
          this._addOptions(data.reply.options, () => this._reset());
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
      } else {
        this._addLinkMessage(resultUrl, 'Open your results ↗');
      }
    }

    async _back() {
      if (!this.sessionId) return;
      try {
        await this._handleReply(await this._api(`/chat/session/${this.sessionId}/back`, { method: 'POST' }));
      } catch (err) {
        this._addMessage(err.message, 'bot');
      }
    }

    async _reset() {
      if (!this.sessionId) return;
      try {
        await this._handleReply(await this._api(`/chat/session/${this.sessionId}/reset`, { method: 'POST' }));
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
