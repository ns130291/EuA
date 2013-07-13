<?php

function lastday($month = '', $year = '') {
    if (empty($month)) {
        $month = date('m');
    }
    if (empty($year)) {
        $year = date('Y');
    }
    $result = strtotime("{$year}-{$month}-01");
    $result = strtotime('-1 second', strtotime('+1 month', $result));
    return date('Y-m-d', $result);
}

session_start();
if (!isset($_SESSION['angemeldet']) || !$_SESSION['angemeldet']) {
    //header 403
    $hostname = $_SERVER['HTTP_HOST'];
    $path = dirname($_SERVER['PHP_SELF']);
    header("HTTP/1.1 403 Forbidden");
    die('{"error":"not_logged_in","location"."' . 'Location: https://' . $hostname . ($path == '/' ? '' : $path) . '/login.php' . '"}');
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    //$link = mysql_connect('localhost:3306', 'root');
    $link = mysql_connect(':/var/run/mysqld/mysqld.sock', 'eua');

    if (!$link) {
        //500
        header("HTTP/1.1 500 Internal Server Error");
        die('Verbindung schlug fehl: ' . mysql_error());
    }
    /* $month = date("n");
      $year = date("Y"); */
    $startDate = $_POST["year"] . "-" . $_POST["month"] . "-01";
    $endDate = lastday($_POST["month"], $_POST["year"]);

    mysql_set_charset('utf8');
    $result = mysql_query(sprintf('CALL eua.holeAusgabenMonat("%s","%s");', $startDate, $endDate));
    //echo sprintf('CALL eua.holeAusgabenMonat("%s","%s");', $startDate, $endDate);
    if (!$result) {
        //header 404
        header("HTTP/1.1 404 Not Found");
        die('Keine Ausgaben in diesem Monat');
    } else {
        $rows = array();
        while ($array = mysql_fetch_assoc($result)) {
            $rows[] = $array;
        }
        $ausgaben = json_encode($rows);

        mysql_close($link);
        $link = mysql_connect(':/var/run/mysqld/mysqld.sock', 'eua');
        if (!$link) {
            //500
            header("HTTP/1.1 500 Internal Server Error");
            die('Verbindung schlug fehl: ' . mysql_error());
        }
        mysql_set_charset('utf8');
        $result = mysql_query(sprintf('CALL eua.summeAusgabenMonat("%s","%s");', $startDate, $endDate));

        if (!$result) {
            //header 404
            header("HTTP/1.1 404 Not Found");
            die('Keine Ausgaben in diesem Monat: Summe fehlt ' . mysql_error());
        } else {
            $row = mysql_fetch_row($result);

            $json = '{"summeausgaben":"' . $row[0] . '","ausgaben":' . $ausgaben . '}';
            echo $json;
        }
    }
    mysql_close($link);
}
?>
