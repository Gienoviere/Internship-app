<?php
$page_title = "Gebruikersdashboard";
include 'header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2">Dashboard</h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <div class="btn-group me-2">
            <button type="button" class="btn btn-sm btn-outline-secondary">Vandaag</button>
            <button type="button" class="btn btn-sm btn-outline-secondary">Week</button>
            <button type="button" class="btn btn-sm btn-outline-secondary">Maand</button>
        </div>
        <button type="button" class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#quickLogModal">
            <i class="bi bi-plus-circle me-1"></i>Snelle log
        </button>
    </div>
</div>

<!-- Alerts -->
<div class="row mb-4">
    <div class="col-md-12">
        <div class="alert alert-warning d-flex align-items-center" role="alert">
            <i class="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
            <div>
                <h5 class="alert-heading mb-1">Waarschuwing: Varkens niet gevoerd gisteren</h5>
                <p class="mb-0">Controleer of de varkens vandaag zijn gevoerd en registreer dit in het log.</p>
            </div>
        </div>
    </div>
</div>

<!-- Today's Stats -->
<div class="row mb-4">
    <div class="col-md-3">
        <div class="card text-white bg-primary mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="card-title">Openstaande taken</h6>
                        <h2 class="mb-0">8</h2>
                    </div>
                    <i class="bi bi-list-check fs-1"></i>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-white bg-success mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="card-title">Voltooide taken</h6>
                        <h2 class="mb-0">12</h2>
                    </div>
                    <i class="bi bi-check-circle fs-1"></i>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-white bg-warning mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="card-title">Urgente taken</h6>
                        <h2 class="mb-0">3</h2>
                    </div>
                    <i class="bi bi-exclamation-triangle fs-1"></i>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-white bg-info mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="card-title">Mijn logs vandaag</h6>
                        <h2 class="mb-0">5</h2>
                    </div>
                    <i class="bi bi-clock-history fs-1"></i>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Recent Tasks & Admin Instructions -->
<div class="row">
    <!-- Recent Tasks -->
    <div class="col-md-8">
        <div class="card mb-4">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-list-task me-2"></i>Recente taken voor vandaag</h5>
            </div>
            <div class="card-body">
                <div class="list-group">
                    <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center task-card task-urgent" id="task-1">
                        <div>
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">Varkens voeren</h6>
                                <small class="text-danger">URGENT</small>
                            </div>
                            <p class="mb-1 small">Voer de varkens met 700g per dier. 5 varkens aanwezig = 3.5kg totaal.</p>
                            <small class="text-muted"><i class="bi bi-clock me-1"></i>Moet voor 10:00 gedaan zijn</small>
                        </div>
                        <button class="btn btn-sm btn-outline-success" onclick="completeTask(1)">Voltooid</button>
                    </div>
                    
                    <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center task-card" id="task-2">
                        <div>
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">Kippenhok schoonmaken</h6>
                                <small class="text-success">Nog 3 uur</small>
                            </div>
                            <p class="mb-1 small">Verwijder oud strooi, desinfecteer en voeg nieuw strooi toe.</p>
                            <small class="text-muted"><i class="bi bi-person me-1"></i>Toegewezen aan: Jan Jansen</small>
                        </div>
                        <button class="btn btn-sm btn-outline-success" onclick="completeTask(2)">Voltooid</button>
                    </div>
                    
                    <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center task-card" id="task-3">
                        <div>
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">Dieren observatie</h6>
                                <small class="text-warning">Nog 5 uur</small>
                            </div>
                            <p class="mb-1 small">Controleer alle dieren op gezondheid en afwijkend gedrag.</p>
                            <small class="text-muted"><i class="bi bi-camera me-1"></i>Foto's uploaden indien nodig</small>
                        </div>
                        <button class="btn btn-sm btn-outline-success" onclick="completeTask(3)">Voltooid</button>
                    </div>
                    
                    <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center task-card">
                        <div>
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">Konijnenvoer bijvullen</h6>
                                <small class="text-success">Nog 6 uur</small>
                            </div>
                            <p class="mb-1 small">Voerbakken bijvullen met 150g per konijn. 8 konijnen = 1.2kg totaal.</p>
                            <small class="text-muted"><i class="bi bi-box me-1"></i>Voorraad: Konijnenvoer (15kg)</small>
                        </div>
                        <button class="btn btn-sm btn-outline-secondary">Details</button>
                    </div>
                </div>
                
                <div class="text-center mt-3">
                    <a href="tasks.php" class="btn btn-outline-primary">Alle taken bekijken</a>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Admin Instructions & Quick Actions -->
    <div class="col-md-4">
        <!-- Admin Instructions -->
        <div class="card mb-4">
            <div class="card-header bg-info text-white">
                <h5 class="mb-0"><i class="bi bi-megaphone me-2"></i>Admin instructies</h5>
            </div>
            <div class="card-body">
                <div class="alert alert-info">
                    <h6><i class="bi bi-info-circle me-1"></i> Belangrijk voor vandaag:</h6>
                    <p class="small mb-0">Let extra op het gedrag van de varkens na het voeren. Meld eventuele afwijkingen direct in observaties.</p>
                </div>
                
                <div class="alert alert-warning">
                    <h6><i class="bi bi-exclamation-triangle me-1"></i> Wijziging voerhoeveelheid:</h6>
                    <p class="small mb-0">Vanaf morgen: varkensvoer verminderd naar 600g per dier i.p.v. 700g.</p>
                </div>
                
                <div class="alert alert-light border">
                    <h6><i class="bi bi-calendar-event me-1"></i> Geplande activiteit:</h6>
                    <p class="small mb-0">Dierenarts bezoekt morgen om 14:00 voor routinecontrole.</p>
                </div>
            </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-lightning me-2"></i>Snelle acties</h5>
            </div>
            <div class="card-body">
                <div class="d-grid gap-2">
                    <a href="tasks.php?action=quick_log" class="btn btn-outline-primary">
                        <i class="bi bi-plus-circle me-2"></i>Snelle log toevoegen
                    </a>
                    <a href="observations.php" class="btn btn-outline-success">
                        <i class="bi bi-eye me-2"></i>Observatie melden
                    </a>
                    <a href="inventory.php" class="btn btn-outline-warning">
                        <i class="bi bi-box-arrow-down me-2"></i>Voorraad bijwerken
                    </a>
                    <button class="btn btn-outline-info" data-bs-toggle="modal" data-bs-target="#photoUploadModal">
                        <i class="bi bi-camera me-2"></i>Foto uploaden
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Recent Activity -->
<div class="row mt-4">
    <div class="col-md-12">
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-clock-history me-2"></i>Recente activiteit</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Tijd</th>
                                <th>Actie</th>
                                <th>Uitgevoerd door</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>09:15</td>
                                <td><span class="badge bg-success">Taak voltooid</span></td>
                                <td>Jan Jansen</td>
                                <td>Kippenhok schoonmaken</td>
                            </tr>
                            <tr>
                                <td>08:45</td>
                                <td><span class="badge bg-info">Observatie</span></td>
                                <td>Piet Pietersen</td>
                                <td>Varken #3 lijkt minder actief</td>
                            </tr>
                            <tr>
                                <td>08:30</td>
                                <td><span class="badge bg-primary">Voorraad</span></td>
                                <td>Admin</td>
                                <td>Konijnenvoer bijgevuld (+25kg)</td>
                            </tr>
                            <tr>
                                <td>Gisteren 16:20</td>
                                <td><span class="badge bg-warning">Waarschuwing</span></td>
                                <td>Systeem</td>
                                <td>Varkens niet gevoerd na 17:00</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Quick Log Modal -->
<div class="modal fade" id="quickLogModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Snelle log toevoegen</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="mb-3">
                        <label for="taskSelect" class="form-label">Taak</label>
                        <select class="form-select" id="taskSelect">
                            <option selected>Selecteer een taak...</option>
                            <option value="1">Varkens voeren</option>
                            <option value="2">Kippenhok schoonmaken</option>
                            <option value="3">Konijnen voeren</option>
                            <option value="4">Dieren observatie</option>
                            <option value="5">Stallen controleren</option>
                        </select>
                    </div>
                    
                    <div class="mb-3">
                        <label for="quantity" class="form-label">Hoeveelheid (gram/kg)</label>
                        <input type="number" class="form-control" id="quantity" placeholder="Bijv. 3500 voor 3.5kg">
                    </div>
                    
                    <div class="mb-3">
                        <label for="notes" class="form-label">Opmerkingen</label>
                        <textarea class="form-control" id="notes" rows="3" placeholder="Optionele opmerkingen..."></textarea>
                    </div>
                    
                    <div class="mb-3 form-check">
                        <input type="checkbox" class="form-check-input" id="addPhoto">
                        <label class="form-check-label" for="addPhoto">Foto toevoegen</label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                <button type="button" class="btn btn-primary" onclick="alert('Log toegevoegd!'); $('#quickLogModal').modal('hide');">Log toevoegen</button>
            </div>
        </div>
    </div>
</div>

<!-- Photo Upload Modal -->
<div class="modal fade" id="photoUploadModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Foto uploaden</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="mb-3">
                        <label for="photoDescription" class="form-label">Beschrijving</label>
                        <input type="text" class="form-control" id="photoDescription" placeholder="Wat zien we op de foto?">
                    </div>
                    
                    <div class="mb-3">
                        <label for="animalSelect" class="form-label">Dier / Locatie</label>
                        <select class="form-select" id="animalSelect">
                            <option selected>Selecteer...</option>
                            <option value="pigs">Varkens</option>
                            <option value="chickens">Kippen</option>
                            <option value="rabbits">Konijnen</option>
                            <option value="general">Algemeen</option>
                        </select>
                    </div>
                    
                    <div class="mb-3">
                        <label for="photoFile" class="form-label">Foto selecteren</label>
                        <input class="form-control" type="file" id="photoFile" accept="image/*">
                    </div>
                    
                    <div class="alert alert-info small">
                        <i class="bi bi-info-circle me-1"></i> Foto's worden opgeslagen in het log en zijn zichtbaar voor administrators.
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                <button type="button" class="btn btn-primary" onclick="alert('Foto geüpload!'); $('#photoUploadModal').modal('hide');">Uploaden</button>
            </div>
        </div>
    </div>
</div>

<?php include 'footer.php'; ?>