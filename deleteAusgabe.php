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

    if (!isset($_POST["idausgabe"])) {
        die('{"error":"server","msg":"Ausgaben ID fehlt"}');
    }
    $idausgabe = $_POST["idausgabe"];

    mysql_set_charset('utf8');
    $result = mysql_query(sprintf('CALL eua.ausgabeLöschen(%s);', $idausgabe));

    $json = array();

    $json["idausgabe"] = $idausgabe;

    if ($result == true) {
        $json["deleted"] = "true";
    } else {
        $json["deleted"] = "false";
    }

    echo json_encode($json);

    //echo mysql_error();
    mysql_close($link);
} else {
    $json = array();

    $json["error"] = "wrong_method";
    $json["msg"] = "Only POST requests are accepted";

    echo json_encode($json);
}
?>
