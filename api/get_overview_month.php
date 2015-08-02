<?php

!defined('SECURE') and exit;

if (!isset($_POST["jahr"]) || !isset($_POST["monat"])) {
    die('{"error":"server","msg":"Jahr/Monat fehlt"}');
}
$jahr = $_POST["jahr"];
$monat = $_POST["monat"];

$result = $mysqli->query(sprintf('CALL eua.monatsuebersicht(%s, %s, %s);', $monat, $jahr, $_SESSION['defaultKonto']));

if (!$result) {
    echo '{"error":"server","msg":"Keine Ergebnisse"}';
} else {
    $rows = array();
    while ($array = $result->fetch_assoc()) {
        $rows[] = $array;
    }
    $ausgaben = json_encode($rows);
    $json = '{"ausgaben":' . $ausgaben . '}';
    echo $json;
}

