'use client';
import { useEffect, useRef, useState } from "react";
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function page() {

    const mountRef = useRef<HTMLDivElement | null>(null)
    const [points,setPoints]=useState<THREE.Vector3[]>([])
    const raycaster=new THREE.Raycaster()
    const mouse=new THREE.Vector2()


    useEffect(() => {
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        )
        const scene = new THREE.Scene()
        scene.add(camera)   
        camera.position.z=5 
        const renderer = new THREE.WebGLRenderer()
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        if (mountRef.current) {
            mountRef.current.appendChild(renderer.domElement)
        }

        const geometry=new THREE.BoxGeometry(2,2,2)
        const material=new THREE.MeshBasicMaterial({color:'blue'})
        const cube=new THREE.Mesh(geometry,material)
        scene.add(cube)
    
        const edges=new THREE.EdgesGeometry(cube.geometry)
        const wireframe=new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000 })
        )
        cube.add(wireframe)
        const controls=new OrbitControls(camera,renderer.domElement)
        controls.enableDamping=true
        controls.dampingFactor=0.05

        const handleSize=()=>
        {
            camera.aspect=window.innerWidth / window.innerHeight
            camera.updateProjectionMatrix()
            renderer.setSize(window.innerWidth, window.innerHeight)
        }
        window.addEventListener('resize',handleSize)

        const clickEvent=(event:MouseEvent)=>{
            mouse.x=(event.clientX-window.innerWidth)*2-1
            mouse.y=(event.clientY-window.innerHeight)*2+1
            
            raycaster.setFromCamera(mouse,camera)
            const intersects=raycaster.intersectObject(cube)
            if(intersects.length>0)
            {
                const point=intersects[0].point
                setPoints((prev)=>[...prev,point])
            }
        }
        window.addEventListener('click',clickEvent)

        const animate=()=>{
            requestAnimationFrame(animate)
            controls.update()
            renderer.render(scene,camera)
        }
        animate()


        cube.position.y=1

       



        return()=>{
            controls.dispose()
            renderer.dispose()
            if(mountRef.current)
            {
                mountRef.current.removeChild(renderer.domElement)
            }
            window.removeEventListener('resize',handleSize)
            window.removeEventListener('click',clickEvent)
        }


    }, [])

    const renderPoligonLines=()=>{
        const lineGroup=new THREE.Group()
        if(points.length>=2)
        {
            for(let i=0;i<points.length-1;i++)
            {
                const lineGeometry=new THREE.BufferGeometry().setFromPoints([points[i],points[i+1]])
                const lineMaterial = new THREE.LineBasicMaterial({color:'green'})
                const line=new THREE.Line(lineGeometry,lineMaterial)
                lineGroup.add(line)

            }
            if (points.length >= 3) {
                const closingLineGeometry = new THREE.BufferGeometry().setFromPoints([
                    points[points.length - 1],
                    points[0],
                ]);
                const closingLineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
                const closingLine = new THREE.Line(closingLineGeometry, closingLineMaterial);
                lineGroup.add(closingLine);
            }
        }
        return lineGroup
    }


    return (
        <>
        <div ref={mountRef}></div>
       {points.length>0&&(
        <group>
            {renderPoligonLines()}
        </group>
       )}
        </>
    )
}
