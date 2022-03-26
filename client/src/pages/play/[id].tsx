import { AppProps } from 'next/app';
import Head from 'next/head';
import { FC, useEffect, useRef } from 'react';
import Game from 'game/Game';
import { useRouter } from 'next/router'
import init from 'wasm-client';
import { PublicKey } from '@solana/web3.js';
import { notify } from 'utils/notifications';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getProgram } from 'utils/program';
import { getGameInputs } from 'utils/gameInputs';


const Play = () => {
    const router = useRouter()
    const wallet = useAnchorWallet();
    const { connection } = useConnection();

    const { id } = router.query
    const mountRef = useRef(null);
    useEffect(() => {
      (async () => {
        try {
          if (id !== undefined && wallet !== undefined) {
            console.log('id: ', id);
            const gamePDAKey = new PublicKey(id);
            const program = getProgram(wallet, connection);

            await init();
            const gameInputs = getGameInputs(gamePDAKey, wallet.publicKey);
            const game = new Game(gamePDAKey, program, gameInputs);
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
          }
        } catch(err) {
          notify({ type: 'error', message: `Joining game failed!` });
        }
      })()
    }, [id, wallet]);
    if (id === undefined) return (
      <div>loading</div>
    )
    return (
        <>
          <div className='absolute right-0 w-500'>
            <WalletMultiButton className="btn btn-ghost mr-4" />
          </div>
          <div
            style={{ width: '100%', height: '100%', zIndex: 0}}
            ref={mountRef}
          />

        </>
    );
};

export default Play;
