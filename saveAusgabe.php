<?php

session_start();
if (!isset($_SESSION['angemeldet']) || !$_SESSION['angemeldet']) {
    $hostname = $_SERVER['HTTP_HOST'];
    $path = dirname($_SERVER['PHP_SELF']);
    die('{"error":"not_logged_in","location":"https://' . $hostname . ($path == '/' ? '' : $path) . '/login.php"}');
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    //$link = mysql_connect('localhost:3306', 'root');
    $link = mysql_connect(':/var/run/mysqld/mysqld.sock', 'eua');

    if (!$link) {
        //500
        //header("HTTP/1.1 500 Internal Server Error");
        die('{"error":"server","msg":"Datenbankfehler: ' . mysql_error() . '"}');
    }
    /* $month = date("n");
      $year = date("Y"); */
    $datum = '"' . $_POST["datum"] . '"';
    $kategorie = "";
    if (isset($_POST["kategorie"])) {
        $kategorie = '"' . $_POST["kategorie"] . '"';
    } else {
        $kategorie = "null";
    }
    $art = '"' . urldecode($_POST["art"]) . '"';
    $preis = $_POST["preis"];
    $beschreibung = "";
    if (isset($_POST["beschreibung"])) {
        $beschreibung = '"' . $_POST["beschreibung"] . '"';
    } else {
        $beschreibung = "null";
    }
    mysql_set_charset('utf8');
    //CALL eua.ausgabeSpeichern("2012-02-02", "EssenHP", "Tortelli mit Basilikum-Käse-Sahnesoße und frischen Cocktailtomaten; Tomatensuppe", 3.61, null);
    mysql_query(sprintf('CALL eua.ausgabeSpeichern(%s,%s,%s,%s,%s);', $datum, $kategorie, $art, $preis, $beschreibung));
    //echo mysql_insert_id($link);
    $result = mysql_query('SELECT LAST_INSERT_ID()');
    if ($result) {
        $array = mysql_fetch_row($result);
        echo '{"id":"' . $array[0] . '"}';
    }
    //echo mysql_error();
    mysql_close($link);
} else {
    $json = array();

    $json["error"] = "wrong_method";
    $json["msg"] = "Only POST requests are accepted";

    echo json_encode($json);
}
?>
