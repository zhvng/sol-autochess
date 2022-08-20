import { AppProps } from 'next/app';
import Head from 'next/head';
import { Dispatch, FC, useEffect, useReducer, useRef } from 'react';
import Game from 'game/Game';
import { useRouter } from 'next/router'
import init, { UnitTypeWasm } from 'wasm-client';
import { PublicKey } from '@solana/web3.js';
import { notify } from 'utils/notifications';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getProgram } from 'utils/program';
import { getGameInputs } from 'utils/gameInputs';
import { useConnectionWrapper } from 'hooks/useConnectionWrapper';
import { PlacePiecesInfo } from 'components/GameUIComponents/PlacePiecesInfo';
import { WaitingForRevealInfo } from 'components/GameUIComponents/WaitingForRevealInfo';
import { LockInButton } from 'components/GameUIComponents/LockInButton';
import { ClaimInactivityButton } from 'components/GameUIComponents/ClaimInactivityButton';
import { UnitData } from 'components/GameUIComponents/UnitData';
import { UnitStats } from 'models/gameTypes';

export enum UIComponent {
  PlacePieces,
  WaitingForReveal,
  ClaimInactivityButton,
  LockInButton,
  UnitData,
}

export type UIComponentData = {
  show: boolean,
  onClick?: () => void,
  disabled?: boolean,
  unitStats?: UnitStats
}

export type UIReducerAction = {
  changes: Map<UIComponent, UIComponentData>,
}

export type UIReducerState = Map<UIComponent, UIComponentData>;

export type UIController = {
  uiState: UIReducerState,
  dispatchUIChange: Dispatch<UIReducerAction>
}

function UIReducer(state: UIReducerState, action: UIReducerAction) {
  const newState = new Map(state);
  for (const key of action.changes.keys()) {
    newState.set(key, action.changes.get(key));
  }
  return newState;
}

const defaultUIState = new Map<UIComponent, UIComponentData>(
  [
    [UIComponent.PlacePieces, { show: false }],
    [UIComponent.WaitingForReveal, { show: false }],
    [UIComponent.ClaimInactivityButton, { show: false }],
    [UIComponent.LockInButton, { show: false }],
    [UIComponent.UnitData, { show: false }],
  ]
);

const uiController: UIController = {
  uiState: defaultUIState,
  dispatchUIChange: () => {},
}

const Play = () => {
    const router = useRouter()
    const wallet = useAnchorWallet();
    const { connection } = useConnectionWrapper();

    const [uiState, dispatchUIChange] = useReducer(UIReducer, defaultUIState); 
    uiController.uiState = uiState;
    uiController.dispatchUIChange = dispatchUIChange;

    const { id } = router.query;
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
            const game = new Game(gamePDAKey, program, gameInputs, uiController); 
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, wallet]);
    if (id === undefined) return (
      <div>loading</div>
    )
    return (
        <>
          <div className='absolute right-0 w-500'>
            <WalletMultiButton className="btn btn-ghost mr-4" />
          </div>
            
          {uiState.get(UIComponent.PlacePieces).show && <PlacePiecesInfo />}
          {uiState.get(UIComponent.WaitingForReveal).show && <WaitingForRevealInfo />}
          {uiState.get(UIComponent.ClaimInactivityButton).show && <ClaimInactivityButton {...uiState.get(UIComponent.ClaimInactivityButton)} />}
          {uiState.get(UIComponent.LockInButton).show && <LockInButton {...uiState.get(UIComponent.LockInButton)} />}
          {uiState.get(UIComponent.UnitData).show && <UnitData {...uiState.get(UIComponent.UnitData)} />}

          <div
            style={{ width: '100%', height: '100%', zIndex: 0}}
            ref={mountRef}
          />
        </>
    );
};

export default Play;
