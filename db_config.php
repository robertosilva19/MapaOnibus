<?php
define('DB_HOST', 'localhost');
define('DB_USER', 'root'); // Substitua pelo seu usuário MySQL
define('DB_PASS', '');   // Substitua pela sua senha MySQL
define('DB_NAME', 'MapaOnibus');  // Nome do banco de dados alterado para 'MapaOnibus'

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("Erro de conexão com o banco de dados: " . $e->getMessage());
}
?>