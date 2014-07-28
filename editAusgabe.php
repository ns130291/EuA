<?php

session_start();
if (!isset($_SESSION['angemeldet']) || !$_SESSION['angemeldet']) {
    $hostname = $_SERVER['HTTP_HOST'];
    $path = dirname($_SERVER['PHP_SELF']);
    die('{"error":"not_logged_in","location":"https://' . $hostname . ($path == '/' ? '' : $path) . '/login.php"}');
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $link = mysql_connect(':/var/run/mysqld/mysqld.sock', 'eua');

    if (!$link) {
        die('{"error":"server","msg":"Datenbankfehler: ' . mysql_error() . '"}');
    }

    if (!isset($_POST["idausgabe"])) {
        die('{"error":"server","msg":"Ausgaben ID fehlt"}');
    }

    $sql = 'UPDATE eua.ausgabe SET';

    $set = '';
    if (isset($_POST["datum"])) {
        $set .= ' datum="' . mysql_real_escape_string($_POST["datum"]) . '",';
    }
    if (isset($_POST["kategorie"])) {
        $set .= ' kategorie="' . mysql_real_escape_string($_POST["kategorie"]) . '",';
    }
    if (isset($_POST["art"])) {
        $set .= ' art="' . mysql_real_escape_string($_POST["art"]) . '",';
    }
    if (isset($_POST["preis"])) {
        $set .= ' preis=' . mysql_real_escape_string($_POST["preis"]) . ',';
    }
    if (isset($_POST["beschreibung"])) {
        $set .= ' beschreibung="' . mysql_real_escape_string($_POST["beschreibung"]) . '",';
    }

    $json = array();
    $json["idausgabe"] = $_POST["idausgabe"];

    if (!empty($set)) {
        $sql .= rtrim($set, ",");
        $sql .= ' WHERE idausgabe = ' . mysql_real_escape_string($_POST["idausgabe"]) . ';';

        $result = mysql_query($sql);
        /*echo $result;
        echo mysql_error();
        echo $sql;*/
        if ($result) {
            $json["changed"] = "true";
        } else {
            $json["changed"] = "false";
        }
    } else {
        $json["changed"] = "true";
    }


    echo json_encode($json);
    mysql_close($link);
} else {
    $json = array();

    $json["error"] = "wrong_method";
    $json["msg"] = "Only POST requests are accepted";

    echo json_encode($json);
}
?>
