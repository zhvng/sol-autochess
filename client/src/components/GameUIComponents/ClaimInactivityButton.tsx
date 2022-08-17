import { FC } from "react";

export type ClaimInactivityButtonProps = {
    show: boolean;
    onClick?: () => void;
}

export const ClaimInactivityButton: FC<ClaimInactivityButtonProps> = (props: ClaimInactivityButtonProps) => {
    if (props.onClick === undefined || props.show === false) {
        return null;
    }
    return (
        <div className='absolute z-50 top-36 left-[50%] translate-x-[-50%]'>
            <button 
                onClick={props.onClick} 
                className={`bg-emerald-400/50 hover:bg-emerald-400 text-md border-0 w-fit py-2 btn animate disabled:animate-none disabled:bg-white/30`}>
                    claim victory
            </button>
        </div>
    )
}
