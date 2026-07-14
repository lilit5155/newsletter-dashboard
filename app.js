import { firebaseConfig, EDIT_PASSWORD, VIEW_PASSWORD } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, setDoc, getDoc, serverTimestamp, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- View gate (must pass before anything else runs) ----------
const viewGateEl = document.getElementById("viewGate");
const appEl = document.getElementById("app");
const viewGatePassword = document.getElementById("viewGatePassword");
const viewGateError = document.getElementById("viewGateError");
const viewGateSubmit = document.getElementById("viewGateSubmit");

function unlockView() {
  viewGateEl.hidden = true;
  appEl.hidden = false;
  startApp();
}

if (localStorage.getItem("nt_view_unlocked") === "1") {
  unlockView();
} else {
  viewGateSubmit.addEventListener("click", () => {
    if (viewGatePassword.value === VIEW_PASSWORD) {
      localStorage.setItem("nt_view_unlocked", "1");
      unlockView();
    } else {
      viewGateError.hidden = false;
    }
  });
  viewGatePassword.addEventListener("keydown", e => { if (e.key === "Enter") viewGateSubmit.click(); });
}

function startApp() {

// ---------- Firebase ----------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const connStatus = document.getElementById("connStatus");
try {
  onSnapshot(collection(db, "campaigns"), () => {
    connStatus.textContent = "connected";
    connStatus.className = "conn-status ok";
  }, (err) => {
    connStatus.textContent = "connection error";
    connStatus.className = "conn-status err";
    console.error(err);
  });
} catch (e) { console.error(e); }

// ---------- State ----------
let campaigns = {};          // id -> data
let categories = [];
let currentCampaignId = null;
let currentTests = [];       // array of {id, ...data} for open campaign, sorted
let unlocked = localStorage.getItem("nt_unlocked") === "1";

// ---------- Elements ----------
const els = {
  lockBtn: document.getElementById("lockBtn"),
  lockIcon: document.getElementById("lockIcon"),
  lockLabel: document.getElementById("lockLabel"),
  ongoingList: document.getElementById("ongoingList"),
  finishedList: document.getElementById("finishedList"),
  ongoingCount: document.getElementById("ongoingCount"),
  finishedCount: document.getElementById("finishedCount"),
  addCampaignBtn: document.getElementById("addCampaignBtn"),
  homeView: document.getElementById("homeView"),
  campaignView: document.getElementById("campaignView"),
  homeEmpty: document.getElementById("homeEmpty"),
  homeGrid: document.getElementById("homeGrid"),
  backBtn: document.getElementById("backBtn"),
  campName: document.getElementById("campName"),
  campCategory: document.getElementById("campCategory"),
  categoryOptions: document.getElementById("categoryOptions"),
  campLink: document.getElementById("campLink"),
  campLinkOpen: document.getElementById("campLinkOpen"),
  campPrice: document.getElementById("campPrice"),
  campRoi: document.getElementById("campRoi"),
  statusToggle: document.getElementById("statusToggle"),
  addTestBtn: document.getElementById("addTestBtn"),
  testsStats: document.getElementById("testsStats"),
  testsRow: document.getElementById("testsRow"),
  testsEmpty: document.getElementById("testsEmpty"),
  campaignModal: document.getElementById("campaignModal"),
  newCampName: document.getElementById("newCampName"),
  newCampCancel: document.getElementById("newCampCancel"),
  newCampSave: document.getElementById("newCampSave"),
  unlockModal: document.getElementById("unlockModal"),
  unlockPassword: document.getElementById("unlockPassword"),
  unlockError: document.getElementById("unlockError"),
  unlockCancel: document.getElementById("unlockCancel"),
  unlockSubmit: document.getElementById("unlockSubmit"),
  notePanel: document.getElementById("notePanel"),
  noteTestNumber: document.getElementById("noteTestNumber"),
  noteText: document.getElementById("noteText"),
  noteClose: document.getElementById("noteClose"),
  noteCancel: document.getElementById("noteCancel"),
  noteSave: document.getElementById("noteSave"),
};

let noteOpenForTestId = null;

// ---------- Edit lock ----------
function applyLockUI() {
  document.querySelectorAll(".edit-only").forEach(el => el.hidden = !unlocked);
  document.querySelectorAll("input, textarea").forEach(el => {
    if (el.id === "unlockPassword" || el.id === "newCampName") return;
    el.disabled = !unlocked;
  });
  els.lockBtn.classList.toggle("unlocked", unlocked);
  els.lockIcon.textContent = unlocked ? "🔓" : "🔒";
  els.lockLabel.textContent = unlocked ? "Editing on" : "View only";
}

els.lockBtn.addEventListener("click", () => {
  if (unlocked) {
    unlocked = false;
    localStorage.removeItem("nt_unlocked");
    applyLockUI();
  } else {
    els.unlockPassword.value = "";
    els.unlockError.hidden = true;
    els.unlockModal.hidden = false;
    els.unlockPassword.focus();
  }
});
els.unlockCancel.addEventListener("click", () => els.unlockModal.hidden = true);
els.unlockSubmit.addEventListener("click", () => {
  if (els.unlockPassword.value === EDIT_PASSWORD) {
    unlocked = true;
    localStorage.setItem("nt_unlocked", "1");
    els.unlockModal.hidden = true;
    applyLockUI();
    if (currentCampaignId) renderTests(currentTests);
  } else {
    els.unlockError.hidden = false;
  }
});
els.unlockPassword.addEventListener("keydown", e => { if (e.key === "Enter") els.unlockSubmit.click(); });

// ---------- Routing ----------
function route() {
  const hash = window.location.hash;
  const match = hash.match(/^#\/campaign\/(.+)$/);
  if (match) {
    openCampaign(match[1]);
  } else {
    showHome();
  }
}
window.addEventListener("hashchange", route);

function showHome() {
  currentCampaignId = null;
  els.homeView.hidden = false;
  els.campaignView.hidden = true;
  renderSidebarActive();
}
els.backBtn.addEventListener("click", () => { window.location.hash = ""; });

// ---------- Categories (shared dropdown list) ----------
const categoriesDocRef = doc(db, "meta", "categories");
onSnapshot(categoriesDocRef, snap => {
  categories = snap.exists() ? (snap.data().list || []) : [];
  els.categoryOptions.innerHTML = categories.map(c => `<option value="${escapeHtml(c)}">`).join("");
});
async function ensureCategorySaved(value) {
  if (!value) return;
  if (categories.includes(value)) return;
  await setDoc(categoriesDocRef, { list: arrayUnion(value) }, { merge: true });
}

// ---------- Campaigns list (sidebar + home grid) ----------
onSnapshot(collection(db, "campaigns"), snap => {
  campaigns = {};
  snap.forEach(d => campaigns[d.id] = d.data());
  renderSidebar();
  renderHomeGrid();
  if (currentCampaignId && campaigns[currentCampaignId]) {
    renderCampaignHeader(currentCampaignId, campaigns[currentCampaignId]);
  }
});

function renderSidebar() {
  const ongoing = Object.entries(campaigns).filter(([, c]) => c.status !== "finished");
  const finished = Object.entries(campaigns).filter(([, c]) => c.status === "finished");
  els.ongoingCount.textContent = ongoing.length;
  els.finishedCount.textContent = finished.length;

  const build = (list) => list.map(([id, c]) => `
    <li data-id="${id}" class="${id === currentCampaignId ? "active" : ""}">
      <span class="li-name-wrap"><span class="status-dot ${c.status === "finished" ? "finished" : "ongoing"}"></span>${escapeHtml(c.name || "Untitled")}</span>
      <span class="cat-tag">${escapeHtml(c.category || "")}</span>
    </li>`).join("") || `<li class="empty-hint">None yet</li>`;

  els.ongoingList.innerHTML = build(ongoing);
  els.finishedList.innerHTML = build(finished);

  document.querySelectorAll(".campaign-list li[data-id]").forEach(li => {
    li.addEventListener("click", () => { window.location.hash = `#/campaign/${li.dataset.id}`; });
  });
}
function renderSidebarActive() {
  document.querySelectorAll(".campaign-list li").forEach(li => li.classList.remove("active"));
}

function renderHomeGrid() {
  const entries = Object.entries(campaigns);
  els.homeEmpty.hidden = entries.length > 0;
  els.homeGrid.hidden = entries.length === 0;
  els.homeGrid.innerHTML = entries.map(([id, c]) => `
    <div class="home-card" data-id="${id}">
      <div class="hc-name">${escapeHtml(c.name || "Untitled")}</div>
      <div class="hc-cat">${escapeHtml(c.category || "no category")}</div>
      <span class="hc-status ${c.status === "finished" ? "finished" : "ongoing"}">${c.status === "finished" ? "Finished" : "Ongoing"}</span>
    </div>`).join("");
  document.querySelectorAll(".home-card").forEach(card => {
    card.addEventListener("click", () => { window.location.hash = `#/campaign/${card.dataset.id}`; });
  });
}

// ---------- Add campaign ----------
els.addCampaignBtn.addEventListener("click", () => {
  els.newCampName.value = "";
  els.campaignModal.hidden = false;
  els.newCampName.focus();
});
els.newCampCancel.addEventListener("click", () => els.campaignModal.hidden = true);
els.newCampSave.addEventListener("click", async () => {
  const name = els.newCampName.value.trim();
  if (!name) return;
  const ref = await addDoc(collection(db, "campaigns"), {
    name, category: "", link: "", price: "", roi: "", status: "ongoing",
    createdAt: serverTimestamp()
  });
  els.campaignModal.hidden = true;
  window.location.hash = `#/campaign/${ref.id}`;
});
els.newCampName.addEventListener("keydown", e => { if (e.key === "Enter") els.newCampSave.click(); });

// ---------- Campaign detail ----------
let unsubTests = null;

function openCampaign(id) {
  currentCampaignId = id;
  els.homeView.hidden = true;
  els.campaignView.hidden = false;
  renderSidebar();

  const ref = doc(db, "campaigns", id);
  getDoc(ref).then(snap => {
    if (snap.exists()) renderCampaignHeader(id, snap.data());
  });

  if (unsubTests) unsubTests();
  const testsQuery = query(collection(db, "campaigns", id, "tests"), orderBy("order", "asc"));
  unsubTests = onSnapshot(testsQuery, snap => {
    currentTests = [];
    snap.forEach(d => currentTests.push({ id: d.id, ...d.data() }));
    renderTests(currentTests);
  });
}

function renderCampaignHeader(id, c) {
  if (document.activeElement !== els.campName) els.campName.value = c.name || "";
  if (document.activeElement !== els.campCategory) els.campCategory.value = c.category || "";
  if (document.activeElement !== els.campLink) els.campLink.value = c.link || "";
  if (document.activeElement !== els.campPrice) els.campPrice.value = c.price || "";
  if (document.activeElement !== els.campRoi) els.campRoi.value = c.roi || "";

  els.campLinkOpen.href = c.link || "#";
  els.campLinkOpen.style.opacity = c.link ? "1" : ".35";

  document.querySelectorAll(".status-pill").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.status === (c.status || "ongoing"));
  });
}

function fieldSaver(el, key) {
  el.addEventListener("blur", async () => {
    if (!unlocked || !currentCampaignId) return;
    const val = el.value.trim();
    await updateDoc(doc(db, "campaigns", currentCampaignId), { [key]: val });
    if (key === "category") ensureCategorySaved(val);
  });
}
fieldSaver(els.campName, "name");
fieldSaver(els.campCategory, "category");
fieldSaver(els.campLink, "link");
fieldSaver(els.campPrice, "price");
fieldSaver(els.campRoi, "roi");

els.statusToggle.addEventListener("click", async (e) => {
  const btn = e.target.closest(".status-pill");
  if (!btn || !unlocked || !currentCampaignId) return;
  await updateDoc(doc(db, "campaigns", currentCampaignId), { status: btn.dataset.status });
});

// ---------- Tests ----------
function renderTests(tests) {
  // ---- stats row ----
  const count = tests.length;
  const totalPledges = tests.reduce((sum, t) => sum + (parseFloat(String(t.pledges).replace(/[^0-9.]/g, "")) || 0), 0);
  const openRates = tests.map(t => parseFloat(String(t.openRate).replace(/[^0-9.]/g, ""))).filter(n => !isNaN(n));
  const avgOpen = openRates.length ? (openRates.reduce((a, b) => a + b, 0) / openRates.length).toFixed(1) : "—";
  els.testsStats.innerHTML = `
    <div class="tstat"><b>${count}</b><span>Sends logged</span></div>
    <div class="tstat-divider"></div>
    <div class="tstat"><b>${totalPledges || 0}</b><span>Total pledges</span></div>
    <div class="tstat-divider"></div>
    <div class="tstat"><b>${avgOpen}${openRates.length ? "%" : ""}</b><span>Avg open rate</span></div>
  `;

  // ---- table rows ----
  els.testsEmpty.hidden = tests.length > 0;
  els.testsRow.innerHTML = tests.map((t, i) => `
    <tr data-id="${t.id}">
      <td><span class="row-num">${i + 1}</span></td>
      <td><input type="date" data-field="sentDate" data-id="${t.id}" value="${t.sentDate || ""}" disabled></td>
      <td>
        <div class="link-cell">
          <input data-field="link" data-id="${t.id}" value="${escapeAttr(t.link || "")}" placeholder="https://…" disabled>
          <a href="${escapeAttr(t.link || "#")}" target="_blank" rel="noopener" class="link-open" style="opacity:${t.link ? 1 : .35}">↗</a>
        </div>
      </td>
      <td><input data-field="pledges" data-id="${t.id}" value="${escapeAttr(t.pledges || "")}" placeholder="0" disabled></td>
      <td><input data-field="openRate" data-id="${t.id}" value="${escapeAttr(t.openRate || "")}" placeholder="0%" disabled></td>
      <td><input data-field="clickRate" data-id="${t.id}" value="${escapeAttr(t.clickRate || "")}" placeholder="0%" disabled></td>
      <td><button class="row-note-btn ${t.note ? "has-note" : ""}" data-action="note" data-id="${t.id}" title="Test notes">T</button></td>
      <td><button class="row-delete-btn edit-only" data-action="delete" data-id="${t.id}" title="Delete send" ${unlocked ? "" : "hidden"}>✕</button></td>
    </tr>
  `).join("");

  els.testsRow.querySelectorAll("input[data-field]").forEach(inp => {
    inp.disabled = !unlocked;
    inp.addEventListener("blur", async () => {
      if (!unlocked) return;
      const id = inp.dataset.id, field = inp.dataset.field;
      await updateDoc(doc(db, "campaigns", currentCampaignId, "tests", id), { [field]: inp.value.trim() });
    });
  });
  els.testsRow.querySelectorAll('[data-action="note"]').forEach(btn => {
    btn.addEventListener("click", () => openNote(btn.dataset.id));
  });
  els.testsRow.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this send and its notes?")) return;
      await deleteDoc(doc(db, "campaigns", currentCampaignId, "tests", btn.dataset.id));
    });
  });
}

els.addTestBtn.addEventListener("click", async () => {
  if (!unlocked || !currentCampaignId) return;
  const nextOrder = currentTests.length ? Math.max(...currentTests.map(t => t.order || 0)) + 1 : 1;
  await addDoc(collection(db, "campaigns", currentCampaignId, "tests"), {
    order: nextOrder, sentDate: "", link: "", pledges: "", openRate: "", clickRate: "", note: "",
    createdAt: serverTimestamp()
  });
});

// ---------- Note panel ----------
function openNote(testId) {
  noteOpenForTestId = testId;
  const t = currentTests.find(x => x.id === testId);
  const idx = currentTests.findIndex(x => x.id === testId);
  els.noteTestNumber.textContent = "#" + (idx + 1);
  els.noteText.value = (t && t.note) || "";
  els.noteText.disabled = !unlocked;
  els.notePanel.hidden = false;
}
els.noteClose.addEventListener("click", () => els.notePanel.hidden = true);
els.noteCancel.addEventListener("click", () => els.notePanel.hidden = true);
els.noteSave.addEventListener("click", async () => {
  if (!unlocked || !noteOpenForTestId || !currentCampaignId) return;
  await updateDoc(doc(db, "campaigns", currentCampaignId, "tests", noteOpenForTestId), { note: els.noteText.value });
  els.notePanel.hidden = true;
});

// ---------- utils ----------
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }
function escapeAttr(s) { return escapeHtml(s); }

// ---------- init ----------
applyLockUI();
route();

} // end startApp()
