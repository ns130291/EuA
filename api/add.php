<?php

!defined('SECURE') and exit;

$datum = '"' . $_POST["datum"] . '"';
$kategorie = "";
if (isset($_POST["kategorie"])) {
    $kategorie = '"' . $_POST["kategorie"] . '"';
} else {
    $kategorie = "null";
}
$art = '"' . urldecode($_POST["art"]) . '"';
$preis = $_POST["preis"];
$beschreibung = "";
if (isset($_POST["beschreibung"])) {
    $beschreibung = '"' . $_POST["beschreibung"] . '"';
} else {
    $beschreibung = "null";
}

$mysqli->query(sprintf('CALL eua.ausgabeSpeichern(%s,%s,%s,%s,%s,%s);', $datum, $kategorie, $art, $preis, $beschreibung, $_SESSION['defaultKonto']));
$insertId = $mysqli->insert_id;
if ($insertId == 0) {
    $result = $mysqli->query('SELECT MAX(idausgabe) as insertid FROM ausgabe;');
    if ($result) {
        $row = $result->fetch_assoc();
        $insertId = $row['insertid'];
    }
}
echo '{"id":"' . $insertId . '"}';

