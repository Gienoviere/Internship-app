<?php 
session_start();
$page_title = "Login - Dierenzorg Log";
?>
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $page_title; ?></title>
    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
        }
        .login-card {
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            overflow: hidden;
        }
        .login-header {
            background-color: #4a6fa5;
            color: white;
            padding: 1.5rem;
            text-align: center;
        }
        .login-body {
            padding: 2rem;
            background-color: white;
        }
        .btn-login {
            background-color: #4a6fa5;
            color: white;
            padding: 0.75rem;
            font-weight: 600;
        }
        .btn-login:hover {
            background-color: #3a5a80;
            color: white;
        }
        .logo-container {
            text-align: center;
            margin-bottom: 1.5rem;
        }
        .logo-icon {
            font-size: 3rem;
            color: #4a6fa5;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-6 col-lg-5">
                <div class="login-card">
                    <div class="login-header">
                        <h1 class="h3 mb-0">Dierenzorg Log Systeem</h1>
                        <p class="mb-0">Registreer en beheer dierenzorg taken</p>
                    </div>
                    <div class="login-body">
                        <div class="logo-container">
                            <i class="bi bi-heart-pulse logo-icon"></i>
                        </div>
                        
                        <form action="dashboard.php" method="POST">
                            <div class="mb-3">
                                <label for="username" class="form-label">Gebruikersnaam</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="bi bi-person"></i></span>
                                    <input type="text" class="form-control" id="username" name="username" placeholder="Voer uw gebruikersnaam in" required>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="password" class="form-label">Wachtwoord</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="bi bi-key"></i></span>
                                    <input type="password" class="form-control" id="password" name="password" placeholder="Voer uw wachtwoord in" required>
                                </div>
                            </div>
                            
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input" id="rememberMe">
                                <label class="form-check-label" for="rememberMe">Onthoud mij</label>
                            </div>
                            
                            <div class="d-grid gap-2 mb-3">
                                <button type="submit" class="btn btn-login">Inloggen</button>
                            </div>
                            
                            <div class="text-center">
                                <a href="#" class="text-decoration-none">Wachtwoord vergeten?</a>
                            </div>
                            
                            <hr class="my-4">
                            
                            <div class="text-center">
                                <p class="mb-0">Demo accounts:</p>
                                <div class="row mt-2">
                                    <div class="col-6">
                                        <button type="button" class="btn btn-outline-secondary btn-sm w-100" onclick="fillDemo('gebruiker', 'demo123')">Gebruiker</button>
                                    </div>
                                    <div class="col-6">
                                        <button type="button" class="btn btn-outline-secondary btn-sm w-100" onclick="fillDemo('admin', 'admin123')">Admin</button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                
                <div class="text-center text-white mt-4">
                    <p>Toegankelijk op alle apparaten - Ondersteunt Android, iOS, Chrome en meer</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS Bundle -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        function fillDemo(username, password) {
            document.getElementById('username').value = username;
            document.getElementById('password').value = password;
        }
        
        // Voor demo doeleinden, redirect naar dashboard bij login
        document.querySelector('form').addEventListener('submit', function(e) {
            e.preventDefault();
            window.location.href = 'dashboard.php';
        });
    </script>
</body>
</html>