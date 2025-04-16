'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/Addons.js';
// @ts-expect-error Suppressing error because OrbitControls is imported from an external library.
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function Page() {
    const mountRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        const mount=mountRef.current
        if (mount) {
            mount.appendChild(renderer.domElement);
        }

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05

        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshBasicMaterial({ 
            color: 'blue',
            transparent: true,
            opacity: 0.8
        });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
  

        const draggableObjects:THREE.Object3D[]=[cube]

        const drageControls=new DragControls(draggableObjects,camera,renderer.domElement)

        drageControls.addEventListener('dragstart',()=>{
            controls.enabled=false
        })

        drageControls.addEventListener('dragend',()=>{
            controls.enabled=true
        })



         
        

        camera.position.z = 5;

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight
            camera.updateProjectionMatrix()
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        window.addEventListener('resize', handleResize)

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };

        animate();

        return () => {
            controls.dispose();
            renderer.dispose();
            if (mountRef.current) {
                mountRef.current.removeChild(renderer.domElement);
            }
            window.removeEventListener('resize', handleResize)
        };
    }, []);

    return <>
        <div ref={mountRef} />
    </>
}