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
        //500
        //header("HTTP/1.1 500 Internal Server Error");
        die('{"error":"server","msg":"Datenbankfehler: ' . mysql_error() . '"}');
    }

    mysql_set_charset('utf8');

    $result = mysql_query('CALL eua.summeAusgabenMonate();');

    if (!$result) {
        die('{"error":"server","msg":"Keine Ergebnisse"}');
    } else {
        $rows = array();
        while ($array = mysql_fetch_assoc($result)) {
            $rows[] = $array;
        }
        $ausgaben = json_encode($rows);
        $json = '{"ausgaben":' . $ausgaben . '}';
        echo $json;
    }
} else {
    $json = array();

    $json["error"] = "wrong_method";
    $json["msg"] = "Only POST requests are accepted";

    echo json_encode($json);
}
?>
