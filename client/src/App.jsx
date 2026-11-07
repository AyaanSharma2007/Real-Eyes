import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PasswordGate from './components/PasswordGate';
import StartScreen from './components/StartScreen';
import Game from './components/Game';
import ResultScreen from './components/ResultScreen';
import Scoreboard from './components/Scoreboard';

function App() {
  return (
    <BrowserRouter>
      <PasswordGate>
        <div className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-cyan-100 selection:text-cyan-900">
          <Routes>
            <Route path="/" element={<StartScreen />} />
            <Route path="/game" element={<Game />} />
            <Route path="/result" element={<ResultScreen />} />
            <Route path="/leaderboard" element={<Scoreboard />} />
          </Routes>
        </div>
      </PasswordGate>
    </BrowserRouter>
  );
}

export default App;
