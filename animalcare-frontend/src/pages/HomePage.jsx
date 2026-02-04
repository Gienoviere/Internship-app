// HomePage.jsx - Bijgewerkt
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // ← Importeer useAuth

const HomePage = () => {
  const { user } = useAuth(); // ← Check of gebruiker is ingelogd

  return (
    <div className="homepage">
      <div className="container">
        {/* Hero Section */}
        <div className="row align-items-center min-vh-80">
          <div className="col-lg-6">
            <h1 className="display-4 fw-bold mb-4">
              Welkom bij <span className="text-primary">AnimalCare</span>
            </h1>
            <p className="lead mb-4">
              Het complete systeem voor het bijhouden van dierenverzorging, 
              taken en inventaris. Perfect voor dierenasielen, stallen en dierenartsen.
            </p>
            <div className="d-flex gap-3">
              {user ? (
                // Toon dashboard knop als ingelogd
                <Link to="/dashboard" className="btn btn-primary btn-lg">
                  Naar Dashboard
                </Link>
              ) : (
                // Toon login/register knoppen als niet ingelogd
                <>
                  <Link to="/login" className="btn btn-primary btn-lg">
                    Inloggen
                  </Link>
                  <Link to="/register" className="btn btn-outline-primary btn-lg">
                    Registreren
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="col-lg-6">
            <div className="text-center">
              <div className="p-5">
                <div className="fs-1 mb-3">🐕 🐈 🐎 🐖</div>
                <h3 className="mb-3">Dierenverzorging Gestroomlijnd</h3>
                <p className="text-muted">
                  Log dagelijkse taken bij, monitor inventaris en beheer 
                  je dierenverzorging efficiënt.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Features blijft hetzelfde */}
        <div className="row mt-5 pt-5">
          <div className="col-md-4 mb-4">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body text-center p-4">
                <div className="fs-1 mb-3">📋</div>
                <h4>Dagelijkse Logs</h4>
                <p>Houd bij welke taken zijn uitgevoerd voor elk dier.</p>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-4">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body text-center p-4">
                <div className="fs-1 mb-3">📊</div>
                <h4>Inventaris Beheer</h4>
                <p>Monitor voer en voorraden met automatische waarschuwingen.</p>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-4">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body text-center p-4">
                <div className="fs-1 mb-3">👥</div>
                <h4>Team Samenwerking</h4>
                <p>Meerdere gebruikers kunnen taken loggen en bijhouden.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;