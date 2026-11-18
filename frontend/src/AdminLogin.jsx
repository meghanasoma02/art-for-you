
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminLogin() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await fetch(
        `http://localhost:8080/api/admin/${isRegister ? 'register' : 'login'}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ username, password })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || 'Something went wrong');
        return;
      }

      if (isRegister) {
        setMessage('Account created! Please login.');
        setIsRegister(false);
        setPassword('');
      } else {
        navigate('/admin');
      }

    } catch (error) {
      setMessage('Cannot connect to server. Please try again.');
    }
  };

  return (
    <div className="admin-login">
      <h2>{isRegister ? 'Create Admin Account' : 'Admin Login'}</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password (minimum 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />

        <button type="submit">
          {isRegister ? 'Create Account' : 'Login'}
        </button>
      </form>

      {message && <p>{message}</p>}

      <p>
        {isRegister
          ? 'Already have an account?'
          : "Don't have an account?"}
        {' '}
        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setMessage('');
          }}
        >
          {isRegister ? 'Login' : 'Create Account'}
        </button>
      </p>
    </div>
  );
}

export default AdminLogin;
