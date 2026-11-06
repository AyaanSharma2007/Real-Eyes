import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StartScreen from './components/StartScreen';
import Game from './components/Game';
import ResultScreen from './components/ResultScreen';
import Scoreboard from './components/Scoreboard';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-cyan-100 selection:text-cyan-900">
        <Routes>
          <Route path="/" element={<StartScreen />} />
          <Route path="/game" element={<Game />} />
          <Route path="/result" element={<ResultScreen />} />
          <Route path="/leaderboard" element={<Scoreboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
