let data = null;

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToLabel(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function addOption(select, value, label) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = label;
  select.appendChild(opt);
}

function findTrainAt(dirKey, station, time) {
  const trains = data.directions[dirKey].trains;
  for (const tr of trains) {
    const stop = tr.stops.find((s) => s.station === station && s.time === time);
    if (stop) return tr;
  }
  return null;
}

function routeBadgesHtml(dirKey, train) {
  if (!train) return "";
  const order = data.directions[dirKey].stationsOrder;
  const terminus = train.stops[train.stops.length - 1].station;
  const isFull = terminus === order[order.length - 1];
  const parts = [];
  if (!isFull) parts.push(`<span class="badge partial">Ferma a ${terminus}</span>`);
  if (train.guaranteed) parts.push(`<span class="badge guaranteed">Garantito in sciopero</span>`);
  if (!parts.length) return "";
  return `<div class="badges">${parts.join("")}</div>`;
}

// ---------- localStorage preferences ----------

const PREF_KEY = "cumana:prefs";

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY)) || {};
  } catch {
    return {};
  }
}

function savePrefs(patch) {
  try {
    const current = loadPrefs();
    localStorage.setItem(PREF_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {
    // ignore (private browsing / storage disabled)
  }
}

// ---------- Tabs ----------

function initTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");

      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });
}

// ---------- Tab 1: prossimo treno ----------

const nextDirection = document.getElementById("next-direction");
const nextStation = document.getElementById("next-station");
const nextResult = document.getElementById("next-result");
const nextUpcomingList = document.getElementById("next-upcoming-list");

function populateNextStations() {
  const dir = data.directions[nextDirection.value];
  const previous = nextStation.value;
  nextStation.innerHTML = "";
  dir.stationsOrder.forEach((s) => addOption(nextStation, s, s));
  if (dir.stationsOrder.includes(previous)) nextStation.value = previous;
}

function renderNext() {
  const dirKey = nextDirection.value;
  const dir = data.directions[dirKey];
  const station = nextStation.value;
  const times = dir.schedule[station] || [];

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const upcomingToday = times
    .map((t) => ({ label: t, mins: timeToMinutes(t) }))
    .filter((t) => t.mins >= nowMinutes);

  nextUpcomingList.innerHTML = "";

  if (upcomingToday.length === 0) {
    nextResult.innerHTML = `<div class="none">Nessun altro treno oggi da ${station}.<br>Il primo di domani è alle <strong>${times[0] ?? "-"}</strong>.</div>`;
    return;
  }

  const next = upcomingToday[0];
  const waitMins = next.mins - nowMinutes;
  const train = findTrainAt(dirKey, station, next.label);

  nextResult.innerHTML = `
    <div class="big-time">${next.label}</div>
    <div class="wait">da ${station} · tra ${minutesToLabel(waitMins)}</div>
    ${routeBadgesHtml(dirKey, train)}
  `;

  upcomingToday.slice(1, 6).forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t.label;
    nextUpcomingList.appendChild(li);
  });
}

function initNextTab() {
  const prefs = loadPrefs();
  if (prefs.nextDirection) nextDirection.value = prefs.nextDirection;
  populateNextStations();
  if (prefs.nextStation && data.directions[nextDirection.value].stationsOrder.includes(prefs.nextStation)) {
    nextStation.value = prefs.nextStation;
  }
  renderNext();

  nextDirection.addEventListener("change", () => {
    populateNextStations();
    savePrefs({ nextDirection: nextDirection.value, nextStation: nextStation.value });
    renderNext();
  });
  nextStation.addEventListener("change", () => {
    savePrefs({ nextStation: nextStation.value });
    renderNext();
  });
  setInterval(renderNext, 30000);
}

// ---------- Tab 2: cerca tratta (da -> a) ----------

const searchFrom = document.getElementById("search-from");
const searchTo = document.getElementById("search-to");
const searchResult = document.getElementById("search-result");
const searchUpcomingList = document.getElementById("search-upcoming-list");
const searchUpcomingSummary = document.getElementById("search-upcoming-summary");
const searchDeadlineField = document.getElementById("search-deadline-field");
const searchDeadlineInput = document.getElementById("search-deadline");
const modeButtons = document.querySelectorAll(".mode-btn");

let searchMode = "now";

function canonicalOrder() {
  return data.directions.MT.stationsOrder;
}

function directionFor(from, to) {
  const order = canonicalOrder();
  return order.indexOf(from) < order.indexOf(to) ? "MT" : "TM";
}

function populateSearchStations() {
  const order = canonicalOrder();
  const prevFrom = searchFrom.value;
  const prevTo = searchTo.value;

  searchFrom.innerHTML = "";
  order.forEach((s) => addOption(searchFrom, s, s));
  if (order.includes(prevFrom)) searchFrom.value = prevFrom;

  populateSearchTo();
  if (order.includes(prevTo) && prevTo !== searchFrom.value) searchTo.value = prevTo;
}

function populateSearchTo() {
  const order = canonicalOrder();
  const from = searchFrom.value;
  const prevTo = searchTo.value;
  searchTo.innerHTML = "";
  order.filter((s) => s !== from).forEach((s) => addOption(searchTo, s, s));
  if (order.includes(prevTo) && prevTo !== from) searchTo.value = prevTo;
}

function candidateTrains(from, to) {
  const dirKey = directionFor(from, to);
  const dir = data.directions[dirKey];
  const results = [];
  dir.trains.forEach((tr) => {
    const fromStop = tr.stops.find((s) => s.station === from);
    const toStop = tr.stops.find((s) => s.station === to);
    if (fromStop && toStop) {
      results.push({ dirKey, train: tr, depTime: fromStop.time, arrTime: toStop.time });
    }
  });
  results.sort((a, b) => timeToMinutes(a.depTime) - timeToMinutes(b.depTime));
  return results;
}

function renderSearchNow(from, to, future) {
  searchUpcomingSummary.textContent = "Prossime corse utili";

  if (future.length === 0) {
    searchResult.innerHTML = `<div class="none">Nessuna corsa utile oggi da ${from} ad ${to}.</div>`;
    return;
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const next = future[0];
  const waitMins = timeToMinutes(next.depTime) - nowMinutes;
  const duration = timeToMinutes(next.arrTime) - timeToMinutes(next.depTime);

  searchResult.innerHTML = `
    <div class="big-time">${next.depTime}</div>
    <div class="wait">da ${from} · tra ${minutesToLabel(waitMins)}</div>
    <div class="leg-summary">Arrivo a ${to} alle ${next.arrTime} · durata ${minutesToLabel(duration)}</div>
    ${routeBadgesHtml(next.dirKey, next.train)}
  `;

  future.slice(1, 6).forEach((r) => {
    const li = document.createElement("li");
    li.textContent = `${r.depTime} → ${r.arrTime}`;
    searchUpcomingList.appendChild(li);
  });
}

function renderSearchDeadline(from, to, future) {
  searchUpcomingSummary.textContent = "Altre corse utili";

  const deadlineValue = searchDeadlineInput.value;
  if (!deadlineValue) {
    searchResult.innerHTML = `<div class="none">Scegli l'orario entro cui vuoi arrivare a ${to}.</div>`;
    return;
  }

  const deadlineMinutes = timeToMinutes(deadlineValue);
  const valid = future.filter((r) => timeToMinutes(r.arrTime) <= deadlineMinutes);

  if (valid.length === 0) {
    const earliestArrival = future[0];
    searchResult.innerHTML = `<div class="none">Nessuna corsa da ${from} arriva a ${to} entro le ${deadlineValue}.<br>${
      earliestArrival
        ? `La più veloce arriva alle <strong>${earliestArrival.arrTime}</strong> (partenza ${earliestArrival.depTime}).`
        : `Non ci sono più corse utili oggi da ${from}.`
    }</div>`;
    return;
  }

  const best = valid[valid.length - 1];
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const waitMins = timeToMinutes(best.depTime) - nowMinutes;
  const duration = timeToMinutes(best.arrTime) - timeToMinutes(best.depTime);

  searchResult.innerHTML = `
    <div class="big-time">${best.depTime}</div>
    <div class="wait">ultima corsa utile da ${from} · tra ${minutesToLabel(waitMins)}</div>
    <div class="leg-summary">Arrivo a ${to} alle ${best.arrTime} (entro le ${deadlineValue}) · durata ${minutesToLabel(duration)}</div>
    ${routeBadgesHtml(best.dirKey, best.train)}
  `;

  valid
    .slice(0, -1)
    .slice(-5)
    .forEach((r) => {
      const li = document.createElement("li");
      li.textContent = `${r.depTime} → ${r.arrTime}`;
      searchUpcomingList.appendChild(li);
    });
}

function renderSearch() {
  const from = searchFrom.value;
  const to = searchTo.value;
  if (!from || !to || from === to) return;

  const all = candidateTrains(from, to);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const future = all.filter((r) => timeToMinutes(r.depTime) >= nowMinutes);

  searchUpcomingList.innerHTML = "";

  if (searchMode === "deadline") {
    renderSearchDeadline(from, to, future);
  } else {
    renderSearchNow(from, to, future);
  }
}

function defaultDeadline() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes() + 60;
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function setSearchMode(mode) {
  searchMode = mode;
  modeButtons.forEach((b) => {
    const active = b.dataset.mode === mode;
    b.classList.toggle("active", active);
    b.setAttribute("aria-selected", String(active));
  });
  searchDeadlineField.hidden = mode !== "deadline";
  savePrefs({ searchMode: mode });
  renderSearch();
}

function initSearchTab() {
  const prefs = loadPrefs();
  populateSearchStations();
  if (prefs.searchFrom && canonicalOrder().includes(prefs.searchFrom)) searchFrom.value = prefs.searchFrom;
  populateSearchTo();
  if (prefs.searchTo && canonicalOrder().includes(prefs.searchTo) && prefs.searchTo !== searchFrom.value) {
    searchTo.value = prefs.searchTo;
  }

  searchDeadlineInput.value = prefs.searchDeadline || defaultDeadline();
  setSearchMode(prefs.searchMode === "deadline" ? "deadline" : "now");

  searchFrom.addEventListener("change", () => {
    populateSearchTo();
    savePrefs({ searchFrom: searchFrom.value, searchTo: searchTo.value });
    renderSearch();
  });
  searchTo.addEventListener("change", () => {
    savePrefs({ searchTo: searchTo.value });
    renderSearch();
  });
  modeButtons.forEach((b) => b.addEventListener("click", () => setSearchMode(b.dataset.mode)));
  searchDeadlineInput.addEventListener("change", () => {
    savePrefs({ searchDeadline: searchDeadlineInput.value });
    renderSearch();
  });
  setInterval(renderSearch, 30000);
}

// ---------- Tab 3: calcola arrivo ----------

const arrivalDirection = document.getElementById("arrival-direction");
const arrivalFrom = document.getElementById("arrival-from");
const arrivalTime = document.getElementById("arrival-time");
const arrivalTo = document.getElementById("arrival-to");
const arrivalResult = document.getElementById("arrival-result");

function populateArrivalFrom() {
  const dir = data.directions[arrivalDirection.value];
  const previous = arrivalFrom.value;
  arrivalFrom.innerHTML = "";
  dir.stationsOrder.slice(0, -1).forEach((s) => addOption(arrivalFrom, s, s));
  if (dir.stationsOrder.slice(0, -1).includes(previous)) arrivalFrom.value = previous;
}

function populateArrivalTime() {
  const dir = data.directions[arrivalDirection.value];
  const fromStation = arrivalFrom.value;
  arrivalTime.innerHTML = "";

  const options = [];
  dir.trains.forEach((tr, idx) => {
    const pos = tr.stops.findIndex((st) => st.station === fromStation);
    if (pos !== -1 && pos < tr.stops.length - 1) {
      options.push({ time: tr.stops[pos].time, idx });
    }
  });
  options.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  options.forEach((o) => addOption(arrivalTime, o.idx, o.time));

  if (options.length === 0) {
    arrivalResult.innerHTML = `<div class="none">Nessun treno utile da questa stazione.</div>`;
  }
}

function populateArrivalTo() {
  const dir = data.directions[arrivalDirection.value];
  const fromStation = arrivalFrom.value;
  const trainIdx = arrivalTime.value;
  arrivalTo.innerHTML = "";
  if (trainIdx === "") return;

  const stops = dir.trains[trainIdx].stops;
  const pos = stops.findIndex((st) => st.station === fromStation);
  stops.slice(pos + 1).forEach((st) => addOption(arrivalTo, st.station, `${st.station} (${st.time})`));
}

function renderArrivalResult() {
  const dirKey = arrivalDirection.value;
  const dir = data.directions[dirKey];
  const fromStation = arrivalFrom.value;
  const trainIdx = arrivalTime.value;
  const toStation = arrivalTo.value;

  if (trainIdx === "" || !toStation) return;

  const train = dir.trains[trainIdx];
  const stops = train.stops;
  const pos = stops.findIndex((st) => st.station === fromStation);
  const destPos = stops.findIndex((st) => st.station === toStation);
  if (pos === -1 || destPos === -1) return;

  const depTime = stops[pos].time;
  const arrTime = stops[destPos].time;
  const duration = timeToMinutes(arrTime) - timeToMinutes(depTime);

  const intermediate = stops.slice(pos, destPos + 1);
  const routeHtml = intermediate
    .map((st, i) => {
      const isEndpoint = i === 0 || i === intermediate.length - 1;
      return `<div class="stop${isEndpoint ? " endpoint" : ""}"><span>${st.station}</span><span>${st.time}</span></div>`;
    })
    .join("");

  arrivalResult.innerHTML = `
    <div class="big-time">${arrTime}</div>
    <div class="wait">arrivo a ${toStation}</div>
    <div class="leg-summary">Partenza da ${fromStation} alle ${depTime} · durata ${minutesToLabel(duration)}</div>
    ${train.guaranteed ? `<div class="badges"><span class="badge guaranteed">Garantito in sciopero</span></div>` : ""}
    <div class="route-list">${routeHtml}</div>
  `;
}

function initArrivalTab() {
  populateArrivalFrom();
  populateArrivalTime();
  populateArrivalTo();
  renderArrivalResult();

  arrivalDirection.addEventListener("change", () => {
    populateArrivalFrom();
    populateArrivalTime();
    populateArrivalTo();
    renderArrivalResult();
  });
  arrivalFrom.addEventListener("change", () => {
    populateArrivalTime();
    populateArrivalTo();
    renderArrivalResult();
  });
  arrivalTime.addEventListener("change", () => {
    populateArrivalTo();
    renderArrivalResult();
  });
  arrivalTo.addEventListener("change", renderArrivalResult);
}

// ---------- Tab 4: orario completo ----------

const fullDirection = document.getElementById("full-direction");
const fullList = document.getElementById("full-list");

function renderFull() {
  const dir = data.directions[fullDirection.value];
  fullList.innerHTML = "";
  dir.stationsOrder.forEach((station) => {
    const times = dir.schedule[station] || [];
    const details = document.createElement("details");
    details.className = "station-block";
    const summary = document.createElement("summary");
    summary.textContent = station;
    const ul = document.createElement("ul");
    ul.className = "chip-list";
    times.forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      ul.appendChild(li);
    });
    details.appendChild(summary);
    details.appendChild(ul);
    fullList.appendChild(details);
  });
}

function initFullTab() {
  renderFull();
  fullDirection.addEventListener("change", renderFull);
}

// ---------- init ----------

async function init() {
  const res = await fetch("data/orario.json");
  data = await res.json();

  document.getElementById("meta").textContent =
    `${data.meta.validita} · Fonte: EAV · ${data.meta.note}`;

  initTabs();
  initNextTab();
  initSearchTab();
  initArrivalTab();
  initFullTab();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();
