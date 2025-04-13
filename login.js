// For LOGIN
var x = document.getElementById("login");
var y = document.getElementById("register");
var z = document.getElementById("btn");
var a = document.getElementById("log");
var b = document.getElementById("reg");
var w = document.getElementById("other");

function register() {
  x.style.left = "-400px";
  y.style.left = "50px";
  z.style.left = "110px";
  w.style.visibility = "hidden";
  b.style.color = "#fff";
  a.style.color = "#000";
}

function login() {
  x.style.left = "50px";
  y.style.left = "450px";
  z.style.left = "0px";
  w.style.visibility = "visible";
  a.style.color = "#fff";
  b.style.color = "#000";
}
  
// CheckBox Function
function goFurther(){
  if (document.getElementById("chkAgree").checked == true) {
    document.getElementById('btnSubmit').style = 'background: linear-gradient(to right, #FA4B37, #DF2771);';
    document.getElementById('btnSubmit').disabled = false;
  }
  else{
    document.getElementById('btnSubmit').style = 'background: lightgray;';
  }
}

function google() {
    alert('Google sign-in integration would go here');
    return false;
}


function registerUser() {
  let username = document.getElementById("reg-username").value;
  let email = document.getElementById("reg-email").value;
  let password = document.getElementById("reg-password").value;

  if (username && email && password) {
      sessionStorage.setItem("loggedInUser", username);
      window.location.href = "index.html";
  } else {
      alert("Please fill in all fields");
  }
  return false;
}


function loginUser() {
  let email = document.getElementById("log-email").value;
  let password = document.getElementById("log-password").value;

  if (email && password) {
      sessionStorage.setItem("loggedInUser", email);
      window.location.href = "index.html";
  } else {
      alert("Please fill in all fields");
  }
  return false;
}


function updateNavbar() {
  let username = sessionStorage.getItem("loggedInUser");
  let navUser = document.getElementById("nav-user");
  let loginBtn = document.getElementById("navbar-login");

  if (username) {
      if (loginBtn) loginBtn.style.display = "none";

      navUser.innerHTML = `
          <span style="font-size: 18px; font-weight: bold; color: white;">${username}</span>
          <button id="logout-btn" style="margin-left: 10px; background: red; color: white; border: none; padding: 5px 10px; border-radius: 5px;">Logout</button>
      `;

      document.getElementById("logout-btn").addEventListener("click", logout);
  } else {
      if (loginBtn) loginBtn.style.display = "inline";
      navUser.innerHTML = "";
  }
}

function logout() {
  sessionStorage.removeItem("loggedInUser");
  location.reload();
}

window.onload = updateNavbar;

