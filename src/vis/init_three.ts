import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

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
    camera.position.set(0, 2, -5);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    const renderer = new THREE.WebGLRenderer({
        canvas: mainCanvas,
        antialias: true,
    });
    renderer.setPixelRatio(1.5);
    renderer.setClearColor(0xffffff);
    renderer.setSize(screenDimension[0], screenDimension[1]);
    controls = new OrbitControls(camera, renderer.domElement)
    
    const grid = new THREE.GridHelper(20, 20, 0xff0000, 0xaaddff);
    scene.add(grid);
    
    const run = () => {
        renderer.render(scene, camera);
        controls.update();
    
        requestAnimationFrame(run);
    }
    run();
}