'use client';
import { useEffect, useRef } from "react";
import * as THREE from 'three';
// @ts-expect-error Suppressing error because OrbitControls is imported from an external library.
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { XRButton } from 'three/examples/jsm/webxr/XRButton.js';

export default function Page() {
    const mountRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {

        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);  
        scene.add(camera);
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer();
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

        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshBasicMaterial({ color: "red" });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, 1, -3);  
        cube.scale.set(2, 2, 2);  
        scene.add(cube);

         
        const edges = new THREE.EdgesGeometry(cube.geometry);
        const wireframe = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0xffffff })  
        );
        cube.add(wireframe);

        const handleSize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleSize);

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
            controls.dispose();
            renderer.dispose();
            if (mount) {
                mount.removeChild(renderer.domElement);
            }
            window.removeEventListener('resize', handleSize);
        };
    }, []);

    return <div ref={mountRef}></div>;
}