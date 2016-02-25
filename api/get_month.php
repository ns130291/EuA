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


// Ausgaben
$result = $mysqli->query(sprintf('CALL eua.holeAusgabenMonat("%s","%s",%s);', $startDate, $endDate, $_SESSION['defaultKonto']));

if (!$result) {
    die('{"error":"server","msg":"Keine Ergebnisse (Ausgaben)"}');
}

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
    die('{"error":"server","msg":"Keine Daten (Ausgaben) für diesem Monat: Summe fehlt:' . $mysqli->error . ' "}');
}

$row = $result->fetch_row();
if ($row[0] == "") {
    $row[0] = "0.00";
}

$summeAusgaben = $row[0];

// Einnahmen
$mysqli->close();
$mysqli = new mysqli('localhost', 'eua', NULL, 'eua');

$result = $mysqli->query(sprintf('CALL eua.holeEinnahmenMonat("%s","%s",%s);', $startDate, $endDate, $_SESSION['defaultKonto']));

if (!$result) {
    die('{"error":"server","msg":"Keine Ergebnisse (Einnahmen) ' . $mysqli->error . '"}');
}

$rows = array();
while ($array = $result->fetch_assoc()) {
    foreach ($array as $key => $entry) {
        $array[$key] = htmlspecialchars($entry);
    }
    $rows[] = $array;
}
$einnahmen = json_encode($rows);

$mysqli->close();
$mysqli = new mysqli('localhost', 'eua', NULL, 'eua');

$result = $mysqli->query(sprintf('CALL eua.summeEinnahmenMonat("%s","%s",%s);', $startDate, $endDate, $_SESSION['defaultKonto']));

if (!$result) {
    die('{"error":"server","msg":"Keine Daten (Einnahmen) für diesem Monat: Summe fehlt:' . $mysqli->error . ' "}');
}

$row = $result->fetch_row();
if ($row[0] == "") {
    $row[0] = "0.00";
}

$summeEinnahmen = $row[0];

// Result
$json = '{"summeausgaben":"' . $summeAusgaben . '","summeeinnahmen":"' . $summeEinnahmen . '","jahr":"' . $year . '","monat":"' . $month . '","ausgaben":' . $ausgaben . ',"einnahmen":' . $einnahmen . '}';
echo $json;
