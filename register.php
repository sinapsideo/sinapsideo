<?php
session_start();
if(isset($_SESSION["loggedin"]) && $_SESSION["loggedin"] === true){
    header("location: dashboard.php");
    exit;
}

$register_err = "";
$register_success = "";

if(isset($_SESSION["register_error"])) {
    $register_err = $_SESSION["register_error"];
    unset($_SESSION["register_error"]);
}
if(isset($_SESSION["register_success"])) {
    $register_success = $_SESSION["register_success"];
    unset($_SESSION["register_success"]);
}
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registrar - MedNotes</title>
    <link rel="stylesheet" href="css/style.css">
    <style>
        /* Reutiliza estilos do login.php ou cria novos */
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f0f2f5; }
        .register-container { background: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }
        .register-container h2 { margin-bottom: 25px; color: #333; }
        .form-group { margin-bottom: 20px; text-align: left; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; }
        .form-group input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        .btn-register { background-color: #28a745; color: white; padding: 12px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%; transition: background-color 0.3s ease; }
        .btn-register:hover { background-color: #218838; }
        .error-message { color: #dc3545; margin-bottom: 15px; font-size: 0.9em; }
        .success-message { color: #28a745; margin-bottom: 15px; font-size: 0.9em; }
        .login-link { margin-top: 20px; font-size: 0.9em;}
        .login-link a { color: #007bff; text-decoration: none; }
        .login-link a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="register-container">
        <h2>Registrar Nova Conta</h2>
        <?php if(!empty($register_err)): ?>
            <p class="error-message"><?php echo $register_err; ?></p>
        <?php endif; ?>
         <?php if(!empty($register_success)): ?>
            <p class="success-message"><?php echo $register_success; ?></p>
        <?php endif; ?>
        <form action="register_process.php" method="post">
            <div class="form-group">
                <label for="username">Usuário:</label>
                <input type="text" name="username" id="username" required>
            </div>
            <div class="form-group">
                <label for="password">Senha:</label>
                <input type="password" name="password" id="password" required>
            </div>
            <div class="form-group">
                <label for="confirm_password">Confirmar Senha:</label>
                <input type="password" name="confirm_password" id="confirm_password" required>
            </div>
            <button type="submit" class="btn-register">Registrar</button>
        </form>
        <p class="login-link">Já tem uma conta? <a href="login.php">Faça login</a></p>
    </div>
</body>
</html>