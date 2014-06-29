<?php
require("PasswordHash.php");
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    session_start();
    $link = mysql_connect(':/var/run/mysqld/mysqld.sock', 'eua');
    //$link = mysql_connect('localhost:3306', 'root');
    if (!$link) {
        die('Verbindung schlug fehl: ' . mysql_error());
    }
    $t_hasher = new PasswordHash(8, FALSE);
    $result = mysql_query(sprintf('CALL eua.checkPw("%s");', $_POST["user"]));
    if (!$result) {
        //header 500
        $message = 'Ungültige Abfrage: ' . mysql_error() . "\n";
        die($message);
    } else {
        if (mysql_result($result, 0)) {
            $check = $t_hasher->CheckPassword($_POST["pw"], mysql_result($result, 0));
            if ($check) {
                $hostname = $_SERVER['HTTP_HOST'];
                $path = dirname($_SERVER['PHP_SELF']);
                $_SESSION['angemeldet'] = true;
                header('Location: https://' . $hostname . ($path == '/' ? '' : $path) . '/index.php', true, 303);
                //header('Location: http://' . $hostname . ($path == '/' ? '' : $path) . '/index.php', true, 303);
                exit;
            } else {
                $_SESSION['angemeldet'] = false;
            }
        }
    }
    mysql_close($link);
} else {
    session_start();
    $hostname = $_SERVER['HTTP_HOST'];
    $path = dirname($_SERVER['PHP_SELF']);
    if ($_SESSION) {
        if (!isset($_SESSION['angemeldet']) && !$_SESSION['angemeldet']) {
            header('Location: https://' . $hostname . ($path == '/' ? '' : $path) . '/index.php');
            //header('Location: http://' . $hostname . ($path == '/' ? '' : $path) . '/index.php');
            exit;
        }
    }
}
?>

<!DOCTYPE html>
<html>
    <head>
        <title>Login</title>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <meta name="viewport" content="width=device-width">
        <link rel="stylesheet" href="main.css">
        <script type="text/javascript" src="login.js"></script>
    </head>
    <body>
        <div id="spacertop"></div>
        <div id="logincontainer">
            <div id="login">
                <div id="loginformcontainer">
                    <?php /* irgendwas verhindert, dass auf der android tastatur "next" angezeigt wird für die formularfelder */ ?>
                    <form action="login.php" method="post" id="loginform">
                        <div class="cf" style="padding-bottom: 5px;">
                            <label for="user" class="login-label left">Benutzer</label><input id="user" name="user" class="right login-input" type="text"/>
                        </div>
                        <div class="cf">
                            <label for="pw" class="login-label left">Passwort</label><input id="pw" class="right login-input" type="password"/>
                        </div>
                        <div class="cf" style="padding-top: 25px;">
                            <div id="loginbutton" class="right">
                                <input type="submit" id="submit" value="Login"/>
                                <input id="hidden" name="pw" type="hidden"/>
                            </div>
                            <a href="#" class="left" style="display: none;">Account anlegen</a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </body>
</html>