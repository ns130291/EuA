<?php

!defined('SECURE') and exit;

$datum = '"' . $_POST["datum"] . '"';
$kategorie = "";
if (isset($_POST["kategorie"])) {
    $kategorie = '"' . $mysqli->real_escape_string(urldecode($_POST["kategorie"])) . '"';
} else {
    $kategorie = "null";
}
$art = '"' . $mysqli->real_escape_string(urldecode($_POST["art"])) . '"';
$preis = $_POST["preis"];
$beschreibung = "";
if (isset($_POST["beschreibung"])) {
    $beschreibung = '"' . $mysqli->real_escape_string(urldecode($_POST["beschreibung"])) . '"';
} else {
    $beschreibung = "null";
}
$query = sprintf('CALL eua.ausgabeSpeichern(%s,%s,%s,%s,%s,%s);', $datum, $kategorie, $art, $preis, $beschreibung, $_SESSION['defaultKonto']);
$result = $mysqli->query($query);
if ($result) {
    $insertId = $mysqli->insert_id;

    if ($insertId == 0) {
        $result = $mysqli->query('SELECT MAX(idausgabe) as insertid FROM ausgabe;');
        if ($result) {
            $row = $result->fetch_assoc();
            $insertId = $row['insertid'];
        }
    }
    echo '{"id":"' . $insertId . '"}';
} else {
    echo('{"error":"server","msg":"Insert error"}');
}

