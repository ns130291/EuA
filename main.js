
$(document).ready(function() {
    $("#next-month").click(naechsterMonat);
    $("#previous-month").click(vorherigerMonat);
    $("#spendings").click(uebersichtMonate);
    $("#plusbutton").click(ausgabenSpeichern);
    $(window).resize(function() {
        $('#ausgaben').height($(window).height() - $('header').height() - $('footer').height() - $('#table-header').height());
        $('.loading').height($(window).height() - $('header').height() - $('footer').height() - $('#table-header').height() - 11);
    });
    $('#ausgaben').height($(window).height() - $('header').height() - $('footer').height() - $('#table-header').height());
    $('.loading').height($(window).height() - $('header').height() - $('footer').height() - $('#table-header').height() - 11);
    holeAusgaben();
});

function uebersichtMonate() {
    $.post('getAusgabenUebersicht.php', function(data) {
        var json = JSON.parse(data);
        if (json['error'] === undefined) {
            if (json.ausgaben) {
                var el = $("<div>").attr("id", "month-overview").click(function() {
                    $(this).remove();
                    return false;
                });
                var ausgaben = json.ausgaben;
                for (var x in ausgaben) {
                    var tempDate = moment([ausgaben[x].jahr, ausgaben[x].monat - 1]);
                    var preis = (ausgaben[x].preis.indexOf(".")) ? ausgaben[x].preis.replace(".", ",") : ausgaben[x].preis;
                    $("<div>").html(tempDate.format("MMM YYYY") + ' ' + preis + ' €<br>').appendTo(el);
                }
                $("#spendings").append(el);
            }
        } else {
            if (json['error'] === 'not_logged_in') {
                if (json['location']) {
                    window.location = json['location'];
                } else {
                    alert("Sie sind nicht eingeloggt");
                }
            } else {
                alert("Unbekannter Fehler");
            }
        }
    });
}

var json = null;
moment.lang("de");
var datum = moment();
var ausgabe = new Object();

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

function holeAusgaben(callback) {
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
                json = JSON.parse(req.responseText);
                if (json['error'] === undefined) {
                    ausgabenAnzeigen();
                    if (callback !== undefined) {
                        callback();
                    }
                    $("#month").text(datum.format("MMMM YYYY"));
                    $('#loading-screen').remove();
                } else {
                    if (json['error'] === 'not_logged_in') {
                        if (json['location']) {
                            window.location = json['location'];
                        } else {
                            alert("Sie sind nicht eingeloggt");
                        }
                    } else {
                        alert("Unbekannter Fehler");
                    }
                }
            }
        }
    };
    req.send(params);
}

function vorherigerMonat() {
    datum.subtract("month", 1);

    ausgabenEntfernen();
    window.history.pushState({}, "", "index.php?year=" + datum.year() + "&month=" + (datum.month() + 1));
    holeAusgaben();
}

function naechsterMonat() {
    datum.add("month", 1);

    ausgabenEntfernen();
    window.history.pushState({}, "", "index.php?year=" + datum.year() + "&month=" + (datum.month() + 1));
    holeAusgaben();
}

function ausgabenEntfernen() {
    $("#month").html('<span class="animate-spin" style="font-family: \'nsvb-symbol\'";>\uE802</span> ' + datum.format("MMMM YYYY"));
    $(".ausgabe").remove();
    if (!document.getElementById('loading-screen')) {
        $('#ausgaben').append($('<div>').css({"background-color": "#ccc"}).addClass('table').attr('id', 'loading-screen').append($('<div>').addClass('tr').append($('<div>').addClass('td').css({"font-family": "nsvb-symbol", "font-size": "200%"}).addClass('loading').append($('<span>').addClass('animate-spin').text('\uE802')))))
        $('.loading').height($(window).height() - $('header').height() - $('footer').height() - $('#table-header').height() - 11);
    }    
}

function ausgabenAnzeigen() {

    $("#spendings").text(((json['summeausgaben'].indexOf(".")) ? json['summeausgaben'].replace(".", ",") : json['summeausgaben']) + " €");

    var x;
    var ausgaben = json['ausgaben'];
    for (x in ausgaben) {
        var element = createRow(ausgaben[x].idausgabe, dateToLocal(ausgaben[x].datum), (ausgaben[x].kategorie) ? ausgaben[x].kategorie : "", ausgaben[x].art, (ausgaben[x].preis.indexOf(".")) ? ausgaben[x].preis.replace(".", ",") : ausgaben[x].preis, (ausgaben[x].beschreibung) ? ausgaben[x].beschreibung : "");
        $("#ausgabenliste").append(element);
    }
}

function removeEntry(e) {
    var el = e.target;
    var ausgabenElement = el.parentNode.parentNode;

    //alert(el.parentNode.parentNode.getAttribute("data-id"));

    var preis = $(ausgabenElement).children(".preis").html();
    preis = preis.split(" ")[0];
    preis = convertPreisToPoint(preis);

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
                if (json['error'] === undefined) {
                    if (json.deleted === 'true') {
                        document.getElementById("ausgabenliste").removeChild(ausgabenElement);

                        addSpendings(-preis);
                    }
                } else {
                    if (json['error'] === 'not_logged_in') {
                        if (json['location']) {
                            window.location = json['location'];
                        } else {
                            alert("Sie sind nicht eingeloggt");
                        }
                    } else {
                        alert("Unbekannter Fehler");
                    }
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
    var error = "";
    var showError = false;

    var datumAusgabe = $('#input-datum').val();
    if (datumAusgabe === undefined || datumAusgabe === "") {
        error += "Datum fehlt<br>";
        showError = true;
    } else {
        var datumDB = "";
        if (datumAusgabe.indexOf(".") > 0) {
            datumDB = localToDate(datumAusgabe);
        } else {
            datumDB = datumAusgabe;
            datumAusgabe = dateToLocal(datumAusgabe);
        }
    }

    var kategorie = $('#input-kategorie').val();

    var art = $('#input-art').val();
    if (art === undefined || art === "") {
        error += "Art der Ausgabe fehlt<br>";
        showError = true;
    }

    var preis = $('#input-preis').val();
    if (preis === undefined || preis === "") {
        error += "Preis fehlt<br>";
        showError = true;
    } else {
        var preisDB = 0;
        if (preis.indexOf(",") > 0) {
            preisDB = preis.replace(",", ".");
        } else {
            preisDB = preis;
            if (preis.indexOf(".") > 0) {
                preisDB = preis;
                preis = preis.replace(".", ",");
            } else {
                preis += ",00";
            }
        }
    }

    var beschreibung = $('#input-beschreibung').val();

    var errorElement = document.getElementById("error");
    if (showError) {
        errorElement.innerHTML = error;
        errorElement.style.display = "block";
        //errorElement.style.setAttribute("display", "block");
    } else {
        errorElement.style = "";
        ausgabe.datumDB = datumDB;
        ausgabe.datumAusgabe = datumAusgabe;
        ausgabe.kategorie = kategorie;
        ausgabe.art = art;
        ausgabe.preisDB = preisDB;
        ausgabe.preis = preis;
        ausgabe.beschreibung = beschreibung;

        //Falls neue Ausgabe nicht im aktuell gewählten Monat ist wird der dazugehörige Monat geladen
        var datumM;
        if (datumDB.split("-")[0].length < 4) {
            datumM = moment(datumDB, "YY-M-D");
        }
        else {
            datumM = moment(datumDB, "YYYY-M-D");
        }

        if (datum.month() !== datumM.month() || datum.year() !== datumM.year()) {
            datum.month(datumM.month());
            datum.year(datumM.year());
            console.log("Anderer Monat wird geladen");
            ausgabenEntfernen();
            holeAusgaben(ausgabenSpeichernRequest);
        } else {
            ausgabenSpeichernRequest();
        }


    }
}

function ausgabenSpeichernRequest() {
    var params = new Object();
    params.datum = ausgabe.datumDB;
    if (ausgabe.kategorie) {
        params.kategorie = ausgabe.kategorie;
    }
    params.art = encodeURIComponent(ausgabe.art);
    params.preis = ausgabe.preisDB;
    if (ausgabe.beschreibung) {
        params.beschreibung = ausgabe.beschreibung;
    }

    $.ajax("saveAusgabe.php", {
        type: 'POST',
        data: params
    }).done(function(result) {
        var json = JSON.parse(result);
        if (json['error'] === undefined) {
            var element = createRow(json['id'], ausgabe.datumAusgabe, ausgabe.kategorie, ausgabe.art, ausgabe.preis, ausgabe.beschreibung);
            element.className += " new";
            document.getElementById("ausgabenliste").insertBefore(element, document.getElementById("input"));

            addSpendings(ausgabe.preisDB);

            clearInput();

            ausgabe = new Object();
        } else {
            if (json['error'] === 'not_logged_in') {
                if (json['location']) {
                    window.location = json['location'];
                } else {
                    alert("Sie sind nicht eingeloggt");
                }
            } else {
                alert("Unbekannter Fehler");
            }
        }
    }).fail(function(msg) {
        alert("Speichern der Ausgabe fehlgeschlagen: " + msg);
    });
}

function clearInput() {
    $('#input-datum, #input-kategorie, #input-art, #input-preis, #input-beschreibung').val("");
}

/**
 * @param float preis Preis der hinzugefügt werden soll, negative Werte zum abziehen
 */
function addSpendings(preis) {
    $('#spendings').html(convertPreisToComma((convertPreisToPoint($('#spendings').html().split(' ')[0]) + parseFloat(preis)).toFixed(2)) + " €");
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
    element.className = "tr ausgabe";
    var html = '<div class="td td-datum">';
    html += datum;
    html += '</div>';
    html += '<div class="td td-kategorie">';
    html += kategorie;
    html += '</div>';
    html += '<div class="td td-art">';
    html += art;
    html += '</div>';
    html += '<div class="preis td td-preis">';
    html += preis + ' &euro;';
    html += '</div>';
    html += '<div class="td td-beschreibung">';
    html += beschreibung;
    html += '</div>';
    html += '<div class="td td-optionen">';
    html += '<div class="remove icon-trash"></div>';
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

function convertPreisToPoint(preis) {
    preis = preis.replace(",", ".");
    return parseFloat(preis);
}

function convertPreisToComma(preis) {
    preis += "";
    preis = preis.replace(".", ",");
    return preis;
}

