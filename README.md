## Learnings
- WebGL: Is an js api for rendering 3d graphics in the web browser using the Gpu
- Three js abstract complicated webGL language into easy to use js api
- `@react-three/fiber` is a React renderer for Three.js. `@react-three/drei` is a helper library that offers abstractions and useful components to simplify common tasks. It helps to directly interact with the canvas
- Can append the three js into the canvas using renderer.domElement when init the threejs in react with useRef

- When clicked on the cube, created red spheres using `SphereGeometry` at the clicked point
- Stored clicked points and when there are two, used `BufferGeometry.setFromPoints()` to draw a line between them
- Used `Vector3.distanceTo()` to calculate the distance between the two points and show it on the screen
- If clicked more than two times, reset the points, line and distance to allow new measurement

- Handle the size of the object based on the screen responsiveness. Used handleResize function to whenever the resize addEventlistner is calling