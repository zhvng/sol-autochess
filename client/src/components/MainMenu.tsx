import { useRouter } from 'next/router';
import React, { FC, useEffect, useRef } from 'react';
import { CreateGame } from './CreateGame';
import { CreateGameButton } from './CreateGameButton';
import GameList from './GameList';
import { MenuButton } from './MenuButton';
import Modal, { ModalHandle } from './Modal';
import { WalletProfileModule } from './WalletProfileModule';

export const MainMenu: FC = () => {
    const router = useRouter();
    const [showCreateGame, setShowCreateGame] = React.useState(false);
    const modalRef = useRef<ModalHandle>();

    return (
        <React.Fragment>
            <MenuButton onClick={()=>{
                if (modalRef && modalRef.current) modalRef.current.toggleModal();
            }} disabled={false} color='green'>Play</MenuButton>
            {showCreateGame && <CreateGame />}
            <Modal ref={modalRef}
            header = {<WalletProfileModule/>}>
                    
                <div className='flex-fit'>
                        <CreateGameButton></CreateGameButton>
                    </div>
                <GameList></GameList>
            </Modal>
            {/* <MenuButton onClick={()=>{setShowJoinGame(!showJoinGame)}} disabled={false} color='red'>Join Game</MenuButton>
            {showJoinGame && <GameList />} */}
            <MenuButton onClick={()=>{
                router.push('/rules');
            }} disabled={false} color='yellow'>What is this?</MenuButton>
        </React.Fragment>
    );
};
