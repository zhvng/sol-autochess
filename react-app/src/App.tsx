import React, { useEffect, useRef } from 'react';
import './App.css';
import Game from './game/Game';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Play from './Play';
import Home from './Home';

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />}>
          <Route path="/play" element={<Play />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
