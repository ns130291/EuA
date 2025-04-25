<?php

!defined('SECURE') and exit;

// Determine active konto
$kontoid = isset($_SESSION['currentKonto']) ? $_SESSION['currentKonto'] : $_SESSION['defaultKonto'];

if($_POST["entrytype"] === 'earnings'){
    if (!isset($_POST["ideinnahme"])) {
        die('{"error":"server","msg":"Einnahmen ID fehlt"}');
    }   
    
    $ideinnahme = $_POST["ideinnahme"];

    $result = $mysqli->query(sprintf('CALL eua.einnahmeLöschen(%s, %s);', $ideinnahme, $kontoid));

    $json = array();

    $json["idausgabe"] = $ideinnahme;

    if ($result == true) {
        $json["deleted"] = "true";
    } else {
        $json["deleted"] = "false";
    }

    echo json_encode($json);
} else {
    if (!isset($_POST["idausgabe"])) {
        die('{"error":"server","msg":"Ausgaben ID fehlt"}');
    }
    
    $idausgabe = $_POST["idausgabe"];

    $result = $mysqli->query(sprintf('CALL eua.ausgabeLöschen(%s, %s);', $idausgabe, $kontoid));

    $json = array();

    $json["idausgabe"] = $idausgabe;

    if ($result == true) {
        $json["deleted"] = "true";
    } else {
        $json["deleted"] = "false";
    }

    echo json_encode($json);
}




