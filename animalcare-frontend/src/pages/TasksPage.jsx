import React, { useState } from 'react';

const TasksPage = () => {
  const [filter, setFilter] = useState('all');

  const sampleTasks = [
    { id: 1, name: 'Dieren voeren', category: 'Verzorging', priority: 'high', completed: true },
    { id: 2, name: 'Hokken schoonmaken', category: 'Hygiëne', priority: 'high', completed: false },
    { id: 3, name: 'Medicatie toedienen', category: 'Gezondheid', priority: 'medium', completed: true },
    { id: 4, name: 'Uitlaatrondje', category: 'Beweging', priority: 'low', completed: false },
  ];

  const filteredTasks = filter === 'all' 
    ? sampleTasks 
    : sampleTasks.filter(task => task.priority === filter);

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h1 className="display-5 fw-bold text-primary">Takenbeheer</h1>
          <p className="lead text-muted">Beheer al je dagelijkse taken op één plek</p>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card border-primary shadow-sm h-100">
            <div className="card-body text-center">
              <h2 className="text-primary">{sampleTasks.length}</h2>
              <p className="text-muted mb-0">Totaal taken</p>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-3">
          <div className="card border-success shadow-sm h-100">
            <div className="card-body text-center">
              <h2 className="text-success">{sampleTasks.filter(t => t.completed).length}</h2>
              <p className="text-muted mb-0">Voltooid</p>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-3">
          <div className="card border-warning shadow-sm h-100">
            <div className="card-body text-center">
              <h2 className="text-warning">{sampleTasks.filter(t => !t.completed).length}</h2>
              <p className="text-muted mb-0">In afwachting</p>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-3">
          <div className="card border-info shadow-sm h-100">
            <div className="card-body text-center">
              <h2 className="text-info">4</h2>
              <p className="text-muted mb-0">Categorieën</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Alle taken</h5>
            <div className="btn-group" role="group">
              <button 
                className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('all')}
              >
                Alle
              </button>
              <button 
                className={`btn btn-sm ${filter === 'high' ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={() => setFilter('high')}
              >
                Hoog
              </button>
              <button 
                className={`btn btn-sm ${filter === 'medium' ? 'btn-warning' : 'btn-outline-warning'}`}
                onClick={() => setFilter('medium')}
              >
                Medium
              </button>
              <button 
                className={`btn btn-sm ${filter === 'low' ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => setFilter('low')}
              >
                Laag
              </button>
            </div>
          </div>
        </div>
        
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Taak</th>
                  <th scope="col">Categorie</th>
                  <th scope="col">Prioriteit</th>
                  <th scope="col">Status</th>
                  <th scope="col">Acties</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => (
                  <tr key={task.id}>
                    <td>
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          checked={task.completed}
                          readOnly
                        />
                        <label className="form-check-label">
                          {task.name}
                        </label>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-secondary bg-opacity-10 text-secondary">
                        {task.category}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        task.priority === 'high' ? 'bg-danger' :
                        task.priority === 'medium' ? 'bg-warning' : 'bg-success'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td>
                      {task.completed ? (
                        <span className="badge bg-success">
                          <i className="bi bi-check-circle me-1"></i> Voltooid
                        </span>
                      ) : (
                        <span className="badge bg-warning">
                          <i className="bi bi-clock me-1"></i> In afwachting
                        </span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary">
                        <i className="bi bi-pencil"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="card-footer bg-white py-3">
          <button className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i> Nieuwe taak
          </button>
        </div>
      </div>
    </div>
  );
};

export default TasksPage;