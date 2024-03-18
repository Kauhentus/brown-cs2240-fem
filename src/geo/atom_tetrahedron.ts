import { add_v, avg_v, cross_v, dot_v, magnitude_v, magnitude_vec3, normalize_v, smul_v, sub_v } from "../math/linalg_standard";
import { Node } from "./atom_node";
import { V3 } from "./atom_vertex";
import { add_mat3, mat3_applyv, mat3_identity, mat3_invert, mat3_matmul, mat3_trace, mat3_tranpose, mat4_det, mat4_vecmul, smul_mat3, sub_mat3 } from "../math/linalg_matrix";

let tet_id_counter = 0;
export class Tetrahedron {
    n1: Node;
    n2: Node;
    n3: Node;
    n4: Node;
    nodes: Node[];

    neighbor_f142!: Tetrahedron;
    neighbor_f243!: Tetrahedron;
    neighbor_f312!: Tetrahedron;
    neighbor_f413!: Tetrahedron;

    neighbor_f142_normal!: V3; // normals are in material space
    neighbor_f243_normal!: V3;
    neighbor_f312_normal!: V3;
    neighbor_f413_normal!: V3;

    neighbor_f142_area: number = 0; // areas are in world space
    neighbor_f243_area: number = 0;
    neighbor_f312_area: number = 0;
    neighbor_f413_area: number = 0;

    m1: V3;
    m2: V3;
    m3: V3;
    m4: V3;

    beta: number[];
    P!: number[];
    V!: number[];
    F!: number[];
    F_dot!: number[];
    sigma!: number[];

    id: symbol;

    constructor(n1 : Node, n2 : Node, n3 : Node, n4 : Node){
        this.n1 = n1;
        this.n2 = n2;
        this.n3 = n3;
        this.n4 = n4;
        this.nodes = [this.n1, this.n2, this.n3, this.n4];
        this.nodes.forEach(n => n.parent = this);
        this.id = Symbol(tet_id_counter++);

        // store OG positions (material space)
        this.m1 = n1.pos.clone();
        this.m2 = n2.pos.clone();
        this.m3 = n3.pos.clone();
        this.m4 = n4.pos.clone();
        this.beta = this.compute_mat_beta();
    }

    compute_mat_beta(){
        const B = [
            sub_v(this.m1, this.m4).to_THREE(),
            sub_v(this.m2, this.m4).to_THREE(),
            sub_v(this.m3, this.m4).to_THREE(),
        ].flat();
        const beta = mat3_invert(B);
        return beta;
    }

    compute_mat_P(){
        this.P = [
            sub_v(this.n1.pos, this.n4.pos).to_THREE(),
            sub_v(this.n2.pos, this.n4.pos).to_THREE(),
            sub_v(this.n3.pos, this.n4.pos).to_THREE(),
        ].flat();
    }

    compute_mat_V(){
        this.V = [
            sub_v(this.n1.vel, this.n4.vel).to_THREE(),
            sub_v(this.n2.vel, this.n4.vel).to_THREE(),
            sub_v(this.n3.vel, this.n4.vel).to_THREE(),
        ].flat();
    }

    compute_F(){
        this.F = this.compute_dx_du();
    }

    compute_F_dot(){
        this.F_dot = this.compute_dx_dot_du();
    }

    compute_xu(u: V3){
        const xu_origin = mat3_applyv(mat3_matmul(this.P, this.beta), sub_v(u, this.m4));
        const xu = add_v(xu_origin, this.n4.pos);
        return xu;
    }

    compute_xu_dot(u: V3){
        const xu_dot_origin = mat3_applyv(mat3_matmul(this.V, this.beta), sub_v(u, this.m4));
        const xu_dot = add_v(xu_dot_origin, this.n4.vel);
        return xu_dot;
    }

    compute_dx_du(){
        return mat3_matmul(this.P, this.beta);
    }

    compute_dx_dot_du(){
        return mat3_matmul(this.V, this.beta);
    }

    compute_volume(){
        // let volume = 1/6 * mat4_det([
        //     this.n1.pos.x, this.n2.pos.x, this.n3.pos.x, this.n4.pos.x, 
        //     this.n1.pos.y, this.n2.pos.y, this.n3.pos.y, this.n4.pos.y, 
        //     this.n1.pos.z, this.n2.pos.z, this.n3.pos.z, this.n4.pos.z, 
        //     1, 1, 1, 1
        // ]);
        let volume = 1/6 * magnitude_v(smul_v(
            cross_v(sub_v(this.n2.pos, this.n1.pos), sub_v(this.n3.pos, this.n1.pos)),
            dot_v(this.n4.pos, this.n1.pos)
        ));
        return volume;
    }

    compute_normals(){
        let edge_14 = sub_v(this.m4, this.m1);
        let edge_42 = sub_v(this.m2, this.m4);
        this.neighbor_f142_normal = smul_v(normalize_v(cross_v(edge_14, edge_42)), -1);
        
        let edge_24 = sub_v(this.m4, this.m2);
        let edge_43 = sub_v(this.m3, this.m4);
        this.neighbor_f243_normal = smul_v(normalize_v(cross_v(edge_24, edge_43)), -1);
        
        let edge_31 = sub_v(this.m1, this.m3);
        let edge_12 = sub_v(this.m2, this.m1);
        this.neighbor_f312_normal = smul_v(normalize_v(cross_v(edge_31, edge_12)), -1);

        let edge_41 = sub_v(this.m1, this.m4);
        let edge_13 = sub_v(this.m3, this.m1);
        this.neighbor_f413_normal = smul_v(normalize_v(cross_v(edge_41, edge_13)), -1);
    }

    compute_areas(){
        let edge_14 = sub_v(this.n4.pos, this.n1.pos);
        let edge_42 = sub_v(this.n2.pos, this.n4.pos);
        this.neighbor_f142_area = magnitude_v(cross_v(edge_14, edge_42));
        
        let edge_24 = sub_v(this.n4.pos, this.n2.pos);
        let edge_43 = sub_v(this.n3.pos, this.n4.pos);
        this.neighbor_f243_area = magnitude_v(cross_v(edge_24, edge_43));
        
        let edge_31 = sub_v(this.n1.pos, this.n3.pos);
        let edge_12 = sub_v(this.n2.pos, this.n1.pos);
        this.neighbor_f312_area = magnitude_v(cross_v(edge_31, edge_12));

        let edge_41 = sub_v(this.n1.pos, this.n4.pos);
        let edge_13 = sub_v(this.n3.pos, this.n1.pos);
        this.neighbor_f413_area = magnitude_v(cross_v(edge_41, edge_13));
    }

    compute_stress_tensor(log = false){
        const F = this.F;
        const F_dot = this.F_dot;
        const I = mat3_identity();
        const strain = sub_mat3(mat3_matmul(mat3_tranpose(F), F), I);
        const strain_dot = add_mat3(
            mat3_matmul(mat3_tranpose(F), F_dot),
            mat3_matmul(mat3_tranpose(F_dot), F)
        );

        if(log){
            console.log(F);
            console.log(strain);
        }

        const lambda = 200;
        const mu = 200;
        const phi = 1;
        const psi = 1;

        const stress_elastic = add_mat3(
            smul_mat3(I, mat3_trace(strain) * lambda),
            smul_mat3(strain, 2 * mu)
        );
        const stress_viscous = add_mat3(
            smul_mat3(I, mat3_trace(strain_dot) * phi),
            smul_mat3(strain_dot, 2 * psi)
        );
        const stress = add_mat3(stress_elastic, stress_viscous);
        this.sigma = mat3_matmul(F, stress);
    }
}