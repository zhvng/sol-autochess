import React, { FC, forwardRef, ForwardRefRenderFunction, useImperativeHandle } from 'react';
import { CreateGame } from './CreateGame';
import GameList from './GameList';

type ModalProps = {
    children?: React.ReactNode;
    header?: React.ReactNode;
}
export type ModalHandle = {
    toggleModal: () => void,
}

const Modal: ForwardRefRenderFunction<ModalHandle, ModalProps> = (props, ref) => {

    const [isOpen, setIsOpen] = React.useState(false);
    useImperativeHandle(ref, () => ({
        toggleModal() {
            setIsOpen(!isOpen);
        },
      }));

    function stopProp(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        e.stopPropagation();
    }
    function closeModal() {
        setIsOpen(false);
    }
    if (!isOpen) {
        return null;
    }
    return (
        <React.Fragment>
            <div onClick={closeModal} className="bg-green-100/20 overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 w-full md:inset-0 h-modal m:h-full">
                <div onClick={stopProp} className="mt-8 relative p-4 w-full max-w-2xl h-full md:h-auto mx-auto my-auto">
                    <div className="relative rounded-3xl shadow bg-black ">
                        <div className="flex justify-between items-start p-2 rounded-t">
                            <div className='p-4'>
                             {props.header}
                            </div>
                            <button onClick={closeModal} className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white" data-modal-toggle="defaultModal">
                                <div>Close</div>
                                <span className="sr-only">Close modal</span>
                            </button>
                        </div>
                        <div className="px-8 pb-8">
                            {props.children}
                        </div>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
};

export default forwardRef(Modal);