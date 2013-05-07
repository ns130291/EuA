
window.onDomReady = function(fn) {
    //W3C-compliant browser
    if (document.addEventListener) {
        document.addEventListener("DOMContentLoaded", fn, false);
    }
    //IE
    else {
        document.onreadystatechange = function() {
            // DOM is ready
            if (document.readyState == "interactive" || document.readyState == "complete") {
                fn();
                document.onreadystatechange = function() {
                };
            }
        };
    }
}

/**
 * gibt alle childNodes vom Typ Element zurück
 * @return array mit Child-Elements
 */
HTMLElement.prototype.getChildElements = function()
{
    var a = [];
    var tags = this.childNodes;

    for (var i = 0; i < tags.length; i++)
    {
        if (tags[i].nodeType == 1)
        {
            a.push(tags[i]);
        }
    }
    return a;
}

window.onDomReady(function() {
    holeAusgaben();
})

var json = null;

/**
 * @return XMLHttpRequest
 */
function initRequest() {
    var xmlhttp;
    if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    }
    else {//IE 5/6
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    return xmlhttp;
}

/**
 * Beide Parameter sind optional
 * @param month Monat, für den die Ausgaben abgerufen werden sollen
 * @param year Jahr, für das die Ausgaben abgerufen werden sollen
 */
function holeAusgaben(month, year) {
    var date = new Date();
    if (!month) {
        month = date.getMonth() + 1;
    }
    if (!year) {
        year = date.getFullYear();
    }
    var req = initRequest();
    var url = "getAusgaben.php";
    var params = "month=" + month + "&year=" + year;
    req.open("post", url, true);
    req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    req.setRequestHeader("Content-length", params.length);
    req.setRequestHeader("Connection", "close");
    req.onreadystatechange = function() {//Call a function when the state changes.
        if (req.readyState == 4) {
            if (req.status == 200) {
                //alert("geht");
                json = JSON.parse(req.responseText);
                //json=eval(req.responseText);
                ausgabenAnzeigen();
            } else if (req.status == 404) {

            } else if (req.status == 500) {

            }
        }
    }
    req.send(params);
}

function ausgabenAnzeigen() {
    var x;
    for (x in json) {
        var element = document.createElement("div");
        //element.innerHTML=JSON.stringify(json[x]);
        element.setAttribute("id", json[x].idausgabe);
        element.setAttribute("data-id", json[x].idausgabe);
        element.className = "tr";
        var html = '<div class="td">';
        html += dateToLocal(json[x].datum);
        html += '</div>';
        html += '<div class="td">';
        if (json[x].kategorie) {
            html += json[x].kategorie;
        }
        html += '</div>';
        html += '<div class="td">';
        html += json[x].art;
        html += '</div>';
        html += '<div class="preis td">';
        if (json[x].preis.indexOf(".")) {
            html += json[x].preis.replace(".", ",");
        } else {
            html += json[x].preis;
        }
        html += " &euro;";
        html += '</div>';
        html += '<div class="td">';
        if (json[x].beschreibung) {
            html += json[x].beschreibung;
        }
        html += '</div>';
        html += '<div class="td">';
        html += '<div class="remove">&times;</div>';
        html += '</div>';
        element.innerHTML = html;
        element.getElementsByClassName("remove")[0].addEventListener("click", removeEntry, false);
        document.getElementById("ausgabenliste").insertBefore(element, document.getElementById("ausgabenliste").childNodes[document.getElementById("ausgabenliste").childNodes.length - 2]);
    }
}

function removeEntry(e) {
    var el = e.target;
    var ausgabenElement = el.parentNode.parentNode;

    //alert(el.parentNode.parentNode.getAttribute("data-id"));


    var req = initRequest();
    var url = "deleteAusgabe.php";
    var params = "idausgabe=" + ausgabenElement.getAttribute("data-id");
    req.open("POST", url, true);
    //Send the proper header information along with the request
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=UTF-8");
    req.setRequestHeader("Content-length", params.length);
    req.setRequestHeader("Connection", "close");

    req.onreadystatechange = function() {//Call a function when the state changes.
        if (req.readyState === 4) {
            if (req.status === 200) {
                //alert(req.responseText);
                var json = JSON.parse(req.responseText);
                if (json.error === undefined) {
                    if (json.deleted === 'true') {
                        document.getElementById("ausgabenliste").removeChild(ausgabenElement);
                    }
                } else {
                    alert(json.error);
                }
            }
        }
    };
    req.send(params);
}

/**
 * 
 */
function ausgabenSpeichern() {
    var parent = document.getElementById("input");

    var id = "";
    var datumInput = parent.getChildElements()[0].getChildElements()[0];
    var kategorieInput = parent.getChildElements()[1].getChildElements()[0];
    var artInput = parent.getChildElements()[2].getChildElements()[0];
    var preisInput = parent.getChildElements()[3].getChildElements()[0];
    var beschreibungInput = parent.getChildElements()[4].getChildElements()[0];

    var datum = datumInput.value;
    var datumDB = "";
    if (datum.indexOf(".") > 0) {
        datumDB = localToDate(datum);
    } else {
        datumDB = datum;
        datum = dateToLocal(datum);
    }
    var kategorie = kategorieInput.value;
    var art = artInput.value;
    var preis = preisInput.value;
    var preisDB = 0;
    if (preis.indexOf(",") > 0) {
        preisDB = preis.replace(",", ".");
    } else {
        preisDB = preis;
        if (preis.indexOf(".") > 0) {
            preisDB = preis;
            preis = preis.replace(".", ",");
        }
    }
    var beschreibung = beschreibungInput.value;

    var error = "";
    var showError = false;
    if (datum == "") {
        error += "Datum fehlt<br>";
        showError = true;
    }
    if (art == "") {
        error += "Art der Ausgabe fehlt<br>"
        showError = true;
    }
    if (preis == "") {
        error += "Preis fehlt<br>"
        showError = true;
    }
    preis = preis + " &euro;";

    var errorElement = document.getElementById("error");
    if (showError) {
        errorElement.innerHTML = error;
        errorElement.style.display = "block";
        //errorElement.style.setAttribute("display", "block");
    } else {
        errorElement.style = "";
        //Irgendwas geht da schief, abe rich wei� nicht was:-(
        //document.getElementById("error").style.removeAttribute("display");    

        //nur noch abspeichern... ;-) so mittels xmlhttprequest und so zeugs
        //vllt noch schleife um es 5 mal zu probieren?

        var params = "datum=" + datumDB;
        if (kategorie) {
            params += "&kategorie=" + kategorie;
        }
        params += "&art=" + encodeURIComponent(art);
        params += "&preis=" + preisDB;
        if (beschreibung) {
            params += "&beschreibung=" + beschreibung;
        }
        params = encodeURI(params);

        var req = initRequest();
        var url = "saveAusgabe.php";
        req.open("POST", url, true);
        //Send the proper header information along with the request
        req.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=UTF-8");
        req.setRequestHeader("Content-length", params.length);
        req.setRequestHeader("Connection", "close");

        req.onreadystatechange = function() {//Call a function when the state changes.
            if (req.readyState == 4) {
                if (req.status == 200) {
                    //alert(req.responseText);
                    id = req.responseText;

                    //id aus antwort des queries
                    var element = document.createElement("div");
                    element.setAttribute("id", id);
                    element.setAttribute("data-id", id);
                    element.className = "tr new";
                    var html = '<div class="td">';
                    html += datum;
                    html += '</div>';
                    html += '<div class="td">';
                    html += kategorie;
                    html += '</div>';
                    html += '<div class="td">';
                    html += art;
                    html += '</div>';
                    html += '<div class="preis td">';
                    html += preis;
                    html += '</div>';
                    html += '<div class="td">';
                    html += beschreibung;
                    html += '</div>';
                    html += '<div class="td">';
                    html += '<div class="remove">&times;</div>';
                    html += '</div>';
                    element.innerHTML = html;
                    element.getElementsByClassName("remove")[0].addEventListener("click", removeEntry, false);
                    document.getElementById("ausgabenliste").insertBefore(element, document.getElementById("ausgabenliste").childNodes[document.getElementById("ausgabenliste").childNodes.length - 2]);

                    datumInput.value = "";
                    kategorieInput.value = "";
                    artInput.value = "";
                    preisInput.value = "";
                    beschreibungInput.value = "";
                }
            }
        }
        req.send(params);
    }
}

/**
 * @param date Datum in DB-Format
 * @return Datum in lokalen Format
 */
function dateToLocal(date) {
    var a = date.split("-");
    return a[2] + "." + a[1] + "." + a[0];
}

/**
 * @param date Datum in lokalen Format
 * @return Datum in DB-Format
 */
function localToDate(date) {
    var a = date.split(".");
    return a[2] + "-" + a[1] + "-" + a[0];
}