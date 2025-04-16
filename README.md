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
-Antialiasing: To make the edges smooth, set the pixelRatio of model in between number 2  -Math.min(window.devicePixelRatio,2)

-DragControls

## day 2

-Rotation: Rotate the model using THREE.MathUtils.degToRad() to a specific degree

-Rotation.reorder: Is used to perform the model in disired position. It helps to prevent unneccessary rotation .
                  THREE.MathUtils.degToRad() used to convert degrees into radians. Because Three js with radians
            
-Measurement: Used useRef, useState, THREE.Raycaster, THREE.Vector3, distanceTo() to measure distance between two clicked points on the model. Displayed result using state.

-Polygon Drawing: Collected multiple Vector3 points on user clicks. Used THREE.BufferGeometry().setFromPoints() and THREE.Line to draw lines between them.

-Annotation: Added red markers using THREE.Mesh, THREE.SphereGeometry, and MeshBasicMaterial to highlight clicked positions.


## Day 3

- Render sides of model : THREE.FrontSide  is used to render the model that points to front side of model
                          THREE.DoubleSide is used to render the model that points to sides of model
                          THREE.BackSide is used to render the model that points to the backside of the model

- set up the Webxr : with the xr button and enabled the xr features in the threjs using rendere.xr.enabled=true
                     and added the xr button to the screen using useRef.appendChild(XRButton.createButton(renderer))
                     route : /webxr