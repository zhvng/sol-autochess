// Next, React
import { FC } from 'react';
import { CreateGame } from 'components/CreateGame';
import GameList from 'components/GameList';
import { useRouter } from 'next/router';
import Image from 'next/image';
import mainPic from '/public/icon.png';

export const HomeView: FC = ({ }) => {
  const router = useRouter();
  return (

    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        {/* <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text text-amber-100">
          sol autochess
        </h1> */}
        <h4 className="text-center text-slate-300 my-2">
          {/* <br></br>
          <div className="border-2 p-5">
            <p>Fully on chain. No game servers. 0% rake.</p>
            <p>Powered by smart contracts on the Solana blockchain.</p>
          </div>
          <br></br> */}
          <div className="md:hidden flex-row flex">
            <p><button onClick={()=>{router.push('/play')}} className='text-white px-4 bg-slate-400'>PLAY</button></p>
            <p><button onClick={()=>{router.push('/rules')}} className='text-white px-4 bg-slate-600'>RULES</button></p>
            <p><button onClick={()=>{router.push('/units')}} className='text-white px-4 bg-slate-600'>UNITS</button></p>
          </div>
          {/* <br></br> */}

          {/* <p>Join or create a game:</p> */}
          {/* <Image src={mainPic} width='100%' height='100%' className="mx-auto" /> */}
          {/* <h1 className="text-center text-xl font-bold text-transparent bg-clip-text text-amber-100">
            Join or create a game
          </h1> */}

        </h4>
        <CreateGame />
        <br></br>
        <GameList/>
      </div>
    </div>
  );
};
