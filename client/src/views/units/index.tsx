
import { FC } from "react";
import { SignMessage } from '../../components/SignMessage';
import { SendTransaction } from '../../components/SendTransaction';

export const UnitsView: FC = ({ }) => {

  return (
<div className="md:hero mx-auto p-4">
        <h4 className="md:w-1/2 text-center text-slate-300 my-2 font-mono">
          <h1 className="text-center text-xl font-bold text-transparent bg-clip-text text-amber-100">
            units
          </h1>
          <br></br>
          <hr></hr>
          <br></br>
          <p>Here's a list of the available units and their stats.</p>
          <br></br>
          <ol>
            <li className="text-amber-100">Wolf</li>
              <ul className="inline-block text-left">
                <li>movement speed: 2</li>
                <li>attack speed: 1.25</li>
                <li>range: 1.25</li> 
                <li>damage: 15</li>
                <li>health: 100</li>
              </ul>
            <li className="text-amber-100 mt-5">Bear</li>
              <ul className="inline-block text-left">
                <li>movement speed: .75</li>
                <li>attack speed: .83</li>
                <li>range: 1.5</li> 
                <li>damage: 10</li>
                <li>health: 250</li>
              </ul>
              <li className="text-amber-100 mt-5">Bull</li>
              <ul className="inline-block text-left">
                <li>movement speed: 1.25</li>
                <li>attack speed: .71</li>
                <li>range: 1.5</li> 
                <li>damage: 25</li>
                <li>health: 150</li>
              </ul>
          </ol>
          <br></br>
          <hr></hr>
          <br></br>
          <p>The game board is 8 squares x 8 squares. Movement speed is in squares/second, attack speed is in attacks/second, range is in squares.</p>
          <br></br>
          <p>More units, traits and abilities coming soon.</p>

        </h4> 
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