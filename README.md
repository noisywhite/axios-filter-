# Axios Registro Famiglie — Tampermonkey Filter

A Tampermonkey userscript that cleans up the **Axios Registro Elettronico Famiglie** interface (registrofamiglie.axioscloud.it) by hiding inconvenient information.

## What it hides

| Section | What gets hidden |
|---|---|
| **Grades** | Grades below 6 in both list and grid view; weighted average adjusted |
| **Absences** | Absences, late arrivals and early exits from the last 45 days |
| **Notes** | Rows classified as *Disciplinary Notes* |
| **Class register** | Absence flags, annotations and disciplinary note columns |
| **Dashboard** | Everything in the daily timeline except lesson topics |

## Requirements

- Chrome, Firefox or Edge
- **Tampermonkey** extension → [tampermonkey.net](https://www.tampermonkey.net/)

## Installation

1. Install Tampermonkey from the official website or your browser's extension store
2. Open the Tampermonkey **Dashboard** → click **+** to create a new script
3. Copy the contents of the file inside the `script/` folder and paste it into the editor
4. Save with `Ctrl + S`
5. Navigate to [registrofamiglie.axioscloud.it](https://registrofamiglie.axioscloud.it) — the script activates automatically

## Configuration

Edit these two constants at the top of the script to customize the behaviour:

```js
const GIORNI      = 45;  // how many days of absences to hide (from today backwards)
const SOGLIA_VOTO = 6;   // hides grades strictly below this value
```

## How it works

- **Preemptive CSS** is injected at `document-start` (before the browser paints anything), so elements are hidden before they are ever visible — no flash
- A **MutationObserver** re-runs the filter every time the DOM changes, covering dynamic content loaded via AJAX (e.g. navigating between days in the dashboard)
- All filtering happens **client-side only** — no data is sent to any external server

## Troubleshooting

### The script does nothing

The most common cause is that Tampermonkey does not have permission to run userscripts on the site.

**Chrome / Edge:**
1. Go to `chrome://extensions` (or `edge://extensions`)
2. Find **Tampermonkey** and click **Details**
3. Scroll down to **Site access** and set it to **On all sites** (or add `registrofamiglie.axioscloud.it` manually)
4. Reload the page

**Firefox:**
1. Click the Tampermonkey icon in the toolbar
2. Click **Manage extension**
3. Go to the **Permissions** tab
4. Under **Access your data for all websites**, click **Always allow**
5. Reload the page

### The script is installed but still not running

- Open the Tampermonkey dashboard and make sure the script toggle is **enabled** (blue/green)
- Check that the `@match` line in the script matches the URL you are visiting — it should be:
  ```
  *://registrofamiglie.axioscloud.it/*
  ```
- Try a **hard refresh** (`Ctrl + Shift + R`) after enabling the script

### Chrome shows "Extensions are disabled" or "Developer mode" warning

Chrome requires **Developer mode** to be enabled to run userscripts via Tampermonkey:
1. Go to `chrome://extensions`
2. Toggle **Developer mode** on (top right corner)
3. Reload the page

## Compatibility

Tested on Axios Registro Elettronico Famiglie v1.0.0.

## License

MIT
