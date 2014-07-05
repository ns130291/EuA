
window.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById("loginform");
    form.addEventListener('submit', login, false);
    document.getElementById("loginbutton").addEventListener('click', function(){
        document.getElementById("loginform").submit();
    }, false);
}, false);

function login(e) {
    var errors = document.getElementsByClassName("error-login");
    for (var i = 0; i < errors.length; i++) {
        document.getElementById("loginformcontainer").removeChild(errors[i])
    }
    if (document.getElementById("load")) {
        document.getElementById("loginbutton").removeChild(document.getElementById("load"));
    }

    var user = document.getElementById("user").value;
    if (user === "" || user === null) {
        var error = document.createElement("div");
        error.innerHTML = "Username muss angegeben werden";
        error.className = "error-login";
        document.getElementById("loginformcontainer").insertBefore(error, document.getElementById("loginform"));
        e.preventDefault();
    }

    var pw = document.getElementById("pw").value;
    if (pw === "" || pw === null) {
        var error = document.createElement("div");
        error.innerHTML = "Passwort fehlt";
        error.className = "error-login";
        document.getElementById("loginformcontainer").insertBefore(error, document.getElementById("loginform"));
        e.preventDefault();
    }
    document.getElementById("pw").value = "";
    document.getElementById("hidden").value = pw;
    var load = document.createElement("span");
    load.id = "load";
    load.className = "animate-spin";
    load.style = "font-family: 'nsvb-symbol'";
    load.innerHTML = "\uE803";
    document.getElementById("loginbutton").insertBefore(load, document.getElementById("submit"));
}