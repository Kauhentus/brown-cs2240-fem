import { load_file } from "./util/load-file";
import { init_three, scene } from "./vis/init_three";
import { parse_mesh } from "./util/parse-mesh";
import { TetrahedralMesh } from "./geo/tetrahedralmesh";
import { view_tetrahedralmesh } from "./vis/view_tetrahedralmesh";
import { integrator_euler_step } from "./math/integrator_euler";
import { mat3_det, mat3_scale, mat3_tranpose, mat3_vecmul, mat4_det, mat4_tranpose, mat4_vecmul } from "./math/linalg_matrix";
import { V3 } from "./geo/atom_vertex";
import { view_fixedtriangles } from "./vis/view_fixedtriangles";
import { view_points } from "./vis/view_points";
import { abs_v, add_v, avg_v, magnitude_v, max_component_v, max_v, min_v, smul_v, zero_v } from "./math/linalg_standard";

init_three();

// load_file('/basic-finite-element/example-meshes/single-tet.mesh').then(raw_mesh_data => {
// load_file('/basic-finite-element/example-meshes/sphere.mesh').then(raw_mesh_data => {
// load_file('/basic-finite-element/example-meshes/cube.mesh').then(raw_mesh_data => {
load_file('/basic-finite-element/example-meshes/ellipsoid.mesh').then(raw_mesh_data => {
// load_file('/basic-finite-element/example-meshes/cone.mesh').then(raw_mesh_data => {
    const mesh_data = parse_mesh(raw_mesh_data);
    const tmesh = TetrahedralMesh.fromMeshData(mesh_data);
    tmesh.nodes.forEach(n => n.pos.add_xyz(0, 2, 0));

    const objs = view_tetrahedralmesh(tmesh, 0xaaff00, 0xff4444);
    const prev_objs = [...objs.objects];

    // SETUP PARAMS AND INIT STATE
    tmesh.rho = 1;
    const step = 0.003;

    const fixed_triangles: V3[][] = [];
    let slant = 0;
    fixed_triangles.push(
        [new V3(-2, 0.5, -2), new V3(2, 0.5 + slant, -2), new V3(2, 0.5 + slant, 2)],
        [new V3(2, 0.5 + slant, 2), new V3(-2, 0.5, 2), new V3(-2, 0.5, -2)]
    );
    view_fixedtriangles(fixed_triangles, 0x0000ff);

    const sd_box = (p: V3, lb: V3, hb: V3) => {
        return lb.x <= p.x && p.x <= hb.x &&
            lb.y <= p.y && p.y <= hb.y &&
            lb.z <= p.z && p.z <= hb.z;
    }

    const inside_collider = (p: V3): boolean => {
        return sd_box(p, new V3(-2, 0, -2), new V3(2, 0.5, 2));
    }

    tmesh.compute_mass();
    console.log(tmesh.nodes[0].mass)

    const max_iter = 100;
    let iters = 0;
    const loop = () => {
        // if(iters >= max_iter) return;

        console.log(`Iter: ${iters}`);
        prev_objs.forEach(o => {
            scene.remove(o);
        });
        
        // update tetrahedral mesh
        tmesh.compute_force_calculation_constants();
        tmesh.compute_forces();

        const x0_x = tmesh.nodes.map(n => n.pos.to_THREE()).flat();
        const x0_v = tmesh.nodes.map(n => {
            if(inside_collider(n.pos)){
                n.vel = smul_v(n.vel, -1);
            } 
             
            return n.vel.to_THREE();
        }).flat();
        const x0 = [x0_x, x0_v];

        const delta_x_v = tmesh.nodes.map(n => n.vel.to_THREE()).flat();
        const delta_x_a = tmesh.nodes.map(n => {
            const M_inv = [
                1.0 / n.mass, 0, 0,
                0, 1.0 / n.mass, 0,
                0, 0, 1.0 / n.mass
            ];

            let f = n.f
            if(inside_collider(n.pos)){
                f = smul_v(f, -1);
            }
            let f_vec3 = f.to_THREE();

            const v_dot = mat3_vecmul(M_inv, f_vec3);
            return v_dot;  
        }).flat();
        const delta_x = [delta_x_v, delta_x_a];

        const intermediate_result = integrator_euler_step(x0, delta_x, step * 0.5);

        // compute midpoint delta_x (derivative)
        const midpoint_x0_x = intermediate_result.new_x0[0];
        const midpoint_x0_v = intermediate_result.new_x0[1];
        tmesh.update_positions(midpoint_x0_x);
        tmesh.update_velocities(midpoint_x0_v);
        tmesh.compute_force_calculation_constants();
        tmesh.compute_forces();

        const midpoint_delta_x_v = tmesh.nodes.map(n => n.vel.to_THREE()).flat();
        const midpoint_delta_x_a = tmesh.nodes.map(n => {
            const M_inv = [
                1.0 / n.mass, 0, 0,
                0, 1.0 / n.mass, 0,
                0, 0, 1.0 / n.mass
            ];

            let f = n.f
            if(inside_collider(n.pos)){
                f = smul_v(f, -1);
            }
            let f_vec3 = f.to_THREE();

            const v_dot = mat3_vecmul(M_inv, f_vec3);
            return v_dot;  
        }).flat();
        const midpoint_delta_x = [midpoint_delta_x_v, midpoint_delta_x_a];

        // compute final step forward with midpoint delta_x with original x0
        const result = integrator_euler_step(x0, midpoint_delta_x, step);
        tmesh.update_positions(result.new_x0[0]);
        tmesh.update_velocities(result.new_x0[1]);

        const objs = view_tetrahedralmesh(tmesh, 0xaaff00, 0xff4444);
        prev_objs.push(...objs.objects);
        iters += 1;

        const exploded = x0_x.some(n => isNaN(n));
        if(!exploded){
            setTimeout(() => {
                loop();
            }, 50);
        }
    }
    loop();
});