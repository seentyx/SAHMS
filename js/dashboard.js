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
  selectedPatientId = patientId; // ✅ THIS WAS MISSING

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

      hospitalMap = L.map("hospitalMap").setView([lat, lng], 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(hospitalMap);

      L.marker([lat, lng])
        .addTo(hospitalMap)
        .bindPopup("You are here")
        .openPopup();

      loadNearbyHospitals(lat, lng);
    },
    () => alert("Location permission denied")
  );
}
function loadNearbyHospitals(lat, lng) {
  const query = `
    [out:json];
    (
      node["amenity"="hospital"](around:5000,${lat},${lng});
      way["amenity"="hospital"](around:5000,${lat},${lng});
    );
    out center;
  `;

  fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query
  })
    .then(res => res.json())
    .then(data => {
      data.elements.forEach(h => {
        const hLat = h.lat || h.center.lat;
        const hLng = h.lon || h.center.lon;

        L.marker([hLat, hLng])
          .addTo(hospitalMap)
          .bindPopup(h.tags?.name || "Hospital");
      });
    });
}

function findNearbyHospitals(location) {
  const request = {
    location: location,
    radius: 5000, // 5km
    type: ["hospital"]
  };

  hospitalService.nearbySearch(request, (results, status) => {
    if (status !== google.maps.places.PlacesServiceStatus.OK) return;

    results.forEach(place => {
      new google.maps.Marker({
        map: hospitalMap,
        position: place.geometry.location,
        title: place.name
      });
    });
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
