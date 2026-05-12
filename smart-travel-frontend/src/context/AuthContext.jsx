import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('travel_token');
    const savedUser = localStorage.getItem('travel_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const loginUser = (token, user) => {
    localStorage.setItem('travel_token', token);
    localStorage.setItem('travel_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const updateUser = (updatedUser) => {
    localStorage.setItem('travel_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const logoutUser = () => {
    localStorage.removeItem('travel_token');
    localStorage.removeItem('travel_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginUser, logoutUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
