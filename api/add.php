<?php

!defined('SECURE') and exit;

// Determine active konto
$kontoid = isset($_SESSION['currentKonto']) ? $_SESSION['currentKonto'] : $_SESSION['defaultKonto'];

$datum = '"' . $_POST["datum"] . '"';
$kategorie = "";
if (isset($_POST["kategorie"]) && $_POST["kategorie"] !== "") {
    $kategorie = '"' . trim($mysqli->real_escape_string(urldecode($_POST["kategorie"]))) . '"';
} else {
    $kategorie = "null";
}
$art = '"' . trim($mysqli->real_escape_string(urldecode($_POST["art"]))) . '"';
$preis = $_POST["preis"];
$beschreibung = "";
if (isset($_POST["beschreibung"]) && $_POST["beschreibung"] !== "") {
    $beschreibung = '"' . $mysqli->real_escape_string(urldecode($_POST["beschreibung"])) . '"';
} else {
    $beschreibung = "null";
}

$query = '';
if($_POST["entrytype"] === 'earnings') {
    $query = sprintf('CALL eua.einnahmeSpeichern(%s,%s,%s,%s,%s,%s);', $datum, $kategorie, $art, $preis, $beschreibung, $kontoid);
} else {
    $query = sprintf('CALL eua.ausgabeSpeichern(%s,%s,%s,%s,%s,%s);', $datum, $kategorie, $art, $preis, $beschreibung, $kontoid);
}

$result = $mysqli->query($query);
if ($result) {
    $insertId = $mysqli->insert_id;

    if ($insertId == 0) {
        if($_POST["entrytype"] === 'earnings') {
            $result = $mysqli->query('SELECT MAX(ideinnahme) as insertid FROM einnahme;');
        } else {
            $result = $mysqli->query('SELECT MAX(idausgabe) as insertid FROM ausgabe;');
        }
        if ($result) {
            $row = $result->fetch_assoc();
            $insertId = $row['insertid'];
        }
    }
    echo '{"id":"' . $insertId . '", "entrytype":"' . $_POST["entrytype"] . '"}';
} else {
    echo('{"error":"server","msg":"Insert error ' . $mysqli->error . '"}');
}

