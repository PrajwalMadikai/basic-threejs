'use client';
import { useEffect, useRef } from "react";
import * as THREE from 'three';
// @ts-expect-error Suppressing error because OrbitControls is imported from an external library.
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { XRButton } from 'three/examples/jsm/webxr/XRButton.js';

// Define more specific type for XR events
interface XRControllerSelectEvent {
  type: string;
  target: THREE.XRTargetRaySpace;
  data?: {
    handedness: string;
    gamepad: Gamepad | null;
  };
}

export default function Page() {
    const mountRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);  

        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.xr.enabled = true;

        const mount = mountRef.current;
        if (mount) {
            mount.appendChild(renderer.domElement);
            mount.appendChild(XRButton.createButton(renderer));  
        }

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;  
        floor.position.y = -1;  
        floor.receiveShadow = true;
        scene.add(floor);

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();

        const onMouseClick = (event: MouseEvent) => {
            if (!renderer.xr.isPresenting) {
                pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
                pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

                raycaster.setFromCamera(pointer, camera);

                const intersects = raycaster.intersectObjects(scene.children, true);

                if (intersects.length > 0) {
                    createCube(intersects[0].point, 0xff0000);  
                }
            }
        };

        const createCube = (position: THREE.Vector3, color: number = 0x0000ff) => {
            const randomSize = 0.1 + Math.random() * 0.3;
            const geometry = new THREE.BoxGeometry(randomSize, randomSize, randomSize);
            const material = new THREE.MeshStandardMaterial({ 
                color: color,
                roughness: 0.7,
                metalness: 0.3
            });
            const cube = new THREE.Mesh(geometry, material);
            cube.position.copy(position);
            cube.castShadow = true;
            cube.receiveShadow = true;
            scene.add(cube);
            return cube;
        };

        const controller1 = renderer.xr.getController(0);
        scene.add(controller1);

        const controller2 = renderer.xr.getController(1);
        scene.add(controller2);

        const controllerGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);
        
        const controllerMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 2
        });

        const controllerLine1 = new THREE.Line(controllerGeometry, controllerMaterial);
        controllerLine1.name = 'controller-line-1';
        controller1.add(controllerLine1);
        
        const controllerLine2 = new THREE.Line(controllerGeometry, controllerMaterial);
        controllerLine2.name = 'controller-line-2';
        controller2.add(controllerLine2);

        const onXRControllerSelect = (event: THREE.Event) => {
            const controller = event.target as THREE.XRTargetRaySpace;
            
            const tempMatrix = new THREE.Matrix4();
            tempMatrix.identity().extractRotation(controller.matrixWorld);
            
            raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
            
            const intersects = raycaster.intersectObjects(scene.children, true);

            if (intersects.length > 0) {
                createCube(intersects[0].point, 0x0000ff);  
            }
        };

        controller1.addEventListener('select', onXRControllerSelect);
        controller2.addEventListener('select', onXRControllerSelect);
        window.addEventListener('click', onMouseClick);

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        const animate = () => {
            renderer.setAnimationLoop(() => {
                if (!renderer.xr.isPresenting) {
                    controls.update();
                }
                renderer.render(scene, camera);
            });
        };
        animate();

        return () => {
            controller1.removeEventListener('select', onXRControllerSelect);
            controller2.removeEventListener('select', onXRControllerSelect);
            controls.dispose();
            renderer.dispose();
            window.removeEventListener('click', onMouseClick);
            window.removeEventListener('resize', handleResize);
            if (mount) {
                mount.removeChild(renderer.domElement);
            }
        };
    }, []);

    return <div ref={mountRef} style={{ width: '100%', height: '100vh' }}></div>;
}