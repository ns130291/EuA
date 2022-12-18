<?php

!defined('SECURE') and exit;

$json = array();
$sql;
$sqlWhere;
if($_POST["entrytype"] === 'earnings'){
    if (!isset($_POST["ideinnahme"])) {
        die('{"error":"server","msg":"Einnahmen ID fehlt"}');
    }   
    $json["ideinnahme"] = $_POST["ideinnahme"];
    $sql = 'UPDATE eua.einnahme SET';
    $sqlWhere = ' WHERE ideinnahme = ' . $mysqli->real_escape_string($_POST["ideinnahme"]) . ' AND konto = ' . $mysqli->real_escape_string($_SESSION['defaultKonto']) . ';';
} else {
    if (!isset($_POST["idausgabe"])) {
        die('{"error":"server","msg":"Ausgaben ID fehlt"}');
    }
    $json["idausgabe"] = $_POST["idausgabe"];
    $sql = 'UPDATE eua.ausgabe SET';
    $sqlWhere = ' WHERE idausgabe = ' . $mysqli->real_escape_string($_POST["idausgabe"]) . ' AND konto = ' . $mysqli->real_escape_string($_SESSION['defaultKonto']) . ';';
}


$set = '';
if (isset($_POST["datum"])) {
    $set .= ' datum="' . $mysqli->real_escape_string($_POST["datum"]) . '",';
}
if (isset($_POST["kategorie"])) { 
    if ($_POST["kategorie"] !== "") {
        $set .= ' kategorie="' . trim($mysqli->real_escape_string(urldecode($_POST["kategorie"]))) . '",';
    } else {
        $set .= ' kategorie=null,';
    }
}
if (isset($_POST["art"])) {
    $set .= ' art="' . trim($mysqli->real_escape_string(urldecode($_POST["art"]))) . '",';
}
if (isset($_POST["preis"])) {
    $set .= ' preis=' . $mysqli->real_escape_string($_POST["preis"]) . ',';
}
if (isset($_POST["beschreibung"])) {
    if($_POST["beschreibung"] !== "") {
        $set .= ' beschreibung="' . $mysqli->real_escape_string(urldecode($_POST["beschreibung"])) . '",';
    } else {
        $set .= ' beschreibung=null,';
    }
}

if (!empty($set)) {
    $sql .= rtrim($set, ",");
    $sql .= $sqlWhere;

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

