<?php
$page_title = "Observaties";
include 'header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2">Observaties</h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <button type="button" class="btn btn-sm btn-primary" onclick="showModal('newObservationModal')">
            <i class="bi bi-plus-circle me-1"></i>Nieuwe observatie
        </button>
    </div>
</div>

<!-- Quick Stats -->
<div class="row mb-4">
    <div class="col-md-3 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h6>Observaties vandaag</h6>
                <h3 class="mb-0">4</h3>
            </div>
        </div>
    </div>
    <div class="col-md-3 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h6>Foto's deze week</h6>
                <h3 class="mb-0">12</h3>
            </div>
        </div>
    </div>
    <div class="col-md-3 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h6>Open issues</h6>
                <h3 class="mb-0">3</h3>
            </div>
        </div>
    </div>
    <div class="col-md-3 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h6>Reactietijd</h6>
                <h3 class="mb-0">4u</h3>
            </div>
        </div>
    </div>
</div>

<!-- Observations List -->
<div class="card">
    <div class="card-header">
        <h5 class="mb-0"><i class="bi bi-eye me-2"></i>Recente observaties</h5>
    </div>
    <div class="card-body p-0">
        <!-- Filters -->
        <div class="p-3 bg-light border-bottom">
            <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary active">Alle</button>
                <button class="btn btn-outline-warning">Open</button>
                <button class="btn btn-outline-success">Gesloten</button>
            </div>
        </div>
        
        <!-- Observations -->
        <div class="list-group list-group-flush">
            <!-- Critical -->
            <div class="list-group-item border-start border-danger border-5">
                <div class="d-flex justify-content-between">
                    <div>
                        <h6>Varken #3 minder actief <span class="badge bg-danger ms-2">KRITIEK</span></h6>
                        <p class="small mb-2">Varken #3 lijkt minder actief, eet wel maar beweegt minder.</p>
                        <small class="text-muted"><i class="bi bi-person me-1"></i> Piet Pietersen - 08:45 vandaag</small>
                        
                        <div class="mt-2">
                            <div class="d-inline-block border rounded p-1 me-2" style="width: 60px; height: 60px; background: #f8f9fa; text-align: center;">
                                <i class="bi bi-camera text-muted" style="line-height: 60px;"></i>
                            </div>
                            <small class="text-muted">Foto beschikbaar</small>
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-warning">In behandeling</span>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-success" onclick="showModal('resolveModal')">Afhandelen</button>
                            <button class="btn btn-sm btn-outline-primary mt-1">Reactie</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- With Photo -->
            <div class="list-group-item border-start border-warning border-5">
                <div class="d-flex justify-content-between">
                    <div>
                        <h6>Kip met kale plek <span class="badge bg-warning ms-2">HOOG</span></h6>
                        <p class="small mb-2">Kip in hok B heeft kale plek op rug. Geen tekenen van gevechten.</p>
                        <small class="text-muted"><i class="bi bi-person me-1"></i> Jan Jansen - Gisteren 14:20</small>
                        
                        <div class="alert alert-light mt-2 small">
                            <strong><i class="bi bi-shield-check me-1"></i> Admin reactie:</strong> Dierenarts geïnformeerd, medicatie toegediend.
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-info">Medicatie toegediend</span>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-success">Afhandelen</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Normal -->
            <div class="list-group-item border-start border-success border-5">
                <div class="d-flex justify-content-between">
                    <div>
                        <h6>Ongebruikelijk groepsgedrag konijnen</h6>
                        <p class="small mb-2">Meer interactie dan normaal, geen agressie waargenomen.</p>
                        <small class="text-muted"><i class="bi bi-person me-1"></i> Kees de Vries - 2 dagen geleden</small>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-success">Afgesloten</span>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-secondary">Details</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Photo Gallery -->
<div class="card mt-4">
    <div class="card-header">
        <h5 class="mb-0"><i class="bi bi-images me-2"></i>Foto galerij</h5>
    </div>
    <div class="card-body">
        <div class="row">
            <div class="col-md-3 mb-3">
                <div class="card">
                    <div class="card-img-top" style="height: 120px; background: #f8f9fa; display: flex; align-items: center; justify-content: center;">
                        <i class="bi bi-image fs-1 text-muted"></i>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title small">Kip gezondheid</h6>
                        <small class="text-muted">2 dagen geleden</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card">
                    <div class="card-img-top" style="height: 120px; background: #f8f9fa; display: flex; align-items: center; justify-content: center;">
                        <i class="bi bi-image fs-1 text-muted"></i>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title small">Varkens stal</h6>
                        <small class="text-muted">3 dagen geleden</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card">
                    <div class="card-img-top" style="height: 120px; background: #f8f9fa; display: flex; align-items: center; justify-content: center;">
                        <i class="bi bi-image fs-1 text-muted"></i>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title small">Konijnen gedrag</h6>
                        <small class="text-muted">4 dagen geleden</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card">
                    <div class="card-img-top" style="height: 120px; background: #f8f9fa; display: flex; align-items: center; justify-content: center;">
                        <i class="bi bi-image fs-1 text-muted"></i>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title small">Voer opslag</h6>
                        <small class="text-muted">5 dagen geleden</small>
                    </div>
                </div>
            </div>
        </div>
        <div class="text-center">
            <button class="btn btn-outline-primary" onclick="showModal('uploadPhotoModal')">
                <i class="bi bi-cloud-upload me-2"></i>Meer foto's uploaden
            </button>
        </div>
    </div>
</div>

<!-- Modals -->
<div class="modal fade" id="newObservationModal">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Nieuwe observatie</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="mb-3">
                        <label class="form-label">Dier / Groep</label>
                        <select class="form-select">
                            <option>Varkens</option>
                            <option>Kippen</option>
                            <option>Konijnen</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Categorie</label>
                        <select class="form-select">
                            <option>Gedrag</option>
                            <option>Gezondheid</option>
                            <option>Voeding</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Beschrijving</label>
                        <textarea class="form-control" rows="3" placeholder="Beschrijf de observatie..."></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Foto's (optioneel)</label>
                        <input type="file" class="form-control" accept="image/*" multiple>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                <button type="button" class="btn btn-primary" onclick="alert('Observatie toegevoegd!')">Opslaan</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="uploadPhotoModal">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Foto's uploaden</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="mb-3">
                        <label class="form-label">Selecteer foto's</label>
                        <input type="file" class="form-control" accept="image/*" multiple>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Beschrijving</label>
                        <textarea class="form-control" rows="2" placeholder="Korte beschrijving..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                <button type="button" class="btn btn-primary" onclick="alert('Foto\'s geüpload!')">Uploaden</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="resolveModal">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Observatie afhandelen</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="mb-3">
                        <label class="form-label">Status</label>
                        <select class="form-select">
                            <option>Opgelost</option>
                            <option>Niet op te lossen</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Actie ondernomen</label>
                        <textarea class="form-control" rows="3"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                <button type="button" class="btn btn-primary" onclick="alert('Observatie afgehandeld!')">Afhandelen</button>
            </div>
        </div>
    </div>
</div>

<?php include 'footer.php'; ?>