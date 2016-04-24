"use strict";

/*global moment*/
/*global Highcharts*/
/*global $*/

if (!String.prototype.includes) {
    String.prototype.includes = function(s) {
        return this.indexOf(s) > -1
    }
}

/* http://stackoverflow.com/a/16771535/1565646 */
var getScrollbarWidth = function() {
    var div, width = getScrollbarWidth.width;
    if (width === undefined) {
        div = document.createElement('div');
        div.innerHTML = '<div style="width:50px;height:50px;position:absolute;left:-50px;top:-50px;overflow:auto;"><div style="width:1px;height:100px;"></div></div>';
        div = div.firstChild;
        document.body.appendChild(div);
        width = getScrollbarWidth.width = div.offsetWidth - div.clientWidth;
        document.body.removeChild(div);
    }
    return width;
};

var json;
moment.locale("de");
var datum = moment();
var chart = null;
var currentView = "spendings";
var mainLoaded = false;

$(document).ready(function() {
    mainLoaded = true;
    $("#next-month").click(naechsterMonat);
    $("#previous-month").click(vorherigerMonat);
    $("#switch-to-stats").click(showStatsView);
    $("#overlay-close").click(showDataView);
    $("#input-form").submit(function(e) {
        saveEntry();
        e.preventDefault();
    });
    $("#spendings").click(function() {
        $("#earnings").removeClass("active");
        $("#spendings").addClass("active");
        switchView("spendings");
    });
    $("#earnings").click(function() {
        $("#spendings").removeClass("active");
        $("#earnings").addClass("active");
        switchView("earnings");
    });
    $("#input-datum").change(prettifyDate);
    var scrollbarWidth = getScrollbarWidth();
    $("#ausgabenliste-header").css("padding-right", scrollbarWidth);
    $("#input").css("padding-right", scrollbarWidth);
    $(window).on('popstate', back);
    processURL();
});

function switchView(view) {
    if (currentView !== view) {
        currentView = view;
        datenAnzeigen();
    }
}

function back(e) {
    var state = e.originalEvent.state;
    if (state !== null && state.year !== undefined && state.month !== undefined) {
        datum.year(state.year).month(state.month);
    }
    else {
        datum = moment();
    }
    if (state !== null && state.statistics !== undefined) {
        showStatsView();
    }
    else {
        showDataView();
        loadingScreen();
    }
    holeDaten();
}

function showDataView() {
    $('#overlay').css('display', 'none');
    $('#content').css('display', 'flex');
    window.history.pushState({
        "year": datum.year(),
        "month": datum.month()
    }, "", "index.php?year=" + datum.year() + "&month=" + (datum.month() + 1));
}

function showStatsView() {
    $('#content').css('display', 'none');
    $('#overlay').css('display', 'block');
    window.history.pushState({
        "year": datum.year(),
        "month": datum.month(),
        "statistics": ""
    }, "", "index.php?year=" + datum.year() + "&month=" + (datum.month() + 1) + "&statistics");
    overlayCharts();
}

function overlayCharts() {
    $.post('api.php', {
        action: 'get_sum_months'
    }).done(function(data) {
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

                //change listener on select element for mobile
                //TODO: change active element in desktop version and vice versa
                $('#select-mobile > select').change(function(e) {
                    var optionSelected = $(this).find("option:selected");
                    if ($(optionSelected).attr('data-month') != null) {
                        monthChart($(optionSelected).attr('data-month'), $(optionSelected).attr('data-year'));
                    }
                    else {
                        yearChart($(optionSelected).attr('data-year'));
                    }

                });

                //TODO: load chart from selected category
                if (ausgaben.length > 0) {
                    yearChart(ausgaben[0].jahr);
                }
            }
        }
        else {
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
    }
    else {
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
    $.post('api.php', {
        action: 'get_overview_month',
        monat: month,
        jahr: year
    }).done(function(data) {
        var json = JSON.parse(data);
        if (json['error'] === undefined) {
            if (json.ausgaben) {
                var ausgaben = json.ausgaben;

                var data = [];

                for (var x in ausgaben) {
                    data[x] = [];
                    if (ausgaben[x].kategorie === null) {
                        data[x][0] = 'Ohne Kategorie';
                    }
                    else {
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
        }
        else {
            errorHandling(json);
        }
    });
}

function yearChart(year) {
    $('#stats > .chart').empty();
    $.post('api.php', {
        action: 'get_overview_year',
        jahr: year
    }).done(function(data) {
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
                            series[i] = {
                                name: 'Ohne Kategorie',
                                data: []
                            };
                        }
                        else {
                            series[i] = {
                                name: kategorie,
                                data: []
                            };
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
                                '<span style="color:' + this.series.color + '"> ● </span>' + this.series.name + ': <b>' + convertPreisToComma(this.point.y) + ' €</b><br/>' +
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
        }
        else {
            errorHandling(json);
        }
    });


}

function processURL() {
    var location = window.location.search;
    var stats = false;
    if (location !== null && location !== "") {
        var regYear = new RegExp("year=(\\d{4})");
        var regMonth = new RegExp("month=(\\d{1,2})");
        var year = regYear.exec(location);
        var month = regMonth.exec(location);
        if (month !== null && month.length === 2 && month[1] >= 1 && month[1] <= 12) {
            if (year !== null && year.length === 2) {
                datum.year(year[1]);
            }
            else {
                if (month[1] - 1 > datum.month()) {
                    datum.subtract(1, "year");
                }
            }
            datum.month(month[1] - 1);
        }
        stats = location.includes("statistics");
    }
    window.history.replaceState({
        "year": datum.year(),
        "month": datum.month()
    }, "", "index.php?year=" + datum.year() + "&month=" + (datum.month() + 1));

    if (loadingDone === true) {
        showEntries();
        console.log("preload already finished");
    }
    else if (loadingDone === "error") {
        holeDaten();
        console.log("preload FAILED");
    }
    if (stats) {
        showStatsView();
    }
    console.log("END processURL");
}

function errorHandling(json) {
    if (json['error'] === 'not_logged_in') {
        if (json['location']) {
            window.location = json['location'];
        }
        else {
            alert("Sie sind nicht eingeloggt");
        }
    }
    else if (json['error'] === 'server') {
        if (json['msg']) {
            alert(json['msg']);
        }
        else {
            alert("Unbekannter Server Fehler");
        }
    }
    else if (json['error'] === 'action_missing') {
        if (json['msg']) {
            alert(json['msg']);
        }
        else {
            alert("Unbekannter Server Fehler");
        }
    }
    else {
        alert("Unbekannter Fehler");
    }
}

function holeDaten(callback, ...args) {
    $.post('api.php', {
        action: 'get_month',
        month: (datum.month() + 1),
        year: datum.year()
    }).done(function(data) {
        json = JSON.parse(data);
        if (json['error'] === undefined) {
            showEntries(callback, ...args);
        }
        else {
            errorHandling(json);
        }
    });
}

function showEntries(callback, ...args) {
    if (json['jahr'] == datum.year() && json['monat'] == datum.month() + 1) {
        datenAnzeigen();
        if (callback !== undefined) {
            callback(...args);
        }
        $("#month").text(datum.format("MMMM YYYY"));
        $('#loading-screen').remove();
    }
}

function vorherigerMonat() {
    datum.subtract(1, "month");
    andererMonat();
}

function naechsterMonat() {
    datum.add(1, "month");
    andererMonat();
}

function andererMonat(callback, ...args) {
    loadingScreen();
    window.history.pushState({
        "year": datum.year(),
        "month": datum.month()
    }, "", "index.php?year=" + datum.year() + "&month=" + (datum.month() + 1));
    holeDaten(callback, ...args);
}

function loadingScreen() {
    $("#month").html('<span class="animate-spin" style="font-family: \'nsvb-symbol\'"></span> ' + datum.format("MMMM YYYY"));
    $(".ausgabe").remove();
    $('#empty').remove();
    if (!document.getElementById('loading-screen')) {
        $('#ausgaben').append($('<div>').css({
            "background-color": "#ccc"
        }).addClass('table').attr('id', 'loading-screen').append($('<div>').addClass('tr').append($('<div>').addClass('td').css({
            "font-family": "nsvb-symbol",
            "font-size": "200%"
        }).addClass('loading').append($('<span>').addClass('animate-spin').text('')))));
        $('.loading').height($(window).height() - $('header').height() - $('footer').height() - $('#table-header').height() - 11);
    }
}

function datenAnzeigen() {
    setSpendings(parseFloat(json['summeausgaben']));
    setEarnings(parseFloat(json['summeeinnahmen']));

    if (currentView === "spendings" || currentView === "earnings") {
        $(".ausgabe").remove();
        $('#empty').remove();
        var daten = currentView === "spendings" ? json['ausgaben'] : json['einnahmen'];
        if (daten.length > 0) {
            for (var x in daten) {
                var element = createRow(currentView === "spendings" ? daten[x].idausgabe : daten[x].ideinnahme, dateToLocal(daten[x].datum), (daten[x].kategorie) ? daten[x].kategorie : "", daten[x].art, (daten[x].preis.indexOf(".")) ? daten[x].preis.replace(".", ",") : daten[x].preis, (daten[x].beschreibung) ? daten[x].beschreibung : "");
                $("#ausgabenliste").append(element);
            }
        }
        else {
            showEmpty();
        }
    }
}

function showEmpty() {
    var empty = $('<div/>', {
        id: 'empty',
        class: 'vert-center'
    }).append($('<div/>', {
        class: 'text-center'
    }).append($('<span/>', {
        class: 'icon-list'
    }).css({
        'font-size': '50px'
    }))).append($('<div/>', {
        class: 'text-center',
        text: 'Keine ' + (currentView === "spendings" ? 'Ausgaben' : 'Einnahmen') + ' in diesem Monat'
    }).css({
        'font-size': '25px'
    }));

    $("#ausgaben").append(empty);
}

function editControlShowSpinner(editControl) {
    hideEditControls(editControl);
    $(editControl).append($('<div/>').addClass('change animate-spin icon-spin5'));
}

function hideEditControls(editControl) {
    console.log(editControl.childNodes);
    for (var i = 0; i < editControl.childNodes.length; i++) {
        if(editControl.childNodes[i].nodeType === 1){
            editControl.childNodes[i].style.display = "none";
        }
    }
}

function removeEntry(e) {
    var el = e.target;
    var ausgabenElement = el.parentNode.parentNode;

    editControlShowSpinner(el.parentNode);

    var preis = $(ausgabenElement).children(".preis").html();
    preis = preis.split(" ")[0];
    preis = convertPreisToPoint(preis);

    $.post('api.php', {
        action: 'delete',
        idausgabe: ausgabenElement.getAttribute("data-id")
    }).done(function(data) {
        var json = JSON.parse(data);
        if (json['error'] === undefined) {
            if (json.deleted === 'true') {
                $(ausgabenElement).on('transitionend', function() {
                    document.getElementById("ausgabenliste").removeChild(ausgabenElement);
                });
                $(ausgabenElement).addClass('remove-animation');

                addSpendings(-preis);

                if (isEmpty($('#ausgabenliste'))) {
                    showEmpty();
                }
            }
        }
        else {
            errorHandling(json);
        }
    });
}

//http://stackoverflow.com/a/6813294/1565646
function isEmpty(el) {
    return !$.trim(el.html());
}

function fehlerAnzeigen(error, id) {
    if (id !== undefined && id !== null) {
        if (error['datum'] !== undefined) {
            $('.ausgabe[data-id=' + id + '] .td-datum').append($('<div>').addClass('error').text(error['datum']) /*.append($('<div>').addClass('error-diamond'))*/ );
        }
        if (error['art'] !== undefined) {
            $('.ausgabe[data-id=' + id + '] .td-art').append($('<div>').addClass('error').text(error['art']));
        }
        if (error['preis'] !== undefined) {
            $('.ausgabe[data-id=' + id + '] .td-preis').append($('<div>').addClass('error').text(error['preis']));
        }
    }
    else {
        if (error['datum'] !== undefined) {
            $('#input .td-datum').append($('<div>').addClass('error').text(error['datum']) /*.append($('<div>').addClass('error-diamond'))*/ );
        }
        if (error['art'] !== undefined) {
            $('#input .td-art').append($('<div>').addClass('error').text(error['art']));
        }
        if (error['preis'] !== undefined) {
            $('#input .td-preis').append($('<div>').addClass('error').text(error['preis']));
        }
    }
}

function deleteError(id) {
    if (id !== undefined && id !== null) {
        $('.ausgabe[data-id=' + id + '] .error').remove();
    }
    else {
        $('#input .error').remove();
    }
}

function saveEntry() {
    var error = {};
    var showError = false;

    deleteError();

    var datumEntry = $('#input-datum').val();
    if (datumEntry === undefined || datumEntry === "") {
        error['datum'] = "Datum fehlt";
        showError = true;
    }
    else {
        var datumDB = "";
        if (datumEntry.indexOf(".") > 0) {
            datumDB = localToDate(datumEntry);
        }
        else {
            datumDB = datumEntry;
            datumEntry = dateToLocal(datumEntry);
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
    }
    else {
        var preisDB = 0;
        //TODO: ???? 
        preis = convertPreisToComma(preis);
        if (preis.indexOf(",") > 0) {
            preisDB = preis.replace(",", ".");
        }
        else {
            preisDB = preis;
            if (preis.indexOf(".") > 0) {
                preisDB = preis;
            }
        }
    }

    var beschreibung = $('#input-beschreibung').val();

    if (showError) {
        fehlerAnzeigen(error);
    }
    else {
        var entry = {};
        entry.datumDB = datumDB;
        entry.datum = datumEntry;
        entry.kategorie = kategorie;
        entry.art = art;
        entry.preisDB = preisDB;
        entry.preis = preis;
        entry.beschreibung = beschreibung;

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
            andererMonat(saveEntryRequest, entry);
        }
        else {
            saveEntryRequest(entry);
        }
    }
}

function saveEntryRequest(entry) {
    var params = {
        datum: entry.datumDB,
        art: encodeURIComponent(entry.art),
        preis: entry.preisDB,
        action: 'add',
        entrytype: currentView,
    };
    if (entry.kategorie) {
        params.kategorie = encodeURIComponent(entry.kategorie);
    }
    if (entry.beschreibung) {
        params.beschreibung = encodeURIComponent(entry.beschreibung);
    }

    $.post("api.php", params).done(function(result) {
        var json = JSON.parse(result);
        if (json['error'] === undefined) {
            //remove empty view if visible
            $('#empty').remove();
            var element = createRow(json['id'], entry.datum, entry.kategorie, entry.art, entry.preis, entry.beschreibung);
            element.className += " new";
            //TODO: insert new Ausgabe at the appropriate position
            document.getElementById("ausgabenliste").appendChild(element);
            $('.ausgabe[data-id=' + json['id'] + ']')[0].scrollIntoView();

            if (json['entrytype'] === 'earnings') {
                addEarnings(entry.preisDB);
            }
            else {
                addSpendings(entry.preisDB);
            }

            clearInput();

            entry = {};
        }
        else {
            errorHandling(json);
        }
    });
}

function clearInput() {
    $('#input-datum, #input-kategorie, #input-art, #input-preis, #input-beschreibung').val("");
    $('#input-datum').focus();
}

/**
 * @param float preis Preis der hinzugefügt werden soll, negative Werte zum abziehen
 */
function addSpendings(preis) {
    var amount = parseFloat(document.querySelector("#spendings").getAttribute("data-amount"));
    amount += parseFloat(preis); //TODO why parseFloat? 
    setSpendings(amount);
}

function setSpendings(amount) {
    $('#spendings').html("Ausgaben " + Math.round(amount) + " €");
    document.querySelector("#spendings").setAttribute("data-amount", amount);
}

function addEarnings(preis) {
    var amount = parseFloat(document.querySelector("#earnings").getAttribute("data-amount"));
    amount += parseFloat(preis); //TODO why parseFloat? 
    setEarnings(amount);
}

function setEarnings(amount) {
    $('#earnings').html("Einnahmen " + Math.round(amount) + " €");
    document.querySelector("#earnings").setAttribute("data-amount", amount);
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

    //var row = $("<div/>").addClass("ausgabe").attr("data-id", id);
    //var datum = $("<div/>").addClass()

    var html = `
<div class="td td-datum">${datum}</div>
<div class="td td-kategorie">${kategorie}</div>
<div class="td td-art">${art}</div>
<div class="preis td td-preis">${preis} &euro;</div>
<div class="td td-beschreibung">${beschreibung}</div>
<div class="td td-optionen">
    <div class="edit icon-pencil"></div><div class="remove icon-trash"></div>
</div>`;

    var element = document.createElement("div");
    element.setAttribute("data-id", id);
    element.className = "tr ausgabe";
    element.innerHTML = html;
    element.getElementsByClassName("remove")[0].addEventListener("click", removeEntry, false);
    element.getElementsByClassName("edit")[0].addEventListener("click", editEntry, false);
    return element;
}

function editEntry(e) {
    var el = e.target;
    var ausgabenElement = el.parentNode.parentNode;

    hideEditControls(el.parentNode);

    var update = document.createElement("div");
    update.addEventListener("click", updateEntry, "false");
    update.className = "update icon-ok";

    var cancel = document.createElement("div");
    cancel.addEventListener("click", cancelEditEntry, "false");
    cancel.className = "cancel icon-cancel";

    el.parentNode.appendChild(update);
    el.parentNode.appendChild(cancel);

    for (var i = 0; i < (ausgabenElement.childNodes.length - 1); i++) {
        if (ausgabenElement.childNodes[i].nodeType === 1 && ausgabenElement.childNodes[i].className.includes("td")) {
            if (ausgabenElement.childNodes[i].classList.contains('preis')) {
                //Preis von €-Zeichen trennen
                var preis = ausgabenElement.childNodes[i].innerHTML.split(' ')[0];
                preis = convertPreisToPoint(preis);
                ausgabenElement.childNodes[i].setAttribute('data-input', preis);
                ausgabenElement.childNodes[i].innerHTML = '<input size="10" class="preis" placeholder="Preis" type="number" min="0.01" step="0.01" value="' + preis + '"><span class="input-suffix">&euro;</span>';
            }
            else {
                var input = ausgabenElement.childNodes[i].innerHTML;
                ausgabenElement.childNodes[i].setAttribute('data-input', input);
                ausgabenElement.childNodes[i].innerHTML = '<input type="text" value="' + input + '">';
            }
        }
    }
    ausgabenElement.classList.add("tr-edit");
}

function cancelEditEntry(e) {
    var el = e.target;
    var parent = el.parentNode;
    parent.removeChild(parent.getElementsByClassName("update")[0]);
    parent.removeChild(parent.getElementsByClassName("cancel")[0]);

    reAddEditControls(parent.parentNode);

    var ausgabenElement = parent.parentNode;
    for (var i = 0; i < (ausgabenElement.childNodes.length - 1); i++) {
        if (ausgabenElement.childNodes[i].className.includes("td")) {
            var text = ausgabenElement.childNodes[i].getAttribute('data-input');
            $(ausgabenElement.childNodes[i]).children('input').remove();
            if (ausgabenElement.childNodes[i].classList.contains('preis')) {
                $(ausgabenElement.childNodes[i]).children('span').remove();
                $(ausgabenElement.childNodes[i]).html(convertPreisToComma(text) + ' €');
            }
            else {
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

    editControlShowSpinner(parent);

    var ausgabenElement = parent.parentNode;
    var idausgabe = $(ausgabenElement).attr('data-id');
    deleteError(idausgabe);

    var params = {};

    if ($(ausgabenElement).children('.td-datum').attr('data-input') !== $(ausgabenElement).children('.td-datum').children('input').val()) {
        var datumAusgabe = $(ausgabenElement).children('.td-datum').children('input').val();
        if (datumAusgabe === undefined || datumAusgabe === "") {
            error['datum'] = "Datum fehlt";
            showError = true;
        }
        else {
            var datumDB = "";
            if (datumAusgabe.indexOf(".") > 0) {
                datumDB = localToDate(datumAusgabe);
            }
            else {
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
        }
        else {
            params.art = encodeURIComponent(art);
        }
    }

    if ($(ausgabenElement).children('.td-preis').attr('data-input') !== $(ausgabenElement).children('.td-preis').children('input').val()) {
        var preis = $(ausgabenElement).children('.td-preis').children('input').val();
        if (preis === undefined || preis === "") {
            error['preis'] = "Preis fehlt";
            showError = true;
        }
        else {
            var preisDB = 0;
            if (preis.indexOf(",") > 0) {
                preisDB = preis.replace(",", ".");
            }
            else {
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
        reAddEditControls(ausgabenElement);
    }
    else {
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
                        if (ausgabenElement.childNodes[i].nodeType === 1 && ausgabenElement.childNodes[i].className.includes("td")) {
                            var text = $(ausgabenElement.childNodes[i]).children('input').val();
                            $(ausgabenElement.childNodes[i]).children('input').remove();
                            if (ausgabenElement.childNodes[i].classList.contains('preis')) {
                                $(ausgabenElement.childNodes[i]).children('span').remove();
                                $(ausgabenElement.childNodes[i]).html(convertPreisToComma(text) + ' €');
                            }
                            else {
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

                    reAddEditControls(ausgabenElement);
                }
            }
            else {
                reAddEditControls(ausgabenElement);
                errorHandling(json);
            }
        });
    }
}

function reAddEditControls(ausgabenElement) {
    $(ausgabenElement).children('.td-optionen').children('.change').remove();
    $(ausgabenElement).children('.td-optionen').children().css('display', '');
    ausgabenElement.classList.remove("tr-edit");
}

function prettifyDate() {
    let inDate = $("#input-datum").val();
    let splitChar;
    if (inDate.indexOf(".") > 0 && inDate.indexOf(",") === -1) {
        splitChar = ".";
    }
    else if (inDate.indexOf(",") > 0 && inDate.indexOf(".") === -1) {
        splitChar = ",";
    }
    else {
        return;
    }
    if (inDate.length >= 3) {
        if (occurrences(inDate, splitChar) === 1) {
            let outDate = moment(inDate, "D" + splitChar + "M").year(moment().year()).format("DD.MM.YYYY");
            $("#input-datum").val(outDate);
        }
        else if (occurrences(inDate, splitChar) === 2) {
            let tempDate = moment(inDate, "D" + splitChar + "M" + splitChar + "YYYY");
            if (tempDate.year() == 0) {
                tempDate.year(moment().year());
            }
            let outDate = tempDate.format("DD.MM.YYYY");
            $("#input-datum").val(outDate);
        }
    }
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
    }
    else {
        preis += ',00';
    }
    return preis;
}

/** Function count the occurrences of substring in a string;
 * @param {String} string   Required. The string;
 * @param {String} subString    Required. The string to search for;
 * @param {Boolean} allowOverlapping    Optional. Default: false;
 * @author Vitim.us http://stackoverflow.com/questions/4009756/how-to-count-string-occurrence-in-string/7924240#7924240
 */
function occurrences(string, subString, allowOverlapping) {

    string += "";
    subString += "";
    if (subString.length <= 0) return (string.length + 1);

    var n = 0,
        pos = 0,
        step = allowOverlapping ? 1 : subString.length;

    while (true) {
        pos = string.indexOf(subString, pos);
        if (pos >= 0) {
            ++n;
            pos += step;
        }
        else break;
    }
    return n;
}
