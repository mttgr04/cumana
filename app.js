let scheduleData = null;

const directionSelect = document.getElementById("direction");
const stationSelect = document.getElementById("station");
const resultEl = document.getElementById("result");
const upcomingList = document.getElementById("upcoming-list");
const metaEl = document.getElementById("meta");

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

function populateStations() {
  const dir = scheduleData.directions[directionSelect.value];
  const previouslySelected = stationSelect.value;
  stationSelect.innerHTML = "";
  dir.stationsOrder.forEach((station) => {
    const opt = document.createElement("option");
    opt.value = station;
    opt.textContent = station;
    stationSelect.appendChild(opt);
  });
  if (dir.stationsOrder.includes(previouslySelected)) {
    stationSelect.value = previouslySelected;
  }
}

function render() {
  const dir = scheduleData.directions[directionSelect.value];
  const station = stationSelect.value;
  const times = dir.schedule[station] || [];

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const upcomingToday = times
    .map((t) => ({ label: t, mins: timeToMinutes(t) }))
    .filter((t) => t.mins >= nowMinutes);

  upcomingList.innerHTML = "";

  if (upcomingToday.length === 0) {
    resultEl.innerHTML = `<div class="none">Nessun altro treno oggi da ${station}.<br>Il primo di domani è alle <strong>${times[0] ?? "-"}</strong>.</div>`;
    return;
  }

  const next = upcomingToday[0];
  const waitMins = next.mins - nowMinutes;

  resultEl.innerHTML = `
    <div class="big-time">${next.label}</div>
    <div class="wait">da ${station} · tra ${minutesToLabel(waitMins)}</div>
  `;

  upcomingToday.slice(1, 6).forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t.label;
    upcomingList.appendChild(li);
  });
}

async function init() {
  const res = await fetch("data/orario.json");
  scheduleData = await res.json();

  metaEl.textContent = `${scheduleData.meta.validita} · Fonte: EAV · ${scheduleData.meta.note}`;

  populateStations();
  render();

  directionSelect.addEventListener("change", () => {
    populateStations();
    render();
  });
  stationSelect.addEventListener("change", render);

  setInterval(render, 30000);
}

init();
