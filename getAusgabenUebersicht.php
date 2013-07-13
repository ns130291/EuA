<?php
session_start();
if (!isset($_SESSION['angemeldet']) || !$_SESSION['angemeldet']) {
    $hostname = $_SERVER['HTTP_HOST'];
    $path = dirname($_SERVER['PHP_SELF']);
    die('{"error":"not_logged_in","location"."' . 'Location: https://' . $hostname . ($path == '/' ? '' : $path) . '/login.php' . '"}');
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $link = mysql_connect(':/var/run/mysqld/mysqld.sock', 'eua');
    if (!$link) {
        die('{"error":"wrong_method","msg"."connection failed: ' . mysql_error() . '"}');
    }

    mysql_set_charset('utf8');

    $result = mysql_query('CALL eua.summeAusgabenMonate();');

    if (!$result) {
        die('{"error":"no_results"}');
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
    die('{"error":"wrong_method","msg"."only POST is allowed"}');
}
?>
