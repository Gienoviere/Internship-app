<?php
$page_title = "Admin Dashboard";
include 'header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2">Admin Dashboard</h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <button type="button" class="btn btn-sm btn-primary" onclick="showModal('sendSummaryModal')">
            <i class="bi bi-envelope me-1"></i>Log samenvatting
        </button>
    </div>
</div>

<!-- Admin Alerts -->
<div class="row mb-4">
    <div class="col-md-4 mb-3">
        <div class="alert alert-danger">
            <h6><i class="bi bi-exclamation-triangle-fill me-2"></i> Kritiek</h6>
            <p class="mb-0 small">Varkens niet gevoerd gisteren</p>
        </div>
    </div>
    <div class="col-md-4 mb-3">
        <div class="alert alert-warning">
            <h6><i class="bi bi-exclamation-triangle me-2"></i> Voorraad</h6>
            <p class="mb-0 small">Kippenvoer bijna op (< 3 weken)</p>
        </div>
    </div>
    <div class="col-md-4 mb-3">
        <div class="alert alert-info">
            <h6><i class="bi bi-info-circle me-2"></i> Update</h6>
            <p class="mb-0 small">Varkensvoer aangepast naar 600g</p>
        </div>
    </div>
</div>

<!-- Overview -->
<div class="row mb-4">
    <div class="col-md-3 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h6>Actieve gebruikers</h6>
                <h2 class="mb-0">8/12</h2>
            </div>
        </div>
    </div>
    <div class="col-md-3 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h6>Voltooide taken</h6>
                <h2 class="mb-0">64%</h2>
            </div>
        </div>
    </div>
    <div class="col-md-3 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h6>Waarschuwingen</h6>
                <h2 class="mb-0">7</h2>
            </div>
        </div>
    </div>
    <div class="col-md-3 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h6>Voorraad niveau</h6>
                <h2 class="mb-0">42%</h2>
            </div>
        </div>
    </div>
</div>

<!-- Main Content -->
<div class="row">
    <div class="col-lg-8">
        <div class="card mb-4">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-calendar-day me-2"></i>Dagelijkse overzicht</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Taak</th>
                                <th>Verantwoordelijke</th>
                                <th>Status</th>
                                <th>Acties</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Varkens voeren</td>
                                <td>Jan Jansen</td>
                                <td><span class="badge bg-danger">Niet gedaan</span></td>
                                <td>
                                    <button class="btn btn-sm btn-outline-warning"><i class="bi bi-bell"></i></button>
                                </td>
                            </tr>
                            <tr>
                                <td>Kippenhok schoonmaken</td>
                                <td>Piet Pietersen</td>
                                <td><span class="badge bg-success">Voltooid</span></td>
                                <td>
                                    <button class="btn btn-sm btn-outline-success"><i class="bi bi-eye"></i></button>
                                </td>
                            </tr>
                            <tr>
                                <td>Dieren observatie</td>
                                <td>Alle</td>
                                <td><span class="badge bg-warning">Bezig</span></td>
                                <td>
                                    <button class="btn btn-sm btn-outline-info">Check</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <div class="col-lg-4">
        <div class="card mb-4">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0"><i class="bi bi-gear me-2"></i>Systeem instellingen</h5>
            </div>
            <div class="card-body">
                <div class="list-group list-group-flush">
                    <a href="#" class="list-group-item list-group-item-action">Alarminstellingen</a>
                    <a href="#" class="list-group-item list-group-item-action">Gebruikersbeheer</a>
                    <a href="#" class="list-group-item list-group-item-action">Voerhoeveelheden</a>
                    <a href="#" class="list-group-item list-group-item-action">Email instellingen</a>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-graph-up me-2"></i>Statistieken</h5>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <h6>Taak voltooiing</h6>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar bg-success" style="width: 64%;">64%</div>
                    </div>
                </div>
                <div class="mb-3">
                    <h6>Voorraad waarschuwingen</h6>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar bg-warning" style="width: 30%;">3 producten</div>
                    </div>
                </div>
                <button class="btn btn-outline-primary w-100 mt-2" onclick="showModal('systemReportModal')">
                    <i class="bi bi-file-text me-2"></i>Rapport genereren
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Recente observaties -->
<div class="card mt-4">
    <div class="card-header">
        <h5 class="mb-0"><i class="bi bi-eye me-2"></i>Recente observaties</h5>
    </div>
    <div class="card-body">
        <div class="row">
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h6>Varken #3 minder actief</h6>
                        <p class="small">Varken #3 lijkt minder actief dan normaal.</p>
                        <div class="d-flex justify-content-between">
                            <small class="text-muted">Piet Pietersen - 08:45</small>
                            <button class="btn btn-sm btn-outline-info">Behandel</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h6>Kip met kale plek</h6>
                        <p class="small">Kip in hok B heeft kale plek op rug.</p>
                        <div class="d-flex justify-content-between">
                            <small class="text-muted">Jan Jansen - Gisteren</small>
                            <button class="btn btn-sm btn-outline-success">Afgerond</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modals -->
<div class="modal fade" id="sendSummaryModal">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Log samenvatting versturen</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="mb-3">
                        <label class="form-label">Ontvangers</label>
                        <input type="text" class="form-control" value="admin@dierenzorg.nl">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Periode</label>
                        <select class="form-select">
                            <option>Vandaag</option>
                            <option>Afgelopen week</option>
                        </select>
                    </div>
                    <div class="form-check mb-3">
                        <input type="checkbox" class="form-check-input" id="autoSend">
                        <label class="form-check-label" for="autoSend">Dagelijks automatisch versturen</label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                <button type="button" class="btn btn-primary" onclick="alert('Samenvatting verstuurd!')">Versturen</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="systemReportModal">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Systeemrapport</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="mb-3">
                        <label class="form-label">Rapport type</label>
                        <select class="form-select">
                            <option>Maandrapport</option>
                            <option>Weekrapport</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Periode</label>
                        <div class="row">
                            <div class="col-md-6">
                                <input type="date" class="form-control" value="<?php echo date('Y-m-d', strtotime('-30 days')); ?>">
                            </div>
                            <div class="col-md-6">
                                <input type="date" class="form-control" value="<?php echo date('Y-m-d'); ?>">
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                <button type="button" class="btn btn-primary" onclick="alert('Rapport gegenereerd!')">Genereren</button>
            </div>
        </div>
    </div>
</div>

<?php include 'footer.php'; ?>