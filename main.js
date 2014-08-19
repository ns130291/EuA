"use strict";

var json = null;
moment.lang("de");
var datum = moment();
var ausgabe = {};
var chart = null;

$(document).ready(function() {
    $("#next-month").click(naechsterMonat);
    $("#previous-month").click(vorherigerMonat);
    $("#spendings").click(overlay);
    $("#plusbutton").click(ausgabenSpeichern);
    $("#overlay-close").click(ausgaben);
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

function ausgaben() {
    $('#content').css('display', 'block');
    $('#overlay').css('display', 'none');
}

function overlay() {
    $('#content').css('display', 'none');
    $('#overlay').css('display', 'block');
    overlayCharts();
}

function overlayCharts() {
    $.post('api.php', {action: 'get_sum_months'}).done(function(data) {
        var json = JSON.parse(data);
        if (json['error'] === undefined) {
            if (json.ausgaben) {
                $('#select').children().remove();
                $('#select-mobile > select').children().remove();
                var ausgaben = json.ausgaben;
                var currentYear = 0;
                for (var x in ausgaben) {
                    var tempDate = moment([ausgaben[x].jahr, ausgaben[x].monat - 1]);
                    if (currentYear === 0 || currentYear > tempDate.year()) {
                        currentYear = tempDate.year();
                        overlayAddSelect(currentYear, currentYear);
                    }
                    overlayAddSelect(tempDate.format('MMMM'), currentYear, ausgaben[x].preis.split('.')[0] + ' €', tempDate.month() + 1);
                }
                $('#select .select-element').first().addClass('active');
                $('#select-mobile > select > optgroup').first().children('option').first().attr('selected', 'selected');
                //TODO: load chart from selected category
                yearChart(2014);
            }
        } else {
            errorHandling(json);
        }
    });
}

function overlayAddSelect(label, year, spendings, month) {
    if (spendings === undefined) {
        $('#select').append($('<div>').addClass('select-element year').html(label).attr('data-year', year).click(function(e) {
            $('#select').children().removeClass('active');
            $(e.target).addClass('active');
            yearChart($(e.target).attr('data-year'));
        }));
        $('#select-mobile > select').append($('<optgroup>').attr('label', label));
        $('#select-mobile > select > optgroup[label="' + label + '"]').append($('<option>').html('Übersicht ' + label).attr('data-year', year));
    } else {
        $('#select').append($('<div>').addClass('select-element').html(label).append($('<div>').addClass('right').html(spendings)).attr('data-month', month).attr('data-year', year).click(function(e) {
            $('#select').children().removeClass('active');
            $(e.target).addClass('active');
            monthChart($(e.target).attr('data-month'), $(e.target).attr('data-year'));
        }));
        $('#select-mobile > select > optgroup[label="' + year + '"]').append($('<option>').html(label + ' - ' + spendings).attr('data-month', month).attr('data-year', year));
    }
}

function monthChart(month, year) {
    $('#stats > .chart').empty();
    $.post('api.php', {action: 'get_overview_month', monat: month, jahr: year}).done(function(data) {
        var json = JSON.parse(data);
        if (json['error'] === undefined) {
            if (json.ausgaben) {
                var ausgaben = json.ausgaben;
                var i = -1;

                var data = [];

                for (var x in ausgaben) {
                    data[x] = [];
                    if (ausgaben[x].kategorie === null) {
                        data[x][0] = 'Ohne Kategorie';
                    } else {
                        data[x][0] = ausgaben[x].kategorie;
                    }
                    data[x][1] = parseFloat(ausgaben[x].preis);
                }

                var series = [{
                        type: 'pie',
                        name: 'Summe',
                        data: data
                    }];

                chart = new Highcharts.Chart({
                    chart: {
                        renderTo: $('#stats > .chart')[0],
                        type: 'pie'
                    },
                    title: {
                        text: moment([year, month - 1]).format('MMMM YYYY')
                    },
                    tooltip: {
                        pointFormat: '{series.name}: <b>{point.y:.2f} €</b>'
                    },
                    plotOptions: {
                        pie: {
                            allowPointSelect: true,
                            cursor: 'pointer',
                            dataLabels: {
                                enabled: true,
                                format: '<b>{point.name}</b>:<br>{point.percentage:.1f} %',
                                style: {
                                    color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
                                }
                            }
                        }
                    },
                    series: series,
                    credits: false
                });
            }
        } else {
            errorHandling(json);
        }
    });
}

function yearChart(year) {
    $('#stats > .chart').empty();
    $.post('api.php', {action: 'get_overview_year', jahr: year}).done(function(data) {
        var json = JSON.parse(data);
        if (json['error'] === undefined) {
            if (json.ausgaben) {
                var ausgaben = json.ausgaben;
                var kategorie = undefined;
                var i = -1;
                var series = [];
                for (var x in ausgaben) {
                    if (kategorie !== ausgaben[x].kategorie) {
                        kategorie = ausgaben[x].kategorie;
                        i++;
                        if (kategorie === null) {
                            series[i] = {name: 'Ohne Kategorie', data: []};
                        } else {
                            series[i] = {name: kategorie, data: []};
                        }
                    }
                    series[i].data[ausgaben[x].monat - 1] = parseFloat(ausgaben[x].preis);
                }

                for (var x in series) {
                    for (i = 0; i < 12; i++) {
                        if (series[x].data[i] === undefined || series[x].data[i] === null) {
                            series[x].data[i] = 0;
                        }
                    }
                }

                chart = new Highcharts.Chart({
                    chart: {
                        renderTo: $('#stats > .chart')[0],
                        type: 'column'
                    },
                    title: {
                        text: year
                    },
                    xAxis: {
                        categories: "Jan._Febr._Mrz._Apr._Mai_Jun._Jul._Aug._Sept._Okt._Nov._Dez.".split("_")
                    },
                    yAxis: {
                        title: {
                            text: ''
                        }
                    },
                    tooltip: {
                        formatter: function() {
                            return this.x + '<br/>' +
                                    '<span style="color:' + this.series.color + '"> \u25CF </span>' + this.series.name + ': <b>' + convertPreisToComma(this.point.y) + ' €</b><br/>' +
                                    'Summe: ' + convertPreisToComma(this.point.stackTotal) + ' €';
                        }
                    },
                    plotOptions: {
                        column: {
                            stacking: 'normal'
                        }
                    },
                    series: series,
                    credits: false
                });
            }
        } else {
            errorHandling(json);
        }
    });


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
    /*if(chart !== null){
     //chart.redraw();
     }*/
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
    } else if (json['error'] === 'action_missing') {
        if (json['msg']) {
            alert(json['msg']);
        } else {
            alert("Unbekannter Server Fehler");
        }
    } else {
        alert("Unbekannter Fehler");
    }
}

function holeAusgaben(callback) {
    $.post('api.php', {action: 'get_month', month: (datum.month() + 1), year: datum.year()}).done(function(data) {
        json = JSON.parse(data);
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
    });
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
        $('#ausgaben').append($('<div>').css({"background-color": "#ccc"}).addClass('table').attr('id', 'loading-screen').append($('<div>').addClass('tr').append($('<div>').addClass('td').css({"font-family": "nsvb-symbol", "font-size": "200%"}).addClass('loading').append($('<span>').addClass('animate-spin').text('\uE802')))));
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

    var preis = $(ausgabenElement).children(".preis").html();
    preis = preis.split(" ")[0];
    preis = convertPreisToPoint(preis);

    $.post('api.php', {action: 'delete', idausgabe: ausgabenElement.getAttribute("data-id")}).done(function(data) {
        var json = JSON.parse(data);
        if (json['error'] === undefined) {
            if (json.deleted === 'true') {
                document.getElementById("ausgabenliste").removeChild(ausgabenElement);

                addSpendings(-preis);
            }
        } else {
            errorHandling(json);
        }
    });
}

function fehlerAnzeigen(error, id) {
    if (id !== undefined && id !== null) {
        if (error['datum'] !== undefined) {
            $('.ausgabe[data-id=' + id + '] .td-datum').append($('<div>').addClass('error').text(error['datum'])/*.append($('<div>').addClass('error-diamond'))*/);
        }
        if (error['art'] !== undefined) {
            $('.ausgabe[data-id=' + id + '] .td-art').append($('<div>').addClass('error').text(error['art']));
        }
        if (error['preis'] !== undefined) {
            $('.ausgabe[data-id=' + id + '] .td-preis').append($('<div>').addClass('error').text(error['preis']));
        }
    } else {
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
}

function fehlerLöschen(id) {
    if (id !== undefined && id !== null) {
        $('.ausgabe[data-id=' + id + '] .error').remove();
    } else {
        $('#input .error').remove();
    }
}

function ausgabenSpeichern() {
    var error = {};
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
            andererMonat(ausgabenSpeichernRequest);
        } else {
            ausgabenSpeichernRequest();
        }
    }
}

function ausgabenSpeichernRequest() {
    var params = {
        datum: ausgabe.datumDB,
        art: encodeURIComponent(ausgabe.art),
        preis: ausgabe.preisDB,
        action: 'add'
    };
    if (ausgabe.kategorie) {
        params.kategorie = encodeURIComponent(ausgabe.kategorie);
    }
    if (ausgabe.beschreibung) {
        params.beschreibung = encodeURIComponent(ausgabe.beschreibung);
    }

    $.post("api.php", params).done(function(result) {
        var json = JSON.parse(result);
        if (json['error'] === undefined) {
            var element = createRow(json['id'], ausgabe.datumAusgabe, ausgabe.kategorie, ausgabe.art, ausgabe.preis, ausgabe.beschreibung);
            element.className += " new";
            //TODO: insert new Ausgabe at the appropriate position
            document.getElementById("ausgabenliste").appendChild(element);
            $('.ausgabe[data-id=' + json['id'] + ']')[0].scrollIntoView();

            addSpendings(ausgabe.preisDB);

            clearInput();

            ausgabe = {};
        } else {
            errorHandling(json);
        }
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
    var error = {};
    var showError = false;

    var el = e.target;
    var parent = el.parentNode;
    parent.removeChild(parent.getElementsByClassName("update")[0]);
    parent.removeChild(parent.getElementsByClassName("cancel")[0]);

    $(parent).append($('<div/>').addClass('change animate-spin icon-spin5'));

    var ausgabenElement = parent.parentNode;
    var idausgabe = $(ausgabenElement).attr('data-id');
    fehlerLöschen(idausgabe);

    var params = {};

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

    params.idausgabe = idausgabe;
    params.action = 'edit';

    if (showError) {
        fehlerAnzeigen(error, idausgabe);
        readdEditControls(ausgabenElement);
    } else {
        $.post("api.php", params).done(function(result) {
            var json = JSON.parse(result);
            if (json['error'] === undefined) {
                var sameMonth = true;
                if (params.datum !== undefined) {
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
                        andererMonat();
                        //andererMonat(/*geänderte Ausgabe markieren*/);
                        sameMonth = false;
                    }
                }

                if (sameMonth) {
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
                readdEditControls(ausgabenElement);
                errorHandling(json);
            }
        });
    }
}

function readdEditControls(ausgabenElement) {
    $(ausgabenElement).children('.td-optionen').children('.change').remove();

    var update = document.createElement("div");
    update.addEventListener("click", updateEntry, "false");
    update.className = "update icon-ok";

    var cancel = document.createElement("div");
    cancel.addEventListener("click", cancelEditEntry, "false");
    cancel.className = "cancel icon-cancel";

    $(ausgabenElement).children('.td-optionen').append(update, cancel);
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

