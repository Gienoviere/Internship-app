// RegisterPage.jsx - VOEG DEBUGGING TOE
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validatie
    if (formData.password !== formData.confirmPassword) {
      return setError('Wachtwoorden komen niet overeen');
    }
    
    if (formData.password.length < 6) {
      return setError('Wachtwoord moet minimaal 6 tekens zijn');
    }
    
    setLoading(true);
    
    try {
      // DEBUG: Log wat we sturen
      console.log('Sending register request:', {
        name: formData.name,
        email: formData.email,
        password: '***', // Verberg wachtwoord in logs
        role: 'USER'
      });
      
      // Call backend register endpoint
      const response = await axios.post('http://localhost:3001/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'USER' // Default role
      });
      
      console.log('Response:', response.data);
      
      setSuccess('Account aangemaakt! Je kunt nu inloggen.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err) {
      // DEBUG: Log de volledige error
      console.error('Registration error:', err);
      console.error('Error response:', err.response);
      
      const errorMsg = err.response?.data?.error || 
                      err.response?.data?.message || 
                      'Registratie mislukt';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card shadow">
            <div className="card-body">
              <h2 className="text-center mb-4">🐾 Registreren</h2>
              
              {error && (
                <div className="alert alert-danger">{error}</div>
              )}
              
              {success && (
                <div className="alert alert-success">{success}</div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Naam</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Jouw naam"
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="naam@voorbeeld.nl"
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Wachtwoord</label>
                  <input
                    type="password"
                    className="form-control"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimaal 6 tekens"
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Bevestig wachtwoord</label>
                  <input
                    type="password"
                    className="form-control"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Herhaal wachtwoord"
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary w-100"
                  disabled={loading}
                >
                  {loading ? 'Registreren...' : 'Account aanmaken'}
                </button>
              </form>
              
              <div className="text-center mt-3">
                <p className="text-muted">
                  Al een account?{' '}
                  <Link to="/login" className="text-decoration-none">
                    Inloggen
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;