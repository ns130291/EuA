
window.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById("loginform");
    form.addEventListener('submit', login, false);
}, false);

function login(e) {
    /*alert("submit");
     e.preventDefault();
     return false;*/


    var user = document.getElementById("user").value;
    if (user == "" || user == null) {
        var error = document.createElement("div");
        error.innerHTML = "Username muss angegeben werden";
        error.className = "error";
        document.getElementById("login").insertBefore(error, document.getElementById("loginform"));
        e.preventDefault();
    }
    var pw = document.getElementById("pw").value;
    //alert(pw);
    document.getElementById("pw").value = "";
    document.getElementById("hidden").value = pw;
    //alert(getElementById("hidden").value);
    //alert(user+" "+pw);
    /*var req=initRequest();
     //var url="login.php?user="+user+"&pw="+pw;
     var url="login.php";
     req.open("post", url, false);
     req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
     req.send("user="+user+"&pw="+pw);*/
    /*if(req.responseText==-1){
     alert("pw falsch");
     }*/
}