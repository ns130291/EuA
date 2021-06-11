<?php

session_start();
if (!isset($_SESSION['angemeldet']) || !$_SESSION['angemeldet']) {
    $hostname = $_SERVER['HTTP_HOST'];
    $path = dirname($_SERVER['PHP_SELF']);
    die('{"error":"not_logged_in","location":"https://' . $hostname . ($path == '/' ? '' : $path) . '/login.php"}');
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (!isset($_POST['action'])) {
        $json = array();
        $json['error'] = 'action_missing';
        $json['msg'] = 'API error: \'action\' parameter missing';
        die(json_encode($json));
    }

    $mysqli = new mysqli('mysql', 'eua', NULL, 'eua');

    if ($mysqli->connect_error) {
        die('{"error":"server","msg":"Datenbankfehler: #' . $mysqli->connect_errno . ' ' . $mysqli->connect_error . '"}');
    }
    
    $mysqli->set_charset('utf8');

    define('SECURE', true);

    switch ($_POST['action']) {
        case 'delete':
            require 'api/delete.php';
            break;
        case 'edit':
            require 'api/edit.php';
            break;
        case 'add':
            require 'api/add.php';
            break;
        case 'get_month':
            require 'api/get_month.php';
            break;
        case 'get_sum_months':
            require 'api/get_sum_months.php';
            break;
        case 'get_overview_month':
            require 'api/get_overview_month.php';
            break;
        case 'get_overview_year':
            require 'api/get_overview_year.php';
            break;
        case 'get_overview_year_category':
            require 'api/get_overview_year_category.php';
            break;
        case 'get_categories':
            require 'api/get_categories.php';
            break;

        default:
            $json = array();

            $json['error'] = 'not_implemented';
            $json['msg'] = 'Action ' . $_POST['action'] . ' is not implemented';

            echo json_encode($json);
            break;
    }

    $mysqli->close();
} else {
    $json = array();

    $json['error'] = 'wrong_method';
    $json['msg'] = 'Only POST requests are accepted';

    echo json_encode($json);
}
