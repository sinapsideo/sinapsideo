<?php
// Inicia a sessão
session_start();

// Desfaz todas as variáveis da sessão
$_SESSION = array();

// Destrói a sessão.
session_destroy();

// Redireciona para a página de login
header("location: login.php");
exit;
?>