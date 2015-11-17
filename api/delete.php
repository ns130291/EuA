<?php

!defined('SECURE') and exit;

if (!isset($_POST["idausgabe"])) {
    die('{"error":"server","msg":"Ausgaben ID fehlt"}');
}
$idausgabe = $_POST["idausgabe"];

$result = $mysqli->query(sprintf('CALL eua.ausgabeLöschen(%s, %s);', $idausgabe, $_SESSION['defaultKonto']));

$json = array();

$json["idausgabe"] = $idausgabe;

if ($result == true) {
    $json["deleted"] = "true";
} else {
    $json["deleted"] = "false";
}

echo json_encode($json);
