import { mat3_vecmul } from "../math/linalg_matrix";
import { MeshData } from "../util/parse-mesh";
import { Node } from "./atom_node";
import { Tetrahedron } from "./atom_tetrahedron";
import { V3 } from "./atom_vertex";
import { smul_v, smul_vec3 } from "../math/linalg_standard";

export class TetrahedralMesh {
    tets: Tetrahedron[];
    verts: V3[];
    nodes: Node[];

    rho: number;

    constructor(){
        this.tets = [];
        this.verts = [];
        this.nodes = [];

        this.rho = 1;
    }

    static fromMeshData(data: MeshData){
        const tmesh = new TetrahedralMesh();

        // handle vertices
        const verts = data.vertices;
        tmesh.verts = verts;
        const nodes = verts.map(v => new Node(v, V3.zero(), V3.zero()));
        tmesh.nodes = nodes;

        // handle tetrahedrons
        let neighbor_map : {[key: symbol]: Tetrahedron[]} = {};
        nodes.forEach(n => neighbor_map[n.id] = []);

        data.indices.forEach(quadruple => {
            const v0 = nodes[quadruple[0]];
            const v1 = nodes[quadruple[1]];
            const v2 = nodes[quadruple[2]];
            const v3 = nodes[quadruple[3]];

            const tet = new Tetrahedron(v0, v1, v2, v3);
            tmesh.tets.push(tet);

            neighbor_map[v0.id].push(tet);
            neighbor_map[v1.id].push(tet);
            neighbor_map[v2.id].push(tet);
            neighbor_map[v3.id].push(tet);
        });

        tmesh.tets.forEach(t => {
            const find_neighbor = (n0: Node, n1: Node, n2: Node): (Tetrahedron | undefined) => {
                let candidates = [...new Set(
                    neighbor_map[n0.id]
                    .concat(neighbor_map[n1.id])
                    .concat(neighbor_map[n2.id])
                )];
                let matches = candidates.filter(u => 
                    neighbor_map[n0.id].includes(u) && 
                    neighbor_map[n1.id].includes(u) && 
                    neighbor_map[n2.id].includes(u) 
                ).filter(u => u != t);
                if(matches.length > 1) throw Error("found triangle face with 2+ neighbors");

                return matches[0];
            }

            // match 142 face
            let t_142_neighbor = find_neighbor(t.n1, t.n4, t.n2);
            if(t_142_neighbor) t.neighbor_f142 = t_142_neighbor;

            // match 243 face
            let t_243_neighbor = find_neighbor(t.n2, t.n4, t.n3);
            if(t_243_neighbor) t.neighbor_f243 = t_243_neighbor;

            // match 312 face
            let t_312_neighbor = find_neighbor(t.n3, t.n1, t.n2);
            if(t_312_neighbor) t.neighbor_f312 = t_312_neighbor;

            // match 413 face
            let t_413_neighbor = find_neighbor(t.n4, t.n1, t.n3);
            if(t_413_neighbor) t.neighbor_f413 = t_413_neighbor;
        });

        tmesh.tets.forEach(t => t.compute_normals());

        return tmesh;
    }

    compute_mass(){
        this.nodes.forEach(n => n.mass = 0); // clear masses

        this.nodes.forEach(n => n.mass = 1);

        // this.tets.forEach(t => {
        //     let volume = t.compute_volume();
        //     let tet_mass = volume * this.rho;
        //     let per_node_mass = tet_mass / 4;
        //     t.nodes.forEach(n => n.mass += per_node_mass);
        // });
    }

    compute_force_calculation_constants(){
        // clear forces add gravity
        this.nodes.forEach(n => n.f.zero_out());
        this.nodes.forEach(n => n.f.add_xyz(0, -9.8, 0));

        // compute area and stress tensors
        this.tets.forEach(tet => tet.compute_areas());
        this.tets.forEach(tet => {
            tet.compute_mat_P();
            tet.compute_mat_V();
        });
        
        let first = true;
        this.tets.forEach(tet => {
            tet.compute_F();
            tet.compute_F_dot();
            tet.compute_stress_tensor();
            first = false;
        });
    }

    compute_forces(){
        // accumulate forces
        let first = true;
        this.tets.forEach(tet => {
            let sigma = tet.sigma;
            let f_on_n1 = smul_vec3(mat3_vecmul(sigma, tet.neighbor_f243_normal.to_THREE()), tet.neighbor_f243_area);
            let f_on_n2 = smul_vec3(mat3_vecmul(sigma, tet.neighbor_f413_normal.to_THREE()), tet.neighbor_f413_area);
            let f_on_n3 = smul_vec3(mat3_vecmul(sigma, tet.neighbor_f142_normal.to_THREE()), tet.neighbor_f142_area);
            let f_on_n4 = smul_vec3(mat3_vecmul(sigma, tet.neighbor_f312_normal.to_THREE()), tet.neighbor_f312_area);

            tet.n1.f.add_xyz(...f_on_n1);
            tet.n2.f.add_xyz(...f_on_n2);
            tet.n3.f.add_xyz(...f_on_n3);
            tet.n4.f.add_xyz(...f_on_n4);
        });

        // console.log(this.nodes[0].f)
    }

    update_positions(new_x: number[]){
        for(let i = 0; i < new_x.length; i += 3){
            let i3 = i / 3;
            this.nodes[i3].pos.set_xyz(new_x[i], new_x[i + 1], new_x[i + 2]);
        }
    }

    update_velocities(new_v: number[]){
        for(let i = 0; i < new_v.length; i += 3){
            let i3 = i / 3;
            this.nodes[i3].vel.set_xyz(new_v[i], new_v[i + 1], new_v[i + 2]);
        }
    }
}