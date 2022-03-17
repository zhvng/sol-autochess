import * as THREE from 'three';
import { Group } from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { ControllerWasm } from 'wasm-client';

class HealthBar {
    private readonly healthBarWidthPx: number = 50;
    private readonly healthBarHeightPx: number = 9.5;
    private health: number;
    private slidingBarSize: number; 
    private readonly bar: CSS2DObject;
    constructor(
        private readonly group: THREE.Group, 
        private readonly controller: ControllerWasm,
        private startingHealth: number
    ){
        this.health = this.startingHealth;
        this.slidingBarSize = 0;

        const color = this.controller === ControllerWasm.Initializer ? '#33ccff' : '#ff6666';

        const healthBarGroup = new Group();

        const healthBarDiv = document.createElement( 'div' );

        healthBarDiv.className = 'healthbar';
        healthBarDiv.style.width = `${this.healthBarWidthPx}px`
        healthBarDiv.style.height = `${this.healthBarHeightPx}px`;
        healthBarDiv.style.borderStyle = 'solid';
        healthBarDiv.style.borderWidth = '2px';
        healthBarDiv.style.borderColor = '#708090';
        healthBarDiv.style.backgroundColor = 'black'

        const healthDiv = document.createElement( 'div' );
        healthBarDiv.appendChild(healthDiv);
        healthDiv.style.width = '100%';
        healthDiv.style.height = '100%';
        healthDiv.style.backgroundColor = color;
        healthDiv.style.position = 'absolute';

        const slidingRedBarDiv = document.createElement( 'div' );
        healthBarDiv.append(slidingRedBarDiv);
        slidingRedBarDiv.style.width = `${this.slidingBarSize}%`;
        slidingRedBarDiv.style.height = '100%';
        slidingRedBarDiv.style.left = '100%';
        slidingRedBarDiv.style.position = 'absolute';
        slidingRedBarDiv.style.backgroundColor = 'yellow';

        const healthBarSegments = Math.floor(this.health / 20);
        const segmentWidth = this.healthBarWidthPx / this.health * 20;
        for (let i=0; i < healthBarSegments; i++) {
            const segment = document.createElement('div');
            segment.style.position = 'absolute';
            segment.style.width = `${segmentWidth}px`;
            segment.style.height = '100%';
            segment.style.left = `${i * segmentWidth}px`;
            segment.style.borderRight = '1px solid gray';
            healthBarDiv.append(segment);
        }

        this.bar = new CSS2DObject(healthBarDiv);
        this.bar.position.set(0, 7, 0);
        healthBarGroup.add(this.bar);

        this.group.add(healthBarGroup);
    }
    public update(timeElapsed: number) {
        if (this.slidingBarSize > 0) {
            this.slidingBarSize = Math.max(this.slidingBarSize - timeElapsed / 50, 0);
            const slidingRedBarDiv = this.bar.element.children[1]! as HTMLDivElement;
            slidingRedBarDiv.style.width = `${this.slidingBarSize}%`;
        }
    }

    public updateGame(newHealth: number) {
        if (this.health !== newHealth) {
            // update health
            const difference = this.health - newHealth;
            this.health = newHealth;
            const percentage = this.health/this.startingHealth * 100;
            (this.bar.element.firstChild! as HTMLDivElement).style.width = `${percentage}%`;

            // set sliding red bar
            if (difference > 0) {
                this.slidingBarSize += difference/this.startingHealth * 100;
                const slidingBarDiv = this.bar.element.children[1]! as HTMLDivElement;
                slidingBarDiv.style.width = `${this.slidingBarSize}%`;
                slidingBarDiv.style.left = `${percentage}%`;
            }
        }
    }

    public remove() {
        this.bar.visible = false;
        this.bar.parent?.remove();
    }

    // public damage(amount:number) {
    //     const newHealth = Math.max(this.health - amount, 0);
    //     this.updateHealth(newHealth);
    // }
    // public heal(amount:number) {
    //     const newHealth = Math.min(this.health + amount, this.startingHealth);
    //     this.updateHealth(newHealth);
    // }

}
export default HealthBar;