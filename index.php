<?php
session_start();

$hostname = $_SERVER['HTTP_HOST'];
$path = dirname($_SERVER['PHP_SELF']);

if (!isset($_SESSION['angemeldet']) || !$_SESSION['angemeldet']) {
    $_SESSION['lastURL'] = $_SERVER['REQUEST_URI'];
    header('Location: https://' . $hostname . ($path == '/' ? '' : $path) . '/login.php');
    exit;
}
?>
<!DOCTYPE html>
<html>
    <head>
        <title>EuA</title>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <meta name="viewport" content="width=device-width">
        <link rel="stylesheet" href="main.css">
        <link rel="stylesheet" href="fontello/css/nsvb-symbol.css">
        <link rel="stylesheet" href="fontello/css/animation.css">
        <script type="text/javascript" src="preload.js"></script>
        <script type="text/javascript" src="js/jquery-2.0.3.min.js"></script>
        <script type="text/javascript" src="js/moment.min.js"></script>
        <script type="text/javascript" src="js/de.js"></script>
        <script type="text/javascript" src="main.js"></script>
        <script type="text/javascript" src="js/highcharts-custom.js"></script>
    </head>
    <body>
        <div id="content">
            <header id="header">
                <div id="navbar" class="bar">
                    <div id="previous-month" class="bar-element">&#8592;</div>
                    <div id="month" class="bar-element">Laden...</div>
                    <div id="next-month" class="bar-element">&#8594;</div>
                    <div class="spacer"></div>
                    <div id="earnings" class="bar-element merge-start">Einnahmen &#x2010; €</div>
                    <div id="spendings" class="bar-element merge-end active">Ausgaben &#x2010; €</div>
                    <div id="switch-to-stats" class="bar-element">Statistiken</div>
                </div>
            </header>
            <section id="section-ausgabe">
                <div id="ausgabenliste-header" class="th">
                    <div class="td td-datum">
                        Datum
                    </div>
                    <div class="td td-kategorie">
                        Kategorie
                    </div>
                    <div class="td td-art">
                        Art
                    </div>
                    <div class="td td-preis">
                        Preis
                    </div>
                    <div class="td td-beschreibung">
                        Beschreibung
                    </div>
                    <div class="td td-optionen">
                    </div>
                </div>
                <div id="ausgabenliste"></div>
                <form id="input-form">
                    <div id="input" class="tr">
                        <div class="td td-datum">
                            <input id="datepicker" placeholder="Datum" size="10" type="date">
                            <input id="input-datum" placeholder="Datum" size="10" type="text">
                            <span id="opendatepicker" class="icon-calendar"></span>
                        </div>
                        <div class="td td-kategorie">
                            <input id="input-kategorie" placeholder="Benzin, Essen, etc." type="text">
                        </div>
                        <div class="td td-art">
                            <input id="input-art" placeholder="Edeka, Döner, etc." type="text">
                        </div>
                        <div class="td td-preis">
                            <input id="input-preis" size="10" class="preis" placeholder="Preis" type="number" min="0.01" step="0.01">
                            <span>&nbsp;&euro;</span>
                        </div>
                        <div class="td td-beschreibung">
                            <input id="input-beschreibung" placeholder="mit Vanessa, etc." type="text">
                        </div>
                        <div class="td td-optionen">
                            <button id="plusbutton" type="submit" class="plus icon-plus"></button>
                        </div>
                    </div>
                </form>
            </section>
        </div>
        <div id="overlay">
            <div class="cf">
                <div class="right" id="overlay-close">&times;</div>
                <div id="select-mobile">
                    <select>
                        
                    </select>
                </div>
            </div>
            <div id="overlay-content">
                <div id="select" class="left"></div>
                <div id="stats-wrapper" class="cf">
                    <div>
                        <div id="details">
                            Details &#8594;
                        </div>
                    </div>
                    <div id="stats">
                        <div class="chart"></div>
                        <div id="additional-charts"></div>
                        <div class="hidden" id="add-chart">
                            <div id="chart-category-select">
                                Weitere Diagramme:
                                <select>
                                    
                                </select>
                            </div>
                            <div id="chart-category-add" class="bar-element">
                                Hinzufügen
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </body>
</html>