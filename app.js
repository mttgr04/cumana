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
  const dir = data.directions[nextDirection.value];
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

  nextResult.innerHTML = `
    <div class="big-time">${next.label}</div>
    <div class="wait">da ${station} · tra ${minutesToLabel(waitMins)}</div>
  `;

  upcomingToday.slice(1, 6).forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t.label;
    nextUpcomingList.appendChild(li);
  });
}

function initNextTab() {
  populateNextStations();
  renderNext();
  nextDirection.addEventListener("change", () => {
    populateNextStations();
    renderNext();
  });
  nextStation.addEventListener("change", renderNext);
  setInterval(renderNext, 30000);
}

// ---------- Tab 2: calcola arrivo ----------

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
  dir.trains.forEach((stops, idx) => {
    const pos = stops.findIndex((st) => st.station === fromStation);
    if (pos !== -1 && pos < stops.length - 1) {
      options.push({ time: stops[pos].time, idx });
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

  const stops = dir.trains[trainIdx];
  const pos = stops.findIndex((st) => st.station === fromStation);
  stops.slice(pos + 1).forEach((st) => addOption(arrivalTo, st.station, `${st.station} (${st.time})`));
}

function renderArrivalResult() {
  const dir = data.directions[arrivalDirection.value];
  const fromStation = arrivalFrom.value;
  const trainIdx = arrivalTime.value;
  const toStation = arrivalTo.value;

  if (trainIdx === "" || !toStation) return;

  const stops = dir.trains[trainIdx];
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

// ---------- Tab 3: orario completo ----------

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
  initArrivalTab();
  initFullTab();
}

init();
