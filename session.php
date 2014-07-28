<?php

function my_session_start() {
    if (isset($_COOKIE['PHPSESSID'])) {
        $sessid = $_COOKIE['PHPSESSID'];
    } else if (isset($_GET['PHPSESSID'])) {
        $sessid = $_GET['PHPSESSID'];
    } else {
        session_start();
        return false;
    }

    if (!preg_match('/^[a-z0-9]{32}$/', $sessid)) {
        return false;
    }
    session_start();

    return true;
}

?>