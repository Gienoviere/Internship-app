<?php
// Simulatie van gebruikerssessie
$is_logged_in = true;
$is_admin = isset($_GET['admin']) || basename($_SERVER['PHP_SELF']) == 'admin_dashboard.php';
$user_name = "Jan Jansen";
$user_role = $is_admin ? "Administrator" : "Dierenverzorger";

// Bepaal actieve pagina voor navigatie highlight
$current_page = basename($_SERVER['PHP_SELF']);
?>
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dierenzorg Log - <?php echo $page_title ?? 'Dashboard'; ?></title>
    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css">
    <style>
        .navbar-brand {
            font-weight: 600;
        }
        .bg-primary {
            background-color: #4a6fa5 !important;
        }
        .btn-primary {
            background-color: #4a6fa5;
            border-color: #4a6fa5;
        }
        .btn-primary:hover {
            background-color: #3a5a80;
            border-color: #3a5a80;
        }
        .sidebar {
            background-color: #f8f9fa;
            min-height: calc(100vh - 56px);
            box-shadow: inset -1px 0 0 rgba(0, 0, 0, .1);
        }
        .sidebar-sticky {
            position: sticky;
            top: 0;
            height: calc(100vh - 56px);
            padding-top: 1rem;
            overflow-x: hidden;
            overflow-y: auto;
        }
        .sidebar .nav-link {
            color: #333;
            font-weight: 500;
            padding: 0.75rem 1rem;
            border-radius: 0.375rem;
            margin-bottom: 0.25rem;
        }
        .sidebar .nav-link:hover {
            background-color: #e9ecef;
        }
        .sidebar .nav-link.active {
            background-color: #4a6fa5;
            color: white;
        }
        .sidebar .nav-link i {
            margin-right: 0.5rem;
        }
        .alert-warning {
            border-left: 4px solid #ffc107;
        }
        .alert-danger {
            border-left: 4px solid #dc3545;
        }
        .alert-success {
            border-left: 4px solid #198754;
        }
        .badge-alert {
            background-color: #dc3545;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
        .task-card {
            transition: transform 0.2s;
            border-left: 4px solid #4a6fa5;
        }
        .task-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .task-urgent {
            border-left-color: #dc3545;
        }
        .task-completed {
            border-left-color: #198754;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container-fluid">
            <a class="navbar-brand" href="<?php echo $is_admin ? 'admin_dashboard.php' : 'dashboard.php'; ?>">
                <i class="bi bi-heart-pulse me-2"></i>Dierenzorg Log
            </a>
            
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown">
                            <i class="bi bi-person-circle me-1"></i><?php echo $user_name; ?>
                        </a>
                        <ul class="dropdown-menu">
                            <li><span class="dropdown-item-text"><small>Rol: <?php echo $user_role; ?></small></span></li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <?php if ($is_admin): ?>
                                    <a class="dropdown-item" href="dashboard.php"><i class="bi bi-speedometer2 me-2"></i>Gebruikersdashboard</a>
                                <?php else: ?>
                                    <a class="dropdown-item" href="admin_dashboard.php"><i class="bi bi-shield-lock me-2"></i>Admin dashboard</a>
                                <?php endif; ?>
                            </li>
                            <li><a class="dropdown-item" href="#"><i class="bi bi-gear me-2"></i>Instellingen</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="index.php"><i class="bi bi-box-arrow-right me-2"></i>Uitloggen</a></li>
                        </ul>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
    
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar -->
            <div class="col-md-3 col-lg-2 d-md-block bg-light sidebar collapse" id="sidebarMenu">
                <div class="sidebar-sticky pt-3">
                    <ul class="nav flex-column">
                        <li class="nav-item">
                            <a class="nav-link <?php echo ($current_page == 'dashboard.php' || $current_page == 'admin_dashboard.php') ? 'active' : ''; ?>" 
                               href="<?php echo $is_admin ? 'admin_dashboard.php' : 'dashboard.php'; ?>">
                                <i class="bi bi-speedometer2"></i> Dashboard
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo $current_page == 'tasks.php' ? 'active' : ''; ?>" href="tasks.php">
                                <i class="bi bi-list-check"></i> Taken
                                <span class="badge badge-alert rounded-pill float-end">3</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo $current_page == 'inventory.php' ? 'active' : ''; ?>" href="inventory.php">
                                <i class="bi bi-box-seam"></i> Voorraad
                                <span class="badge bg-warning rounded-pill float-end">!</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo $current_page == 'observations.php' ? 'active' : ''; ?>" href="observations.php">
                                <i class="bi bi-eye"></i> Observaties
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?php echo $current_page == 'manual.php' ? 'active' : ''; ?>" href="manual.php">
                                <i class="bi bi-book"></i> Handleiding
                            </a>
                        </li>
                        
                        <li class="nav-item mt-4">
                            <h6 class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
                                <span>Snel acties</span>
                            </h6>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="tasks.php?action=quick_log">
                                <i class="bi bi-plus-circle"></i> Snelle log
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="inventory.php?action=update">
                                <i class="bi bi-arrow-repeat"></i> Voorraad updaten
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="observations.php?action=new">
                                <i class="bi bi-camera"></i> Foto uploaden
                            </a>
                        </li>
                        
                        <?php if ($is_admin): ?>
                        <li class="nav-item mt-4">
                            <h6 class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
                                <span>Admin tools</span>
                            </h6>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#">
                                <i class="bi bi-people"></i> Gebruikersbeheer
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#">
                                <i class="bi bi-envelope"></i> Log samenvatting
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#">
                                <i class="bi bi-exclamation-triangle"></i> Alarminstellingen
                            </a>
                        </li>
                        <?php endif; ?>
                    </ul>
                    
                    <div class="px-3 mt-4">
                        <div class="alert alert-warning p-2 small">
                            <i class="bi bi-exclamation-triangle-fill me-1"></i>
                            <strong>Waarschuwing:</strong> Varkens niet gevoerd gisteren
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Main content -->
            <main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4 pt-3">