<?php
$page_title = "Handleiding";
include 'header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2">Digitale Handleiding</h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <button type="button" class="btn btn-sm btn-primary" onclick="showModal('searchManualModal')">
            <i class="bi bi-search me-1"></i>Zoeken
        </button>
    </div>
</div>

<div class="row">
    <!-- Sidebar Navigation -->
    <div class="col-md-3">
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-bookmark me-2"></i>Inhoud</h5>
            </div>
            <div class="card-body p-0">
                <div class="list-group list-group-flush">
                    <a href="#section1" class="list-group-item list-group-item-action">1. Introductie</a>
                    <a href="#section2" class="list-group-item list-group-item-action">2. Dagelijkse taken</a>
                    <a href="#section3" class="list-group-item list-group-item-action">3. Voerhoeveelheden</a>
                    <a href="#section4" class="list-group-item list-group-item-action">4. Diergezondheid</a>
                    <a href="#section5" class="list-group-item list-group-item-action">5. Noodprocedures</a>
                </div>
            </div>
        </div>
        
        <div class="card mt-3">
            <div class="card-body">
                <h6>Snelle contacten</h6>
                <div class="small">
                    <p class="mb-1"><strong>Dierenarts:</strong> 06-12345678</p>
                    <p class="mb-1"><strong>Noodnummer:</strong> 112</p>
                    <p class="mb-0"><strong>Beheerder:</strong> 06-11111111</p>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Content -->
    <div class="col-md-9">
        <div class="card">
            <div class="card-body">
                <!-- Section 1 -->
                <h3 id="section1" class="border-bottom pb-2">1. Introductie</h3>
                <p>Welkom bij de digitale handleiding voor het Dierenzorg Log Systeem.</p>
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    <strong>Belangrijk:</strong> Log alle taken in het systeem voor transparantie.
                </div>
                
                <!-- Section 2 -->
                <h3 id="section2" class="border-bottom pb-2 mt-4">2. Dagelijkse taken</h3>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Taak</th>
                                <th>Frequentie</th>
                                <th>Tijdstip</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Varkens voeren</td>
                                <td>2x per dag</td>
                                <td>07:00 & 16:00</td>
                            </tr>
                            <tr>
                                <td>Kippen voeren</td>
                                <td>1x per dag</td>
                                <td>08:00</td>
                            </tr>
                            <tr>
                                <td>Konijnen voeren</td>
                                <td>2x per dag</td>
                                <td>08:00 & 15:00</td>
                            </tr>
                            <tr>
                                <td>Stallen schoonmaken</td>
                                <td>1x per dag</td>
                                <td>09:00 - 12:00</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <!-- Section 3 -->
                <h3 id="section3" class="border-bottom pb-2 mt-4">3. Voerhoeveelheden</h3>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-header bg-success text-white">
                                <h6 class="mb-0">Varkens</h6>
                            </div>
                            <div class="card-body">
                                <p><strong>Aantal:</strong> 5</p>
                                <p><strong>Hoeveelheid:</strong> 600g per dier</p>
                                <p><strong>Totaal per dag:</strong> 6kg</p>
                                <div class="alert alert-warning small mt-2">
                                    <i class="bi bi-exclamation-triangle me-1"></i> Recent aangepast van 700g naar 600g
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-header bg-warning text-white">
                                <h6 class="mb-0">Konijnen</h6>
                            </div>
                            <div class="card-body">
                                <p><strong>Aantal:</strong> 8</p>
                                <p><strong>Hoeveelheid:</strong> 150g per dier</p>
                                <p><strong>Totaal per dag:</strong> 2.4kg</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Section 4 -->
                <h3 id="section4" class="border-bottom pb-2 mt-4">4. Diergezondheid</h3>
                <div class="row">
                    <div class="col-md-6">
                        <div class="card border-danger mb-3">
                            <div class="card-header bg-danger text-white">
                                <h6 class="mb-0">Alarmerende symptomen</h6>
                            </div>
                            <div class="card-body">
                                <ul class="small">
                                    <li>Niet eten/drinken > 24 uur</li>
                                    <li>Ademhalingsproblemen</li>
                                    <li>Abnormale ontlasting</li>
                                    <li>Plotseling gewichtsverlies</li>
                                </ul>
                                <div class="alert alert-danger small mt-2">
                                    <i class="bi bi-telephone me-1"></i>
                                    <strong>Direct dierenarts bellen: 06-12345678</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card border-warning mb-3">
                            <div class="card-header bg-warning">
                                <h6 class="mb-0">Preventieve zorg</h6>
                            </div>
                            <div class="card-body">
                                <ul class="small">
                                    <li>Vaccinaties volgens schema</li>
                                    <li>Ontworming elke 3 maanden</li>
                                    <li>Gebitscontrole maandelijks</li>
                                    <li>Klauwverzorging 6-8 weken</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Section 5 -->
                <h3 id="section5" class="border-bottom pb-2 mt-4">5. Noodprocedures</h3>
                <div class="card border-danger">
                    <div class="card-body">
                        <h6>Eerste hulp bij dieren</h6>
                        <ol class="small">
                            <li>Blijf kalm en benader voorzichtig</li>
                            <li>Zorg voor eigen veiligheid eerst</li>
                            <li>Plaats dier in rustige omgeving</li>
                            <li>Bel dierenarts (06-12345678)</li>
                            <li>Noteer acties in systeem</li>
                        </ol>
                        
                        <h6 class="mt-3">Brand / evacuatie</h6>
                        <ol class="small">
                            <li>Activeer brandalarm</li>
                            <li>Bel 112</li>
                            <li>Evacueer naar verzamelpunt</li>
                        </ol>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <small class="text-muted">Handleiding versie 2.3 - Laatst bijgewerkt: 5 januari 2023</small>
            </div>
        </div>
    </div>
</div>

<!-- Search Modal -->
<div class="modal fade" id="searchManualModal">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Handleiding zoeken</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="mb-3">
                        <label class="form-label">Zoekterm</label>
                        <input type="text" class="form-control" placeholder="Voer zoekterm in...">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                <button type="button" class="btn btn-primary" onclick="alert('Zoeken...')">Zoeken</button>
            </div>
        </div>
    </div>
</div>

<?php include 'footer.php'; ?>