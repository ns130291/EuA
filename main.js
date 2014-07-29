"use strict";

var json = null;
moment.lang("de");
var datum = moment();
var ausgabe = new Object();

$(document).ready(function() {
    $("#next-month").click(naechsterMonat);
    $("#previous-month").click(vorherigerMonat);
    $("#spendings").click(uebersichtMonate);
    $("#plusbutton").click(ausgabenSpeichern);
    $(window).resize(resize);
    $(window).on('popstate', back);
    resize();
    ausgabenLaden();
});

function back(e) {
    var state = e.originalEvent.state;
    if (state !== null && state.year !== undefined && state.month !== undefined) {
        datum.year(state.year).month(state.month);
    } else {
        datum = moment();
    }
    loadingScreen();
    holeAusgaben();
}

function ausgabenLaden() {
    var location = window.location.search;
    if (location !== null && location !== "") {
        var regYear = new RegExp("year=(\\d{4})");
        var regMonth = new RegExp("month=(\\d{1,2})");
        var year = regYear.exec(location);
        var month = regMonth.exec(location);
        if (year.length === 2 && month.length === 2 && month[1] >= 1 && month[1] <= 12) {
            datum.month(month[1] - 1);
            datum.year(year[1]);
        }
    }
    holeAusgaben();
}

function resize() {
    $('#ausgaben').height($(window).height() - $('header').height() - $('footer').height() - $('#table-header').height());
    $('.loading').height($(window).height() - $('header').height() - $('footer').height() - $('#table-header').height() - 11);
}

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
            errorHandling(json);
        }
    });
}

function errorHandling(json) {
    if (json['error'] === 'not_logged_in') {
        if (json['location']) {
            window.location = json['location'];
        } else {
            alert("Sie sind nicht eingeloggt");
        }
    } else if (json['error'] === 'server') {
        if (json['msg']) {
            alert(json['msg']);
        } else {
            alert("Unbekannter Server Fehler");
        }
    } else {
        alert("Unbekannter Fehler");
    }
}

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
                    errorHandling(json);
                }
            }
        }
    };
    req.send(params);
}

function vorherigerMonat() {
    datum.subtract("month", 1);
    andererMonat();
}

function naechsterMonat() {
    datum.add("month", 1);
    andererMonat();
}

function andererMonat(callback) {
    loadingScreen();
    window.history.pushState({"year": datum.year(), "month": datum.month()}, "", "index.php?year=" + datum.year() + "&month=" + (datum.month() + 1));
    holeAusgaben(callback);
}

function loadingScreen() {
    $("#month").html('<span class="animate-spin" style="font-family: \'nsvb-symbol\'">\uE802</span> ' + datum.format("MMMM YYYY"));
    $(".ausgabe").remove();
    if (!document.getElementById('loading-screen')) {
        $('#ausgaben').append($('<div>').css({"background-color": "#ccc"}).addClass('table').attr('id', 'loading-screen').append($('<div>').addClass('tr').append($('<div>').addClass('td').css({"font-family": "nsvb-symbol", "font-size": "200%"}).addClass('loading').append($('<span>').addClass('animate-spin').text('\uE802')))))
        $('.loading').height($(window).height() - $('header').height() - $('footer').height() - $('#table-header').height() - 11);
    }
}

function ausgabenAnzeigen() {
    $("#spendings").text(((json['summeausgaben'].indexOf(".")) ? json['summeausgaben'].replace(".", ",") : json['summeausgaben']) + " €");

    var ausgaben = json['ausgaben'];
    for (var x in ausgaben) {
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
                var json = JSON.parse(req.responseText);
                if (json['error'] === undefined) {
                    if (json.deleted === 'true') {
                        document.getElementById("ausgabenliste").removeChild(ausgabenElement);

                        addSpendings(-preis);
                    }
                } else {
                    errorHandling(json);
                }
            }
        }
    };
    req.send(params);
}

function fehlerAnzeigen(error) {
    if (error['datum'] !== undefined) {
        $('#input .td-datum').append($('<div>').addClass('error').text(error['datum'])/*.append($('<div>').addClass('error-diamond'))*/);
    }
    if (error['art'] !== undefined) {
        $('#input .td-art').append($('<div>').addClass('error').text(error['art']));
    }
    if (error['preis'] !== undefined) {
        $('#input .td-preis').append($('<div>').addClass('error').text(error['preis']));
    }
}

function fehlerLöschen() {
    $('#input .error').remove();
}

function ausgabenSpeichern() {
    var error = new Object();
    var showError = false;

    fehlerLöschen();

    var datumAusgabe = $('#input-datum').val();
    if (datumAusgabe === undefined || datumAusgabe === "") {
        error['datum'] = "Datum fehlt";
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
        error['art'] = "Art der Ausgabe fehlt";
        showError = true;
    }

    var preis = $('#input-preis').val();
    if (preis === undefined || preis === "") {
        error['preis'] = "Preis fehlt";
        showError = true;
    } else {
        var preisDB = 0;
        preis = convertPreisToComma(preis);
        if (preis.indexOf(",") > 0) {
            preisDB = preis.replace(",", ".");
        } else {
            preisDB = preis;
            if (preis.indexOf(".") > 0) {
                preisDB = preis;
            }
        }
    }

    var beschreibung = $('#input-beschreibung').val();

    if (showError) {
        fehlerAnzeigen(error);
    } else {
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
            andererMonat(ausgabenSpeichernRequest);
        } else {
            ausgabenSpeichernRequest();
        }


    }
}

function ausgabenSpeichernRequest() {
    var params = new Object();
    params.datum = ausgabe.datumDB;
    if (ausgabe.kategorie) {
        params.kategorie = encodeURIComponent(ausgabe.kategorie);
    }
    params.art = encodeURIComponent(ausgabe.art);
    params.preis = ausgabe.preisDB;
    if (ausgabe.beschreibung) {
        params.beschreibung = encodeURIComponent(ausgabe.beschreibung);
    }

    $.ajax("saveAusgabe.php", {
        type: 'POST',
        data: params
    }).done(function(result) {
        var json = JSON.parse(result);
        if (json['error'] === undefined) {
            var element = createRow(json['id'], ausgabe.datumAusgabe, ausgabe.kategorie, ausgabe.art, ausgabe.preis, ausgabe.beschreibung);
            element.className += " new";
            //TODO: insert new Ausgabe at the appropriate position
            document.getElementById("ausgabenliste").appendChild(element);

            addSpendings(ausgabe.preisDB);

            clearInput();

            ausgabe = new Object();
        } else {
            errorHandling(json);
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
    html += '<div class="edit icon-pencil"></div>';
    html += '<div class="remove icon-trash"></div>';
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
    update.addEventListener("click", updateEntry, "false");
    update.className = "update icon-ok";

    var cancel = document.createElement("div");
    cancel.addEventListener("click", cancelEditEntry, "false");
    cancel.className = "cancel icon-cancel";

    el.parentNode.appendChild(update);
    el.parentNode.appendChild(cancel);

    for (var i = 0; i < (ausgabenElement.childNodes.length - 1); i++) {
        if (ausgabenElement.childNodes[i].className.contains("td")) {
            if (ausgabenElement.childNodes[i].classList.contains('preis')) {
                //Preis von €-Zeichen trennen
                var preis = ausgabenElement.childNodes[i].innerHTML.split(' ')[0];
                preis = convertPreisToPoint(preis);
                ausgabenElement.childNodes[i].setAttribute('data-input', preis);
                ausgabenElement.childNodes[i].innerHTML = '<input size="10" class="preis" placeholder="Preis" type="number" min="0.01" step="0.01" value="' + preis + '"><span>&euro;</span>';
            } else {
                var input = ausgabenElement.childNodes[i].innerHTML;
                ausgabenElement.childNodes[i].setAttribute('data-input', input);
                ausgabenElement.childNodes[i].innerHTML = '<input type="text" value="' + input + '">';
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

    var ausgabenElement = parent.parentNode;
    for (var i = 0; i < (ausgabenElement.childNodes.length - 1); i++) {
        if (ausgabenElement.childNodes[i].className.contains("td")) {
            var text = ausgabenElement.childNodes[i].getAttribute('data-input');
            $(ausgabenElement.childNodes[i]).children('input').remove();
            if (ausgabenElement.childNodes[i].classList.contains('preis')) {
                $(ausgabenElement.childNodes[i]).children('span').remove();
                $(ausgabenElement.childNodes[i]).html(convertPreisToComma(text) + ' €');
            } else {
                $(ausgabenElement.childNodes[i]).html(text);
            }
        }
    }
}

function updateEntry(e) {
    var error = new Object();
    var showError = false;

    fehlerLöschen();//TODO: Anpassen


    var el = e.target;
    var parent = el.parentNode;
    parent.removeChild(parent.getElementsByClassName("update")[0]);
    parent.removeChild(parent.getElementsByClassName("cancel")[0]);

    $(parent).append($('<div/>').addClass('change animate-spin icon-spin5'));

    var ausgabenElement = parent.parentNode;

    var params = new Object();

    if ($(ausgabenElement).children('.td-datum').attr('data-input') !== $(ausgabenElement).children('.td-datum').children('input').val()) {
        var datumAusgabe = $(ausgabenElement).children('.td-datum').children('input').val();
        if (datumAusgabe === undefined || datumAusgabe === "") {
            error['datum'] = "Datum fehlt";
            showError = true;
        } else {
            var datumDB = "";
            if (datumAusgabe.indexOf(".") > 0) {
                datumDB = localToDate(datumAusgabe);
            } else {
                datumDB = datumAusgabe;
                datumAusgabe = dateToLocal(datumAusgabe);
            }
            params.datum = datumDB;
        }
    }

    if ($(ausgabenElement).children('.td-kategorie').attr('data-input') !== $(ausgabenElement).children('.td-kategorie').children('input').val()) {
        params.kategorie = encodeURIComponent($(ausgabenElement).children('.td-kategorie').children('input').val());
    }

    if ($(ausgabenElement).children('.td-art').attr('data-input') !== $(ausgabenElement).children('.td-art').children('input').val()) {
        var art = $(ausgabenElement).children('.td-art').children('input').val();
        if (art === undefined || art === "") {
            error['art'] = "Art der Ausgabe fehlt";
            showError = true;
        } else {
            params.art = encodeURIComponent(art);
        }
    }

    if ($(ausgabenElement).children('.td-preis').attr('data-input') !== $(ausgabenElement).children('.td-preis').children('input').val()) {
        var preis = $(ausgabenElement).children('.td-preis').children('input').val();
        if (preis === undefined || preis === "") {
            error['preis'] = "Preis fehlt";
            showError = true;
        } else {
            var preisDB = 0;
            if (preis.indexOf(",") > 0) {
                preisDB = preis.replace(",", ".");
            } else {
                preisDB = preis;
            }
            params.preis = preisDB;
        }

    }

    if ($(ausgabenElement).children('.td-beschreibung').attr('data-input') !== $(ausgabenElement).children('.td-beschreibung').children('input').val()) {
        params.beschreibung = encodeURIComponent($(ausgabenElement).children('.td-beschreibung').children('input').val());
    }

    params.idausgabe = $(ausgabenElement).attr('data-id');

    if (showError) {
        //TODO: Fehler anzeigen, spinner entfernen, Schaltflächen wieder hinzufügen
    } else {
        $.ajax("editAusgabe.php", {
            type: 'POST',
            data: params
        }).done(function(result) {
            var json = JSON.parse(result);
            if (json['error'] === undefined) {
                var datumM;
                if (params.datum.split("-")[0].length < 4) {
                    datumM = moment(params.datum, "YY-M-D");
                }
                else {
                    datumM = moment(params.datum, "YYYY-M-D");
                }

                if (datum.month() !== datumM.month() || datum.year() !== datumM.year()) {
                    datum.month(datumM.month());
                    datum.year(datumM.year());
                    console.log("Anderer Monat wird geladen");
                    andererMonat();
                    //andererMonat(/*geänderte Ausgabe markeiren*/);
                } else {
                    for (var i = 0; i < (ausgabenElement.childNodes.length - 1); i++) {
                        if (ausgabenElement.childNodes[i].className.contains("td")) {
                            var text = $(ausgabenElement.childNodes[i]).children('input').val();
                            $(ausgabenElement.childNodes[i]).children('input').remove();
                            if (ausgabenElement.childNodes[i].classList.contains('preis')) {
                                $(ausgabenElement.childNodes[i]).children('span').remove();
                                $(ausgabenElement.childNodes[i]).html(convertPreisToComma(text) + ' €');
                            } else {
                                $(ausgabenElement.childNodes[i]).html(text);
                            }
                        }
                    }

                    if (params.preis) {
                        var preisAlt = convertPreisToPoint($(ausgabenElement).children('.td-preis').attr('data-input'));
                        var preisNeu = convertPreisToPoint(params.preis);
                        var change = -preisAlt + preisNeu;
                        addSpendings(parseFloat(change));
                    }

                    $(ausgabenElement).children('.td-optionen').children('.change').remove();

                    $(ausgabenElement).children('.td-optionen').children().css('display', '');
                }
            } else {
                $(ausgabenElement).children('.td-optionen').children('.change').remove();

                var update = document.createElement("div");
                update.addEventListener("click", updateEntry, "false");
                update.className = "update icon-ok";

                var cancel = document.createElement("div");
                cancel.addEventListener("click", cancelEditEntry, "false");
                cancel.className = "cancel icon-cancel";

                $(ausgabenElement).children('.td-optionen').append(update, cancel);

                errorHandling(json);
            }
        }).fail(function(msg) {
            $(ausgabenElement).children('.td-optionen').children('.change').remove();

            var update = document.createElement("div");
            update.addEventListener("click", updateEntry, "false");
            update.className = "update icon-ok";

            var cancel = document.createElement("div");
            cancel.addEventListener("click", cancelEditEntry, "false");
            cancel.className = "cancel icon-cancel";

            $(ausgabenElement).children('.td-optionen').append(update, cancel);

            alert("Ändern der Ausgabe fehlgeschlagen: " + msg);
        });
    }
    //TODO abspeichern
    //Gesamtausgaben aktualisieren
    //Bearbeiten & löschen wieder anzeigen
}

function convertPreisToPoint(preis) {
    preis += '';
    preis = preis.replace(",", ".");
    return parseFloat(preis);
}

function convertPreisToComma(preis) {
    preis += "";
    preis = preis.replace(".", ",");
    if (preis.split(",").length > 1) {
        if (preis.split(",")[1].length === 1) {
            preis += '0';
        }
    } else {
        preis += ',00';
    }
    return preis;
}

