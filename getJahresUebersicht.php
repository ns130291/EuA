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

    mysql_set_charset('utf8');

    if (!isset($_POST["jahr"])) {
        die('{"error":"server","msg":"Jahr fehlt"}');
    }
    $jahr = $_POST["jahr"];

    $result = mysql_query(sprintf('CALL eua.jahresuebersicht(%s);', $jahr));

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
