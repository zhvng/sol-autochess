// Next, React
import { FC } from 'react';
import { CreateGame } from 'components/CreateGame';
import GameList from 'components/GameList';
import { useRouter } from 'next/router';

export const HomeView: FC = ({ }) => {
  const router = useRouter();
  return (

    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text text-amber-100">
          sol autochess
        </h1>
        <h4 className="text-center text-slate-300 my-2 font-mono">
          <br></br>
          <div className="border-2 p-5">
            <p>Fully on chain. No game servers. 0% rake.</p>
            <p>Powered by smart contracts on the Solana blockchain.</p>
          </div>
          <br></br>
          <div className="md:hidden">
            <p><button onClick={()=>{router.push('/rules')}} className='text-amber-100 underline'>how to play</button></p>
            <p><button onClick={()=>{router.push('/units')}} className='text-amber-100 underline'>unit list</button></p>
          </div>
          <br></br>

          <p>Join or create a game:</p>

        </h4>   
        <div className="text-center">
          <CreateGame />
          {/* {wallet.publicKey && <p>Public Key: {wallet.publicKey.toBase58()}</p>} */}
        </div>

        <GameList/>
      </div>
    </div>
  );
};
