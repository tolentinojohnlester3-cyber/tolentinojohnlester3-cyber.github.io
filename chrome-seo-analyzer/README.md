# JLT SEO Analyzer (Chrome extension)

This extension analyzes the **page you already have open** — the same approach SEO Chrome extensions use. It reads the tab’s HTML with Chrome permissions, so casino / protected sites that block website CORS proxies still work.

## Install (unpacked)

1. Open Chrome → `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this folder: `chrome-seo-analyzer`
5. Open any website tab → click the extension icon → **Analyze this page**

## Why the website tool sometimes fails

A normal webpage cannot freely download another site’s HTML (browser CORS / bot protection). Extensions can read the current tab, so they succeed where a GitHub Pages tool alone cannot.
