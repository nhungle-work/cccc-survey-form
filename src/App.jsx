import React from 'react';
import { Routes, Route } from 'react-router-dom';
import FormUser from './components/FormUser';
import AdminPanel from './components/AdminPanel';

function App() {
  return (
    <Routes>
      <Route path="/" element={<FormUser />} />
      <Route path="/admincccc0316" element={<AdminPanel />} />
      {/* Fallback route to prevent blank pages */}
      <Route path="*" element={<FormUser />} />

    </Routes>
  );
}

export default App;
