import { FC } from "react";

type InfoProps = {
    children?: React.ReactNode;
}

export const Info: FC = ({children}: InfoProps) => {

    return (
        <div className='flex w-full h-16 absolute top-16 bg-white/30 items-center justify-center'>
            <div className='text-3xl text-white'>
                {children} 
            </div>
        </div>
    );
};
