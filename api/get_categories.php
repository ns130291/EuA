<?php

!defined('SECURE') and exit;

if(isset($_POST['mincount']) && is_numeric($_POST['mincount'])){
    $result = $mysqli->query(sprintf('CALL eua.getCategories(%s, %s);', $_POST['mincount'], $_SESSION['defaultKonto']));
} else {
    $result = $mysqli->query(sprintf('CALL eua.getCategories(0, %s);', $_SESSION['defaultKonto']));
}

if (!$result) {
    echo '{"error":"server","msg":"Keine Ergebnisse"}';
} else {
    $rows = array();
    while ($array = $result->fetch_assoc()) {
        $rows[] = $array['kategorie'];
    }
    $kategorien = json_encode($rows);
    $json = '{"kategorien":' . $kategorien . '}';
    echo $json;
}

