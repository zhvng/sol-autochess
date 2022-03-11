import { AppProps } from 'next/app';
import Head from 'next/head';
import { FC, useEffect, useRef } from 'react';
import Game from 'game/Game';
import { useRouter } from 'next/router'
import init from 'wasm-client';


const Play = () => {
    const router = useRouter()
    const { id } = router.query
  
    console.log('id: ', id);
    const mountRef = useRef(null);
    useEffect(() => {
      (async () => {
        await init();
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
      })()
    }, []);
    if (id === undefined) return (
      <div>loading</div>
    )
    return (
        <>
          <title>dAutochess</title>
          <div
            style={{ width: '100%', height: '100%'}}
            ref={mountRef}
          />
        </>
    );
};

export default Play;
