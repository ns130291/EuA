
window.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById("loginform");
    form.addEventListener('submit', login, false);
}, false);

function login(e) {

    var user = document.getElementById("user").value;
    if (user === "" || user === null) {
        var error = document.createElement("div");
        error.innerHTML = "Username muss angegeben werden";
        error.className = "error-login";
        document.getElementById("login").insertBefore(error, document.getElementById("loginformcontainer"));
        e.preventDefault();
    }
    
    var pw = document.getElementById("pw").value;
    if (pw === "" || pw === null) {
        var error = document.createElement("div");
        error.innerHTML = "Passwort fehlt";
        error.className = "error-login";
        document.getElementById("login").insertBefore(error, document.getElementById("loginformcontainer"));
        e.preventDefault();
    }
    document.getElementById("pw").value = "";
    document.getElementById("hidden").value = pw;
}