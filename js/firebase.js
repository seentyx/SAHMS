// js/firebase.js
// Firebase v8 setup (classic script)
const firebaseConfig = {
  apiKey: "AIzaSyAskVG5jy-oQ5Jywszkn_TQlyR03S8WOJo",
  authDomain: "aahms-a0035.firebaseapp.com",
  databaseURL: "https://aahms-a0035-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aahms-a0035",
  storageBucket: "aahms-a0035.appspot.com",
  messagingSenderId: "1058168019904",
  appId: "1:1058168019904:web:60f108c34731a8376c0625",
  measurementId: "G-TKQMV1EMDJ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Declare **once** for global use
var auth = firebase.auth();
var db = firebase.database();

function testHealth(patientId) {
  // Hide patient table, show health section
  document.getElementById("patientManagement").style.display = "none";
  document.getElementById("patientHealth").style.display = "block";

  // Now you can fetch and display sensor data for this patient
  console.log("Testing health for patient: " + patientId);
}
function testHealth(patientId) {
  selectedPatientId = patientId;

  document.getElementById("patientManagement").style.display = "none";
  document.getElementById("patientHealth").style.display = "block";

  // Reset values until test runs
  document.getElementById("hrTest").innerText = "-- bpm";
  document.getElementById("spo2Test").innerText = "-- %";
  document.getElementById("tempTest").innerText = "-- °C";
}
