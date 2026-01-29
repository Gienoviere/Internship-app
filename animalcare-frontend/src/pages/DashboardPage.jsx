// src/pages/DashboardPage.jsx - VERBETERD
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, ProgressBar, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const DashboardPage = () => {
  const { user, api } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch taken voor vandaag
      const tasksResponse = await api.get(`/tasks/today?date=${selectedDate}`);
      setTasks(tasksResponse.data.tasks || []);
      
      // Fetch logs voor vandaag
      const logsResponse = await api.get(`/daily-logs?date=${selectedDate}`);
      setLogs(logsResponse.data || []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskToggle = async (taskId, completed) => {
    try {
      const existingLog = logs.find(log => log.taskId === taskId);
      
      if (existingLog) {
        // Update bestaande log
        await api.patch(`/daily-logs/${existingLog.id}`, { completed });
      } else {
        // Maak nieuwe log
        await api.post('/daily-logs', {
          date: selectedDate,
          taskId,
          completed
        });
      }
      
      // Refresh data
      await fetchDashboardData();
      
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Kon taak niet bijwerken');
    }
  };

  const handleTaskQuantity = async (taskId, quantityGrams) => {
    try {
      const existingLog = logs.find(log => log.taskId === taskId);
      
      if (existingLog) {
        await api.patch(`/daily-logs/${existingLog.id}`, { quantityGrams });
      } else {
        await api.post('/daily-logs', {
          date: selectedDate,
          taskId,
          quantityGrams,
          completed: true
        });
      }
      
      await fetchDashboardData();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const completedTasks = tasks.filter(task => {
    const log = logs.find(l => l.taskId === task.taskId);
    return log?.completed;
  }).length;

  const completionPercentage = tasks.length > 0 
    ? Math.round((completedTasks / tasks.length) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Laden...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h1 className="display-5 fw-bold">Welkom terug, {user?.name}!</h1>
          <p className="lead text-muted">Hier is je overzicht voor vandaag</p>
          
          <div className="d-flex align-items-center gap-3 mt-3">
            <div>
              <label htmlFor="datePicker" className="form-label mb-0">Datum:</label>
              <input
                type="date"
                id="datePicker"
                className="form-control"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: '200px' }}
              />
            </div>
            <Button 
              variant="outline-primary"
              onClick={fetchDashboardData}
              disabled={loading}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Vernieuwen
            </Button>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <Card className="border-primary border-2 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <Card.Title className="text-primary">Dagelijkse Taken</Card.Title>
                  <Card.Text className="text-muted">{tasks.length} taken voor vandaag</Card.Text>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
                  <i className="bi bi-list-check text-primary fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
        
        <div className="col-md-4 mb-3">
          <Card className="border-success border-2 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <Card.Title className="text-success">Voortgang</Card.Title>
                  <Card.Text className="text-muted">
                    <span className="fw-bold">{completionPercentage}%</span> voltooid
                    ({completedTasks}/{tasks.length})
                  </Card.Text>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded-circle">
                  <i className="bi bi-graph-up text-success fs-4"></i>
                </div>
              </div>
              <ProgressBar 
                now={completionPercentage} 
                variant="success"
                className="mt-2"
                style={{ height: '8px' }}
              />
            </Card.Body>
          </Card>
        </div>
        
        <div className="col-md-4 mb-3">
          <Card className="border-info border-2 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <Card.Title className="text-info">Rol</Card.Title>
                  <Card.Text className="text-muted">
                    {user?.role === 'ADMIN' ? 'Beheerder' : 'Gebruiker'}
                  </Card.Text>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded-circle">
                  <i className="bi bi-person-badge text-info fs-4"></i>
                </div>
              </div>
              {user?.role === 'ADMIN' && (
                <Link to="/admin" className="btn btn-info btn-sm mt-3 w-100">
                  Admin Dashboard
                </Link>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <Card className="shadow-sm">
            <Card.Header className="bg-white border-bottom-0 py-3">
              <h4 className="mb-0">
                <i className="bi bi-calendar-day me-2 text-primary"></i>
                Taken voor {selectedDate}
              </h4>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="list-group list-group-flush">
                {tasks.length > 0 ? tasks.map(task => {
                  const log = logs.find(l => l.taskId === task.taskId);
                  const isCompleted = log?.completed || false;
                  
                  return (
                    <div key={task.taskId} className="list-group-item border-0 py-3 px-4 hover-light">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <div className="form-check me-3">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={isCompleted}
                              onChange={(e) => handleTaskToggle(task.taskId, e.target.checked)}
                              id={`task-${task.taskId}`}
                              style={{ transform: 'scale(1.5)' }}
                            />
                          </div>
                          <div>
                            <h6 className="mb-1">{task.taskName}</h6>
                            {task.category && (
                              <Badge bg="secondary" className="bg-opacity-10 text-secondary">
                                {task.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div>
                          <Badge bg={isCompleted ? "success" : "warning"} className="bg-opacity-10">
                            <i className={`bi ${isCompleted ? 'bi-check-circle' : 'bi-clock'} me-1`}></i>
                            {isCompleted ? 'Voltooid' : 'In afwachting'}
                          </Badge>
                        </div>
                      </div>
                      {log?.notes && (
                        <div className="mt-2">
                          <small className="text-muted">Notitie: {log.notes}</small>
                        </div>
                      )}
                      {log?.quantityGrams && (
                        <div className="mt-1">
                          <small className="text-primary">
                            <i className="bi bi-scale me-1"></i>
                            {log.quantityGrams}g
                          </small>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="text-center py-5">
                    <i className="bi bi-check2-circle fs-1 text-muted opacity-25"></i>
                    <p className="text-muted mt-3">Geen taken voor vandaag. Geniet van je dag!</p>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;