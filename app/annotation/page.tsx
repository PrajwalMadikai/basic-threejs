'use client';
import ToolBar from "@/components/ToolBar";
import { useEffect, useRef, useState } from "react";
import * as THREE from 'three';
// @ts-expect-error Suppressing error because OrbitControls is imported from an external library.
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export type AnnotationMode = 'measure' | 'polygon' | 'annotate' | 'undo' | 'redo' | null;

interface ExportData {
    measurements: {
        points: [
            { x: number, y: number, z: number },
            { x: number, y: number, z: number }
        ];
        distance: string;
    }[];
    annotations: {
        position: { x: number, y: number, z: number };
        worldPosition: { x: number, y: number, z: number };
        text: string;
    }[];
    polygons: {
        points: { x: number, y: number, z: number }[];
    }[];
}

interface Measurement {
    points: [THREE.Vector3, THREE.Vector3];
    distance: string;
    objects: THREE.Object3D[]
    pointIndices?: [number, number]
}
interface Annotation {
    position: THREE.Vector3;
    text: string;
    worldPosition: THREE.Vector3;
    object?: THREE.Object3D;
}

interface PolygonData {
    points: THREE.Vector3[];
    objects: THREE.Object3D[];
}

interface HistoryAction {
    type: 'measure' | 'polygon' | 'annotate' | 'clear';
    data: {
        points?: THREE.Vector3[];
        distance?: string;
        position?: THREE.Vector3;
        text?: string;
        worldPosition?: THREE.Vector3;
        measurements?: Measurement[];
        annotations?: Annotation[];
        polygons?: PolygonData[];
        objects?: THREE.Object3D[];
    };
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
    const animationRef = useRef<number | null>(null);

    const [mode, setMode] = useState<AnnotationMode>(null);
    const [points, setPoints] = useState<THREE.Vector3[]>([]);
    const [measurements, setMeasurements] = useState<Measurement[]>([]);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [polygons, setPolygons] = useState<PolygonData[]>([]);
    const [annotationText, setAnnotationText] = useState<string>("");
    const [showAnnotationInput, setShowAnnotationInput] = useState<boolean>(false);
    const [tempAnnotationPosition, setTempAnnotationPosition] = useState<THREE.Vector3 | null>(null);

    const [history, setHistory] = useState<HistoryAction[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);

    const needsUpdate = useRef<boolean>(true);
    const [screenPositions, setScreenPositions] = useState<{ [key: number]: { left: number, top: number } }>({});

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

        const mount = mountRef.current;
        if (mount) {
            mount.appendChild(renderer.domElement);
        }

        camera.position.z = 5;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.addEventListener('change', () => {
            needsUpdate.current = true;
            updateAnnotationPositions();
        });
        controlsRef.current = controls;

        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshStandardMaterial({
            color: 0x3080ff,
            flatShading: true
        });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        cube.position.y = 1;

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
                needsUpdate.current = true;
                updateAnnotationPositions();
            }
        };

        window.addEventListener('resize', handleResize);

        const animate = () => {
            animationRef.current = requestAnimationFrame(animate);
            if (controls) controls.update();

            if (scene && camera && renderer && needsUpdate.current) {
                renderer.render(scene, camera);
                needsUpdate.current = false;
            }
        };

        animate();

        return () => {
            if (controls) controls.dispose();
            if (renderer) renderer.dispose();
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            window.removeEventListener('resize', handleResize);
            if (mount && renderer.domElement) {
                mount.removeChild(renderer.domElement);
            }
        };
    }, []);

    const updateAnnotationPositions = () => {
        const newPositions: { [key: number]: { left: number, top: number } } = {};

        annotations.forEach((annotation, index) => {
            const pos = getScreenPosition(annotation.position);
            newPositions[index] = pos;
        });

        setScreenPositions(newPositions);

        needsUpdate.current = true;
    };

    useEffect(() => {
        updateAnnotationPositions();
    }, [annotations]);

    useEffect(() => {
        if (!sceneRef.current || !cameraRef.current) return;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const handleClick = (event: MouseEvent): void => {
            if (!mountRef.current || !mode) return;
            if (showAnnotationInput) return;

            if (mode === 'undo') {
                handleUndo();
                setMode(null);
                return;
            }

            if (mode === 'redo') {
                handleRedo();
                setMode(null);
                return;
            }

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
                            needsUpdate.current = true;
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

    const addToHistory = (action: HistoryAction): void => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(action);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const handleUndo = (): void => {
        if (historyIndex < 0) return;
        const action = history[historyIndex];

        if (action.type === 'measure') {
            if (action.data.objects) {
                action.data.objects.forEach(obj => {
                    if (obj.parent) {
                        obj.parent.remove(obj);
                    }
                });
            }
            setMeasurements(prev => prev.slice(0, -3));
        } else if (action.type === 'polygon') {
            if (action.data.objects) {
                action.data.objects.forEach(obj => {
                    if (obj.parent) {
                        obj.parent.remove(obj);
                    }
                });
            }
            setPolygons(prev => prev.slice(0, -1));
        } else if (action.type === 'annotate') {
            if (action.data.objects) {
                action.data.objects.forEach(obj => {
                    if (obj.parent) {
                        obj.parent.remove(obj);
                    }
                });
            }
            setAnnotations(prev => prev.slice(0, -1));
        } else if (action.type === 'clear') {
            if (action.data.measurements || action.data.annotations || action.data.polygons) {
                const previousState = {
                    measurements: action.data.measurements || [],
                    annotations: action.data.annotations || [],
                    polygons: action.data.polygons || []
                };
                restoreState(previousState);
            }
        }

        setHistoryIndex(historyIndex - 1);
        needsUpdate.current = true;
    };

    const handleRedo = (): void => {
        if (historyIndex >= history.length - 1) return;
        const action = history[historyIndex + 1];

        if (action.type === 'measure' && action.data.points && action.data.points.length >= 2) {
            const p1 = action.data.points[0];
            const p2 = action.data.points[1];

            const objects: THREE.Object3D[] = [];

            const pointGeometry = new THREE.SphereGeometry(0.05, 16, 16);
            const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

            const point1 = new THREE.Mesh(pointGeometry, pointMaterial);
            point1.position.copy(p1);
            pointsGroupRef.current?.add(point1);
            objects.push(point1);

            const point2 = new THREE.Mesh(pointGeometry, pointMaterial);
            point2.position.copy(p2);
            pointsGroupRef.current?.add(point2);
            objects.push(point2);

            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
            const line = new THREE.Line(lineGeometry, lineMaterial);
            measureLinesRef.current?.add(line);
            objects.push(line);

            setPoints(prev => [...prev, p1, p2]);

            const measurementData: Measurement = {
                points: [p1, p2] as [THREE.Vector3, THREE.Vector3],
                distance: action.data.distance || p1.distanceTo(p2).toFixed(2),
                objects: objects
            };

            setMeasurements(prev => [...prev, measurementData]);

            const updatedAction = { ...action };
            updatedAction.data.objects = objects;
            setHistory(prev => {
                const newHistory = [...prev];
                newHistory[historyIndex + 1] = updatedAction;
                return newHistory;
            });
        } else if (action.type === 'polygon' && action.data.points) {
            const polygonPoints = action.data.points;
            const objects: THREE.Object3D[] = [];

            const pointGeometry = new THREE.SphereGeometry(0.05, 16, 16);
            const pointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

            polygonPoints.forEach((point: THREE.Vector3) => {
                const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
                pointMesh.position.copy(point);
                pointsGroupRef.current?.add(pointMesh);
                objects.push(pointMesh);
            });

            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
            for (let i = 0; i < polygonPoints.length; i++) {
                const p1 = polygonPoints[i];
                const p2 = polygonPoints[(i + 1) % polygonPoints.length];
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                const line = new THREE.Line(lineGeometry, lineMaterial);
                polygonGroupRef.current?.add(line);
                objects.push(line);
            }

            const polygonShape = new THREE.Shape();
            polygonShape.moveTo(polygonPoints[0].x, polygonPoints[0].y);
            for (let i = 1; i < polygonPoints.length; i++) {
                polygonShape.lineTo(polygonPoints[i].x, polygonPoints[i].y);
            }
            polygonShape.lineTo(polygonPoints[0].x, polygonPoints[0].y);

            const polygonGeometry = new THREE.ShapeGeometry(polygonShape);
            const polygonMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });

            const polygonMesh = new THREE.Mesh(polygonGeometry, polygonMaterial);
            polygonGroupRef.current?.add(polygonMesh);
            objects.push(polygonMesh);

            const polygonData: PolygonData = {
                points: polygonPoints,
                objects: objects
            };

            setPolygons(prev => [...prev, polygonData]);

            const updatedAction = { ...action };
            updatedAction.data.objects = objects;
            setHistory(prev => {
                const newHistory = [...prev];
                newHistory[historyIndex + 1] = updatedAction;
                return newHistory;
            });
        } else if (action.type === 'annotate') {
            if (action.data.position && action.data.text) {
                const objects: THREE.Object3D[] = [];

                const pointGeometry = new THREE.SphereGeometry(0.05, 16, 16);
                const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
                const point = new THREE.Mesh(pointGeometry, pointMaterial);
                point.position.copy(action.data.position);
                pointsGroupRef.current?.add(point);
                objects.push(point);

                const annotation: Annotation = {
                    position: action.data.position,
                    text: action.data.text,
                    worldPosition: action.data.worldPosition || action.data.position.clone(),
                    object: point
                };

                setAnnotations(prev => [...prev, annotation]);

                const updatedAction = { ...action };
                updatedAction.data.objects = objects;
                setHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[historyIndex + 1] = updatedAction;
                    return newHistory;
                });
            }
        } else if (action.type === 'clear') {
            clearAll();
        }

        setHistoryIndex(historyIndex + 1);
        needsUpdate.current = true;
    };

    const restoreState = (state: { measurements: Measurement[]; annotations: Annotation[]; polygons: PolygonData[] }) => {
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

        const newMeasurements: Measurement[] = [];
        state.measurements.forEach((measurement: Measurement) => {
            const p1 = measurement.points[0];
            const p2 = measurement.points[1];
            const objects: THREE.Object3D[] = [];

            const pointGeometry = new THREE.SphereGeometry(0.05, 16, 16);
            const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

            const point1 = new THREE.Mesh(pointGeometry, pointMaterial);
            point1.position.copy(p1);
            pointsGroupRef.current?.add(point1);
            objects.push(point1);

            const point2 = new THREE.Mesh(pointGeometry, pointMaterial);
            point2.position.copy(p2);
            pointsGroupRef.current?.add(point2);
            objects.push(point2);

            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
            const line = new THREE.Line(lineGeometry, lineMaterial);
            measureLinesRef.current?.add(line);
            objects.push(line);

            newMeasurements.push({
                points: measurement.points,
                distance: measurement.distance,
                objects: objects
            });
        });

        const newAnnotations: Annotation[] = [];
        state.annotations.forEach((annotation: Annotation) => {
            const pointGeometry = new THREE.SphereGeometry(0.05, 16, 16);
            const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const point = new THREE.Mesh(pointGeometry, pointMaterial);
            point.position.copy(annotation.position);
            pointsGroupRef.current?.add(point);

            newAnnotations.push({
                position: annotation.position,
                text: annotation.text,
                worldPosition: annotation.worldPosition,
                object: point
            });
        });

        const newPolygons: PolygonData[] = [];
        state.polygons.forEach((polygon: PolygonData) => {
            const objects: THREE.Object3D[] = [];
            const points = polygon.points;

            const pointGeometry = new THREE.SphereGeometry(0.05, 16, 16);
            const pointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

            points.forEach((point: THREE.Vector3) => {
                const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
                pointMesh.position.copy(point);
                pointsGroupRef.current?.add(pointMesh);
                objects.push(pointMesh);
            });

            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length];
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                const line = new THREE.Line(lineGeometry, lineMaterial);
                polygonGroupRef.current?.add(line);
                objects.push(line);
            }

            const polygonShape = new THREE.Shape();
            polygonShape.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                polygonShape.lineTo(points[i].x, points[i].y);
            }
            polygonShape.lineTo(points[0].x, points[0].y);

            const polygonGeometry = new THREE.ShapeGeometry(polygonShape);
            const polygonMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });

            const polygonMesh = new THREE.Mesh(polygonGeometry, polygonMaterial);
            polygonGroupRef.current?.add(polygonMesh);
            objects.push(polygonMesh);

            newPolygons.push({
                points: points,
                objects: objects
            });
        });

        setMeasurements(newMeasurements);
        setAnnotations(newAnnotations);
        setPolygons(newPolygons);
        needsUpdate.current = true;
        updateAnnotationPositions();
    };

    const handleMeasurePoint = (point: THREE.Vector3): void => {
        if (!pointsGroupRef.current || !measureLinesRef.current) return;

        const objects: THREE.Object3D[] = [];

        const pointGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
        pointMesh.position.copy(point);
        pointsGroupRef.current.add(pointMesh);
        objects.push(pointMesh);

        setPoints(prevPoints => {
            const newPoints = [...prevPoints, point];

            if (newPoints.length % 2 === 0 && measureLinesRef.current) {
                const p1 = newPoints[newPoints.length - 2];
                const p2 = newPoints[newPoints.length - 1];
                const distance = p1.distanceTo(p2);

                const point2Mesh = new THREE.Mesh(pointGeometry.clone(), pointMaterial.clone());
                point2Mesh.position.copy(p2);
                pointsGroupRef.current?.add(point2Mesh);
                objects.push(point2Mesh);

                const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                const line = new THREE.Line(lineGeometry, lineMaterial);
                measureLinesRef.current.add(line);
                objects.push(line);

                const measurement: Measurement = {
                    points: [p1, p2],
                    distance: distance.toFixed(2),
                    objects: objects,
                    pointIndices: [newPoints.length - 2, newPoints.length - 1]
                };

                setMeasurements(prev => [...prev, measurement]);

                addToHistory({
                    type: 'measure',
                    data: {
                        points: [p1, p2],
                        distance: distance.toFixed(2),
                        objects: objects
                    }
                });

                needsUpdate.current = true;

                return [];
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

        const tempObjects: THREE.Object3D[] = [pointMesh];

        setPoints(prevPoints => {
            const newPoints = [...prevPoints, point];

            if (newPoints.length >= 2 && polygonGroupRef.current) {
                const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
                const p1 = newPoints[newPoints.length - 2];
                const p2 = newPoints[newPoints.length - 1];
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                const line = new THREE.Line(lineGeometry, lineMaterial);
                polygonGroupRef.current.add(line);
                tempObjects.push(line);

                if (newPoints.length > 2 && p2.distanceTo(newPoints[0]) < 0.2) {
                    const polygonObjects: THREE.Object3D[] = [];

                    newPoints.forEach((p) => {
                        const pMesh = new THREE.Mesh(pointGeometry.clone(), pointMaterial.clone());
                        pMesh.position.copy(p);
                        pointsGroupRef.current?.add(pMesh);
                        polygonObjects.push(pMesh);
                    });

                    for (let i = 0; i < newPoints.length; i++) {
                        const startPoint = newPoints[i];
                        const endPoint = newPoints[(i + 1) % newPoints.length];
                        const lineGeo = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
                        const polyLine = new THREE.Line(lineGeo, lineMaterial);
                        polygonGroupRef.current.add(polyLine);
                        polygonObjects.push(polyLine);
                    }

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

                    const polygonMesh = new THREE.Mesh(polygonGeometry, polygonMaterial);
                    polygonGroupRef.current?.add(polygonMesh);
                    polygonObjects.push(polygonMesh);

                    const polygonPoints = [...newPoints];

                    const polygonData: PolygonData = {
                        points: polygonPoints,
                        objects: polygonObjects
                    };

                    setPolygons(prev => [...prev, polygonData]);

                    tempObjects.forEach(obj => {
                        if (obj.parent) {
                            obj.parent.remove(obj);
                        }
                    });

                    addToHistory({
                        type: 'polygon',
                        data: {
                            points: polygonPoints,
                            objects: polygonObjects
                        }
                    });

                    needsUpdate.current = true;
                    return [];
                }
            }

            return newPoints;
        });
    };

    const addAnnotation = (): void => {
        if (!tempAnnotationPosition || !annotationText.trim() || !pointsGroupRef.current) return;

        const objects: THREE.Object3D[] = [];

        const indicatorGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const indicatorMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.copy(tempAnnotationPosition);
        pointsGroupRef.current.add(indicator);
        objects.push(indicator);

        const newAnnotation: Annotation = {
            position: tempAnnotationPosition.clone(),
            text: annotationText,
            worldPosition: tempAnnotationPosition.clone(),
            object: indicator
        };

        setAnnotations(prev => [...prev, newAnnotation]);

        addToHistory({
            type: 'annotate',
            data: {
                position: tempAnnotationPosition.clone(),
                text: annotationText,
                worldPosition: tempAnnotationPosition.clone(),
                objects: objects
            }
        });

        setAnnotationText("");
        setShowAnnotationInput(false);
        setTempAnnotationPosition(null);
        needsUpdate.current = true;
    };

    const cancelAnnotation = (): void => {
        setAnnotationText("");
        setShowAnnotationInput(false);
        setTempAnnotationPosition(null);
        needsUpdate.current = true;
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
        const currentState = {
            measurements: [...measurements],
            annotations: [...annotations],
            polygons: [...polygons]
        };

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

        if (measurements.length > 0 || annotations.length > 0 || polygons.length > 0) {
            addToHistory({
                type: 'clear',
                data: currentState
            });
        }

        setPoints([]);
        setMeasurements([]);
        setAnnotations([]);
        setPolygons([]);
        setShowAnnotationInput(false);
        setTempAnnotationPosition(null);
        setAnnotationText("");
        needsUpdate.current = true;
    };

    useEffect(() => {
        needsUpdate.current = true;
    }, [measurements, polygons]);

    useEffect(() => {
        const continuallyUpdatePositions = () => {
            const newMeasurementPositions: { [key: number]: { left: number, top: number } } = {};
            measurements.forEach((measurement, index) => {
                const midpoint = new THREE.Vector3().addVectors(
                    measurement.points[0],
                    measurement.points[1]
                ).multiplyScalar(0.5);

                const screenPos = getScreenPosition(midpoint);
                newMeasurementPositions[index] = screenPos;
            });

            updateAnnotationPositions();

            requestAnimationFrame(continuallyUpdatePositions);
        };

        const animId = requestAnimationFrame(continuallyUpdatePositions);

        return () => {
            cancelAnimationFrame(animId);
        };
    }, [annotations, measurements]);

    const exportToJson = () => {
        const exportData: ExportData = {
            measurements: measurements.map(m => ({
                points: [
                    { x: m.points[0].x, y: m.points[0].y, z: m.points[0].z },
                    { x: m.points[1].x, y: m.points[1].y, z: m.points[1].z }
                ],
                distance: m.distance
            })),
            annotations: annotations.map(a => ({
                position: { x: a.position.x, y: a.position.y, z: a.position.z },
                worldPosition: { x: a.worldPosition.x, y: a.worldPosition.y, z: a.worldPosition.z },
                text: a.text
            })),
            polygons: polygons.map(p => ({
                points: p.points.map(point => ({ x: point.x, y: point.y, z: point.z }))
            }))
        };
    
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'model-annotations.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };
    const importFromJson = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target?.result as string) as ExportData;
                
                clearAll();
                
                importData.measurements.forEach(m => {
                    const p1 = new THREE.Vector3(m.points[0].x, m.points[0].y, m.points[0].z);
                    const p2 = new THREE.Vector3(m.points[1].x, m.points[1].y, m.points[1].z);
                    
                    const objects: THREE.Object3D[] = [];
                    
                    const pointGeometry = new THREE.SphereGeometry(0.05, 16, 16);
                    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                    
                    const point1 = new THREE.Mesh(pointGeometry, pointMaterial);
                    point1.position.copy(p1);
                    pointsGroupRef.current?.add(point1);
                    objects.push(point1);
                    
                    const point2 = new THREE.Mesh(pointGeometry, pointMaterial);
                    point2.position.copy(p2);
                    pointsGroupRef.current?.add(point2);
                    objects.push(point2);
                    
                    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
                    const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                    const line = new THREE.Line(lineGeometry, lineMaterial);
                    measureLinesRef.current?.add(line);
                    objects.push(line);
                    
                    setMeasurements(prev => [...prev, {
                        points: [p1, p2] as [THREE.Vector3, THREE.Vector3],
                        distance: m.distance,
                        objects: objects
                    }]);
                });
                
                importData.annotations.forEach(a => {
                    const position = new THREE.Vector3(a.position.x, a.position.y, a.position.z);
                    const worldPosition = new THREE.Vector3(a.worldPosition.x, a.worldPosition.y, a.worldPosition.z);
                    
                    const pointGeometry = new THREE.SphereGeometry(0.05, 16, 16);
                    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
                    const point = new THREE.Mesh(pointGeometry, pointMaterial);
                    point.position.copy(position);
                    pointsGroupRef.current?.add(point);
                    
                    setAnnotations(prev => [...prev, {
                        position: position,
                        text: a.text,
                        worldPosition: worldPosition,
                        object: point
                    }]);
                });
                
                importData.polygons.forEach(p => {
                    const points = p.points.map(pt => new THREE.Vector3(pt.x, pt.y, pt.z));
                    const objects: THREE.Object3D[] = [];
                    
                    const pointGeometry = new THREE.SphereGeometry(0.05, 16, 16);
                    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
                    
                    points.forEach(point => {
                        const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
                        pointMesh.position.copy(point);
                        pointsGroupRef.current?.add(pointMesh);
                        objects.push(pointMesh);
                    });
                    
                    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
                    for (let i = 0; i < points.length; i++) {
                        const p1 = points[i];
                        const p2 = points[(i + 1) % points.length];
                        const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                        const line = new THREE.Line(lineGeometry, lineMaterial);
                        polygonGroupRef.current?.add(line);
                        objects.push(line);
                    }
                    
                    if (points.length >= 3) {
                        const polygonGeometry = new THREE.BufferGeometry();
                        
                        const vertices = [];
                        const indices = [];
                        
                        for (let i = 0; i < points.length; i++) {
                            vertices.push(points[i].x, points[i].y, points[i].z);
                        }
                        
                        for (let i = 1; i < points.length - 1; i++) {
                            indices.push(0, i, i + 1);
                        }
                        
                        polygonGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                        polygonGeometry.setIndex(indices);
                        polygonGeometry.computeVertexNormals();
                        
                        const polygonMaterial = new THREE.MeshBasicMaterial({
                            color: 0x00ff00,
                            transparent: true,
                            opacity: 0.3,
                            side: THREE.DoubleSide
                        });
                        
                        const polygonMesh = new THREE.Mesh(polygonGeometry, polygonMaterial);
                        polygonGroupRef.current?.add(polygonMesh);
                        objects.push(polygonMesh);
                    }
                    
                    setPolygons(prev => [...prev, {
                        points: points,
                        objects: objects
                    }]);
                });
                
                event.target.value = '';
                
                needsUpdate.current = true;
                updateAnnotationPositions();
            } catch (error) {
                console.error("Failed to import annotations:", error);
                event.target.value = '';
            }
        };
        reader.readAsText(file)
    }

    return (
        <div className="relative w-full h-screen">
            <div ref={mountRef} className="w-full h-full" />

            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                {annotations.map((annotation, index) => {
                    const pos = screenPositions[index] || getScreenPosition(annotation.position);
                    return (
                        <div
                            key={index}
                            className="absolute bg-white text-black px-2 py-1 rounded-md shadow-md pointer-events-auto"
                            style={{
                                left: `${pos.left}px`,
                                top: `${pos.top}px`,
                                transform: 'translate(-50%, -50%)',
                                zIndex: 10,
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
                                zIndex: 10,
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
            </div>

            {showAnnotationInput && (
                <>
                    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white p-6 rounded-lg shadow-xl w-96">
                        <input
                            type="text"
                            value={annotationText}
                            onChange={(e) => setAnnotationText(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded mb-4 text-black"
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
                </>
            )}

            <ToolBar
                setMode={setMode}
                clearAll={clearAll}
                mode={mode}
                canUndo={historyIndex >= 0}
                canRedo={historyIndex < history.length - 1}
                exportToJson={exportToJson}
                importFromJson={importFromJson}
            />
        </div>
    );
}