import { AppBar } from "components/AppBar";
import type { NextPage } from "next";
import Head from "next/head";
import { UnitsView } from "../views";

const Units: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>units</title>
        <meta
          name="description"
          content="unit descriptions"
        />
      </Head>
      <AppBar/>
      <UnitsView />
    </div>
  );
};

export default Units;
