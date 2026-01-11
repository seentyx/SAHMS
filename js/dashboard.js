let routingControl = null;
let userLatLng = null;


document.addEventListener("DOMContentLoaded", function() {
  openPatientManagement(); // Load patient list on page load
});

// Load all patients
function loadPatients() {
  const tbody = document.getElementById("patientTableBody");
  tbody.innerHTML = "";

  db.ref("patients").once("value").then(snapshot => {
    const patients = snapshot.val();
    if (!patients) return;

    Object.keys(patients).forEach(key => {
      const p = patients[key];
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.name}</td>
        <td>${calculateAge(p.birthdate)} yrs old</td>
        <td>${p.role}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="testHealth('${key}')">Test Health</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}
function calculateAge(birthdate) {
  const dob = new Date(birthdate);
  const diff = Date.now() - dob.getTime();
  return new Date(diff).getUTCFullYear() - 1970;
}
let charts = {};
let selectedPatientId = null;

function testHealth(patientId) {
  selectedPatientId = patientId; 

  document.getElementById("patientManagement").style.display = "none";
  document.getElementById("patientHealth").style.display = "block";

  db.ref(`patients/${patientId}/sensorData`).once("value")
    .then(snapshot => {
      const data = snapshot.val();
      if (!data) return;

      const labels = [];
      const hr = [];
      const spo2 = [];
      const temp = [];

      Object.keys(data).sort().forEach(ts => {
        const d = data[ts];
        labels.push(new Date(ts * 1000).toLocaleTimeString());
        hr.push(d.heartRate);
        spo2.push(d.spo2);
        temp.push(d.temperature);
      });

      renderChart("hrChartTest", "Heart Rate", labels, hr, "red");
      renderChart("spo2ChartTest", "SpO₂", labels, spo2, "blue");
      renderChart("tempChartTest", "Temperature", labels, temp, "orange");

      // Latest values
      const last = data[Object.keys(data).sort().pop()];
      document.getElementById("hrTest").innerText = last.heartRate + " bpm";
      document.getElementById("spo2Test").innerText = last.spo2 + " %";
      document.getElementById("tempTest").innerText = last.temperature + " °C";
      runHealthTest();

    });
}


// Render chart function
function renderLineChart(canvasId, label, labels, data, color) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  if (charts[canvasId]) charts[canvasId].destroy();

  charts[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        borderColor: color,
        backgroundColor: color + "33",
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: false }
      }
    }
  });
}
function renderChart(id, label, labels, data, color) {
  const ctx = document.getElementById(id).getContext("2d");

  if (charts[id]) charts[id].destroy();

  charts[id] = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label,
        data,
        borderColor: color,
        backgroundColor: color + "33",
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: false }
      }
    }
  });
}

function runHealthTest() {
  if (!selectedPatientId) {
    alert("No patient selected");
    return;
  }

  db.ref(`patients/${selectedPatientId}/sensorData`)
    .once("value")
    .then(snapshot => {
      const data = snapshot.val();
      if (!data) {
        alert("No health data available");
        return;
      }

      const labels = [];
      const hr = [];
      const spo2 = [];
      const temp = [];

      Object.keys(data).sort().forEach(ts => {
        const d = data[ts];
        labels.push(new Date(ts * 1000).toLocaleTimeString());
        hr.push(d.heartRate);
        spo2.push(d.spo2);
        temp.push(d.temperature);
      });

      renderChart("hrChartTest", "Heart Rate", labels, hr, "red");
      renderChart("spo2ChartTest", "SpO₂", labels, spo2, "blue");
      renderChart("tempChartTest", "Temperature", labels, temp, "orange");

      const last = data[Object.keys(data).sort().pop()];
      document.getElementById("hrTest").innerText = last.heartRate + " bpm";
      document.getElementById("spo2Test").innerText = last.spo2 + " %";
      document.getElementById("tempTest").innerText = last.temperature + " °C";
    });
}
let hospitalMap;

function openHospitalLocation() {
  const modal = new bootstrap.Modal(
    document.getElementById("hospitalModal")
  );
  modal.show();

  setTimeout(initHospitalMap, 300);
}

function initHospitalMap() {
  if (hospitalMap) return;

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;

      userLatLng = L.latLng(lat, lng);

      hospitalMap = L.map("hospitalMap").setView(userLatLng, 17);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(hospitalMap);

      // Accuracy circle
      L.circle(userLatLng, {
        radius: accuracy,
        color: "#2563eb",
        fillColor: "#3b82f6",
        fillOpacity: 0.2
      }).addTo(hospitalMap);

      // User marker
      L.marker(userLatLng)
        .addTo(hospitalMap)
        .bindPopup(
          `You are here<br>Accuracy: ~${Math.round(accuracy)} meters`
        )
        .openPopup();

      loadNearbyHospitals(lat, lng);
    },
    err => {
      alert("Location permission denied or unavailable");
      console.error(err);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}
const hospitalModalEl = document.getElementById("hospitalModal");

hospitalModalEl.addEventListener('shown.bs.modal', () => {
  if (hospitalMap) {
    hospitalMap.invalidateSize(); // forces Leaflet to recalc size
    if (routingControl) {
      routingControl.getPlan().setWaypoints(routingControl.getWaypoints()); // redraw route if exists
    }
  }
});
function loadNearbyHospitals(lat, lng) {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:3000,${lat},${lng});
      way["amenity"="hospital"](around:3000,${lat},${lng});
    );
    out center;
  `;

  fetch("https://maps.mail.ru/osm/tools/overpass/api/interpreter", {
    method: "POST",
    body: query
  })
    .then(res => res.text())
    .then(text => {
      if (text.startsWith("<")) {
        throw new Error("Overpass timeout or server error");
      }
      return JSON.parse(text);
    })
    .then(data => {
      data.elements.forEach(h => {
        const hLat = h.lat || h.center?.lat;
        const hLng = h.lon || h.center?.lon;

        if (!hLat || !hLng) return;

        L.marker([hLat, hLng])
  .addTo(hospitalMap)
  .bindPopup(
    `<b>${h.tags?.name || "Hospital"}</b><br>
     <button onclick="routeToHospital(${hLat}, ${hLng})">
       Show Fastest Route
     </button>`
  );
      });
    })
    .catch(err => {
      console.error(err);
      alert("Hospital data unavailable right now.");
    });
}


function submitNewPatient() {
  const name = document.getElementById("patientName").value.trim();
  const birthdate = document.getElementById("patientBirthdate").value;
  const role = document.getElementById("patientRole").value;

  if (!name || !birthdate || !role) {
    alert("Please complete all fields");
    return;
  }

  db.ref("patients").push({
    name: name,
    birthdate: birthdate,
    role: role,
    createdAt: firebase.database.ServerValue.TIMESTAMP
  })
  .then(() => {
    alert("Patient added successfully");

    // Reset form
    document.getElementById("newPatientForm").reset();

    // Close modal
    const modalEl = document.getElementById("newPatientModal");
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();

    // Refresh patient list
    loadPatients();
  })
  .catch(err => {
    console.error(err);
    alert("Failed to add patient");
  });
}
function routeToHospital(hLat, hLng) {
  if (!userLatLng) return alert("User location not available");

  if (routingControl) {
    hospitalMap.removeControl(routingControl);
  }

  routingControl = L.Routing.control({
    waypoints: [
      userLatLng,
      L.latLng(hLat, hLng)
    ],
    router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
    lineOptions: { styles: [{ color: '#3b82f6', weight: 5 }] },
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
    showAlternatives: false
  })
  .on('routesfound', e => {
    const route = e.routes[0];
    const distanceKm = (route.summary.totalDistance / 1000).toFixed(2);
    const timeMin = Math.round(route.summary.totalTime / 60);

    document.getElementById("routeDistance").innerText = distanceKm + " km";
    document.getElementById("routeTime").innerText = timeMin + " min";
  })
  .addTo(hospitalMap);
}
