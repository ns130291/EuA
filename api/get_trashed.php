<?php
// Returns trashed entries for both expenses (ausgaben) and income (einnahmen)
!defined('SECURE') and exit;

// Determine active account
$kontoid = isset($_SESSION['currentKonto']) ? $_SESSION['currentKonto'] : $_SESSION['defaultKonto'];

// Fetch trashed expenses
$ausgaben = array();
$query = "SELECT idausgabe, datum, kategorie, art, preis, beschreibung FROM ausgabe WHERE trash=1 AND konto=" . intval($kontoid) . " ORDER BY trashdate DESC";
$result = $mysqli->query($query);
if (!$result) {
    die(json_encode(array('error' => 'server', 'msg' => 'Fehler beim Abrufen der Ausgaben: ' . $mysqli->error)));
}
while ($row = $result->fetch_assoc()) {
    foreach ($row as $key => $val) {
        $row[$key] = htmlspecialchars($val);
    }
    $ausgaben[] = $row;
}

// Fetch trashed income
$einnahmen = array();
$query = "SELECT ideinnahme, datum, kategorie, art, preis, beschreibung FROM einnahme WHERE trash=1 AND konto=" . intval($kontoid) . " ORDER BY trashdate DESC";
$result = $mysqli->query($query);
if (!$result) {
    die(json_encode(array('error' => 'server', 'msg' => 'Fehler beim Abrufen der Einnahmen: ' . $mysqli->error)));
}
while ($row = $result->fetch_assoc()) {
    foreach ($row as $key => $val) {
        $row[$key] = htmlspecialchars($val);
    }
    $einnahmen[] = $row;
}

// Return combined JSON
echo json_encode(array(
    'ausgaben'  => $ausgaben,
    'einnahmen' => $einnahmen
));
?>