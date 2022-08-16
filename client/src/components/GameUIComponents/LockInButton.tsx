import { FC } from "react";

export type LockInButtonProps = {
    show: boolean;
    onClick?: () => void;
    disabled?: boolean;
}

export const LockInButton: FC<LockInButtonProps> = (props: LockInButtonProps) => {
    if (props.onClick === undefined || props.show === false || props.disabled === undefined) {
        return null;
    }
    return (
        <div className='absolute z-50 top-[28%] left-[50%] translate-x-[-50%] translate-y-[-50%]'>
            <button 
                onClick={props.onClick} 
                disabled={props.disabled}
                className={`bg-emerald-400/50 hover:bg-emerald-400 text-md border-0 min-h-0 h-fit w-fit py-2 rounded-lg btn animate disabled:animate-none disabled:bg-white/30`}>
                    READY
            </button>
        </div>
    )
}
