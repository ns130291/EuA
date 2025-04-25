<?php
defined('SECURE') or exit;
header('Content-Type: application/json; charset=utf-8');
// Determine active konto
$kontoid = isset($_POST['kontoid']) ? intval($_POST['kontoid']) : null;
if ($kontoid === null) {
    echo json_encode(['error'=>'kontoid_missing']);
    exit;
}
if (!isset($_SESSION['user'])) {
    echo json_encode(['error'=>'not_logged_in']);
    exit;
}
$user = $_SESSION['user'];
$stmt = $mysqli->prepare('SELECT 1 FROM userkonto WHERE user = ? AND kontoid = ?');
$stmt->bind_param('si', $user, $kontoid);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows !== 1) {
    echo json_encode(['error'=>'invalid_konto']);
    exit;
}
// Set current konto in session
$_SESSION['currentKonto'] = $kontoid;
echo json_encode(['success'=>true]);