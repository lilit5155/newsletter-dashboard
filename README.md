# Newsletter Testing Dashboard — setup guide

Two pieces: Firebase (stores your data, free) and GitHub Pages (hosts the site, free).

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project** → give it any name (e.g. `newsletter-testing-dashboard`) → finish the wizard (Google Analytics not needed, skip it).
2. In the left menu: **Build → Firestore Database → Create database**. Choose "Start in production mode" and any region close to you.
3. Click the ⚙️ gear icon (top left) → **Project settings**. Scroll to "Your apps" → click the **</>** (web) icon → give it a nickname → **Register app**. (Don't check "Also set up Firebase Hosting" — you're using GitHub Pages instead.)
4. Firebase shows a `firebaseConfig` object. Copy each value into `firebase-config.js` in this folder, replacing the placeholder text.
5. Still in `firebase-config.js`, change `EDIT_PASSWORD` to whatever password you want to use to unlock editing.
6. Also change `VIEW_PASSWORD` to whatever password people need just to open the dashboard at all. Share this one with your manager (or whoever you want to see it) — keep `EDIT_PASSWORD` separate so only you can edit.

## 2. Set the security rules

1. In Firebase console: **Build → Firestore Database → Rules** tab.
2. Replace the contents with what's in `firestore.rules` in this folder, then **Publish**.
3. Read the note at the top of that file — this dashboard has no real login system, so the rules allow read/write to anyone with your config. That's normal for this kind of internal tool, just don't put anything truly sensitive in it.

## 3. Put it on GitHub Pages

1. Create a new GitHub repository (public or private both work with GitHub Pages, private needs GitHub Pro).
2. Upload all the files from this folder to the repo (`index.html`, `style.css`, `app.js`, `firebase-config.js` — with your real values now, not the placeholders).
3. In the repo: **Settings → Pages** → under "Build and deployment", set Source to **Deploy from a branch**, branch `main`, folder `/ (root)` → Save.
4. GitHub gives you a URL like `https://yourusername.github.io/your-repo-name/` within a minute or two. That's your dashboard link — share it with your manager.

## How the password locks work

- **View password** — nobody sees anything until they enter the password you set as `VIEW_PASSWORD`. This unlocks once per browser (stored locally) so people don't have to re-enter it every visit.
- **Edit password** — once viewing, everything is still read-only until the 🔒 button in the sidebar is clicked and the `EDIT_PASSWORD` is entered. Keep this different from the view password, and don't share it with people who should only be able to look.
- Both are practical soft-locks for keeping this an internal tool, not real security. Anyone who opens their browser's dev tools can read both passwords out of the page source, and the Firestore rules allow reads/writes from anyone with your config regardless of these passwords. Don't store anything sensitive in this dashboard, and keep the GitHub repo private so the code itself isn't publicly browsable.

## Editing the design later

- Colors, fonts, and spacing live in `style.css` (all at the top as CSS variables under `:root`).
- All the app behavior (adding campaigns, sends, saving fields) lives in `app.js`.
- Categories typed into the "Category" field are saved automatically so they show up as dropdown suggestions next time — no separate setup needed.

## Data structure (for reference)

```
campaigns/{campaignId}
  name, category, link, price, roi, status ("ongoing" | "finished")

campaigns/{campaignId}/tests/{testId}
  order, sentDate, link, pledges, openRate, clickRate, note

meta/categories
  list: [array of category strings ever entered]
```
