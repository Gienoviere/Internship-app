<?php
$page_title = "Takenoverzicht";
include 'header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2">Takenoverzicht</h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <button type="button" class="btn btn-sm btn-primary" onclick="showModal('newTaskModal')">
            <i class="bi bi-plus-circle me-1"></i>Nieuwe taak
        </button>
    </div>
</div>

<!-- Filters -->
<div class="card mb-4">
    <div class="card-body">
        <div class="row g-2">
            <div class="col-md-3">
                <select class="form-select form-select-sm">
                    <option>Alle status</option>
                    <option>Open</option>
                    <option>Voltooid</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select form-select-sm">
                    <option>Alle categorieën</option>
                    <option>Voeren</option>
                    <option>Schoonmaken</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select form-select-sm">
                    <option>Iedereen</option>
                    <option>Jan Jansen</option>
                    <option>Piet Pietersen</option>
                </select>
            </div>
            <div class="col-md-3">
                <input type="datetime-local" class="form-control form-control-sm" value="<?php echo date('Y-m-d'); ?>">
            </div>
        </div>
    </div>
</div>

<!-- Tasks -->
<div class="card">
    <div class="card-header">
        <h5 class="mb-0"><i class="bi bi-list-check me-2"></i>Taken voor vandaag</h5>
    </div>
    <div class="card-body p-0">
        <!-- Urgent Tasks -->
        <div class="p-3 bg-light border-bottom">
            <h6 class="mb-0">Urgente taken <span class="badge bg-danger">3</span></h6>
        </div>
        <div class="list-group list-group-flush">
            <div class="list-group-item task-card task-urgent" data-task-id="101">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">Varkens voeren <span class="badge bg-danger ms-2">NIET GEDAAN GISTEREN</span></h6>
                        <p class="mb-1 small">600g per dier (5 varkens = 3kg totaal)</p>
                        <small class="text-muted"><i class="bi bi-clock me-1"></i> Voor 10:00</small>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-success btn-sm" onclick="completeTask(101)">Voltooid</button>
                        <button class="btn btn-outline-secondary btn-sm" onclick="showModal('logTaskModal')">Log</button>
                    </div>
                </div>
            </div>
            
            <div class="list-group-item task-card task-urgent" data-task-id="102">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">Medicatie toedienen <span class="badge bg-danger ms-2">MEDISCH</span></h6>
                        <p class="mb-1 small">Kip in hok B medicatie geven</p>
                        <small class="text-muted"><i class="bi bi-clock me-1"></i> Voor 12:00</small>
                    </div>
                    <button class="btn btn-success btn-sm" onclick="completeTask(102)">Voltooid</button>
                </div>
            </div>
        </div>
        
        <!-- Regular Tasks -->
        <div class="p-3 bg-light border-bottom">
            <h6 class="mb-0">Reguliere taken <span class="badge bg-primary">7</span></h6>
        </div>
        <div class="list-group list-group-flush">
            <div class="list-group-item task-card" data-task-id="103">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">Kippenhok schoonmaken</h6>
                        <p class="mb-1 small">Verwijder oud strooi, desinfecteer, nieuw strooi</p>
                        <small class="text-muted"><i class="bi bi-person me-1"></i> Piet Pietersen</small>
                    </div>
                    <button class="btn btn-outline-success btn-sm" onclick="completeTask(103)">Voltooid</button>
                </div>
            </div>
            
            <div class="list-group-item task-card" data-task-id="104">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">Konijnenvoer bijvullen</h6>
                        <p class="mb-1 small">150g per konijn (8 konijnen = 1.2kg)</p>
                        <small class="text-muted"><i class="bi bi-box me-1"></i> Voorraad: 15kg</small>
                    </div>
                    <button class="btn btn-outline-success btn-sm" onclick="completeTask(104)">Voltooid</button>
                </div>
            </div>
            
            <div class="list-group-item task-card">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">Dieren observatie</h6>
                        <p class="mb-1 small">Controleer alle dieren op gezondheid</p>
                        <small class="text-muted"><i class="bi bi-people me-1"></i> Iedereen</small>
                    </div>
                    <button class="btn btn-outline-info btn-sm">Log</button>
                </div>
            </div>
        </div>
        
        <!-- Completed Tasks -->
        <div class="p-3 bg-light border-bottom">
            <h6 class="mb-0">Voltooide taken <span class="badge bg-success">12</span></h6>
        </div>
        <div class="list-group list-group-flush">
            <div class="list-group-item task-completed">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">Kippenhok schoonmaken</h6>
                        <small class="text-muted"><i class="bi bi-person me-1"></i> Piet Pietersen - 09:15</small>
                    </div>
                    <button class="btn btn-outline-info btn-sm">Bekijk log</button>
                </div>
            </div>
            
            <div class="list-group-item task-completed">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">Stallen controleren</h6>
                        <small class="text-muted"><i class="bi bi-person me-1"></i> Kees de Vries - 08:30</small>
                    </div>
                    <button class="btn btn-outline-info btn-sm">Bekijk log</button>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modals -->
<div class="modal fade" id="newTaskModal">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Nieuwe taak</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="mb-3">
                        <label class="form-label">Taak naam</label>
                        <input type="text" class="form-control" placeholder="Bijv. Varkens voeren">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Categorie</label>
                        <select class="form-select">
                            <option>Voeren</option>
                            <option>Schoonmaken</option>
                            <option>Observatie</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Toewijzen aan</label>
                        <select class="form-select">
                            <option>Jan Jansen</option>
                            <option>Piet Pietersen</option>
                            <option>Iedereen</option>
                        </select>
                    </div>
                    <div class="form-check mb-3">
                        <input type="checkbox" class="form-check-input" id="urgentTask">
                        <label class="form-check-label" for="urgentTask">Markeer als urgent</label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                <button type="button" class="btn btn-primary" onclick="alert('Taak toegevoegd!')">Toevoegen</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="logTaskModal">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Taak loggen</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="mb-3">
                        <label class="form-label">Hoeveelheid gevoerd (gram)</label>
                        <input type="number" class="form-control" value="3000">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Opmerkingen</label>
                        <textarea class="form-control" rows="2"></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Foto (optioneel)</label>
                        <input type="file" class="form-control" accept="image/*">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                <button type="button" class="btn btn-primary" onclick="alert('Taak gelogd!')">Opslaan</button>
            </div>
        </div>
    </div>
</div>

<?php include 'footer.php'; ?>