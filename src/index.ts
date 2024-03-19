import { load_file } from "./util/load-file";
import { camera, controls, init_three, scene } from "./vis/init_three";
import { parse_mesh } from "./util/parse-mesh";
import { TetrahedralMesh } from "./geo/tetrahedralmesh";
import { get_tetrahedralmesh_surface, get_tetrahedralmesh_vertices, view_tetrahedralmesh, view_tetrahedralmesh_surface } from "./vis/view_tetrahedralmesh";
import { integrator_euler_step } from "./math/integrator_euler";
import { mat3_det, mat3_scale, mat3_tranpose, mat3_vecmul, mat4_applyv3, mat4_det, mat4_matmul, mat4_rot_x, mat4_tranpose, mat4_translate, mat4_vecmul, vec4_dot } from "./math/linalg_matrix";
import { V3 } from "./geo/atom_vertex";
import { view_fixedtriangles } from "./vis/view_fixedtriangles";
import { view_points } from "./vis/view_points";
import { abs_v, add_v, avg_v, magnitude_v, max_component_v, max_v, min_v, smul_v, zero_v } from "./math/linalg_standard";
import { get_elapsed_time, get_elapsed_time2, reset_elapsed_time, reset_elapsed_time2 } from "./util/timer";
import * as THREE from "three";

export const adaptive = false;
export const render_neon = true;
export let scenario = 2;

init_three();

let debug_log = false;
const console_log = (...s: any) => debug_log ? console.log(...s) : 0;

const start = () => {
load_file('/basic-finite-element/example-meshes/single-tet.mesh').then(raw_mesh_data => {
    // load_file('/basic-finite-element/example-meshes/sphere.mesh').then(raw_mesh_data => {
    // load_file('/basic-finite-element/example-meshes/cube.mesh').then(raw_mesh_data => {
    // load_file('/basic-finite-element/example-meshes/ellipsoid.mesh').then(raw_mesh_data => {
    // load_file('/basic-finite-element/example-meshes/cone.mesh').then(raw_mesh_data => {
            const mesh_data = parse_mesh(raw_mesh_data);
            const tmesh = TetrahedralMesh.fromMeshData(mesh_data);
            tmesh.nodes.forEach(n => n.pos.add_xyz(0, 3.3, 0));
            tmesh.tets.forEach(t => t.compute_boundary_map());
        
            const render_interior = true;
            let objs: THREE.LineSegments[];
            if(render_neon) objs = [...view_tetrahedralmesh(tmesh, 0xaaff00, 0xff4444, render_interior).objects];
            const obj_interior = view_tetrahedralmesh_surface(tmesh, render_neon ? 0x000000 : 0x00aaff);
        
            // SETUP PARAMS AND INIT STATE
            tmesh.rho = 1;
            let step = 0.003;
            console.log(raw_mesh_data.length);
        
            tmesh.compute_mass();
            console_log(tmesh.nodes[0].mass)
        
            setInterval(() => {
                console.log(camera, controls)
            }, 1000);
        
            // SETUP COLLIDERS
            let angles: number = 0;
            let sphere_size: V3, sphere_pos: V3;
            let box_size: V3, box_pos: V3, box2_size: V3, box2_pos: V3;
            if(scenario === 1){
                angles = Math.PI / 6;
                box_size = new V3(4, 1, 4);
                box_pos = new V3(0, 0, 0);
                let box_collider_geo = new THREE.BoxGeometry(box_size.x, box_size.y, box_size.z);
                box_collider_geo.rotateX(angles);
                box_collider_geo.translate(box_pos.x, box_pos.y, box_pos.z);
                let box_collider_wireframe = new THREE.LineSegments(
                    new THREE.EdgesGeometry(box_collider_geo).scale(1.01, 1.01, 1.01), 
                    new THREE.LineBasicMaterial({ color: 0xffaa00})
                );
                let box_collider_fill = new THREE.Mesh(box_collider_geo, new THREE.MeshStandardMaterial({
                    color: render_neon ? 0x000000 : 0xffaa00
                }));
                if(render_neon) scene.add(box_collider_wireframe);
                scene.add(box_collider_fill);
        
                box2_size = new V3(4, 1, 4);
                box2_pos = new V3(0, -4, 4);
                let box2_collider_geo = new THREE.BoxGeometry(box2_size.x, box2_size.y, box2_size.z);
                box2_collider_geo.rotateX(-angles);
                box2_collider_geo.translate(box2_pos.x, box2_pos.y, box2_pos.z);
                let box2_collider_wireframe = new THREE.LineSegments(
                    new THREE.EdgesGeometry(box2_collider_geo).scale(1.01, 1.02, 1.01).translate(0, 0.1, -0.02), 
                    new THREE.LineBasicMaterial({ color: 0xffaa00})
                );
                let box2_collider_fill = new THREE.Mesh(box2_collider_geo, new THREE.MeshStandardMaterial({
                    color: render_neon ? 0x000000 : 0xffaa00
                }));
                if(render_neon) scene.add(box2_collider_wireframe);
                scene.add(box2_collider_fill);
            } 
        
            else {
                box_size = new V3(6, 1, 5);
                box_pos = new V3(0, 0, 0);
                let box_collider_geo = new THREE.BoxGeometry(box_size.x, box_size.y, box_size.z);
                box_collider_geo.rotateX(angles);
                box_collider_geo.translate(box_pos.x, box_pos.y, box_pos.z);
                let box_collider_wireframe = new THREE.LineSegments(
                    new THREE.EdgesGeometry(box_collider_geo).scale(1.01, 1.01, 1.01), 
                    new THREE.LineBasicMaterial({ color: 0xffaa00})
                );
                let box_collider_fill = new THREE.Mesh(box_collider_geo, new THREE.MeshStandardMaterial({
                    color: render_neon ? 0x000000 : 0xffaa00
                }));
                if(render_neon) scene.add(box_collider_wireframe);
                scene.add(box_collider_fill);
        
                sphere_size = new V3(2, 1, 2);
                sphere_pos = new V3(0, 0.31, 0);
                let sphere_collider_geo = new THREE.SphereGeometry(0.5, 24, 24);
                sphere_collider_geo.scale(sphere_size.x * 2, sphere_size.y * 2, sphere_size.z * 2);
                sphere_collider_geo.translate(sphere_pos.x, sphere_pos.y, sphere_pos.z);
                let sphere_collider_wireframe = new THREE.LineSegments(
                    new THREE.EdgesGeometry(sphere_collider_geo).scale(1.01, 1.01, 1.01), 
                    new THREE.LineBasicMaterial({ color: 0x00aaff})
                );
                let sphere_collider_fill = new THREE.Mesh(sphere_collider_geo, new THREE.MeshStandardMaterial({
                    color: render_neon ? 0x000000 : 0xff4444,
                    // flatShading: true
                }));
                if(render_neon) scene.add(sphere_collider_wireframe);
                scene.add(sphere_collider_fill);
            }
        
        
            if(raw_mesh_data.length == 209) step = 0.004;
            const sd_box = (p: V3, c: V3, s: V3) => {
                let lb = new V3(c.x - s.x * 0.5, c.y - s.y * 0.5, c.z - s.z * 0.5);
                let hb = new V3(c.x + s.x * 0.5, c.y + s.y * 0.5, c.z + s.z * 0.5);
                return lb.x <= p.x && p.x <= hb.x &&
                    lb.y <= p.y && p.y <= hb.y &&
                    lb.z <= p.z && p.z <= hb.z;
            }
            const sd_sphere = (p: V3, c: V3, s: V3) => {
                return ((p.x - c.x)/s.x)**2 + ((p.y - c.y)/s.y)**2 + ((p.z - c.z)/s.z)**2 <= 1;
            }
            const sd_rot_x = (p: V3, x: number) => {
                const rot = mat4_rot_x(x);
                const p_r = mat4_applyv3(rot, p, true, true);
                return p_r;
            }
            const sd_rot_x_t = (p: V3, x: number) => {
                const trans = mat4_translate(box2_pos.x, box2_pos.y, box2_pos.z);
                const rot = mat4_rot_x(x);
                const trans_inv = mat4_translate(-box2_pos.x, -box2_pos.y, -box2_pos.z);
                const final_mat = mat4_matmul(mat4_matmul(trans, rot), trans_inv);
                const p_r = mat4_applyv3(final_mat, p, true, true);
                return p_r;
            }
            const sd_union = (d1: boolean, d2: boolean) => d1 || d2;
            const inside_collider = (p: V3): boolean => {
                if(scenario === 1){
                    return sd_union(
                        sd_box(sd_rot_x(p, -angles), box_pos, box_size),
                        sd_box(sd_rot_x_t(p, angles), box2_pos, box2_size)
                    );
                } 
                
                else {
                    return sd_union(
                        sd_box(p, box_pos, box_size),
                        sd_sphere(p, sphere_pos, sphere_size)
                    );
                }
            }
        
            // const p = new V3(1, 2, 3);
            // const rot = mat4_rot_x(0);
            // const p_r = mat4_applyv3(rot, p, false, false);
            // console.log(p_r);
        
            const max_iter = 100;
            let iters = 0;
            const loop = () => {
                console_log(`Iter: ${iters}`);
                reset_elapsed_time();
        
                // adaptive ... calculate 
                let factor = 1;
                if(adaptive){
                    let h_base = step;
                    let h_half = h_base * 0.5;
        
                    tmesh.compute_force_calculation_constants();
                    tmesh.compute_forces();
            
                    // take full step with h
                    const x0_x = tmesh.nodes.map(n => n.pos.to_THREE()).flat();
                    const x0_v_og = tmesh.nodes.map(n => n.vel.to_THREE()).flat();
                    const x0_v = tmesh.nodes.map(n => {
                        if(inside_collider(n.pos)) n.vel = smul_v(n.vel, -1);
                        return n.vel.to_THREE();
                    }).flat();
                    const x0 = [x0_x, x0_v];
                    const delta_x_v = tmesh.nodes.map(n => n.vel.to_THREE()).flat();
                    const delta_x_a = tmesh.nodes.map(n => {
                        const M_inv = [1.0 / n.mass, 0, 0, 0, 1.0 / n.mass, 0, 0, 0, 1.0 / n.mass];
                        let f = n.f
                        if(inside_collider(n.pos)) f = smul_v(f, -1);
                        const v_dot = mat3_vecmul(M_inv, f.to_THREE());
                        return v_dot;  
                    }).flat();
                    const delta_x = [delta_x_v, delta_x_a];
                    const intermediate_result = integrator_euler_step(x0, delta_x, h_base);
                    const x0_x_a = intermediate_result.new_x0[0];
                    const x0_v_a = intermediate_result.new_x0[1];
                    tmesh.update_positions(x0_x_a);
                    tmesh.update_velocities(x0_v_a);
        
                    // take two half-steps
                    const delta_x_v_halfa = tmesh.nodes.map(n => n.vel.to_THREE()).flat();
                    const delta_x_a_halfa = tmesh.nodes.map(n => {
                        const M_inv = [1.0 / n.mass, 0, 0, 0, 1.0 / n.mass, 0, 0, 0, 1.0 / n.mass];
                        let f = n.f
                        if(inside_collider(n.pos)) f = smul_v(f, -1);
                        const v_dot = mat3_vecmul(M_inv, f.to_THREE());
                        return v_dot;  
                    }).flat();
                    const delta_x_halfa = [delta_x_v_halfa, delta_x_a_halfa];
                    const intermediate_result_halfa = integrator_euler_step(x0, delta_x_halfa, h_half);
                    const x0_x_b = intermediate_result_halfa.new_x0[0];
                    const x0_v_b = intermediate_result_halfa.new_x0[1];
                    tmesh.update_positions(x0_x_b);
                    tmesh.update_velocities(x0_v_b);
        
                    const delta_x_v_halfb = tmesh.nodes.map(n => n.vel.to_THREE()).flat();
                    const delta_x_a_halfb = tmesh.nodes.map(n => {
                        const M_inv = [1.0 / n.mass, 0, 0, 0, 1.0 / n.mass, 0, 0, 0, 1.0 / n.mass];
                        let f = n.f
                        if(inside_collider(n.pos)) f = smul_v(f, -1);
                        const v_dot = mat3_vecmul(M_inv, f.to_THREE());
                        return v_dot;  
                    }).flat();
                    const delta_x_halfb = [delta_x_v_halfb, delta_x_a_halfb];
                    const intermediate_result_halfb = integrator_euler_step([x0_x_b, x0_v_b], delta_x_halfb, h_half);
                    const x0_x_c = intermediate_result_halfb.new_x0[0];
                    const x0_v_c = intermediate_result_halfb.new_x0[1];            
                    tmesh.update_positions(x0_x);
                    tmesh.update_velocities(x0_v_og);
        
                    // compute error ratio...
                    let squared_error = 0;
                    for(let i = 0; i < x0_x_c.length; i++) squared_error += (x0_x_c[i] - x0_x_a[i]) ** 2;
                    let error = Math.sqrt(squared_error);
        
                    let target_error = 0.001;
                    factor = Math.sqrt(target_error / error);
                }
                // console.log(factor);
        
                // update tetrahedral mesh
                tmesh.compute_force_calculation_constants();
                tmesh.compute_forces();
                console_log(`  Computed forces in ${get_elapsed_time(true)} ms`);
        
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
                const intermediate_result = integrator_euler_step(x0, delta_x, step * 0.5 * factor);
        
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
                const result = integrator_euler_step(x0, midpoint_delta_x, step * factor);
                tmesh.update_positions(result.new_x0[0]);
                tmesh.update_velocities(result.new_x0[1]);
        
                console_log(`  Integrated DE system in ${get_elapsed_time(true)} ms`);
        
                if(iters % 2 == 0){
                    const new_vertices = get_tetrahedralmesh_vertices(tmesh, 0xaaff00, 0xff4444);
                    const new_surface = get_tetrahedralmesh_surface(tmesh, 0x000000);
                    console_log(`  Get verts in in ${get_elapsed_time(true)} ms`);
                    if(render_neon){
                        if(render_interior){
                            objs[0].geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(new_vertices.boundary_vertices), 3));
                        } else {
                            objs[0].geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(new_vertices.vertices), 3));
                            objs[1].geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(new_vertices.boundary_vertices), 3));
                        }
                    }
        
                    obj_interior.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(new_surface), 3));
                    if(!render_neon){
                        obj_interior.geometry.computeVertexNormals();
                    }
                    console_log(`  Updated viewing in ${get_elapsed_time(true)} ms`);
                }
        
                iters += 1;
                setTimeout(() => {
                    loop();
                }, 1);
            }
            loop();
        });
}
document.body.addEventListener('click', () => start());