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

$mysqli->query(sprintf('CALL eua.ausgabeSpeichern(%s,%s,%s,%s,%s);', $datum, $kategorie, $art, $preis, $beschreibung));

echo '{"id":"' . $mysqli->insert_id . '"}';

