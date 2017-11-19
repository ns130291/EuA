<?php

!defined('SECURE') and exit;

if (!isset($_POST["jahr"])) {
    die('{"error":"server","msg":"Jahr fehlt"}');
}
$jahr = $_POST["jahr"];

if (!isset($_POST["kategorie"])) {
    die('{"error":"server","msg":"Kategorie fehlt"}');
}
$kategorie = $_POST["kategorie"];

if($kategorie == "null"){
    $result = $mysqli->query(sprintf('CALL eua.jahresuebersichtKategorie(%s, NULL, %s);', $jahr, $_SESSION['defaultKonto']));    
} else {
    $result = $mysqli->query(sprintf('CALL eua.jahresuebersichtKategorie(%s, "%s", %s);', $jahr, $kategorie, $_SESSION['defaultKonto']));
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

