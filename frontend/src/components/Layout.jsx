import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import logo from './IIEST_logo.png';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const currentUser = useMemo(() => {
    const storedUser = localStorage.getItem('currentUser');
    return storedUser ? JSON.parse(storedUser) : null;
  }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-container">
          
          {/* 🌟 CHANGE 2: Replace the file path with the {logo} variable */}
          <img src={logo} alt="IIEST Shibpur logo" height={100} width={100}/>
          
          <div className="header-text-block">
            <h1 className="header-english">
              <a href="https://www.iiests.ac.in/en" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                INDIAN INSTITUTE OF ENGINEERING SCIENCE AND TECHNOLOGY, SHIBPUR
              </a>
            </h1>
            <span className="header-erstwhile">
              Erstwhile B.E. College, Estd. 1856
            </span>
            <span className="header-subtitle">
              An Institute of National Importance under Ministry of Education, Government of India
            </span>
          </div>
        </div>
        
        <nav className="nav-links">
          {!currentUser ? (
            <>
              <Link to="/">Home</Link>
              <Link to="/register">Register</Link>
              <Link to="/application">Apply</Link>
            </>
          ) : (
            <>
              {currentUser.role && ['admin', 'super_admin', 'department_admin'].includes(currentUser.role) ? (
                <Link to="/admin-dashboard">Admin Dashboard</Link>
              ) : (
                <Link to="/dashboard">Dashboard</Link>
              )}
              <button className="ghost-btn logout-btn" onClick={logout}>Logout</button>
            </>
          )}
        </nav>
      </header>

      <main className="page-content">{children}</main>

      <footer className="footer">
        <p>Indian Institute of Engineering Science and Technology, Shibpur</p>
      </footer>
    </div>
  );
}