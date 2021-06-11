<?php
require("PasswordHash.php");
$errorUser = false;
$errorPW = false;
$errorLogin = false;
$errorServer = false;
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['auth'])) {
        if ($_POST['auth'] == '') {
            echo 'false';
            exit;
        }
        $mysqli = new mysqli('localhost', 'eua', NULL, 'users');
        if ($mysqli->connect_error) {
            echo 'false';
            exit;
        }
        $mysqli->set_charset('utf8');
        $result = $mysqli->query('SELECT * FROM users.tokens WHERE token="' . $mysqli->real_escape_string($_POST['auth']) . '";');
        if (!$result) {
            echo 'false';
            exit;
        } else {
            if($result->num_rows !== 1) {
                echo 'false';
                exit;
            } // else --> token is valid, continue
        }
        $mysqli->close();
        if (!isset($_POST['pw']) || $_POST['pw'] == '') { // only check if user exists
            $mysqli = new mysqli('localhost', 'eua', NULL, 'eua');
            if ($mysqli->connect_error) {
                echo 'false';
                exit;
            }
            $mysqli->set_charset('utf8');
            $result = $mysqli->query('SELECT * FROM eua.user WHERE user="' . $mysqli->real_escape_string($_POST['user']) . '";');
            if (!$result) {
                echo 'false';
                exit;
            } else {
                if($result->num_rows !== 1) {
                    echo 'false';
                    exit;
                } else {
                    echo 'true';
                    exit;
                }
            }
            $mysqli->close();
        }
    }
    if (!isset($_POST['user']) || $_POST['user'] == '') {
        $errorUser = true;
    }
    if (!isset($_POST['pw']) || $_POST['pw'] == '') {
        $errorPW = true;
    }
    if (!$errorPW && !$errorUser) {
        session_start();
        $mysqli = new mysqli('localhost', 'eua', NULL, 'eua');
        if ($mysqli->connect_error) {
            $_SESSION['angemeldet'] = false;
            $errorServer = true;
        }
        $mysqli->set_charset('utf8');
        $t_hasher = new PasswordHash(8, FALSE);

        $result = $mysqli->query(sprintf('CALL eua.checkPw("%s");', $_POST["user"]));
        if (!$result) {
            $_SESSION['angemeldet'] = false;
            $errorServer = true;
        } else {
            $pw = $result->fetch_array();
            $pw = $pw[0];
            if ($pw) {
                $check = $t_hasher->CheckPassword($_POST["pw"], $pw);
                if ($check) {
                    $mysqli->close();
                    $mysqli = new mysqli('localhost', 'eua', NULL, 'eua');
                    $result = $mysqli->query(sprintf('CALL eua.standardKonto("%s");', $_POST["user"]));
                    if (!$result) {
                        $_SESSION['angemeldet'] = false;
                        $errorServer = true;
                    } else {
                        $defaultKonto = $result->fetch_array();
                        $defaultKonto = $defaultKonto[0];
                        if ($defaultKonto) {
                            $_SESSION['user'] = $_POST["user"];
                            $_SESSION['defaultKonto'] = $defaultKonto;
                            $hostname = $_SERVER['HTTP_HOST'];
                            $path = dirname($_SERVER['PHP_SELF']);
                            $_SESSION['angemeldet'] = true;
                        } else {
                            $_SESSION['angemeldet'] = false;
                            $errorServer = true;
                        }
                    }
                } else {
                    $_SESSION['angemeldet'] = false;
                    $errorLogin = true;
                }
            } else {
                $_SESSION['angemeldet'] = false;
                $errorLogin = true;
            }
        }
        $mysqli->close();
        if (isset($_POST['auth'])) { // authentication for external services
            if ($_SESSION['angemeldet'] == true) {
                echo 'true';
                exit;
            } else {
                echo 'false';
                exit;
            }
        } else {
            if ($_SESSION['angemeldet'] == true) {
                if (isset($_SESSION['lastURL'])) {
                    header('Location: https://' . $hostname . $_SESSION['lastURL'], true, 303);
                    unset($_SESSION['lastURL']);
                } else {
                    header('Location: https://' . $hostname . ($path == '/' ? '' : $path) . '/index.php', true, 303);
                }
                exit;
            }
        }
    }
} else {
    session_start();
    
    if (isset($_GET['logout'])) {
        session_destroy();
        $_SESSION = array();
        session_start();
    }
    
    if ($_SESSION) {
        if (isset($_SESSION['angemeldet']) && $_SESSION['angemeldet']) {
            $hostname = $_SERVER['HTTP_HOST'];
            $path = dirname($_SERVER['PHP_SELF']);
            header('Location: https://' . $hostname . ($path == '/' ? '' : $path) . '/index.php');
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
        <link rel="stylesheet" href="fontello/css/nsvb-symbol.css">
        <link rel="stylesheet" href="fontello/css/animation.css">
        <script type="text/javascript" src="login.js"></script>
    </head>
    <body>
        <div id="spacertop" class="preload-symbol"></div>
        <div id="logincontainer">
            <div id="login">
                <div id="loginformcontainer">
                    <?php /* irgendwas verhindert, dass auf der android tastatur "next" angezeigt wird für die formularfelder */ ?>
                    <form action="login.php" method="post" id="loginform">
                        <?php
                        if ($errorUser) {
                            echo '<div class="error-login">Username muss angegeben werden</div>';
                        }
                        if ($errorPW) {
                            echo '<div class="error-login">Passwort fehlt</div>';
                        }
                        if ($errorLogin) {
                            echo '<div class="error-login">Login fehlgeschlagen: Username und Passwort überprüfen</div>';
                        }
                        if ($errorServer) {
                            echo '<div class="error-login">Login nicht möglich: Bitte später erneut probieren</div>';
                        }
                        ?>
                        <div class="cf" style="padding-bottom: 5px;">
                            <label for="user" class="login-label left">Benutzer</label><input id="user" name="user" class="right login-input" type="text" autofocus="autofocus"/>
                        </div>
                        <div class="cf">
                            <label for="pw" class="login-label left">Passwort</label><input id="pw" name="pw" class="right login-input" type="password"/>
                        </div>
                        <div class="cf" style="padding-top: 25px;">
                            <div id="loginbutton" class="right">
                                <input type="submit" id="submitBtn" value="Login"/>
                            </div>
                            <a href="#" class="left" style="display: none;">Account anlegen</a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </body>
</html>