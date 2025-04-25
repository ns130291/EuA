<?php
defined('SECURE') or exit;
header('Content-Type: application/json; charset=utf-8');
if (!isset($_SESSION['user'])) {
    echo json_encode(['error'=>'not_logged_in']);
    exit;
}
$user = $_SESSION['user'];
$stmt = $mysqli->prepare('SELECT k.idkonto, k.name FROM konto k JOIN userkonto uk ON uk.kontoid = k.idkonto WHERE uk.user = ?');
$stmt->bind_param('s', $user);
$stmt->execute();
$result = $stmt->get_result();
$accounts = [];
while ($row = $result->fetch_assoc()) {
    $row['idkonto'] = (int)$row['idkonto'];
    $accounts[] = $row;
}
$current = isset($_SESSION['currentKonto']) ? $_SESSION['currentKonto'] : $_SESSION['defaultKonto'];
echo json_encode(['accounts'=>$accounts, 'current'=>$current]);
