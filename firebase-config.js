// ============================================================
// 1. Go to https://console.firebase.google.com → create a project
// 2. In the project, click "Build > Firestore Database" → Create database
//    (start in production mode, pick any region)
// 3. Click the gear icon > Project settings > scroll to "Your apps"
//    > click the </> (web) icon > register an app (no need for Hosting)
// 4. Firebase shows you a firebaseConfig object — paste its values below
// ============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyAitoY11eX7_82MeBhKH8PtyBTxdemyQQ4",
  authDomain: "newsletter-testing-dashboard.firebaseapp.com",
  projectId: "newsletter-testing-dashboard",
  storageBucket: "newsletter-testing-dashboard.firebasestorage.app",
  messagingSenderId: "589767147406",
  appId: "1:589767147406:web:a65f81a3784217fba26edf"
};

// ============================================================
// Set the password that unlocks editing on this dashboard.
// This is a soft lock only (see README) — anyone who opens
// browser dev tools and inspects this file can read it.
// Good enough to stop accidental edits, not a real security wall.
// ============================================================
export const EDIT_PASSWORD = "1199557744";

// ============================================================
// Set the password required just to VIEW the dashboard at all.
// Share this with people you want to see the dashboard (e.g. your
// manager) — keep EDIT_PASSWORD separate so only you can edit.
// Same caveat as above: this is a soft lock, not real security.
// Anyone with dev tools can read this file directly.
// ============================================================
export const VIEW_PASSWORD = "119955774400";
