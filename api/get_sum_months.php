<?php

!defined('SECURE') and exit;

$result = $mysqli->query(sprintf('CALL eua.summeAusgabenMonate(%s);', $_SESSION['defaultKonto']));

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

