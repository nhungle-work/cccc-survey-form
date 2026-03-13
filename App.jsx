import React from 'react';
import { Routes, Route } from 'react-router-dom';
import FormUser from './components/FormUser';
import AdminPanel from './components/AdminPanel';

function App() {
  return (
    <Routes>
      <Route path="/" element={<FormUser />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  );
}

export default App;
