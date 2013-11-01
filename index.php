<?php
session_start();

$hostname = $_SERVER['HTTP_HOST'];
$path = dirname($_SERVER['PHP_SELF']);

if (!isset($_SESSION['angemeldet']) || !$_SESSION['angemeldet']) {
    header('Location: https://' . $hostname . ($path == '/' ? '' : $path) . '/login.php');
    exit;
}
?>
<!DOCTYPE html>
<html>
    <head>
        <title>EuA</title>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <link rel="stylesheet" href="main.css">
        <script type="text/javascript" src="js/jquery-2.0.3.min.js"></script>
        <script type="text/javascript" src="js/moment.min.js"></script>
        <script type="text/javascript" src="js/de.js"></script>
        <script type="text/javascript" src="json2.js"></script>
        <script type="text/javascript" src="main.js"></script>
    </head>
    <body>
        <div id="content">
            <header>
                <h1>Einnahmen und Ausgaben</h1>
            </header>
            <section id="content" class="colmask doublepage">
                <div id="leftwrapper" class="colleft">
                    <section id="ausgaben" class="col1">
                        <h2>Ausgaben</h2>
                        <div id="error"></div>
                        <div id="navbar" class="bar cf">
                            <div id="previous-month" class="bar-element">&lt;</div>
                            <div id="month" class="bar-element">Laden...</div>
                            <div id="next-month" class="bar-element">&gt;</div>
                            <div class="right">
                                <div id="spendings" class="bar-element">Laden...</div>
                            </div>
                        </div>
                        <div id="ausgabenliste" class="table">
                            <div id="ausgabenliste-header" class="tr th">
                                <div class="td">
                                    Datum
                                </div>
                                <div class="td">
                                    Kategorie
                                </div>
                                <div class="td">
                                    Art
                                </div>
                                <div class="td">
                                    Preis
                                </div>
                                <div class="td">
                                    Beschreibung
                                </div>
                                <div class="td">
                                </div>
                            </div>
                            <div id="input" class="tr">
                                <div class="td">
                                    <input id="input-datum" size="10" type="date">
                                </div>
                                <div class="td">
                                    <input id="input-kategorie" placeholder="Benzin, Essen, etc." type="text" autocomplete="off">
                                </div>
                                <div class="td">
                                    <input id="input-art" placeholder="Edeka, Döner, etc." type="text">
                                </div>
                                <div class="td">
                                    <input id="input-preis" size="10" class="preis" placeholder="Preis" type="number" min="0.01" step="0.01">
                                    <span>&euro;</span>
                                </div>
                                <div class="td">
                                    <input id="input-beschreibung" placeholder="mit Vanessa, etc." type="text">
                                </div>
                                <div class="td">
                                    <div id="plusbutton" onclick="ausgabenSpeichern()">enter</div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section id="einnahmen" class="col2">
                        <h2>Einnahmen</h2>
                        <div>

                        </div>
                    </section>
                </div>
            </section>
        </div>
    </body>
</html>