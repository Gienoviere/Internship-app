<?php
$page_title = "Voorraadbeheer";
include 'header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2">Voorraadbeheer</h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <button type="button" class="btn btn-sm btn-primary" onclick="showModal('updateInventoryModal')">
            <i class="bi bi-arrow-repeat me-1"></i>Voorraad bijwerken
        </button>
    </div>
</div>

<!-- Warning -->
<div class="alert alert-warning mb-4">
    <i class="bi bi-exclamation-triangle-fill me-2"></i>
    <strong>Voorraad waarschuwing:</strong> 3 producten hebben lage voorraad. Kippenvoer nog 18 dagen.
</div>

<!-- Stats -->
<div class="row mb-4">
    <div class="col-md-3 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h6>Totaal waarde</h6>
                <h4 class="mb-0">€ 1.850</h4>
            </div>
        </div>
    </div>
    <div class="col-md-3 mb-3">
        <div class="card stat-card border-success">
            <div class="card-body text-center">
                <h6>Voldoende</h6>
                <h4 class="mb-0">17</h4>
                <small class="text-muted">Producten</small>
            </div>
        </div>
    </div>
    <div class="col-md-3 mb-3">
        <div class="card stat-card border-warning">
            <div class="card-body text-center">
                <h6>Laag</h6>
                <h4 class="mb-0">3</h4>
                <small class="text-muted">Producten</small>
            </div>
        </div>
    </div>
    <div class="col-md-3 mb-3">
        <div class="card stat-card border-danger">
            <div class="card-body text-center">
                <h6>Bijna op</h6>
                <h4 class="mb-0">3</h4>
                <small class="text-muted">Producten</small>
            </div>
        </div>
    </div>
</div>

<!-- Inventory Table -->
<div class="card mb-4">
    <div class="card-header">
        <h5 class="mb-0"><i class="bi bi-box-seam me-2"></i>Voorraadoverzicht</h5>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Huidig</th>
                        <th>Verbruik/dag</th>
                        <th>Dagen over</th>
                        <th>Status</th>
                        <th>Acties</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="table-warning">
                        <td><strong>Kippenvoer</strong><br><small>20kg per zak</small></td>
                        <td>180kg (9 zakken)</td>
                        <td>10kg</td>
                        <td><strong class="text-warning">18 dagen</strong></td>
                        <td><span class="badge bg-warning">Waarschuwing</span></td>
                        <td><button class="btn btn-sm btn-outline-warning" onclick="showModal('adjustModal')">Aanpassen</button></td>
                    </tr>
                    <tr class="table-danger">
                        <td><strong>Varkensvoer</strong><br><small>25kg per zak</small></td>
                        <td>150kg (6 zakken)</td>
                        <td>15kg</td>
                        <td><strong class="text-danger">10 dagen</strong></td>
                        <td><span class="badge bg-danger">Kritiek</span></td>
                        <td><button class="btn btn-sm btn-outline-danger" onclick="showModal('adjustModal')">Aanpassen</button></td>
                    </tr>
                    <tr>
                        <td><strong>Konijnenvoer</strong><br><small>10kg per zak</small></td>
                        <td>150kg (15 zakken)</td>
                        <td>1.2kg</td>
                        <td><strong class="text-success">125 dagen</strong></td>
                        <td><span class="badge bg-success">Veilig</span></td>
                        <td><button class="btn btn-sm btn-outline-secondary">Aanpassen</button></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Consumption & Predictions -->
<div class="row">
    <div class="col-md-6">
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-graph-down me-2"></i>Verbruik laatste 30 dagen</h5>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <h6>Varkensvoer</h6>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar bg-danger" style="width: 85%;">425kg / 450kg</div>
                    </div>
                </div>
                <div class="mb-3">
                    <h6>Kippenvoer</h6>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar bg-warning" style="width: 72%;">216kg / 300kg</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="col-md-6">
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-calendar-week me-2"></i>Voorspellingen</h5>
            </div>
            <div class="card-body">
                <div class="alert alert-warning">
                    <h6><i class="bi bi-exclamation-triangle me-2"></i> Bestelmomenten</h6>
                    <ul class="mb-0">
                        <li>Kippenvoer: Bestel binnen 3 dagen</li>
                        <li>Varkensvoer: Bestel binnen 7 dagen</li>
                    </ul>
                </div>
                <button class="btn btn-warning w-100" onclick="showModal('orderModal')">
                    <i class="bi bi-cart me-2"></i>Bestelling plaatsen
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Modals -->
<div class="modal fade" id="updateInventoryModal">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Voorraad bijwerken</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="mb-3">
                        <label class="form-label">Product</label>
                        <select class="form-select">
                            <option>Kippenvoer</option>
                            <option>Varkensvoer</option>
                            <option>Konijnenvoer</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Actie</label>
                        <select class="form-select">
                            <option>Toevoegen (inkoop)</option>
                            <option>Verwijderen (gebruik)</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Hoeveelheid (kg)</label>
                        <input type="number" class="form-control" placeholder="0">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                <button type="button" class="btn btn-primary" onclick="alert('Voorraad bijgewerkt!')">Bijwerken</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="orderModal">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Bestelling plaatsen</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="alert alert-info small mb-3">
                    <i class="bi bi-info-circle me-1"></i> Kippenvoer: min. 25 zakken a 20kg. Overige voer: min. 500kg totaal.
                </div>
                <form>
                    <div class="mb-3">
                        <label class="form-label">Product</label>
                        <select class="form-select">
                            <option>Kippenvoer (20kg/zak)</option>
                            <option>Varkensvoer (25kg/zak)</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Aantal zakken</label>
                        <input type="number" class="form-control" value="25">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Leverancier</label>
                        <select class="form-select">
                            <option>VoerDirect BV</option>
                            <option>DierenVoerNL</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                <button type="button" class="btn btn-primary" onclick="alert('Bestelling geplaatst!')">Bestellen</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="adjustModal">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Voorraad aanpassen</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="mb-3">
                        <label class="form-label">Product</label>
                        <input type="text" class="form-control" value="Kippenvoer" readonly>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Nieuwe voorraad (kg)</label>
                        <input type="number" class="form-control" value="180">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Reden</label>
                        <select class="form-select">
                            <option>Correctie</option>
                            <option>Nieuwe levering</option>
                            <option>Schade/verlies</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                <button type="button" class="btn btn-primary" onclick="alert('Voorraad aangepast!')">Opslaan</button>
            </div>
        </div>
    </div>
</div>

<?php include 'footer.php'; ?>