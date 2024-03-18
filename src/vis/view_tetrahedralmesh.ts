import * as THREE from "three";
import { scene } from "./init_three";
import { TetrahedralMesh } from "../geo/tetrahedralmesh";

export const view_tetrahedralmesh = (tmesh: TetrahedralMesh, color: number, boundary_color?: number) => {
    let vertices: number[] = [];
    let boundary_vertices: number[] = [];
    for(let t of tmesh.tets){
        if(boundary_color != undefined){
            //               1 2    2 3    3 4    4 1    1 3    2 4
            //                0      1      2      3      4      5
            let boundary = [false, false, false, false, false, false];
            if(t.neighbor_f142 === undefined){ boundary[3] = true; boundary[5] = true; boundary[0] = true; }
            if(t.neighbor_f243 === undefined){ boundary[5] = true; boundary[2] = true; boundary[1] = true; }
            if(t.neighbor_f312 === undefined){ boundary[4] = true; boundary[0] = true; boundary[1] = true; }
            if(t.neighbor_f413 === undefined){ boundary[3] = true; boundary[4] = true; boundary[2] = true; }

            (boundary[0] ? boundary_vertices : vertices).push(...t.n1.to_THREE(), ...t.n2.to_THREE());
            (boundary[1] ? boundary_vertices : vertices).push(...t.n2.to_THREE(), ...t.n3.to_THREE());
            (boundary[2] ? boundary_vertices : vertices).push(...t.n3.to_THREE(), ...t.n4.to_THREE());
            (boundary[3] ? boundary_vertices : vertices).push(...t.n4.to_THREE(), ...t.n1.to_THREE());
            (boundary[4] ? boundary_vertices : vertices).push(...t.n1.to_THREE(), ...t.n3.to_THREE());
            (boundary[5] ? boundary_vertices : vertices).push(...t.n2.to_THREE(), ...t.n4.to_THREE());
        } else {
            vertices.push(
                ...t.n1.to_THREE(), ...t.n2.to_THREE(), 
                ...t.n2.to_THREE(), ...t.n3.to_THREE(), 
                ...t.n3.to_THREE(), ...t.n4.to_THREE(), 
                ...t.n4.to_THREE(), ...t.n1.to_THREE(), 
                
                ...t.n1.to_THREE(), ...t.n3.to_THREE(), 
                ...t.n2.to_THREE(), ...t.n4.to_THREE(), 
            )
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({color: color}));
    scene.add(lines);

    if(boundary_color != undefined){
        const geometry2 = new THREE.BufferGeometry();
        geometry2.setAttribute('position', new THREE.BufferAttribute(new Float32Array(boundary_vertices), 3));
        const lines2 = new THREE.LineSegments(geometry2, new THREE.LineBasicMaterial({color: boundary_color}));
        scene.add(lines2);

        return {
            objects: [lines, lines2]
        }
    }

    return {
        objects: [lines]
    }
}