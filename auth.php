<?php
session_start(); // Inicia a sessão antes de qualquer output

// Inclui o arquivo de conexão
require_once "includes/db_connect.php";

// Limpa erros anteriores
unset($_SESSION["login_error"]);

// Verifica se username e password foram enviados
if($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['username']) && isset($_POST['password'])){

    $username = trim($_POST['username']);
    $password = trim($_POST['password']);

    // Validação básica (pode ser mais robusta)
    if(empty($username) || empty($password)){
        $_SESSION["login_error"] = "Por favor, preencha o usuário e a senha.";
        header("location: login.php");
        exit;
    }

    // Prepara a consulta SQL para evitar SQL Injection
    $sql = "SELECT id, username, password_hash FROM users WHERE username = ?";

    if($stmt = $mysqli->prepare($sql)){
        // Vincula variáveis aos parâmetros da declaração preparada
        $stmt->bind_param("s", $param_username);

        // Define parâmetros
        $param_username = $username;

        // Tenta executar a declaração preparada
        if($stmt->execute()){
            // Armazena o resultado
            $stmt->store_result();

            // Verifica se o usuário existe, se sim, verifica a senha
            if($stmt->num_rows == 1){
                // Vincula variáveis de resultado
                $stmt->bind_result($id, $username_db, $hashed_password);
                if($stmt->fetch()){
                    // Verifica a senha usando password_verify
                    if(password_verify($password, $hashed_password)){
                        // Senha correta, inicia uma nova sessão

                        // Armazena dados na sessão
                        $_SESSION["loggedin"] = true;
                        $_SESSION["user_id"] = $id;
                        $_SESSION["username"] = $username_db;

                        // Redireciona para o dashboard
                        header("location: dashboard.php");
                        exit;
                    } else{
                        // Senha incorreta
                        $_SESSION["login_error"] = "Usuário ou senha inválidos.";
                        header("location: login.php");
                        exit;
                    }
                }
            } else{
                // Usuário não encontrado
                $_SESSION["login_error"] = "Usuário ou senha inválidos.";
                header("location: login.php");
                exit;
            }
        } else{
            $_SESSION["login_error"] = "Oops! Algo deu errado. Tente novamente mais tarde.";
            header("location: login.php");
            exit;
        }
        // Fecha a declaração
        $stmt->close();
    } else {
         $_SESSION["login_error"] = "Erro ao preparar a consulta.";
         header("location: login.php");
         exit;
    }

    // Fecha a conexão
    $mysqli->close();

} else {
    // Se não for POST ou faltar dados, volta para o login
    $_SESSION["login_error"] = "Acesso inválido.";
    header("location: login.php");
    exit;
}
?>