
import { FC } from "react";
import { SignMessage } from '../../components/SignMessage';
import { SendTransaction } from '../../components/SendTransaction';

export const RulesView: FC = ({ }) => {

  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <h4 className="md:w-1/2 text-center text-slate-300 my-2 font-mono">
          <p>How to play:</p>
          <br></br>
          <ul className="list-decimal inline-block text-left">
            <li>Create or join a game with your preferred wager amount</li>
            <li>At the start of the game, you draw 5 random units</li>
            <li>Place any 3 of them on your side of the board</li>
            <li>When the timer expires, the units will start fighting</li>
            <li>Player with units left standing wins the wagered sol</li>
          </ul>
          <br></br>
          <br></br>
          <hr></hr>
          <br></br>
          <p>This game involves sending multiple transactions in succession.</p>
          <br></br>
          <p>When you join a game, we create a burner wallet in the browser. We load it with a few cents, use it to pay tx fees, and send the remainder back to your main wallet after the game. </p>
          <br></br>
          <p>Dont keep funds in the burner wallet! It is stored in local storage so clearing the cache will delete it.</p>
          <br></br>
          <hr></hr>


        </h4>   
        </div>
        </div>
  );
};

// units.insert(
//   UnitType::Bull,
//   Unit {
//       movement_speed: 125 / TICKS_PER_SECOND, // per tick
//       attack_duration: 7,
//       attack_range: 150,
//       attack_damage: 25,
//       starting_health: 150,
//   },
// );