import { Tetrahedron } from "./atom_tetrahedron";
import { V3 } from "./atom_vertex";

let node_id_counter = 0;
export class Node {
    pos: V3;
    vel: V3;
    f: V3;
    mass: number;
    id: symbol;
    parent!: Tetrahedron;

    constructor(x: V3, v: V3, f: V3){
        this.pos = x;
        this.vel = v;
        this.f = f;
        this.mass = 0;
        this.id = Symbol(node_id_counter++);
    }

    to_THREE(){
        return this.pos.to_THREE();
    }
}