"use strict";
/*global moment*/
/*global Highcharts*/
/*global $*/

if (!String.prototype.includes) {
    String.prototype.includes = function (s) {
        return this.indexOf(s) > -1
    }
}

/* http://stackoverflow.com/a/16771535/1565646 */
var getScrollbarWidth = function () {
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
var pendingUpdate = false;
var dataDirty = false;

var openMenuID = '';
var additionalChartsCache = []; // shared across all years
var searchData = {ausgaben: [], einnahmen: []};
var keyboardFocusedIndex = -1;
var kbFocusedBeforeEdit = -1;

$(document).ready(function () {
    mainLoaded = true;

    window.visualViewport.addEventListener("resize", ev => {
        if (pendingUpdate) {
            return;
        }
        pendingUpdate = true;

        requestAnimationFrame(() => {
            pendingUpdate = false;
            let content = document.querySelector('#content');
            if (content) {
                let viewport = ev.target;
                content.style.height = viewport.height + "px";
                console.log("Viewport Height " + viewport.height);
            }
        });
    });

    window.visualViewport.addEventListener("scroll", ev => {
        requestAnimationFrame(() => {
            window.scroll({
                top: 0,
                left: 0,
                behavior: 'instant'
            });
        });
    });

    document.querySelectorAll("input").forEach(el => {
        // https://gist.github.com/kiding/72721a0553fa93198ae2bb6eefaa3299
        el.addEventListener("focus", ev => {
            requestAnimationFrame(() => {
                el.style.opacity = 0;
                setTimeout(() => el.style.opacity = 1, 10);
            });
        });
    });

    $("#next-month").click(naechsterMonat);
    $("#previous-month").click(vorherigerMonat);
    $("#switch-to-stats").click(showStatsView);
    $("#switch-to-trash").click(showTrashView);
    $("#switch-to-search").click(function() { showSearchView(); });
    $("#input-form").submit(function (e) {
        saveEntry();
        e.preventDefault();
    });
    $("#input-form").on('focusin', 'input', function() {
        clearKeyboardFocus();
    });
    $("#spendings").click(function () {
        $("#earnings").removeClass("active");
        $("#spendings").addClass("active");
        switchView("spendings");
    });
    $("#earnings").click(function () {
        $("#spendings").removeClass("active");
        $("#earnings").addClass("active");
        switchView("earnings");
    });

    document.querySelector('#menu').addEventListener('click', ev => {
        document.body.addEventListener('click', closeMenu);
        openMenuID = 'menu-overlay';
        document.querySelector('#menu-overlay').style.setProperty('display', 'block');
        ev.stopPropagation();
    });

    if (!hasWebkitDatepicker('#datepicker')) {
        $("#opendatepicker").css('display', 'inline-block');
    }
    $("#opendatepicker").click(function () {
        $("#datepicker").focus().click();
    });
    $("#datepicker").change(function () {
        $("#input-datum").val($("#datepicker").val());
        prettifyDate()
    });
    $("#input-datum").change(function () {
        prettifyDate();
        let datestring = $("#input-datum").val();
        datestring = moment(datestring, "D.M.YYYY").format("YYYY-MM-DD");
        $("#datepicker").val(datestring);
    });
    $("#input-preis").change(e => formatPreisInput(e.target));

    var scrollbarWidth = getScrollbarWidth();
    $("#ausgabenliste-header").css("padding-right", scrollbarWidth);
    $("#input").css("padding-right", scrollbarWidth);
    $(window).on('popstate', back);
    processURL();

    // Account selection dropdown initialization
    $.post('api.php', { action: 'get_accounts' }).done(function (resp) {
        if (resp.error !== undefined) {
            console.error('Error fetching accounts:', resp.error);
            return;
        }
        var accounts = resp.accounts;
        var current = resp.current;
        var $overlay = $('#konto-selection-overlay');
        $overlay.children().filter(':not(#konto-selection-overlay-close)').remove();
        var currentName = '';
        accounts.forEach(function(acc) {
            var $item = $('<div>')
                .addClass('konto-item')
                .attr('data-id', acc.idkonto)
                .text(acc.name);
            if (acc.idkonto == current) {
                $item.addClass('active');
                currentName = acc.name;
            }
            $overlay.append($item);
        });
        if (currentName) {
            $('#konto-name').text(currentName);
        }
    });

    // Show/hide account selection overlay
    $('#konto-selection').click(function(ev) {
        ev.stopPropagation();
        $('#konto-selection-overlay').css('display', 'block');
    });

    // Hide overlay on outside click
    $(document).click(function() {
        $('#konto-selection-overlay').css('display', 'none');
    });

    $('#konto-selection-overlay-close').click(function (ev) {
        ev.stopPropagation();
        $('#konto-selection-overlay').css('display', 'none');
    });

    // Handle account selection
    $('#konto-selection-overlay').on('click', '.konto-item', function(ev) {
        ev.stopPropagation();
        var id = $(this).data('id');
        var name = $(this).text();
        $.post('api.php', {action: 'set_account', kontoid: id}).done(function(resp) {
            if (resp.error !== undefined) {
                console.error('Error setting account:', resp.error);
                return;
            }
            $('#konto-name').text(name);
            $('#konto-selection-overlay').css('display', 'none');
            $('#konto-selection-overlay .konto-item').removeClass('active');
            $(`#konto-selection-overlay .konto-item[data-id="${id}"]`).addClass('active');
            holeDaten();
        });
    });

    // Clear keyboard row focus on any UI click
    document.addEventListener('click', function() {
        clearKeyboardFocus();
    });

    // ── Keyboard navigation for the main list ──────────────────────────────
    document.addEventListener('keydown', function(e) {
        // Only active when the main data view is visible
        if ($('#content').css('display') === 'none') return;

        var activeEl = document.activeElement;
        var isInNewEntryForm = !!(activeEl && $(activeEl).closest('#input-form').length);

        // When any row is being edited, block all navigation.
        // Also handle ESC here in case focus has left the row.
        var editingRow = document.querySelector('#ausgabenliste .ausgabe.tr-edit');
        if (editingRow) {
            if (e.key === 'Escape') {
                e.preventDefault();
                var cancelBtn = editingRow.querySelector('.cancel');
                if (cancelBtn) cancelBtn.click();
            }
            return;
        }

        // When focus is inside the new-entry form, only intercept ArrowUp and Escape
        if (isInNewEntryForm) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                var rows = getListRows();
                if (rows.length > 0) {
                    activeEl.blur();
                    setKeyboardFocus(rows.length - 1);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                activeEl.blur();
            }
            return;
        }

        // ── Free navigation (no input focused) ──
        var rows = getListRows();

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (rows.length === 0) {
                    $('#input-datum').focus();
                } else if (keyboardFocusedIndex === -1) {
                    setKeyboardFocus(0);
                } else if (keyboardFocusedIndex < rows.length - 1) {
                    setKeyboardFocus(keyboardFocusedIndex + 1);
                } else {
                    // past last item → jump to new-entry form
                    clearKeyboardFocus();
                    $('#input-datum').focus();
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (keyboardFocusedIndex > 0) {
                    setKeyboardFocus(keyboardFocusedIndex - 1);
                } else if (keyboardFocusedIndex === -1 && rows.length > 0) {
                    setKeyboardFocus(rows.length - 1);
                }
                // at first item → stay there
                break;

            case 'Enter':
                if (keyboardFocusedIndex !== -1) {
                    e.preventDefault();
                    var row = rows[keyboardFocusedIndex];
                    var editBtn = row ? row.querySelector('.edit') : null;
                    if (editBtn) {
                        kbFocusedBeforeEdit = keyboardFocusedIndex;
                        clearKeyboardFocus();
                        editBtn.click();
                    }
                }
                break;

            case 'Backspace':
            case 'Delete':
                if (keyboardFocusedIndex !== -1) {
                    e.preventDefault();
                    var savedIndex = keyboardFocusedIndex;
                    var rowToDelete = rows[savedIndex];
                    if (rowToDelete) {
                        clearKeyboardFocus();
                        rowToDelete.querySelector('.remove').click();
                        // Restore focus after the 1.5 s removal animation
                        setTimeout(function() {
                            var newRows = getListRows();
                            if (newRows.length > 0) {
                                setKeyboardFocus(Math.min(savedIndex, newRows.length - 1));
                            }
                        }, 1600);
                    }
                }
                break;

            case 'ArrowLeft':
                e.preventDefault();
                vorherigerMonat();
                break;

            case 'ArrowRight':
                e.preventDefault();
                naechsterMonat();
                break;

            case 'a':
            case 'A':
                e.preventDefault();
                $("#earnings").removeClass("active");
                $("#spendings").addClass("active");
                switchView("spendings");
                break;

            case 'e':
            case 'E':
                e.preventDefault();
                $("#spendings").removeClass("active");
                $("#earnings").addClass("active");
                switchView("earnings");
                break;
        }
    });
});

function getListRows() {
    return Array.from(document.querySelectorAll('#ausgabenliste .ausgabe'));
}

function setKeyboardFocus(index) {
    var rows = getListRows();
    rows.forEach(function(r) { r.classList.remove('tr-kb-focus'); });
    if (index >= 0 && index < rows.length) {
        keyboardFocusedIndex = index;
        rows[index].classList.add('tr-kb-focus');
        rows[index].scrollIntoView({ block: 'nearest' });
    } else {
        keyboardFocusedIndex = -1;
    }
}

function clearKeyboardFocus() {
    var rows = getListRows();
    rows.forEach(function(r) { r.classList.remove('tr-kb-focus'); });
    keyboardFocusedIndex = -1;
}

function closeMenu(ev) {
    if (ev.target.id != openMenuID) {
        document.body.removeEventListener('click', closeMenu);
        openMenuID = '';
        document.querySelector('#menu-overlay').style.removeProperty('display');
    }
}

function switchView(view) {
    if (currentView !== view) {
        currentView = view;
        datenAnzeigen();
        /*if(currentView === "earnings"){
         $('.edit').css('display', 'none');
         } else {*/
        $('.edit').css('display', '');
        //}
    }
}

function back(e) {
    var state = e.originalEvent.state;
    if (state !== null && state.year !== undefined && state.month !== undefined) {
        datum.year(state.year).month(state.month);
    } else {
        datum = moment();
    }
    if (state !== null && state.statistics !== undefined) {
        showStatsView();
    } else if (state !== null && state.search !== undefined) {
        showSearchView(typeof state.query === 'string' ? state.query : undefined);
    } else {
        showDataView();
        loadingScreen();
    }
    holeDaten();
}

function showDataView() {
    clearKeyboardFocus();
    if (dataDirty) {
        loadingScreen();
        holeDaten(function () {
            dataDirty = false;
        });
    }

    let newElements = document.getElementById("ausgabenliste").querySelectorAll(".tr.ausgabe.new");
    for (let i = 0; i < newElements.length; i++) {
        newElements[i].classList.remove("new");
    }
    $('#overlay').css('display', 'none');
    $('#content').css('display', '');
    window.history.pushState({
        "year": datum.year(),
        "month": datum.month()
    }, "", "index.php?year=" + datum.year() + "&month=" + (datum.month() + 1));
}

function showStatsView() {
    $('#content').css('display', 'none');
    let overlay = $('#overlay');
    overlay.empty();
    createStatsElements();
    overlay.css('display', 'flex');
    window.history.pushState({
        "year": datum.year(),
        "month": datum.month(),
        "statistics": ""
    }, "", "index.php?year=" + datum.year() + "&month=" + (datum.month() + 1) + "&statistics");
    overlayCharts();
}

// Show search view overlay
function showSearchView(query) {
    if (typeof query !== 'string') {
        query = '';
    }
    $('#content').css('display', 'none');
    let overlay = $('#overlay');
    overlay.empty();
    overlaySearch(query);
    overlay.css('display', 'flex');
    var searchUrl = "index.php?year=" + datum.year() + "&month=" + (datum.month() + 1) + "&search=" + encodeURIComponent(query);
    window.history.pushState({
        year: datum.year(),
        month: datum.month(),
        search: true,
        query: query
    }, "", searchUrl);
}

function overlaySearch(initialQuery) {
    let tabBar = $('<div id="search-navbar" class="bar"></div>');
    let subBar = $('<div class="bar-sub"></div>');
    let searchIconBar = $('<bar class="bar-element icon-search"></bar>')
    var $tabs = $('<div id="search-tabs" class="bar-collection"></div>');
    let closeButton = $('<bar id="overlay-close" class="bar-element">&times;</bar>');

    // top search input in navbar
    let searchInputWrapper = $('<div class="bar-collection"></div>').css("flex-grow", "1");
    let $searchInput = $('<input id="search-input" type="search" placeholder="Suche nach Art...">');
    searchInputWrapper.append($searchInput);

    subBar.append(searchInputWrapper);
    tabBar.append(searchIconBar).append(subBar).append(closeButton);

    $('#overlay').append(tabBar).append('<section id="search-section"></section>')
    $("#overlay-close").click(showDataView);

    if (initialQuery) {
        $searchInput.val(initialQuery);
    }

    // debounce helper
    function debounce(fn, delay) {
        let t;
        return function() {
            const args = arguments;
            clearTimeout(t);
            t = setTimeout(function() { fn.apply(null, args); }, delay);
        };
    }

    function renderResults(data) {
        // clear search-section
        $('#search-section').empty();

        // store data for edit lookups
        searchData.ausgaben = data.ausgaben || [];
        searchData.einnahmen = data.einnahmen || [];

        var hasAus = data.ausgaben && data.ausgaben.length > 0;
        var hasEin = data.einnahmen && data.einnahmen.length > 0;

        if (!hasAus && !hasEin) {
            // show single no-results message inside search-section
            $('#search-section').append($('<div class="no-results">').text('Keine Treffer'));
            return;
        }

        const headerHtml = `
            <div class="th">
                <div class="td td-datum">Datum</div>
                <div class="td td-kategorie">Kategorie</div>
                <div class="td td-art">Art</div>
                <div class="td td-preis">Preis</div>
                <div class="td td-beschreibung">Beschreibung</div>
                <div class="td td-optionen"></div>
            </div>`;

        if (hasAus) {
            $('#search-section').append(`
                <div id="search-ausgaben" class="search-block">
                    <h3>Ausgaben</h3>
                    ${headerHtml}
                    <div id="search-results-ausgaben" class="search-rows"></div>
                </div>
            `);
            let ausContainer = $('#search-results-ausgaben');
            data.ausgaben.forEach(function(item) {
                var element = document.createElement('div');
                element.className = 'tr ausgabe';
                element.setAttribute('data-id', item.idausgabe);
                element.setAttribute('data-type', 'ausgabe');
                element.innerHTML =
                    '<div class="td td-datum">' + dateToLocal(item.datum) + '</div>' +
                    '<div class="td td-kategorie">' + (item.kategorie || '') + '</div>' +
                    '<div class="td td-art">' + item.art + '</div>' +
                    '<div class="preis td td-preis">' + formatPreis(item.preis) + '</div>' +
                    '<div class="td td-beschreibung">' + (item.beschreibung || '') + '</div>' +
                    '<div class="td td-optionen"><div class="edit icon-pencil"></div></div>';
                element.getElementsByClassName('edit')[0].addEventListener('click', editEntry, false);
                ausContainer.append(element);
            });
        }

        if (hasEin) {
            $('#search-section').append(`
                <div id="search-einnahmen" class="search-block">
                    <h3>Einnahmen</h3>
                    ${headerHtml}
                    <div id="search-results-einnahmen" class="search-rows"></div>
                </div>
            `);
            let einContainer = $('#search-results-einnahmen');
            data.einnahmen.forEach(function(item) {
                var element = document.createElement('div');
                element.className = 'tr ausgabe';
                element.setAttribute('data-id', item.ideinnahme);
                element.setAttribute('data-type', 'einnahme');
                element.innerHTML =
                    '<div class="td td-datum">' + dateToLocal(item.datum) + '</div>' +
                    '<div class="td td-kategorie">' + (item.kategorie || '') + '</div>' +
                    '<div class="td td-art">' + item.art + '</div>' +
                    '<div class="preis td td-preis">' + formatPreis(item.preis) + '</div>' +
                    '<div class="td td-beschreibung">' + (item.beschreibung || '') + '</div>' +
                    '<div class="td td-optionen"><div class="edit icon-pencil"></div></div>';
                element.getElementsByClassName('edit')[0].addEventListener('click', editEntry, false);
                einContainer.append(element);
            });
        }
    }

    function doSearch(q) {
        if (!q || q.trim() === '') {
            $('#search-section').empty();
            return;
        }
        $.post('api.php', {action: 'search', q: q}).done(function(resp) {
            try {
                var data = JSON.parse(resp);
                if (data.error !== undefined) {
                    errorHandling(data);
                } else {
                    renderResults(data);
                }
            } catch (e) {
                console.error('Invalid search response', e, resp);
            }
        });
    }

    var debounced = debounce(function(e) {
        var q = e.target.value;
        doSearch(q);
        var url = "index.php?year=" + datum.year() + "&month=" + (datum.month() + 1) + "&search=" + encodeURIComponent(q);
        window.history.replaceState({
            year: datum.year(),
            month: datum.month(),
            search: true,
            query: q
        }, "", url);
    }, 300);
    $searchInput.on('input', debounced);

    if (initialQuery) {
        doSearch(initialQuery);
    }
}

function createStatsElements() {
    const htmlString = `
        <div id="stats-navbar" class="bar">
            <div id="select-mobile">
                <select></select>
            </div>
            <div class="bar-sub">
                <div id="stats-tabs" class="bar-collection">
                </div>
            </div>
            <bar id="overlay-close" class="bar-element">×</bar>
        </div>
        <div id="overlay-content">
            <div class="flex-row">
                <div id="select"></div>
                <div id="stats-wrapper">
                    <div>
                        <div id="details">Details &#8594;</div>
                    </div>
                    <div id="stats">
                        <div class="chart"></div>
                        <div id="additional-charts"></div>
                        <div class="hidden" id="add-chart">
                            <div id="chart-category-select">
                                Weitere Diagramme:
                                <select></select>
                            </div>
                            <div id="chart-category-add" class="bar-element">
                                Hinzufügen
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.querySelector('#overlay').innerHTML = htmlString;
    $("#overlay-close").click(showDataView);
    $('#chart-category-add').click(addChart);
}


// Show trashed items view (Papierkorb)
function showTrashView() {
    $('#content').css('display', 'none');
    let overlay = $('#overlay');
    overlay.empty();
    overlayTrash();
    overlay.css('display', 'flex');
    window.history.pushState({
        year: datum.year(),
        month: datum.month(),
        trash: true
    }, "", "index.php?year=" + datum.year() + "&month=" + (datum.month() + 1) + "&trash");
}
// Load and display trash items in overlay
function overlayTrash() {
    let tabBar = $('<div id="trash-navbar" class="bar"></div>');

    let subBar = $('<div class="bar-sub"></div>');
    let trashIconBar = $('<bar class="bar-element icon-trash"></bar>')
    var $tabs = $('<div id="trash-tabs" class="bar-collection"></div>');
    var $tabA = $('<bar id="tab-ausgaben" class="bar-element merge-start active">Ausgaben</bar>');
    var $tabE = $('<bar id="tab-einnahmen" class="bar-element merge-end">Einnahmen</bar>');

    let closeButton = $('<bar id="overlay-close" class="bar-element">&times;</bar>');

    $tabs.append($tabA).append($tabE);
    subBar.append($tabs);
    tabBar.append(trashIconBar).append(subBar).append(closeButton);
    $('#overlay').append(tabBar).append('<section id="trash-section"></section>')
    $("#overlay-close").click(showDataView);

    // Fetch trashed entries
    $.post('api.php', {action: 'get_trashed'}).done(function(data) {
        var jsonTrash = JSON.parse(data);
        if (jsonTrash.error) {
            console.error('Error fetching trash:', jsonTrash.msg);
            $('#trash-list').append($('<div>').text('Fehler beim Laden des Papierkorbs'));
            return;
        }
        window.trashData = jsonTrash;
        renderTrashList('ausgaben');
    });
    $tabE.click(function() {
        $('#trash-tabs .bar-element').removeClass('active');
        $(this).addClass('active');
        renderTrashList('einnahmen');
    });
    $tabA.click(function() {
        $('#trash-tabs .bar-element').removeClass('active');
        $(this).addClass('active');
        renderTrashList('ausgaben');
    });
}
// Render trashed entries list for given type
function renderTrashList(type) {
    let items = window.trashData[type] || [];
    let section = $('#trash-section');
    // Header
    var $header = $('<div class="th"></div>');
    $header.append('<div class="td td-datum">Datum</div>');
    $header.append('<div class="td td-kategorie">Kategorie</div>');
    $header.append('<div class="td td-art">Art</div>');
    $header.append('<div class="td td-preis">Preis</div>');
    $header.append('<div class="td td-beschreibung">Beschreibung</div>');
    $header.append('<div class="td td-optionen">Optionen</div>');
    section.append($header).append($('<div id="trash-list"></div>'));
    let list = $('#trash-list');
    if (items.length === 0) {
        list.append($('<div id="empty">').text('Kein Eintrag im Papierkorb für ' + (type === 'einnahmen' ? 'Einnahmen' : 'Ausgaben')));
        return;
    }
    items.forEach(function(item) {
        var idField = (type === 'einnahmen' ? 'ideinnahme' : 'idausgabe');
        var $row = $('<div class="tr ausgabe"></div>').attr('data-id', item[idField]);
        $row.append('<div class="td td-datum">' + dateToLocal(item.datum) + '</div>');
        $row.append('<div class="td td-kategorie">' + (item.kategorie || '') + '</div>');
        $row.append('<div class="td td-art">' + item.art + '</div>');
        $row.append('<div class="td td-preis">' + formatPreis(item.preis) + '</div>');
        $row.append('<div class="td td-beschreibung">' + (item.beschreibung || '') + '</div>');
        var $opt = $('<div class="td td-optionen"></div>');
        var $btn = $('<div class="restore icon-ccw" title="Wiederherstellen"></div>');
        $btn.click(function() {
            $.post('api.php', {action: 'restore', type: type, id: item[idField]}).done(function(resp) {
                var jr = JSON.parse(resp);
                if (jr.error) {
                    alert('Fehler: ' + jr.msg);
                } else {
                    $row.remove();
                    dataDirty = true;
                }
            });
        });
        $opt.append($btn);
        $row.append($opt);
        list.append($row);
    });
}

function overlayCharts() {
    $.post('api.php', {
        action: 'get_sum_months'
    }).done(function (data) {
        var json = JSON.parse(data);
        if (json['error'] === undefined) {
            if (json.ausgaben) {
                $('#select').children().remove();
                $('#select-mobile > select').children().remove();
                var ausgaben = json.ausgaben;

                let yearlySums = {};
                ausgaben.forEach(entry => {
                    let year = entry.jahr;
                    let preis = parseFloat(entry.preis); // Convert preis to a number
                    if (!yearlySums[year]) {
                        yearlySums[year] = 0;
                    }
                    yearlySums[year] += preis;
                });

                var currentYear = 0;
                for (var x in ausgaben) {
                    var tempDate = moment([ausgaben[x].jahr, ausgaben[x].monat - 1]);
                    if (currentYear === 0 || currentYear > tempDate.year()) {
                        currentYear = tempDate.year();
                        overlayAddSelect(currentYear, currentYear, formatPreis(Math.floor(yearlySums[currentYear]), false));
                    }
                    overlayAddSelect(tempDate.format('MMMM'), currentYear,formatPreis(Math.floor(ausgaben[x].preis), false), tempDate.month() + 1);
                }
                $('#select .select-element').first().addClass('active');
                $('#select-mobile > select > optgroup').first().children('option').first().attr('selected', 'selected');

                //change listener on select element for mobile
                //TODO: change active element in desktop version and vice versa
                $('#select-mobile > select').change(function (e) {
                    var optionSelected = $(this).find("option:selected");
                    if ($(optionSelected).attr('data-month') != null) {
                        monthChart($(optionSelected).attr('data-month'), $(optionSelected).attr('data-year'));
                    } else {
                        yearChart($(optionSelected).attr('data-year'));
                    }

                });

                $.post('api.php', {
                    action: 'get_categories',
                    mincount: 2
                }).done(function (data) {
                    let json = JSON.parse(data);
                    if (json['error'] === undefined) {
                        if (json.kategorien) {
                            let categorySelect = $('#chart-category-select > select');
                            for (let kategorie of json.kategorien) {
                                if (kategorie === null) {
                                    kategorie = "Ohne Kategorie"
                                }
                                categorySelect.append($('<option>').html(kategorie).attr('data-category', kategorie));
                            }
                        }
                    } else {
                        // TODO show error message instead of select box
                    }
                });

                //TODO: load chart from selected category
                if (ausgaben.length > 0) {
                    yearChart(ausgaben[0].jahr);
                    $('#add-chart').removeClass('hidden');
                }
            }
        } else {
            errorHandling(json);
        }
    });
}

function overlayAddSelect(label, year, spendings, month) {
    if (month === undefined) { // year chart
        $('#select').append($('<div>').addClass('select-element year').html(label).append($('<div>').addClass('right').html(spendings)).attr('data-year', year).click(function (e) {
            $('#select').children().removeClass('active');
            $(e.currentTarget).addClass('active');
            yearChart($(e.currentTarget).attr('data-year'));
            $('#add-chart').removeClass('hidden');
        }));
        $('#select-mobile > select').append($('<optgroup>').attr('label', label));
        $('#select-mobile > select > optgroup[label="' + label + '"]').append($('<option>').html('Übersicht ' + label + ' - ' + spendings).attr('data-year', year));
    } else { // month chart
        $('#select').append($('<div>').addClass('select-element').html(label).append($('<div>').addClass('right').html(spendings)).attr('data-month', month).attr('data-year', year).click(function (e) {
            $('#select').children().removeClass('active');
            $(e.currentTarget).addClass('active');
            monthChart($(e.currentTarget).attr('data-month'), $(e.currentTarget).attr('data-year'));
            $('#add-chart').addClass('hidden');
        }));
        $('#select-mobile > select > optgroup[label="' + year + '"]').append($('<option>').html(label + ' - ' + spendings).attr('data-month', month).attr('data-year', year));
    }
}

function addChart() {
    let yearEl = $('.select-element.year.active');
    if (yearEl.length > 0) {
        let category = $('#chart-category-select > select option:selected').attr('data-category');
        let currentYear = yearEl.attr('data-year');
        if (additionalChartsCache.indexOf(category) === -1) {
            additionalChartsCache.push(category);
            renderSingleAdditionalChart(currentYear, category);
        }
    }
}

function renderAdditionalCharts(year) {
    $('#additional-charts').empty();
    for (var i = 0; i < additionalChartsCache.length; i++) {
        renderSingleAdditionalChart(year, additionalChartsCache[i]);
    }
}

function renderSingleAdditionalChart(year, category) {
    var postCategory = category === "Ohne Kategorie" ? "null" : category;
    $.post('api.php', {
        action: 'get_overview_year_category',
        jahr: year,
        kategorie: postCategory
    }).done(function (data) {
        let json = JSON.parse(data);
        if (json['error'] === undefined) {
            if (json.ausgaben) {
                let ausgaben = json.ausgaben;
                let series = [{
                    name: category,
                    data: []
                }];
                for (let x in ausgaben) {
                    series[0].data[ausgaben[x].monat - 1] = parseFloat(ausgaben[x].preis);
                }
                for (let i = 0; i < 12; i++) {
                    if (series[0].data[i] === undefined || series[0].data[i] === null) {
                        series[0].data[i] = 0;
                    }
                }

                let wrapper = $('<div>').addClass('additional-chart-wrapper').attr('data-category', category);
                let closeBtn = $('<button>').addClass('additional-chart-close').html('&times;').click(function () {
                    additionalChartsCache = additionalChartsCache.filter(function (c) { return c !== category; });
                    wrapper.remove();
                });
                let chartDiv = $('<div>').addClass('chart');
                wrapper.append(closeBtn).append(chartDiv);
                $('#additional-charts').append(wrapper);

                new Highcharts.Chart({
                    chart: {
                        renderTo: chartDiv[0],
                        type: 'column'
                    },
                    title: {
                        text: category
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
                        formatter: function () {
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
        } else {
            errorHandling(json);
        }
    });
}

function monthChart(month, year) {
    $('#stats > .chart').empty();
    $('#additional-charts').empty();
    $.post('api.php', {
        action: 'get_overview_month',
        monat: month,
        jahr: year
    }).done(function (data) {
        var json = JSON.parse(data);
        if (json['error'] === undefined) {
            if (json.ausgaben) {
                var ausgaben = json.ausgaben;

                var data = [];

                for (var x in ausgaben) {
                    data[x] = [];
                    if (ausgaben[x].kategorie === null || ausgaben[x].kategorie === "") {
                        data[x][0] = 'Ohne Kategorie';
                    } else {
                        data[x][0] = ausgaben[x].kategorie.trim();
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
    var spendingsReq = $.post('api.php', {
        action: 'get_overview_year',
        jahr: year
    });
    var earningsReq = $.post('api.php', {
        action: 'get_overview_year_earnings',
        jahr: year
    });
    $.when(spendingsReq, earningsReq).done(function (spendingsResponse, earningsResponse) {
        var json = JSON.parse(spendingsResponse[0]);
        var earningsJson = JSON.parse(earningsResponse[0]);
        if (json['error'] === undefined) {
            if (json.ausgaben) {
                var ausgaben = json.ausgaben;
                var kategorie = undefined;
                var i = -1;
                var series = [];
                for (var x in ausgaben) {
                    let newKategorie = ausgaben[x].kategorie;
                    if (newKategorie !== null) {
                        newKategorie = newKategorie.trim();
                    }
                    if (kategorie !== newKategorie) {
                        kategorie = newKategorie;
                        i++;
                        if (kategorie === null || kategorie === "") {
                            series[i] = {
                                name: 'Ohne Kategorie',
                                data: [],
                                stack: 'spendings'
                            };
                        } else {
                            series[i] = {
                                name: kategorie,
                                data: [],
                                stack: 'spendings'
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

                if (earningsJson['error'] === undefined && earningsJson.einnahmen) {
                    var earningsData = new Array(12).fill(0);
                    for (var e in earningsJson.einnahmen) {
                        earningsData[earningsJson.einnahmen[e].monat - 1] = parseFloat(earningsJson.einnahmen[e].preis);
                    }
                    series.push({
                        name: 'Einnahmen',
                        data: earningsData,
                        stack: 'earnings',
                        color: '#2ecc71'
                    });
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
                        formatter: function () {
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
                renderAdditionalCharts(year);
            }
        } else {
            errorHandling(json);
        }
    });


}

function processURL() {
    var location = window.location.search;
    var stats = false;
    let trash = false;
    var search = false;
    var searchQuery = '';
    if (location !== null && location !== "") {
        var regYear = new RegExp("year=(\\d{4})");
        var regMonth = new RegExp("month=(\\d{1,2})");
        var year = regYear.exec(location);
        var month = regMonth.exec(location);
        if (month !== null && month.length === 2 && month[1] >= 1 && month[1] <= 12) {
            if (year !== null && year.length === 2) {
                datum.year(year[1]);
            } else {
                if (month[1] - 1 > datum.month()) {
                    datum.subtract(1, "year");
                }
            }
            datum.month(month[1] - 1);
        }
        stats = location.includes("statistics");
        trash = location.includes("trash");
        var regSearch = new RegExp("[?&]search(?:=([^&]*))?");
        var searchMatch = regSearch.exec(location);
        search = searchMatch !== null;
        searchQuery = searchMatch ? decodeURIComponent(searchMatch[1] || '') : '';
    }
    window.history.replaceState({
        "year": datum.year(),
        "month": datum.month()
    }, "", "index.php?year=" + datum.year() + "&month=" + (datum.month() + 1));

    if (loadingDone === true) {
        showEntries();
        console.log("preload already finished");
    } else if (loadingDone === "error") {
        holeDaten();
        console.log("preload FAILED");
    }
    if (stats) {
        showStatsView();
    } else if (trash) {
        showTrashView();
    } else if (search) {
        showSearchView(searchQuery);
    }
    console.log("END processURL");
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

function holeDaten(callback, ...args) {
    $.post('api.php', {
        action: 'get_month',
        month: (datum.month() + 1),
        year: datum.year()
    }).done(function (data) {
        json = JSON.parse(data);
        if (json['error'] === undefined) {
            showEntries(callback, ...args);
        } else {
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
    clearKeyboardFocus();
    setSpendings(parseFloat(json['summeausgaben']));
    setEarnings(parseFloat(json['summeeinnahmen']));

    if (currentView === "spendings" || currentView === "earnings") {
        $(".ausgabe").remove();
        $('#empty').remove();
        var daten = currentView === "spendings" ? json['ausgaben'] : json['einnahmen'];
        if (daten.length > 0) {
            for (var x in daten) {
                var element = createRow(currentView === "spendings" ? daten[x].idausgabe : daten[x].ideinnahme, dateToLocal(daten[x].datum), (daten[x].kategorie) ? daten[x].kategorie : "", daten[x].art, daten[x].preis, (daten[x].beschreibung) ? daten[x].beschreibung : "");
                $("#ausgabenliste").append(element);
            }
        } else {
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

    $("#ausgabenliste").append(empty);
}

function editControlShowSpinner(editControl) {
    hideEditControls(editControl);
    $(editControl).append($('<div/>').addClass('change animate-spin icon-spin5'));
}

function hideEditControls(editControl) {
    for (var i = 0; i < editControl.childNodes.length; i++) {
        if (editControl.childNodes[i].nodeType === 1) {
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

    var params = {
        action: 'delete',
        entrytype: currentView
    };
    if (currentView === "earnings") {
        params.ideinnahme = ausgabenElement.getAttribute("data-id");
    } else {
        params.idausgabe = ausgabenElement.getAttribute("data-id");
    }

    $.post('api.php', params).done(function (data) {
        var json = JSON.parse(data);
        if (json['error'] === undefined) {
            if (json.deleted === 'true') {
                $(ausgabenElement).on('transitionend', function () {
                    document.getElementById("ausgabenliste").removeChild(ausgabenElement);
                    if (isEmpty($('#ausgabenliste'))) {
                        showEmpty();
                    }
                });
                $(ausgabenElement).addClass('remove-animation');

                if (currentView === "earnings") {
                    addEarnings(-preis);
                } else {
                    addSpendings(-preis);
                }

                // TODO remove from json object
            }
        } else {
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
            $('.ausgabe[data-id=' + id + '] .td-datum').append($('<div>').addClass('error').text(error['datum']) /*.append($('<div>').addClass('error-diamond'))*/);
        }
        if (error['art'] !== undefined) {
            $('.ausgabe[data-id=' + id + '] .td-art').append($('<div>').addClass('error').text(error['art']));
        }
        if (error['preis'] !== undefined) {
            $('.ausgabe[data-id=' + id + '] .td-preis').append($('<div>').addClass('error').text(error['preis']));
        }
    } else {
        if (error['datum'] !== undefined) {
            $('#input .td-datum').append($('<div>').addClass('error').text(error['datum']) /*.append($('<div>').addClass('error-diamond'))*/);
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
    } else {
        $('#input .error').remove();
    }
}

function formatPreisInput(element) {
    let value = convertPreisToNumber(element.value);
    value = formatPreisWithoutSymbol(value);
    element.value = value;
}

function saveEntry() {
    var error = {};
    var showError = false;

    deleteError();

    var datumEntry = $('#input-datum').val();
    if (datumEntry === undefined || datumEntry === "") {
        error['datum'] = "Datum fehlt";
        showError = true;
    } else {
        var datumDB = "";
        if (datumEntry.indexOf(".") > 0) {
            datumDB = localToDate(datumEntry);
        } else {
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
    if (preis === undefined || preis === "" || preis === NaN) {
        error['preis'] = "Preis fehlt";
        showError = true;
    } else {
        var preisDB = convertPreisToNumber(preis);
    }

    var beschreibung = $('#input-beschreibung').val();

    if (showError) {
        fehlerAnzeigen(error);
    } else {
        var entry = {};
        entry.datumDB = datumDB;
        entry.datum = datumEntry;
        entry.kategorie = kategorie;
        entry.art = art;
        entry.preisDB = preisDB;
        entry.beschreibung = beschreibung;

        //Falls neue Ausgabe nicht im aktuell gewählten Monat ist wird der dazugehörige Monat geladen
        var datumM;
        if (datumDB.split("-")[0].length < 4) {
            datumM = moment(datumDB, "YY-M-D");
        } else {
            datumM = moment(datumDB, "YYYY-M-D");
        }

        if (datum.month() !== datumM.month() || datum.year() !== datumM.year()) {
            datum.month(datumM.month());
            datum.year(datumM.year());
            andererMonat(saveEntryRequest, entry);
        } else {
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

    $.post("api.php", params).done(function (result) {
        var json = JSON.parse(result);
        if (json['error'] === undefined) {
            //remove empty view if visible
            $('#empty').remove();
            var element = createRow(json['id'], entry.datum, entry.kategorie, entry.art, entry.preisDB, entry.beschreibung);
            element.className += " new";
            //TODO: insert new Ausgabe at the appropriate position
            document.getElementById("ausgabenliste").appendChild(element);
            $('.ausgabe[data-id=' + json['id'] + ']')[0].scrollIntoView();

            if (json['entrytype'] === 'earnings') {
                addEarnings(entry.preisDB);
                var einnahme = {
                    ideinnahme: json['id'],
                    art: entry.art,
                    beschreibung: entry.beschreibung,
                    datum: entry.datumDB,
                    kategorie: entry.kategorie,
                    preis: convertPreisToPoint(entry.preisDB)
                };
                addEarningsToJSON(einnahme);
            } else {
                addSpendings(entry.preisDB);
                var ausgabe = {
                    idausgabe: json['id'],
                    art: entry.art,
                    beschreibung: entry.beschreibung,
                    datum: entry.datumDB,
                    kategorie: entry.kategorie,
                    preis: convertPreisToPoint(entry.preisDB)
                };
                addSpendingsToJSON(ausgabe);
            }

            clearInput();

            entry = {};
        } else {
            errorHandling(json);
        }
    });
}

function clearInput() {
    $('#input-datum, #input-kategorie, #input-art, #input-preis, #input-beschreibung, #datepicker').val("");
    $('#input-datum').focus();
}

/**
 * @param float preis Preis der hinzugefügt werden soll, negative Werte zum abziehen
 */
function addSpendings(preis) {
    var amount = parseFloat(json['summeausgaben']);
    amount += parseFloat(preis); //TODO why parseFloat?
    setSpendings(amount);
    json['summeausgaben'] = amount + "";
}

function setSpendings(amount) {
    $('#spendings').html("Ausgaben " + Math.round(amount) + "&nbsp;€");
    document.querySelector("#spendings").setAttribute("data-amount", amount);
}

function addSpendingsToJSON(ausgabe) {
    json['ausgaben'].push(ausgabe);
}

function changeSpending(params) {
    for (var i = 0; i < json['ausgaben'].length; i++) {
        if (json['ausgaben'][i]['idausgabe'] == params.idausgabe) {
            var entry = json['ausgaben'][i]
            if (params.datum) {
                entry['datum'] = params.datum;
            }
            if (params.kategorie) {
                entry['kategorie'] = params.kategorie;
            }
            if (params.art) {
                entry['art'] = params.art;
            }
            if (params.preis) {
                entry['preis'] = params.preis;
            }
            if (params.beschreibung) {
                entry['beschreibung'] = params.beschreibung;
            }
            break;
        }
    }
}

function addEarnings(preis) {
    var amount = parseFloat(json['summeeinnahmen']);
    amount += parseFloat(preis); //TODO why parseFloat?
    setEarnings(amount);
    json['summeeinnahmen'] = amount + "";
}

function setEarnings(amount) {
    $('#earnings').html("Einnahmen " + Math.round(amount) + "&nbsp;€");
    document.querySelector("#earnings").setAttribute("data-amount", amount);
}

function addEarningsToJSON(einnahme) {
    json['einnahmen'].push(einnahme);
}

function changeEarning(params) {
    for (var i = 0; i < json['einnahmen'].length; i++) {
        if (json['einnahmen'][i]['ideinnahme'] == params.ideinnahme) {
            var entry = json['einnahmen'][i]
            if (params.datum) {
                entry['datum'] = params.datum;
            }
            if (params.kategorie) {
                entry['kategorie'] = params.kategorie;
            }
            if (params.art) {
                entry['art'] = params.art;
            }
            if (params.preis) {
                entry['preis'] = params.preis;
            }
            if (params.beschreibung) {
                entry['beschreibung'] = params.beschreibung;
            }
            break;
        }
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

    var html = `
<div class="td td-datum">${datum}</div>
<div class="td td-kategorie">${kategorie}</div>
<div class="td td-art">${art}</div>
<div class="preis td td-preis">${formatPreis(preis)}</div>
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

function getDataFromJSON(id, type) {
    if (type === 'ausgabe') {
        return searchData.ausgaben.find(entry => entry.idausgabe === id);
    } else if (type === 'einnahme') {
        return searchData.einnahmen.find(entry => entry.ideinnahme === id);
    } else if (currentView === "spendings") {
        return json['ausgaben'].find(entry => entry.idausgabe === id);
    } else {
        return json['einnahmen'].find(entry => entry.ideinnahme === id);
    }
}

function editEntry(e) {
    var el = e.target;
    var ausgabenElement = el.parentNode.parentNode;

    let dataID = ausgabenElement.getAttribute('data-id');
    let entryType = ausgabenElement.getAttribute('data-type');
    let data = getDataFromJSON(dataID, entryType);
    console.log(data);  // TODO remove

    hideEditControls(el.parentNode);

    var update = document.createElement("div");
    update.addEventListener("click", updateEntry, "false");
    update.className = "update icon-ok";

    var cancel = document.createElement("div");
    cancel.addEventListener("click", cancelEditEntry, "false");
    cancel.className = "cancel icon-cancel";

    el.parentNode.appendChild(update);
    el.parentNode.appendChild(cancel);

    [...ausgabenElement.querySelectorAll('div.td')]
            .forEach(function (td) {
                if (td.classList.contains('td-datum')) {
                    td.innerHTML = '<input type="text" value="' + dateToLocal(data.datum) + '">';
                } else if (td.classList.contains('td-kategorie')) {
                    td.innerHTML = '<input type="text" value="' + data.kategorie + '">';
                } else if (td.classList.contains('td-art')) {
                    td.innerHTML = '<input type="text" value="' + data.art + '">';
                } else if (td.classList.contains('td-preis')) {
                    // type=tel: workaround for number field validation (I want to have a numeric keyboard)
                    td.innerHTML =
                            '<input size="10" class="preis" placeholder="Preis" type="tel" minlength="1" value="' + formatPreisWithoutSymbol(data.preis) + '"><span class="input-suffix">&nbsp;&euro;</span>';
                    td.querySelector('input').addEventListener('change', e => formatPreisInput(e.target));
                } else if (td.classList.contains('td-beschreibung')) {
                    td.innerHTML = '<input type="text" value="' + data.beschreibung + '">';
                }
            });

    ausgabenElement.classList.add("tr-edit");

    // Auto-focus first input so the row's own keydown handler receives events
    var firstInput = ausgabenElement.querySelector('.td-datum input');
    if (firstInput) firstInput.focus();

    function onKeyDown(ev) {
        if (ev.key === 'Enter') {
            ev.preventDefault();
            ausgabenElement.removeEventListener('keydown', onKeyDown);
            update.click();
        } else if (ev.key === 'Escape') {
            ev.preventDefault();
            ausgabenElement.removeEventListener('keydown', onKeyDown);
            cancel.click();
        }
    }
    ausgabenElement.addEventListener('keydown', onKeyDown);
}

function cancelEditEntry(e) {
    var tdOptionen = e.target.parentNode;
    removeEditControls(e.target.parentNode);

    var trAusgabe = tdOptionen.parentNode;
    reAddEditControls(trAusgabe);

    let dataID = trAusgabe.getAttribute('data-id');
    let entryType = trAusgabe.getAttribute('data-type');
    let data = getDataFromJSON(dataID, entryType);
    console.log(data);  // TODO remove

    [...trAusgabe.querySelectorAll('div.td')]
            .forEach(function (td) {
                if (td.classList.contains('td-datum')) {
                    td.innerHTML = dateToLocal(data.datum);
                } else if (td.classList.contains('td-kategorie')) {
                    td.innerHTML = data.kategorie;
                } else if (td.classList.contains('td-art')) {
                    td.innerHTML = data.art;
                } else if (td.classList.contains('td-preis')) {
                    td.innerHTML = formatPreis(data.preis);
                } else if (td.classList.contains('td-beschreibung')) {
                    td.innerHTML = data.beschreibung;
                }
            });
}

function updateEntry(e) {
    var error = {};
    var showError = false;

    let tdOptionen = e.target.parentNode;
    removeEditControls(tdOptionen);
    editControlShowSpinner(tdOptionen);

    var ausgabenElement = tdOptionen.parentNode;
    var id = $(ausgabenElement).attr('data-id');
    deleteError(id);

    let dataID = ausgabenElement.getAttribute('data-id');
    let entryType = ausgabenElement.getAttribute('data-type'); // 'ausgabe', 'einnahme', or null for monthly view
    let oldData = getDataFromJSON(dataID, entryType);
    console.log(oldData);  // TODO remove

    var params = {};

    // TODO prettify dates
    let datumAusgabe = ausgabenElement.querySelector('.td-datum').querySelector('input').value;
    let datumDB = datumAusgabe;
    if (datumAusgabe === undefined || datumAusgabe === "") {
        error['datum'] = "Datum fehlt";
        showError = true;
    } else if (datumAusgabe.indexOf(".") > 0) { // TODO does not work for other date formats
        datumDB = localToDate(datumAusgabe);
    }
    if (oldData.datum !== datumDB) {
        params.datum = datumDB;
    }

    if (oldData.kategorie !== $(ausgabenElement).children('.td-kategorie').children('input').val()) {
        params.kategorie = encodeURIComponent($(ausgabenElement).children('.td-kategorie').children('input').val());
    }

    if (oldData.art !== $(ausgabenElement).children('.td-art').children('input').val()) {
        var art = $(ausgabenElement).children('.td-art').children('input').val();
        if (art === undefined || art === "") {
            error['art'] = "Art der Ausgabe fehlt";
            showError = true;
        } else {
            params.art = encodeURIComponent(art);
        }
    }

    let preis = convertPreisToNumber(ausgabenElement.querySelector('.td-preis').querySelector('input').value);
    if (convertPreisToNumber(oldData.preis) !== preis) {
        if (preis === undefined || preis === "" || preis === NaN) {
            error['preis'] = "Preis fehlt";
            showError = true;
        } else {
            params.preis = convertPreisToPoint(preis);
        }
    }

    if (oldData.beschreibung !== $(ausgabenElement).children('.td-beschreibung').children('input').val()) {
        params.beschreibung = encodeURIComponent($(ausgabenElement).children('.td-beschreibung').children('input').val());
    }

    if (showError) {
        fehlerAnzeigen(error, id);
        reAddEditControls(ausgabenElement);
    } else if (Object.keys(params).length > 0) {
        var isEarnings = entryType === 'einnahme' || (!entryType && currentView === "earnings");
        if (isEarnings) {
            params.ideinnahme = id;
        } else {
            params.idausgabe = id;
        }
        params.action = 'edit';
        params.entrytype = isEarnings ? 'earnings' : 'spendings';
        console.log(params);
        $.post("api.php", params).done(function (result) {
            var json = JSON.parse(result);
            if (json['error'] === undefined) {

                if(params.datum !== undefined) {
                    oldData.datum = params.datum;
                }
                if(params.kategorie !== undefined) {
                    oldData.kategorie = params.kategorie;
                }
                if(params.art !== undefined) {
                    oldData.art = params.art;
                }
                if(params.preis !== undefined) {
                    oldData.preis = params.preis;
                }
                if(params.beschreibung !== undefined) {
                    oldData.beschreibung = params.beschreibung;
                }
                console.log(getDataFromJSON(dataID, entryType));

                var sameMonth = true;
                if (!entryType && params.datum !== undefined) {
                    var datumM;
                    if (params.datum.split("-")[0].length < 4) {
                        datumM = moment(params.datum, "YY-M-D");
                    } else {
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
                    // convert input fields back to normal text
                    for (var i = 0; i < (ausgabenElement.childNodes.length - 1); i++) {
                        if (ausgabenElement.childNodes[i].nodeType === 1 && ausgabenElement.childNodes[i].className.includes("td")) {
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

                    if (!entryType) {
                        if (params.preis) {
                            var preisAlt = convertPreisToPoint(oldData.preis);
                            var preisNeu = convertPreisToPoint(params.preis);
                            var change = -preisAlt + preisNeu;
                            if (currentView === "spendings") {
                                addSpendings(parseFloat(change));
                            } else {
                                addEarnings(parseFloat(change));
                            }
                        }

                        if (currentView === "spendings") {
                            changeSpending(params);
                        } else {
                            changeEarning(params);
                        }
                    }

                    reAddEditControls(ausgabenElement);
                }
            } else {
                reAddEditControls(ausgabenElement);
                errorHandling(json);
            }
        });
    } else {
        console.log('no changes in entry');
        reAddEditControls(ausgabenElement);
    }
}

function reAddEditControls(ausgabenElement) {
    $(ausgabenElement).children('.td-optionen').children('.change').remove();
    $(ausgabenElement).children('.td-optionen').children().css('display', '');
    ausgabenElement.classList.remove("tr-edit");
    // Restore keyboard focus if the edit was keyboard-initiated
    if (kbFocusedBeforeEdit !== -1) {
        var savedIdx = kbFocusedBeforeEdit;
        kbFocusedBeforeEdit = -1;
        var rows = getListRows();
        if (savedIdx < rows.length) {
            setKeyboardFocus(savedIdx);
        }
    }
}

function removeEditControls(tdOptionen) {
    tdOptionen.removeChild(tdOptionen.getElementsByClassName("update")[0]);
    tdOptionen.removeChild(tdOptionen.getElementsByClassName("cancel")[0]);
}

function prettifyDate() {
    let inDate = $("#input-datum").val();
    let splitChar;
    if (inDate.indexOf(".") > 0 && inDate.indexOf(",") === -1 && inDate.indexOf("-") === -1) {
        splitChar = ".";
    } else if (inDate.indexOf(",") > 0 && inDate.indexOf(".") === -1 && inDate.indexOf("-") === -1) {
        splitChar = ",";
    } else if (inDate.indexOf("-") > 0 && inDate.indexOf(".") === -1 && inDate.indexOf(",") === -1) {
        splitChar = "-";
    } else {
        return;
    }
    if (inDate.length >= 3 && splitChar !== '-') {
        if (occurrences(inDate, splitChar) === 1) {
            let outDate = moment(inDate, "D" + splitChar + "M").year(moment().year()).format("DD.MM.YYYY");
            $("#input-datum").val(outDate);
        } else if (occurrences(inDate, splitChar) === 2) {
            let tempDate = moment(inDate, "D" + splitChar + "M" + splitChar + "YYYY");
            if (tempDate.year() == 0) {
                tempDate.year(moment().year());
            }
            let outDate = tempDate.format("DD.MM.YYYY");
            $("#input-datum").val(outDate);
        }
    } else if (inDate.length >= 5 && splitChar === '-' && occurrences(inDate, splitChar) === 2) {
        let outDate = moment(inDate, "YYYY" + splitChar + "M" + splitChar + "D").format("DD.MM.YYYY");
        $("#input-datum").val(outDate);
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
    } else {
        preis += ',00';
    }
    return preis;
}

function convertPreisToNumber(preis) {
    if (preis.lastIndexOf('.') > preis.lastIndexOf(',')) { // e.g. 1,000.543
        preis = preis.replace(',', '');
    } else if (preis.lastIndexOf('.') < preis.lastIndexOf(',')) { // e.g 1.000,543
        preis = preis.replace('.', '').replace(',', '.');
    } // else -> both must be -1, therefore no '.' or ','
    return parseFloat(preis);
}

function formatPreis(preis, withDecimal = true) {
    const options = { style: 'currency', currency: 'EUR' };
    if (!withDecimal) {
        options.minimumFractionDigits = 0;
        options.maximumFractionDigits = 0;
    }
    return new Intl.NumberFormat(undefined, options).format(preis);
}

function formatPreisWithoutSymbol(preis) {
    return Intl.NumberFormat(undefined, {style: 'currency', currency: 'EUR'})
            .formatToParts(preis).map(({type, value}) => {
        if (type === 'currency' || type === 'literal') {
            return '';
        } else {
            return value;
    }
    }).reduce((string, part) => string + part);
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
    if (subString.length <= 0)
        return (string.length + 1);

    var n = 0,
            pos = 0,
            step = allowOverlapping ? 1 : subString.length;

    while (true) {
        pos = string.indexOf(subString, pos);
        if (pos >= 0) {
            ++n;
            pos += step;
        } else
            break;
    }
    return n;
}

function hasWebkitDatepicker(element) {
    let style = window.getComputedStyle(document.querySelector('#datepicker'), '::-webkit-calendar-picker-indicator');
    return (style.webkitAppearance !== undefined && style.msWrapFlow === undefined);
}

// https://stackoverflow.com/a/51411377/1565646
function getDecimalSeparator(locale) {
    const numberWithDecimalSeparator = 1.1;
    return Intl.NumberFormat(locale)
            .formatToParts(numberWithDecimalSeparator)
            .find(part => part.type === 'decimal')
            .value;
}
