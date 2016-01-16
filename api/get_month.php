<?php

!defined('SECURE') and exit;

function lastday($month, $year) {
    $result = strtotime("{$year}-{$month}-01");
    $result = strtotime('-1 second', strtotime('+1 month', $result));
    return date('Y-m-d', $result);
}

if (!isset($_POST["year"]) || !isset($_POST["month"])) {
    die('{"error":"server","msg":"Jahr/Monat fehlt"}');
}

$month = filter_input(INPUT_POST, 'month');
$year = filter_input(INPUT_POST, 'year');

$startDate = $year . "-" . $month . "-01";
$endDate = lastday($month, $year);

$result = $mysqli->query(sprintf('CALL eua.holeAusgabenMonat("%s","%s",%s);', $startDate, $endDate, $_SESSION['defaultKonto']));

if (!$result) {
    echo '{"error":"server","msg":"Keine Ergebnisse"}';
} else {
    $rows = array();
    while ($array = $result->fetch_assoc()) {
        foreach ($array as $key => $entry) {
            $array[$key] = htmlspecialchars($entry);
        }
        $rows[] = $array;
    }
    $ausgaben = json_encode($rows);
    
    //$result->close(); // Did not work; closing and reopening link instead...
    $mysqli->close();
    $mysqli = new mysqli('localhost', 'eua', NULL, 'eua');

    $result = $mysqli->query(sprintf('CALL eua.summeAusgabenMonat("%s","%s",%s);', $startDate, $endDate, $_SESSION['defaultKonto']));

    if (!$result) {
        die('{"error":"server","msg":"Keine Ausgaben in diesem Monat: Summe fehlt:' . $mysqli->error . ' "}');
    } else {
        $row = $result->fetch_row();
        if ($row[0] == "") {
            $row[0] = "0.00";
        }
        $json = '{"summeausgaben":"' . $row[0] . '","jahr":"' . $year . '","monat":"' . $month . '","ausgaben":' . $ausgaben . '}';
        echo $json;
    }
}