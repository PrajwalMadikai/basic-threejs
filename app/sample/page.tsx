'use client';
import { useEffect, useRef } from "react";
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function page() {

    const mountRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {

        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        )
        const scene = new THREE.Scene()
        scene.add(camera)
        camera.position.z = 5
        const renderer = new THREE.WebGLRenderer()
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

        if (mountRef.current) {
            mountRef.current.appendChild(renderer.domElement)
        }

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05

        const geometry = new THREE.BoxGeometry(2, 2, 2)
        const material = new THREE.MeshBasicMaterial({ color: "red" })
        const cube = new THREE.Mesh(geometry, material)

        scene.add(cube)
        cube.position.y = 1

        const axeshelper = new THREE.AxesHelper(2)
        cube.add(axeshelper)

        const edges = new THREE.EdgesGeometry(cube.geometry)
        const wireframe = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000 })
        )
        cube.add(wireframe)

        const hanleSize = () => {
            camera.aspect = window.innerWidth / window.innerHeight
            camera.updateProjectionMatrix()
            renderer.setSize(window.innerWidth, window.innerHeight)
        }
        window.addEventListener('resize', hanleSize)

        const animate = () => {
            requestAnimationFrame(animate)
            controls.update()
            renderer.render(scene, camera)
        }
        animate()
        return () => {
            controls.dispose()
            renderer.dispose()
            window.removeEventListener('resize', hanleSize)
        }

    }, [])
    return (
        <div ref={mountRef}></div>
    )
}
