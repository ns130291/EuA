<?php
mysqli_report(MYSQLI_REPORT_OFF); // PHP >= 8.1 throws by default; this code checks return values
require("PasswordHash.php");

header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

// only used so that an unknown user costs as much time as a wrong password
define('DUMMY_HASH', '$2a$08$' . str_repeat('.', 53));

function startSession() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    ini_set('session.use_strict_mode', '1'); // never adopt a session id the client made up
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => true, // TLS ends at haproxy, which redirects all http to https
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

// $_POST values can be arrays (user[]=x); treat anything but a string as missing
function postString($key) {
    return (isset($_POST[$key]) && is_string($_POST[$key])) ? $_POST[$key] : '';
}

function dbConnect($name) {
    return new mysqli('mysql', 'eua', NULL, $name);
}

// prepared statement with one string parameter; returns the result set or false
function dbQuery($mysqli, $sql, $value) {
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        return false;
    }
    $stmt->bind_param('s', $value);
    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }
    $result = $stmt->get_result();
    $stmt->close();
    return $result;
}

// slows down password guessing a little
function failDelay() {
    usleep(random_int(200000, 400000));
}

function loginDir() {
    $dir = dirname($_SERVER['SCRIPT_NAME']);
    return $dir == '/' ? '' : $dir;
}

// https URL on the host the request came in on (haproxy talks plain http to the backend)
function ownLocation($path) {
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
    if (!preg_match('/^[A-Za-z0-9.-]+(:[0-9]{1,5})?$/', $host)) {
        return $path;
    }
    return 'https://' . $host . $path;
}

// only a path on this host: starts with a single "/", no control characters
function isLocalPath($path) {
    return is_string($path) && preg_match('#^/(?![/\\\\])#', $path) && !preg_match('/[\x00-\x1f\x7f]/', $path);
}

$errorUser = false;
$errorPW = false;
$errorLogin = false;
$errorServer = false;
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $auth = postString('auth');
    $user = postString('user');
    $pw = postString('pw');
    if (isset($_POST['auth'])) {
        if ($auth == '') {
            echo 'false';
            exit;
        }
        $mysqli = dbConnect('users');
        if ($mysqli->connect_error) {
            echo 'false';
            exit;
        }
        $mysqli->set_charset('utf8');
        $result = dbQuery($mysqli, 'SELECT * FROM users.tokens WHERE token=?', $auth);
        if (!$result || $result->num_rows !== 1) {
            echo 'false';
            exit;
        } // else --> token is valid, continue
        $mysqli->close();
        if ($pw == '') { // only check if user exists
            $mysqli = dbConnect('eua');
            if ($mysqli->connect_error) {
                echo 'false';
                exit;
            }
            $mysqli->set_charset('utf8');
            $result = dbQuery($mysqli, 'SELECT * FROM eua.user WHERE user=?', $user);
            echo ($result && $result->num_rows === 1) ? 'true' : 'false';
            exit;
        }
    }
    if ($user == '') {
        $errorUser = true;
    }
    if ($pw == '') {
        $errorPW = true;
    }
    if (!$errorPW && !$errorUser) {
        startSession();
        $_SESSION['angemeldet'] = false;
        if (strlen($user) > 20 || strlen($pw) > 72) { // longer than the user column / than bcrypt looks at
            failDelay();
            $errorLogin = true;
        } else {
            $mysqli = dbConnect('eua');
            if ($mysqli->connect_error) {
                $errorServer = true;
            } else {
                $mysqli->set_charset('utf8');
                $t_hasher = new PasswordHash(8, FALSE);

                $result = dbQuery($mysqli, 'CALL eua.checkPw(?)', $user);
                if (!$result) {
                    $errorServer = true;
                } else {
                    $row = $result->fetch_array();
                    $storedHash = $row ? $row[0] : null;
                    // always verify against some hash, also for unknown users (timing)
                    $check = $t_hasher->CheckPassword($pw, $storedHash ? $storedHash : DUMMY_HASH);
                    if ($check && $storedHash) {
                        $mysqli->close();
                        $mysqli = dbConnect('eua');
                        if ($mysqli->connect_error) {
                            $errorServer = true;
                        } else {
                            $result = dbQuery($mysqli, 'CALL eua.standardKonto(?)', $user);
                            if (!$result) {
                                $errorServer = true;
                            } else {
                                $row = $result->fetch_array();
                                $defaultKonto = $row ? $row[0] : null;
                                if ($defaultKonto) {
                                    session_regenerate_id(true); // new id after login (session fixation)
                                    $_SESSION['user'] = $user;
                                    $_SESSION['defaultKonto'] = $defaultKonto;
                                    $_SESSION['angemeldet'] = true;
                                } else {
                                    $errorServer = true;
                                }
                            }
                        }
                    } else {
                        failDelay();
                        $errorLogin = true;
                    }
                }
                if (!$mysqli->connect_error) {
                    $mysqli->close();
                }
            }
        }
        if (isset($_POST['auth'])) { // authentication for external services
            echo $_SESSION['angemeldet'] ? 'true' : 'false';
            exit;
        } else {
            if ($_SESSION['angemeldet']) {
                if (isset($_SESSION['lastURL']) && isLocalPath($_SESSION['lastURL'])) {
                    $target = $_SESSION['lastURL'];
                } else {
                    $target = loginDir() . '/index.php';
                }
                unset($_SESSION['lastURL']);
                header('Location: ' . ownLocation($target), true, 303);
                exit;
            }
        }
    }
} else {
    startSession();

    if (isset($_GET['logout'])) {
        session_destroy();
        $_SESSION = array();
        startSession();
    }

    if (!empty($_SESSION['angemeldet'])) {
        header('Location: ' . ownLocation(loginDir() . '/index.php'));
        exit;
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