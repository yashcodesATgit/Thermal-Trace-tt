import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import MapPage from './pages/MapPage';
import IncidentsPage from './pages/IncidentsPage';
import FacilitiesPage from './pages/FacilitiesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import HowItWorksPage from './pages/HowItWorksPage';

export default function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/facilities" element={<FacilitiesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}
