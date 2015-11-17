<html>
    <head>
        <title>PW Hasher</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body><?php
        require("PasswordHash.php");
        ini_set('display_errors', 1);
        ini_set('display_startup_errors', 1);
        error_reporting(-1);
        if ($_SERVER['REQUEST_METHOD'] == 'POST') {
            if (isset($_POST['pw'])) {
                $t_hasher = new PasswordHash(8, FALSE);
                $hashPassword = $t_hasher->HashPassword($_POST['pw']);
                echo $hashPassword;
            }
        } else {
            ?>
            <form action="generatehash.php" method="post">
                <input name="pw" type="password"/>
                <input type="submit" id="submitBtn" value="Generieren"/>
            </form>
            <?php
        }
        ?>
    </body>
</html>


