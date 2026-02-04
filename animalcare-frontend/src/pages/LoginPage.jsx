// LoginPage.jsx - Gecorrigeerde redirect
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/dashboard'); // ← Naar dashboard gaan na login
    } else {
      setError(result.error || 'Inloggen mislukt');
    }
    
    setLoading(false);
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card shadow">
            <div className="card-body">
              <h2 className="text-center mb-4">🐾 AnimalCare</h2>
              <p className="text-center text-muted mb-4">Inloggen</p>
              
              {error && (
                <div className="alert alert-danger">{error}</div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="naam@voorbeeld.nl"
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Wachtwoord</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Wachtwoord"
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary w-100"
                  disabled={loading}
                >
                  {loading ? 'Inloggen...' : 'Inloggen'}
                </button>
              </form>
              
              <div className="text-center mt-3">
                <p className="text-muted">
                  Nog geen account?{' '}
                  <Link to="/register" className="text-decoration-none">
                    Registreer hier
                  </Link>
                </p>
              </div>
              
              <div className="text-center mt-3">
                <small className="text-muted">
                  Demo: admin@example.com / wachtwoord
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;