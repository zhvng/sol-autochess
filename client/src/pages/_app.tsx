import { AppProps } from 'next/app';
import Head from 'next/head';
import { FC, useEffect, useRef } from 'react';
import { ContextProvider } from '../contexts/ContextProvider';
import { AppBar } from '../components/AppBar';
import { ContentContainer } from '../components/ContentContainer';
import { Footer } from '../components/Footer';
import Notifications from '../components/Notification'

require('@solana/wallet-adapter-react-ui/styles.css');
require('../styles/globals.css');

const App: FC<AppProps> = ({ Component, pageProps }) => {
    return (
        <>
          <Head>
            <title>sol autochess</title>
          </Head>
          <ContextProvider>
            <Notifications />
            <Component {...pageProps} />
          </ContextProvider>
        </>
    );
};

export default App;
