
$(document).ready(function() {
    $("#next-month").click(naechsterMonat);
    $("#previous-month").click(vorherigerMonat);
    $("#spendings").click(uebersichtMonate);
});

function uebersichtMonate() {
    $.post('getAusgabenUebersicht.php', function(data) {
        var result = JSON.parse(data);
        if (!result.error) {
            if (result.ausgaben) {
                var el = $("<div>").attr("id", "month-overview").click(function() {
                    $(this).remove();
                    return false;
                });
                var ausgaben = result.ausgaben;
                for (var x in ausgaben) {
                    var tempDate = moment([ausgaben[x].jahr, ausgaben[x].monat - 1]);
                    var preis = (ausgaben[x].preis.indexOf(".")) ? ausgaben[x].preis.replace(".", ",") : ausgaben[x].preis;
                    $("<div>").html(tempDate.format("MMM YYYY") + ' ' + preis + ' €<br>').appendTo(el);
                }
                $("#spendings").append(el);
            }
        }
    });
}

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
};

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
        if (tags[i].nodeType === 1)
        {
            a.push(tags[i]);
        }
    }
    return a;
};

window.onDomReady(function() {
    holeAusgaben();
});

//TODO: Warum ist das global??
var json = null;
moment.lang("de");
var datum = moment();

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
function holeAusgaben() {
    var req = initRequest();
    var url = "getAusgaben.php";
    var params = "month=" + (datum.month() + 1) + "&year=" + datum.year();
    req.open("post", url, true);
    req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    req.setRequestHeader("Content-length", params.length);
    req.setRequestHeader("Connection", "close");
    req.onreadystatechange = function() {//Call a function when the state changes.
        if (req.readyState === 4) {
            if (req.status === 200) {
                //alert(req.responseText);
                json = JSON.parse(req.responseText);
                //json=eval(req.responseText);
                ausgabenAnzeigen();
                $("#month").text(datum.format("MMMM YYYY"));
            } else if (req.status === 403) {
                alert(req.responseText);
                var result = JSON.parse(req.responseText);
                if (result['error'] && result['error'] === 'not_logged_in') {
                    if (result['location']) {
                        window.location = result['location'];
                    } else {
                        alert("error");
                    }
                }
            } else if (req.status === 404) {

            } else if (req.status === 500) {

            }
        }
    };
    req.send(params);
}

function vorherigerMonat() {
    datum.subtract("month", 1);

    ausgabenEntfernen();
    holeAusgaben();
}

function naechsterMonat() {
    datum.add("month", 1);

    ausgabenEntfernen();
    holeAusgaben();
}

function ausgabenEntfernen() {

    $("#ausgabenliste").children().each(function() {
        //alert("hallo");
        //alert($(this).html());
        if (!($(this).hasClass("th") || $(this).attr('id') === "input")) {
            $(this).remove();
        }
    });
    /*
     var el = document.getElementById("ausgabenliste");
     
     for (var i = 0; i < (el.childNodes.length - 1); i++) {
     var tempEl = el.childNodes[i];
     if(!(tempEl.classList.contains("th")||(tempEl.id === "input"))){
     el.removeChild(tempEL);
     }
     }*/
}

function ausgabenAnzeigen() {

    $("#spendings").text(((json['summeausgaben'].indexOf(".")) ? json['summeausgaben'].replace(".", ",") : json['summeausgaben']) + " €");

    var x;
    var ausgaben = json['ausgaben'];
    for (x in ausgaben) {
        var element = createRow(ausgaben[x].idausgabe, dateToLocal(ausgaben[x].datum), (ausgaben[x].kategorie) ? ausgaben[x].kategorie : "", ausgaben[x].art, (ausgaben[x].preis.indexOf(".")) ? ausgaben[x].preis.replace(".", ",") : ausgaben[x].preis, (ausgaben[x].beschreibung) ? ausgaben[x].beschreibung : "");
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
    if (datum === "") {
        error += "Datum fehlt<br>";
        showError = true;
    }
    if (art === "") {
        error += "Art der Ausgabe fehlt<br>";
        showError = true;
    }
    if (preis === "") {
        error += "Preis fehlt<br>";
        showError = true;
    }

    var errorElement = document.getElementById("error");
    if (showError) {
        errorElement.innerHTML = error;
        errorElement.style.display = "block";
        //errorElement.style.setAttribute("display", "block");
    } else {
        errorElement.style = "";
        //Irgendwas geht da schief, aber ich weiß nicht was:-(
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
            if (req.readyState === 4) {
                if (req.status === 200) {
                    //alert(req.responseText);
                    id = req.responseText;

                    //id aus antwort des queries
                    var element = createRow(id, datum, kategorie, art, preis, beschreibung);
                    element.className += " new";
                    document.getElementById("ausgabenliste").insertBefore(element, document.getElementById("ausgabenliste").childNodes[document.getElementById("ausgabenliste").childNodes.length - 2]);

                    datumInput.value = "";
                    kategorieInput.value = "";
                    artInput.value = "";
                    preisInput.value = "";
                    beschreibungInput.value = "";
                }
            }
        };
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

function createRow(id, datum, kategorie, art, preis, beschreibung) {
    var element = document.createElement("div");
    element.setAttribute("data-id", id);
    element.className = "tr";
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
    html += preis + ' &euro;';
    html += '</div>';
    html += '<div class="td">';
    html += beschreibung;
    html += '</div>';
    html += '<div class="td">';
    html += '<div class="remove">&times;</div>';
    html += '<div class="edit">edit</div>';
    html += '</div>';
    element.innerHTML = html;
    element.getElementsByClassName("remove")[0].addEventListener("click", removeEntry, false);
    element.getElementsByClassName("edit")[0].addEventListener("click", editEntry, false);
    return element;
}

function editEntry(e) {
    var el = e.target;
    var ausgabenElement = el.parentNode.parentNode;

    for (var i = 0; i < el.parentNode.childNodes.length; i++) {
        el.parentNode.childNodes[i].style.display = "none";
    }

    var update = document.createElement("div");
    update.innerHTML = "Update";
    update.addEventListener("click", updateEntry, "false");
    update.className = "update";

    var cancel = document.createElement("div");
    cancel.innerHTML = "&times;";
    cancel.addEventListener("click", cancelEditEntry, "false");
    cancel.className = "cancel";

    el.parentNode.appendChild(update);
    el.parentNode.appendChild(cancel);

    //TODO: jedes child einzeln behandeln
    for (var i = 0; i < (ausgabenElement.childNodes.length - 1); i++) {
        if (ausgabenElement.childNodes[i].className.contains("td")) {
            //alert("TD in if");
            if (ausgabenElement.childNodes[i].classList.contains('preis')) {
                var preis = ausgabenElement.childNodes[i].innerHTML.split(' ')[0];
                ausgabenElement.childNodes[i].innerHTML = '<input size="10" class="preis" placeholder="Preis in &euro;" type="number" min="0.01" step="0.01" value="' + preis + '"><span>&euro;</span>';
            } else {
                ausgabenElement.childNodes[i].innerHTML = '<input type="text" value="' + ausgabenElement.childNodes[i].innerHTML + '">';
            }
        }
    }
}

function cancelEditEntry(e) {
    var el = e.target;
    var parent = el.parentNode;
    parent.removeChild(parent.getElementsByClassName("update")[0]);
    parent.removeChild(parent.getElementsByClassName("cancel")[0]);

    for (var i = 0; i < parent.childNodes.length; i++) {
        parent.childNodes[i].style.display = "";
    }
    //TODO input wieder in divs umwandeln
}

function updateEntry(e) {
    //TODO abspeichern
}

