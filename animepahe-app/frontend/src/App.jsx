import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SeriesPage from './pages/SeriesPage';
import WatchPage from './pages/WatchPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/series/:session" element={<SeriesPage />} />
        <Route path="/watch/:animeSession/:epSession/:episodeNum" element={<WatchPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
