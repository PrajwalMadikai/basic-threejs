'use client';
import { useEffect, useRef } from "react";
import * as THREE from 'three';
// @ts-expect-error Suppressing error because OrbitControls is imported from an external library.
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { XRButton } from 'three/examples/jsm/webxr/XRButton.js';

export default function Page() {
    const mountRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb); // Sky blue background

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
            mount.appendChild(XRButton.createButton(renderer)); // Add XR button
        }

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        // Raycaster setup
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();

        // Handle mouse/touch events for non-XR mode
        const onMouseClick = (event: MouseEvent) => {
            if (!renderer.xr.isPresenting) {
                // Calculate pointer position in normalized device coordinates (-1 to +1)
                pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
                pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

                // Update the raycaster with the camera and pointer
                raycaster.setFromCamera(pointer, camera);

                // Perform raycasting
                const intersects = raycaster.intersectObjects(scene.children, true);

                if (intersects.length > 0) {
                    const intersectionPoint = intersects[0].point;

                    // Create a new cube at the intersection point
                    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
                    const material = new THREE.MeshBasicMaterial({ color: "red" });
                    const cube = new THREE.Mesh(geometry, material);
                    cube.position.copy(intersectionPoint);
                    scene.add(cube);
                }
            }
        };

        // Handle XR controller interactions
        const onXRControllerSelect = (event: any) => {
            const controller = event.target; // The XR controller that triggered the event

            // Cast a ray from the controller
            const controllerPointer = new THREE.Vector2(0, 0); // Fix: Use THREE.Vector2
            raycaster.setFromCamera(controllerPointer, controller);

            const intersects = raycaster.intersectObjects(scene.children, true);

            if (intersects.length > 0) {
                const intersectionPoint = intersects[0].point;

                // Create a new cube at the intersection point
                const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
                const material = new THREE.MeshBasicMaterial({ color: "blue" });
                const cube = new THREE.Mesh(geometry, material);
                cube.position.copy(intersectionPoint);
                scene.add(cube);
            }
        };

        // Add XR controllers
        const controller1 = renderer.xr.getController(0);
        controller1.addEventListener('select', onXRControllerSelect);
        scene.add(controller1);

        const controller2 = renderer.xr.getController(1);
        controller2.addEventListener('select', onXRControllerSelect);
        scene.add(controller2);

        // Add event listeners for mouse clicks
        window.addEventListener('click', onMouseClick);

        const handleSize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleSize);

        const animate = () => {
            renderer.setAnimationLoop(() => {
                if (!renderer.xr.isPresenting) {
                    controls.update(); // Update OrbitControls only outside XR mode
                }
                renderer.render(scene, camera);
            });
        };
        animate();

        return () => {
            controls.dispose();
            renderer.dispose();
            window.removeEventListener('click', onMouseClick);
            window.removeEventListener('resize', handleSize);
            if (mount) {
                mount.removeChild(renderer.domElement);
            }
        };
    }, []);

    return <div ref={mountRef}></div>;
}