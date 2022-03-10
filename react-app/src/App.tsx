import React, { useEffect, useRef } from 'react';
import './App.css';
import Game from './game/Game';

function App() {
  const mountRef = useRef(null);
  useEffect(() => {
    const game = new Game();
    const canvas = game.getCanvasElement();
    const cssRenderer = game.getCSSRendererElement();
    if (mountRef.current !== null) {
      (mountRef.current as Node).appendChild(canvas);
      (mountRef.current as Node).appendChild(cssRenderer);
    }
    return () =>  {
      if (mountRef.current !== null) {
        const node = mountRef.current as Node;
        node.removeChild(canvas);
        node.removeChild(cssRenderer);
      }
    }
  }, []);

  return (
    <div className="App">
      <header className="App-header">
      <noscript>This page contains webassembly and javascript content, please enable javascript in your browser.</noscript>
      <div
        style={{ width: '100%', height: '100%'}}
        ref={mountRef}
      />
      </header>
    </div>
  );
}

export default App;
