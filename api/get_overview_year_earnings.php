<?php

!defined('SECURE') and exit;

if (!isset($_POST["jahr"])) {
    die('{"error":"server","msg":"Jahr fehlt"}');
}
$jahr = $_POST["jahr"];

// Determine active konto: use currentKonto if set, otherwise defaultKonto
$kontoid = isset($_SESSION['currentKonto']) ? $_SESSION['currentKonto'] : $_SESSION['defaultKonto'];
$result = $mysqli->query(sprintf('CALL eua.jahresuebersichtEinnahmen(%s, %s);', $jahr, $kontoid));

if (!$result) {
    echo '{"error":"server","msg":"Keine Ergebnisse"}';
} else {
    $rows = array();
    while ($array = $result->fetch_assoc()) {
        $rows[] = $array;
    }
    $einnahmen = json_encode($rows);
    $json = '{"einnahmen":' . $einnahmen . '}';
    echo $json;
}
