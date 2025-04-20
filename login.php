<?php
// Inicia a sessão
session_start();

// Se o usuário já está logado, redireciona para o dashboard
if(isset($_SESSION["loggedin"]) && $_SESSION["loggedin"] === true){
    header("location: dashboard.php");
    exit;
}

// Inclui o arquivo de conexão (necessário se formos verificar algo no DB aqui,
// mas a verificação principal será no auth.php)
// require_once "includes/db_connect.php"; // Descomente se precisar do DB aqui

$login_err = "";
if(isset($_SESSION["login_error"])) {
    $login_err = $_SESSION["login_error"];
    unset($_SESSION["login_error"]); // Limpa o erro após exibir
}
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - MedNotes</title>
    <link rel="stylesheet" href="css/style.css">
    <style>
        /* Estilos específicos para a página de login */
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f0f2f5; }
        .login-container { background: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }
        .login-container h2 { margin-bottom: 25px; color: #333; }
        .form-group { margin-bottom: 20px; text-align: left; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; }
        .form-group input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        .btn-login { background-color: #007bff; color: white; padding: 12px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%; transition: background-color 0.3s ease; }
        .btn-login:hover { background-color: #0056b3; }
        .error-message { color: #dc3545; margin-bottom: 15px; font-size: 0.9em; }
        .register-link { margin-top: 20px; font-size: 0.9em;}
        .register-link a { color: #007bff; text-decoration: none; }
        .register-link a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="login-container">
        <h2>Login MedNotes</h2>
        <?php if(!empty($login_err)): ?>
            <p class="error-message"><?php echo $login_err; ?></p>
        <?php endif; ?>
        <form action="auth.php" method="post">
            <div class="form-group">
                <label for="username">Usuário:</label>
                <input type="text" name="username" id="username" required>
            </div>
            <div class="form-group">
                <label for="password">Senha:</label>
                <input type="password" name="password" id="password" required>
            </div>
            <button type="submit" class="btn-login">Entrar</button>
        </form>
         <p class="register-link">Não tem uma conta? <a href="register.php">Registre-se</a></p>
    </div>
</body>
</html>