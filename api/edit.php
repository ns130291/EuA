<?php

!defined('SECURE') and exit;

if (!isset($_POST["idausgabe"])) {
    die('{"error":"server","msg":"Ausgaben ID fehlt"}');
}

$sql = 'UPDATE eua.ausgabe SET';

$set = '';
if (isset($_POST["datum"])) {
    $set .= ' datum="' . $mysqli->real_escape_string($_POST["datum"]) . '",';
}
if (isset($_POST["kategorie"])) {
    $set .= ' kategorie="' . $mysqli->real_escape_string(urldecode($_POST["kategorie"])) . '",';
}
if (isset($_POST["art"])) {
    $set .= ' art="' . $mysqli->real_escape_string(urldecode($_POST["art"])) . '",';
}
if (isset($_POST["preis"])) {
    $set .= ' preis=' . $mysqli->real_escape_string($_POST["preis"]) . ',';
}
if (isset($_POST["beschreibung"])) {
    $set .= ' beschreibung="' . $mysqli->real_escape_string(urldecode($_POST["beschreibung"])) . '",';
}

$json = array();
$json["idausgabe"] = $_POST["idausgabe"];

if (!empty($set)) {
    $sql .= rtrim($set, ",");
    $sql .= ' WHERE idausgabe = ' . $mysqli->real_escape_string($_POST["idausgabe"]) . ';';

    $result = $mysqli->query($sql);

    if ($result) {
        $json["changed"] = "true";
    } else {
        $json["changed"] = "false";
    }
} else {
    $json["changed"] = "true";
}

echo json_encode($json);

