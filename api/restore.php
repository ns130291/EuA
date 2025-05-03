<?php
!defined('SECURE') and exit;

// Restore a trashed entry (expense or income)
if (empty($_POST['type']) || empty($_POST['id'])) {
    die(json_encode(['error' => 'params_missing', 'msg' => 'Type oder ID fehlt']));
}

$type = $_POST['type'];
$id = filter_input(INPUT_POST, 'id', FILTER_SANITIZE_NUMBER_INT);

// Determine active account
$kontoid = isset($_SESSION['currentKonto']) ? $_SESSION['currentKonto'] : $_SESSION['defaultKonto'];

// Prepare update based on type
if ($type === 'ausgaben') {
    $stmt = $mysqli->prepare('UPDATE ausgabe SET trash=0, trashdate=NULL WHERE idausgabe=? AND konto=?');
} elseif ($type === 'einnahmen') {
    $stmt = $mysqli->prepare('UPDATE einnahme SET trash=0, trashdate=NULL WHERE ideinnahme=? AND konto=?');
} else {
    die(json_encode(['error' => 'invalid_type', 'msg' => 'Ungültiger Typ']));
}

if (!$stmt) {
    die(json_encode(['error' => 'server', 'msg' => 'Datenbankfehler: ' . $mysqli->error]));
}

$stmt->bind_param('ii', $id, $kontoid);
if (!$stmt->execute()) {
    die(json_encode(['error' => 'server', 'msg' => 'Fehler beim Wiederherstellen: ' . $stmt->error]));
}

echo json_encode(['success' => true]);
?>