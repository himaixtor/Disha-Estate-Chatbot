# Disha Chatbot — Embeddable Widget (Release 1)

A single, framework-free script (`src/widget.js`) that any HTML page can embed
with one `<script>` tag. Uses Shadow DOM so the host page's CSS can't leak in
(or the widget's CSS leak out) — see blueprint §14.

Deliberately vanilla JS rather than a React bundle: this is the one part of
the platform meant to run on someone else's website, so it ships with zero
build step and zero host-page dependencies, exactly per the brief. (The Admin
Portal, an internal tool, is React — see `../chatbot-admin/`.)

## Try it

1. Start the backend (`cd ../backend && npm run dev`).
2. Open `demo/index.html` directly in a browser (or serve it: `npx serve demo`).
3. Click the chat bubble, bottom-right.

## Re-theming for a different project

Set `window.DishaChatbotConfig` before the script tag loads:

```html
<script>
  window.DishaChatbotConfig = {
    apiBase: 'https://api.some-other-client.com/api/v1',
    botName: 'Their Bot Name',
    tagline: 'Their tagline',
    welcomeText: 'Hello! Welcome to Their Portal.',
    primaryColor: '#123456',
    accentColor: '#654321',
  };
</script>
<script src="https://cdn.example.com/widget.js"></script>
```

Nothing else in the widget needs to change — this is the "Branding / theme"
module from the platform blueprint.

## What's real vs. mocked in Release 1

- Name validation, mobile/OTP verification, category/subcategory/location
  data, and Back/Start Over all call the real Backend — nothing is hardcoded
  in this file, unlike the original `Chatbotprototype.html` reference.
- "Matching inventory" calls the Backend's `InventoryProvider` module, which
  is a mock/fixture until Disha's real property API is delivered (blueprint
  Issue G13) — so a result URL always comes back, but it points at a
  placeholder domain until then.
- The AI Q&A step from the target design (`AI_SCHEME_QA`) isn't wired into
  this widget at all yet — Release 1 conversations end at the results step.
