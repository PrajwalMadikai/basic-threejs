'use client';
import { useEffect, useRef, useState } from "react";
import * as THREE from 'three';
//@ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

type AnnotationMode = 'measure' | 'polygon' | 'annotate' | null;

interface Annotation {
    position: THREE.Vector3;
    text: string;
}

interface Measurement {
    points: [THREE.Vector3, THREE.Vector3];
    distance: string;
}

export default function Page() {

    const mountRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const pointsGroupRef = useRef<THREE.Group | null>(null);
    const measureLinesRef = useRef<THREE.Group | null>(null);
    const polygonGroupRef = useRef<THREE.Group | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);

    const [mode, setMode] = useState<AnnotationMode>(null);
    const [points, setPoints] = useState<THREE.Vector3[]>([]);
    const [measurements, setMeasurements] = useState<Measurement[]>([]);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [polygons, setPolygons] = useState<THREE.Vector3[][]>([]);
    const [annotationText, setAnnotationText] = useState<string>("");
    const [showAnnotationInput, setShowAnnotationInput] = useState<boolean>(false);
    const [tempAnnotationPosition, setTempAnnotationPosition] = useState<THREE.Vector3 | null>(null);

    useEffect(() => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        sceneRef.current = scene;
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        rendererRef.current = renderer;

        if (mountRef.current) {
            mountRef.current.appendChild(renderer.domElement);
        }

        camera.position.z = 5;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controlsRef.current = controls;

        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshStandardMaterial({
            color: 0x3080ff,
            flatShading: true
        });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        cube.position.y = 1;

        const edges = new THREE.EdgesGeometry(cube.geometry);
        const wireframe = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000 })
        );
        cube.add(wireframe);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const pointsGroup = new THREE.Group();
        scene.add(pointsGroup);
        pointsGroupRef.current = pointsGroup;

        const measureLines = new THREE.Group();
        scene.add(measureLines);
        measureLinesRef.current = measureLines;

        const polygonGroup = new THREE.Group();
        scene.add(polygonGroup);
        polygonGroupRef.current = polygonGroup;

        const handleResize = () => {
            if (camera && renderer) {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        const animate = () => {
            requestAnimationFrame(animate);
            if (controls) controls.update();
            if (scene && camera && renderer) {
                renderer.render(scene, camera);
            }
        };
        animate();

        return () => {
            if (controls) controls.dispose();
            if (renderer) renderer.dispose();
            window.removeEventListener('resize', handleResize);
            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    useEffect(() => {
        if (!sceneRef.current || !cameraRef.current) return;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const handleClick = (event: MouseEvent): void => {

            if (!mountRef.current || !mode) return;

            if (showAnnotationInput) return;

            const rect = mountRef.current.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            if (cameraRef.current) {
                raycaster.setFromCamera(mouse, cameraRef.current);

                if (sceneRef.current) {
                    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

                    if (intersects.length > 0) {
                        const point = intersects[0].point.clone();

                        if (mode === 'measure') {
                            handleMeasurePoint(point);
                        } else if (mode === 'polygon') {
                            handlePolygonPoint(point);
                        } else if (mode === 'annotate') {
                            setTempAnnotationPosition(point);
                            setShowAnnotationInput(true);
                        }
                    }
                }
            }
        };

        window.addEventListener('click', handleClick);

        return () => {
            window.removeEventListener('click', handleClick);
        };
    }, [mode, points, measurements, polygons, showAnnotationInput]);

    const handleMeasurePoint = (point: THREE.Vector3): void => {
        if (!pointsGroupRef.current || !measureLinesRef.current) return;

        const pointGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);

        pointMesh.position.copy(point);
        pointsGroupRef.current.add(pointMesh);

        setPoints(prevPoints => {
            const newPoints = [...prevPoints, point];

            if (newPoints.length % 2 === 0 && measureLinesRef.current) {

                const p1 = newPoints[newPoints.length - 2];
                const p2 = newPoints[newPoints.length - 1];
                const distance = p1.distanceTo(p2);

                const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                const line = new THREE.Line(lineGeometry, lineMaterial);
                measureLinesRef.current.add(line);

                setMeasurements(prev => [...prev, {
                    points: [p1, p2],
                    distance: distance.toFixed(2)
                }]);
            }

            return newPoints;
        });
    };

    const handlePolygonPoint = (point: THREE.Vector3): void => {

        if (!pointsGroupRef.current || !polygonGroupRef.current) return;

        const pointGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const pointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
        pointMesh.position.copy(point);
        pointsGroupRef.current.add(pointMesh);

        setPoints(prevPoints => {
            const newPoints = [...prevPoints, point];

            if (newPoints.length >= 2 && polygonGroupRef.current){
                
                const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
                const p1 = newPoints[newPoints.length - 2];
                const p2 = newPoints[newPoints.length - 1];
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                const line = new THREE.Line(lineGeometry, lineMaterial);
                polygonGroupRef.current.add(line);

                if (newPoints.length > 2 && p2.distanceTo(newPoints[0]) < 0.2) {
                    const closingGeometry = new THREE.BufferGeometry().setFromPoints([p2, newPoints[0]]);
                    const closingLine = new THREE.Line(closingGeometry, lineMaterial);
                    polygonGroupRef.current.add(closingLine);

                    const polygonShape = new THREE.Shape();

                    polygonShape.moveTo(newPoints[0].x, newPoints[0].y);
                    for (let i = 1; i < newPoints.length; i++) {
                        polygonShape.lineTo(newPoints[i].x, newPoints[i].y);
                    }
                    polygonShape.lineTo(newPoints[0].x, newPoints[0].y);

                    const polygonGeometry = new THREE.ShapeGeometry(polygonShape);
                    const polygonMaterial = new THREE.MeshBasicMaterial({
                        color: 0x00ff00,
                        transparent: true,
                        opacity: 0.3,
                        side: THREE.DoubleSide
                    });

                    setPolygons(prev => [...prev, newPoints]);

                    return [];
                }
            }

            return newPoints;
        });
    };

    const addAnnotation = (): void => {
        if (!tempAnnotationPosition || !annotationText.trim() || !pointsGroupRef.current) return;

        const newAnnotation: Annotation = {
            position: tempAnnotationPosition,
            text: annotationText
        };

        setAnnotations([...annotations, newAnnotation]);

        const indicatorGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const indicatorMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.copy(tempAnnotationPosition);
        pointsGroupRef.current.add(indicator);

        setAnnotationText("");
        setShowAnnotationInput(false);
        setTempAnnotationPosition(null);
    };

    const cancelAnnotation = (): void => {
        setAnnotationText("");
        setShowAnnotationInput(false);
        setTempAnnotationPosition(null);
    };

    interface ScreenPosition {
        left: number;
        top: number;
    }

    const getScreenPosition = (position: THREE.Vector3): ScreenPosition => {
        if (!position || !cameraRef.current || !rendererRef.current) {
            return { left: 0, top: 0 };
        }

        const vector = position.clone();
        const canvas = rendererRef.current.domElement;

        vector.project(cameraRef.current);

        const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (-(vector.y * 0.5) + 0.5) * canvas.clientHeight;

        return { left: x, top: y };
    };

    const clearAll = (): void => {
        if (pointsGroupRef.current) {
            while (pointsGroupRef.current.children.length > 0) {
                pointsGroupRef.current.remove(pointsGroupRef.current.children[0]);
            }
        }

        if (measureLinesRef.current) {
            while (measureLinesRef.current.children.length > 0) {
                measureLinesRef.current.remove(measureLinesRef.current.children[0]);
            }
        }

        if (polygonGroupRef.current) {
            while (polygonGroupRef.current.children.length > 0) {
                polygonGroupRef.current.remove(polygonGroupRef.current.children[0]);
            }
        }

        setPoints([]);
        setMeasurements([]);
        setAnnotations([]);
        setPolygons([]);
        setShowAnnotationInput(false);
        setTempAnnotationPosition(null);
        setAnnotationText("");
    };

    return (
        <div className="relative w-full h-screen">
            <div ref={mountRef} className="w-full h-full" />

            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                {annotations.map((annotation, index) => {
                    const pos = getScreenPosition(annotation.position);
                    return (
                        <div
                            key={index}
                            className="absolute bg-white text-black px-2 py-1 rounded-md shadow-md pointer-events-auto"
                            style={{
                                left: `${pos.left}px`,
                                top: `${pos.top}px`,
                                transform: 'translate(-50%, -50%)',
                                zIndex: 10
                            }}
                        >
                            {annotation.text}
                        </div>
                    );
                })}
            </div>

            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                {measurements.map((measurement, index) => {
                    const midpoint = new THREE.Vector3().addVectors(
                        measurement.points[0],
                        measurement.points[1]
                    ).multiplyScalar(0.5);

                    const pos = getScreenPosition(midpoint);
                    return (
                        <div
                            key={index}
                            className="absolute bg-red-100 text-red-800 px-2 py-1 rounded-md shadow-md pointer-events-auto text-sm"
                            style={{
                                left: `${pos.left}px`,
                                top: `${pos.top}px`,
                                transform: 'translate(-50%, -50%)',
                                zIndex: 10
                            }}
                        >
                            {measurement.distance} units
                        </div>
                    );
                })}
            </div>

            <div className="absolute top-4 left-4 flex flex-col gap-2">
                {mode && (
                    <div className="bg-black bg-opacity-60 text-white px-3 py-1 rounded-md">
                        Mode: {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </div>
                )}
                
                {showAnnotationInput && (
                    <div className="bg-white p-4 rounded-md shadow-lg z-50 w-64 mt-2">
                        <h3 className="text-lg font-semibold mb-2 text-gray-800">Add Annotation</h3>
                        <input
                            type="text"
                            value={annotationText}
                            onChange={(e) => setAnnotationText(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded mb-2 text-black" 
                            placeholder="Enter annotation text"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={cancelAnnotation}
                                className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 text-gray-800"
                                type="button"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addAnnotation}
                                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                type="button"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {showAnnotationInput && (
                <div 
                    className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-20 z-40"
                    onClick={cancelAnnotation}
                ></div>
            )}

            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-gray-800 p-2 rounded-md shadow-md">
                <button
                    onClick={() => setMode('measure')}
                    className={`px-3 py-1 ${mode === 'measure' ? 'bg-blue-600' : 'bg-blue-500'} text-white rounded-md hover:bg-blue-600 transition-colors`}
                >
                    Measure Distance
                </button>
                <button
                    onClick={() => setMode('polygon')}
                    className={`px-3 py-1 ${mode === 'polygon' ? 'bg-green-600' : 'bg-green-500'} text-white rounded-md hover:bg-green-600 transition-colors`}
                >
                    Draw Polygon
                </button>
                <button
                    onClick={() => setMode('annotate')}
                    className={`px-3 py-1 ${mode === 'annotate' ? 'bg-yellow-600' : 'bg-yellow-500'} text-white rounded-md hover:bg-yellow-600 transition-colors`}
                >
                    Add Annotation
                </button>
                <button
                    onClick={clearAll}
                    className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                    Clear All
                </button>
            </div>
        </div>
    );
}