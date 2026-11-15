const GOAL = 10;
const KEY = "loyalty-customers";
const PIN_KEY = "loyalty-pin";
const SESSION_KEY = "loyalty-unlocked";

let customers = load();
let currentId = null;

const $ = (id) => document.getElementById(id);

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY)) || [];
    data.forEach((c) => { if (!c.history) c.history = []; });
    return data;
  } catch { return []; }
}
function save() { localStorage.setItem(KEY, JSON.stringify(customers)); }

/* ---------- Staff PIN ---------- */
// Note: this is a simple demo lock stored in the browser, not real security.
function showLock() {
  const hasPin = !!localStorage.getItem(PIN_KEY);
  $("app").hidden = true;
  $("lock").hidden = false;
  $("lock-msg").textContent = hasPin
    ? "Enter your PIN to open the app."
    : "First time here. Choose a 4-digit staff PIN.";
  $("lock-error").hidden = true;
  $("pin").value = "";
  $("pin").focus();
}

function unlock() {
  sessionStorage.setItem(SESSION_KEY, "1");
  $("lock").hidden = true;
  $("app").hidden = false;
  renderList();
}

$("lock-form").onsubmit = (e) => {
  e.preventDefault();
  const pin = $("pin").value;
  if (!/^\d{4}$/.test(pin)) return;
  const saved = localStorage.getItem(PIN_KEY);
  if (!saved) {
    localStorage.setItem(PIN_KEY, pin);
    unlock();
  } else if (pin === saved) {
    unlock();
  } else {
    $("lock-error").hidden = false;
    $("pin").value = "";
  }
};

$("lock-btn").onclick = () => {
  sessionStorage.removeItem(SESSION_KEY);
  goHome();
  showLock();
};

/* ---------- Home screen ---------- */
function renderList() {
  const q = $("search").value.trim().toLowerCase();
  const shown = customers.filter((c) => c.name.toLowerCase().includes(q));
  $("list").innerHTML = "";
  shown.forEach((c) => {
    const li = document.createElement("li");
    li.innerHTML = '<span></span><span class="badge">${c.stamps}/${GOAL}</span>';
    li.firstChild.textContent = c.name;
    li.onclick = () => openCard(c.id);
    $("list").appendChild(li);
  });
  $("empty").hidden = customers.length > 0;
}

$("add-form").onsubmit = (e) => {
  e.preventDefault();
  const name = $("name").value.trim();
  if (!name) return;
  customers.push({ id: Date.now(), name, stamps: 0, rewards: 0, history: [] });
  save();
  $("name").value = "";
  renderList();
};
$("search").oninput = renderList;

/* ---------- Customer card ---------- */
function current() { return customers.find((c) => c.id === currentId); }

function openCard(id) {
  currentId = id;
  $("home").hidden = true;
  $("card").hidden = false;
  renderCard();
}

function renderCard(popIndex = -1) {
  const c = current();
  $("card-name").textContent = c.name;

  $("grid").innerHTML = "";
  for (let i = 0; i < GOAL; i++) {
    const cell = document.createElement("div");
    cell.className = "cell" + (i < c.stamps ? " filled" : "") + (i === popIndex ? " pop" : "");
    cell.textContent = i < c.stamps ? "\u2615" : "";
    $("grid").appendChild(cell);
  }

  const full = c.stamps >= GOAL;
  $("count").textContent = '${c.stamps} of ${GOAL} stamps';
  $("reward").hidden = !full;
  $("stamp").disabled = full;
  $("redeem").disabled = !full;
  $("rewards").textContent = c.rewards;
  renderHistory(c);
}

function renderHistory(c) {
  $("history").innerHTML = "";
  [...c.history].reverse().forEach((h) => {
    const li = document.createElement("li");
    const label = h.type === "stamp" ? "Stamp given" : "Free coffee redeemed";
    const when = new Date(h.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    li.innerHTML = '<span></span><span class="when"></span>';
    li.children[0].textContent = label;
    li.children[1].textContent = when;
    $("history").appendChild(li);
  });
  $("history-empty").hidden = c.history.length > 0;
}

$("stamp").onclick = () => {
  const c = current();
  if (c.stamps >= GOAL) return;
  c.stamps++;
  c.history.push({ type: "stamp", date: new Date().toISOString() });
  save();
  renderCard(c.stamps - 1);
  if (c.stamps >= GOAL) launchConfetti();
};

$("redeem").onclick = () => {
  const c = current();
  if (c.stamps < GOAL) return;
  c.stamps = 0;
  c.rewards++;
  c.history.push({ type: "redeem", date: new Date().toISOString() });
  save();
  renderCard();
};

$("delete").onclick = () => {
  if (!confirm("Delete this customer?")) return;
  customers = customers.filter((c) => c.id !== currentId);
  save();
  goHome();
};

function goHome() {
  $("card").hidden = true;
  $("home").hidden = false;
  renderList();
}
$("back").onclick = goHome;

/* ---------- Confetti ---------- */
function launchConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = $("confetti");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ["#c4622d", "#5a3a24", "#e8b86d", "#f3ebe0", "#8c5a3a"];
  const pieces = Array.from({ length: 120 }, () => ({
    x: canvas.width / 2,
    y: canvas.height / 3,
    vx: (Math.random() - 0.5) * 12,
    vy: Math.random() * -10 - 3,
    size: Math.random() * 6 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
  }));

  let frames = 0;
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.vy += 0.3;           // gravity
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    if (++frames < 120) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  tick();
}

/* ---------- Start ---------- */
if (sessionStorage.getItem(SESSION_KEY) && localStorage.getItem(PIN_KEY)) unlock();
else showLock();