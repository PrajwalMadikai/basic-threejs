'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/Addons.js';
// @ts-ignore
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function Page() {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [distance, setDistance] = useState<number | null>(null);

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

        if (mountRef.current) {
            mountRef.current.appendChild(renderer.domElement);
        }

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05

        const raycaster = new THREE.Raycaster()
        const mouse = new THREE.Vector2()
        
        const points: THREE.Vector3[] = []
        const spheres: THREE.Mesh[]  = []
        let line: THREE.Line | null  = null

        const pointsMaterial = new THREE.MeshBasicMaterial({color: 'red'})
        const lineMaterial = new THREE.LineBasicMaterial({color: 'white'})

        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshBasicMaterial({ 
            color: 'blue',
            transparent: true,
            opacity: 0.8
        });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        const edges = new THREE.EdgesGeometry(cube.geometry);
        const wireframe = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000 })  
        );
        cube.add(wireframe);


        const draggableObjects:THREE.Object3D[]=[cube]
        const drageControls=new DragControls(draggableObjects,camera,renderer.domElement)

        drageControls.addEventListener('dragstart',()=>{
            controls.enabled=false
        })

        drageControls.addEventListener('dragend',()=>{
            controls.enabled=true
        })



        const handleClick = (event: MouseEvent) => {
            if (!mountRef.current) return

            const rect = renderer.domElement.getBoundingClientRect()
            
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

            raycaster.setFromCamera(mouse, camera)
            
            const intersects = raycaster.intersectObject(cube)
            
            if (intersects.length > 0) {
                const point = intersects[0].point.clone()
                points.push(point)

                const sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(0.1),
                    pointsMaterial
                )
                sphere.position.copy(point)
                scene.add(sphere)
                spheres.push(sphere)

                if (points.length == 2) {
                    if (line) {
                        scene.remove(line)
                    }
                    
                    const geometry = new THREE.BufferGeometry().setFromPoints(points)
                    line = new THREE.Line(geometry, lineMaterial)
                    scene.add(line)

                    const dist = points[0].distanceTo(points[1])
                    setDistance(parseFloat(dist.toFixed(2)))
                }
                
                if (points.length > 2) {
                    points.length = 0
                    spheres.forEach((s) => scene.remove(s))
                    spheres.length = 0
                    if (line) {
                        scene.remove(line)
                        line = null
                    }
                    setDistance(null)
                }
            }
        }
        
        renderer.domElement.addEventListener('click', handleClick)

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
            renderer.domElement.removeEventListener('click', handleClick)
        };
    }, []);

    return <>
        <div ref={mountRef} />
        {distance !== null && (
            <div className="absolute top-5 left-5 bg-black text-white px-3 py-2 rounded-lg font-mono text-sm shadow-md">
                Distance: {distance}
            </div>
        )}
    </>
}