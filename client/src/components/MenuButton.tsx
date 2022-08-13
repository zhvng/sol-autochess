import React, { FC } from 'react';

type MenuButtonProps = {
    onClick: () => void;
    disabled?: boolean;
    children?: React.ReactNode;
    color: 'green' | 'red' | 'orange' | 'blue' | 'yellow';
}

export const MenuButton: FC<MenuButtonProps> = ({onClick, children, disabled, color}: MenuButtonProps) => {

    let colorClassName = '';
    if (color == 'green') {
        colorClassName = 'bg-green-700 border-green-800 hover:bg-green-600 hover:border-green-700'
    } else if (color == 'red') {
        colorClassName = 'bg-rose-500 border-rose-700 hover:bg-rose-400 hover:border-rose-500'
    } else if (color == 'orange') {
        colorClassName = 'bg-orange-700 border-orange-800 hover:bg-orange-600 hover:border-orange-700'
    } else if (color == 'blue') {
        colorClassName = 'bg-sky-500 border-sky-600 hover:bg-sky-400 hover:border-sky-500'
    }else if (color == 'yellow') {
        colorClassName = 'bg-yellow-500 border-yellow-600 hover:bg-yellow-400 hover:border-yellow-500'
    } 
    return (
        <button 
            onClick={onClick} 
            disabled={disabled} 
            className={`block mt-2 mx-auto border-0 text-xl border-b-8 pt-4 px-8 pb-10 w-fit rounded-lg btn animate disabled:animate-none ${colorClassName}`}>
                {children}
        </button>
    );
};
