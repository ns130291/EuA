<?php

!defined('SECURE') and exit;

// Determine active konto
$kontoid = isset($_SESSION['currentKonto']) ? $_SESSION['currentKonto'] : $_SESSION['defaultKonto'];

if (!isset($_POST["jahr"]) || !is_numeric($_POST["jahr"])) {
    die('{"error":"server","msg":"Jahr fehlt"}');
}
$jahr = (int)$_POST["jahr"];

if (!isset($_POST["kategorie"])) {
    die('{"error":"server","msg":"Kategorie fehlt"}');
}
$kategorie = $_POST["kategorie"];

if($kategorie == "null"){
    $result = $mysqli->query(sprintf('CALL eua.jahresuebersichtKategorie(%d, NULL, %d);', $jahr, $kontoid));
} else {
    $result = $mysqli->query(sprintf('CALL eua.jahresuebersichtKategorie(%d, "%s", %d);', $jahr, $mysqli->real_escape_string($kategorie), $kontoid));
}

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

