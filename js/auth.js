// js/auth.js
document.getElementById("loginBtn").addEventListener("click", login);

function login() {
  var email = document.getElementById("email").value;
  var password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      
      window.location.href = "dashboard.html";
    })
    .catch(err => alert(err.message));
}
