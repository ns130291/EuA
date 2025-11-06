<?php
!defined('SECURE') and exit;

// Simple search endpoint that searches the 'art' field in both ausgabe and einnahme
if (!isset($_POST['q'])) {
    echo json_encode(array('error' => 'server', 'msg' => 'Query parameter missing'));
    exit;
}

$q = $mysqli->real_escape_string(trim($_POST['q']));
if ($q === '') {
    echo json_encode(array('ausgaben' => array(), 'einnahmen' => array()));
    exit;
}

// Determine active account
$kontoid = isset($_SESSION['currentKonto']) ? $_SESSION['currentKonto'] : $_SESSION['defaultKonto'];

$like = "%%%s%%";
$like = sprintf($like, $q);

$ausgaben = array();
$query = sprintf("SELECT idausgabe, datum, kategorie, art, preis, beschreibung FROM ausgabe WHERE konto=%d AND trash=0 AND art LIKE '%s' ORDER BY datum DESC LIMIT 100", intval($kontoid), $mysqli->real_escape_string($like));
$result = $mysqli->query($query);
if ($result) {
    while ($row = $result->fetch_assoc()) {
        foreach ($row as $key => $val) {
            $row[$key] = htmlspecialchars($val);
        }
        $ausgaben[] = $row;
    }
} else {
    die(json_encode(array('error' => 'server', 'msg' => 'Fehler bei Suche (Ausgaben): ' . $mysqli->error)));
}

$einnahmen = array();
$query = sprintf("SELECT ideinnahme, datum, kategorie, art, preis, beschreibung FROM einnahme WHERE konto=%d AND trash=0 AND art LIKE '%s' ORDER BY datum DESC LIMIT 100", intval($kontoid), $mysqli->real_escape_string($like));
$result = $mysqli->query($query);
if ($result) {
    while ($row = $result->fetch_assoc()) {
        foreach ($row as $key => $val) {
            $row[$key] = htmlspecialchars($val);
        }
        $einnahmen[] = $row;
    }
} else {
    die(json_encode(array('error' => 'server', 'msg' => 'Fehler bei Suche (Einnahmen): ' . $mysqli->error)));
}

echo json_encode(array('ausgaben' => $ausgaben, 'einnahmen' => $einnahmen));
?>
