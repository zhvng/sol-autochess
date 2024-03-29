// Next, React
import { FC } from 'react';
import { CreateGame } from 'components/CreateGame';
import GameList from 'components/GameList';
import { useRouter } from 'next/router';
import Image from 'next/image';
import mainPic from '/public/autochess_dalle.jpeg';
import logo from '/public/autochess_logo.png';
import { MainMenu } from 'components/MainMenu';

export const HomeView: FC = ({ }) => {
  const router = useRouter();
  return (

    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        {/* <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text text-amber-100">
          sol autochess
        </h1> */}
        <h4 className="text-center text-slate-300">
          {/* <br></br>
          <div className="border-2 p-5">
            <p>Fully on chain. No game servers. 0% rake.</p>
            <p>Powered by smart contracts on the Solana blockchain.</p>
          </div>
          <br></br> */}
          {/* <div className="md:hidden flex-row flex">
            <p><button onClick={()=>{router.push('/play')}} className='text-white px-4 bg-slate-400'>PLAY</button></p>
            <p><button onClick={()=>{router.push('/rules')}} className='text-white px-4 bg-slate-600'>RULES</button></p>
            <p><button onClick={()=>{router.push('/units')}} className='text-white px-4 bg-slate-600'>UNITS</button></p>
          </div> */}
          {/* <br></br> */}

          {/* <p>Join or create a game:</p> */}
          {/* <h1 className="text-center text-xl font-bold text-transparent bg-clip-text text-amber-100">
            Join or create a game
          </h1> */}
        </h4>
        <div className='relative w-96 h-8 mx-auto'>
          <Image src={logo} 
              alt='Solana Autochess' 
              layout='fill'/>
        </div>
        <div className='w-80 mx-auto'>
          <Image src={mainPic} 
              alt='brown bear and black bull fighting on a giant chessboard with trees in the background, digital art' 
              layout='intrinsic'
              className="mx-auto" />
        </div>
        <MainMenu />
      </div>
    </div>
  );
};
