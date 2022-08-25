import { useConnection } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { useEffect, useState } from "react";

export let useConnectionWrapper;

const env = process.env.NEXT_PUBLIC_CLIENT_MODE;
if(env === "local"){
    useConnectionWrapper = () => {
        const [connection, setConnection] = useState(undefined);
        useEffect(()=>{
            setConnection(new Connection('http://localhost:8899', 'confirmed'));
        }, []);
        return { connection };
    };
} else {  
    useConnectionWrapper = useConnection;
}
