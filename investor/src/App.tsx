import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PitchDeckPage from './pages/PitchDeckPage';
import InvestorBoardPage from './pages/InvestorBoardPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pitch" element={<PitchDeckPage />} />
        <Route path="/board" element={<InvestorBoardPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
