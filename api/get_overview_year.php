<?php

!defined('SECURE') and exit;

if (!isset($_POST["jahr"])) {
    die('{"error":"server","msg":"Jahr fehlt"}');
}
$jahr = $_POST["jahr"];

$result = $mysqli->query(sprintf('CALL eua.jahresuebersicht(%s);', $jahr));

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

