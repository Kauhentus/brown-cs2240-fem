import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import { render_neon, scenario } from '../index';

export let scene: THREE.Scene; 
export let camera: THREE.Camera;
export let controls: OrbitControls;

export const init_three = () => {
    const screenDimension = [800, 600];

    const mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    mainCanvas.width = screenDimension[0];
    mainCanvas.height = screenDimension[1];
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, screenDimension[0] / screenDimension[1], 0.1, 1000 );
    if(scenario === 1) camera.position.set(7.18, -0.47, 5.15);
    else camera.position.set(0, 3, -6);

    const renderer = new THREE.WebGLRenderer({
        canvas: mainCanvas,
        antialias: true,
    });
    renderer.setPixelRatio(1.5);
    if(render_neon) renderer.setClearColor(0x000000);
    else renderer.setClearColor(0xffffff);
    
    renderer.setSize(screenDimension[0], screenDimension[1]);
    controls = new OrbitControls(camera, renderer.domElement)
    if(scenario === 1) controls.target.set(0.29, -2.34, 2.19)
    else controls.target.set(0, 1, 0);
    controls.update();
    
    // const grid = new THREE.GridHelper(20, 20, 0xff0000, 0xaaddff);
    // scene.add(grid);
    if(!render_neon){
        const light = new THREE.DirectionalLight();
        light.position.set(0, 10, 0);
        const light_target = new THREE.Object3D();
        light_target.position.set(0, 0, 5);
        scene.add(light_target);
        light.target = light_target;
        scene.add(light);

        const ambient_light = new THREE.AmbientLight(0xffffff); // soft white light
        scene.add(ambient_light);
    }

    const renderScene = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
    const params = {
        threshold: 0,
        strength: 0.6,
        radius: 0,
        exposure: 1
    };
    bloomPass.threshold = params.threshold;
    bloomPass.strength = params.strength;
    bloomPass.radius = params.radius;

    const outputPass = new OutputPass();
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    if(render_neon) composer.addPass(bloomPass);
    composer.addPass(outputPass);

    const run = () => {
        // renderer.render(scene, camera);
        composer.render();
        controls.update();
    
        requestAnimationFrame(run);
    }
    run();
}