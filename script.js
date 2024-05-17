const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const widget = document.getElementById('widget');
const translateBtn = document.getElementById('translate');
const rotateBtn = document.getElementById('rotate');
const scaleBtn = document.getElementById('scale');
const detailsPanel = document.getElementById('detailsPanel');
const posXInput = document.getElementById('posX');
const posYInput = document.getElementById('posY');
const posZInput = document.getElementById('posZ');
const rotXInput = document.getElementById('rotX');
const rotYInput = document.getElementById('rotY');
const rotZInput = document.getElementById('rotZ');
const scaleXInput = document.getElementById('scaleX');
const scaleYInput = document.getElementById('scaleY');
const scaleZInput = document.getElementById('scaleZ');

const cubeVertices = [
    {x: -0.5, y: -0.5, z: -0.5},
    {x:  0.5, y: -0.5, z: -0.5},
    {x:  0.5, y:  0.5, z: -0.5},
    {x: -0.5, y:  0.5, z: -0.5},
    {x: -0.5, y: -0.5, z:  0.5},
    {x:  0.5, y: -0.5, z:  0.5},
    {x:  0.5, y:  0.5, z:  0.5},
    {x: -0.5, y:  0.5, z:  0.5},
];

const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0], // back face
    [4, 5], [5, 6], [6, 7], [7, 4], // front face
    [0, 4], [1, 5], [2, 6], [3, 7]  // connecting edges
];

let cubes = [
    {position: {x: -1.5, y: 0, z: 0}, rotation: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 1, z: 1}, rotating: true},
    {position: {x: 1.5, y: 0, z: 0}, rotation: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 1, z: 1}, rotating: false},
    {position: {x: 0, y: 1.5, z: 0}, rotation: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 1, z: 1}, rotating: true},
    {position: {x: 0, y: -1.5, z: 0}, rotation: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 1, z: 1}, rotating: false}
];

const projectionMatrix = (fov, aspect, near, far) => {
    const f = 1.0 / Math.tan(fov / 2);
    return [
        [f / aspect, 0, 0, 0],
        [0, f, 0, 0],
        [0, 0, (far + near) / (near - far), (2 * far * near) / (near - far)],
        [0, 0, -1, 0]
    ];
};

const multiplyMatrixAndPoint = (matrix, point) => {
    const x = point.x, y = point.y, z = point.z;
    const w = 1.0;
    const transformed = {
        x: matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * z + matrix[0][3] * w,
        y: matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * z + matrix[1][3] * w,
        z: matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * z + matrix[2][3] * w,
        w: matrix[3][0] * x + matrix[3][1] * y + matrix[3][2] * z + matrix[3][3] * w,
    };

    if (transformed.w !== 0) {
        transformed.x /= transformed.w;
        transformed.y /= transformed.w;
        transformed.z /= transformed.w;
    }

    return transformed;
};

const drawLine = (start, end) => {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
};

let fov = Math.PI / 4;
const aspect = canvas.width / canvas.height;
const near = 0.1;
const far = 100.0;

let projection = projectionMatrix(fov, aspect, near, far);

let angleX = 0;
let angleY = 0;
let posZ = -2.0;  // Camera's initial z-position
let transX = 0;  // Translation offset for x-axis
let transY = 0;  // Translation offset for y-axis
let camX = 0, camY = 0, camZ = 0; // Camera translation
let selectedCube = null; // Track the selected cube
let activeWidgetMode = null; // Track the active widget mode

const rotateX = (point, angle) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const y = point.y * cos - point.z * sin;
    const z = point.y * sin + point.z * cos;
    return {x: point.x, y, z};
};

const rotateY = (point, angle) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = point.x * cos + point.z * sin;
    const z = -point.x * sin + point.z * cos;
    return {x, y: point.y, z};
};

const rotateZ = (point, angle) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = point.x * cos - point.y * sin;
    const y = point.x * sin + point.y * cos;
    return {x, y, z: point.z};
};

const renderCube = (cube) => {
    const { position, rotation, scale, rotating } = cube;
    const transformedVertices = cubeVertices.map(vertex => {
        let transformed = { ...vertex };
        transformed.x *= scale.x;
        transformed.y *= scale.y;
        transformed.z *= scale.z;

        transformed = rotateX(transformed, rotation.x);
        transformed = rotateY(transformed, rotation.y);
        transformed = rotateZ(transformed, rotation.z);

        transformed.x += position.x;
        transformed.y += position.y;
        transformed.z += position.z;

        let cameraTransformed = {...transformed};
        cameraTransformed.x -= camX;
        cameraTransformed.y -= camY;
        cameraTransformed.z -= camZ;

        let rotated = rotateX(cameraTransformed, angleX);
        rotated = rotateY(rotated, angleY);
        rotated.z += posZ; // Move the camera along z-axis
        rotated.x += transX; // Translate along x-axis
        rotated.y += transY; // Translate along y-axis

        const projected = multiplyMatrixAndPoint(projection, rotated);
        return {
            x: (projected.x * 0.5 + 0.5) * canvas.width,
            y: (projected.y * -0.5 + 0.5) * canvas.height,
            z: projected.z
        };
    });

    edges.forEach(edge => {
        const start = transformedVertices[edge[0]];
        const end = transformedVertices[edge[1]];
        drawLine(start, end);
    });

    // Draw selection box if this cube is selected
    if (selectedCube === cube) {
        ctx.strokeStyle = 'red';
        edges.forEach(edge => {
            const start = transformedVertices[edge[0]];
            const end = transformedVertices[edge[1]];
            drawLine(start, end);
        });
        ctx.strokeStyle = 'black';
    }
};

const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    cubes.forEach(cube => {
        if (cube.rotating) {
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
            cube.rotation.z += 0.01;
        }
        renderCube(cube);
    });
    requestAnimationFrame(render);
};

const getMousePos = (canvas, evt) => {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
};

const isPointInPath = (point, vertices) => {
    // Simple bounding box collision detection for 2D projection of the cube
    const xs = vertices.map(v => v.x);
    const ys = vertices.map(v => v.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
};

const updateDetailsPanel = () => {
    if (selectedCube) {
        detailsPanel.style.display = 'block';
        posXInput.value = selectedCube.position.x;
        posYInput.value = selectedCube.position.y;
        posZInput.value = selectedCube.position.z;
        rotXInput.value = selectedCube.rotation.x;
        rotYInput.value = selectedCube.rotation.y;
        rotZInput.value = selectedCube.rotation.z;
        scaleXInput.value = selectedCube.scale.x;
        scaleYInput.value = selectedCube.scale.y;
        scaleZInput.value = selectedCube.scale.z;
    } else {
        detailsPanel.style.display = 'none';
    }
};

canvas.addEventListener('click', event => {
    const mousePos = getMousePos(canvas, event);
    selectedCube = null;
    for (const cube of cubes) {
        const transformedVertices = cubeVertices.map(vertex => {
            let transformed = { ...vertex };
            transformed.x *= cube.scale.x;
            transformed.y *= cube.scale.y;
            transformed.z *= cube.scale.z;

            transformed = rotateX(transformed, cube.rotation.x);
            transformed = rotateY(transformed, cube.rotation.y);
            transformed = rotateZ(transformed, cube.rotation.z);

            transformed.x += cube.position.x;
            transformed.y += cube.position.y;
            transformed.z += cube.position.z;

            let cameraTransformed = {...transformed};
            cameraTransformed.x -= camX;
            cameraTransformed.y -= camY;
            cameraTransformed.z -= camZ;

            let rotated = rotateX(cameraTransformed, angleX);
            rotated = rotateY(rotated, angleY);
            rotated.z += posZ; // Move the camera along z-axis
            rotated.x += transX; // Translate along x-axis
            rotated.y += transY; // Translate along y-axis

            const projected = multiplyMatrixAndPoint(projection, rotated);
            return {
                x: (projected.x * 0.5 + 0.5) * canvas.width,
                y: (projected.y * -0.5 + 0.5) * canvas.height,
                z: projected.z
            };
        });

        if (isPointInPath(mousePos, transformedVertices)) {
            selectedCube = cube;
            widget.style.display = 'flex';
            widget.style.left = `${event.clientX}px`;
            widget.style.top = `${event.clientY}px`;
            updateDetailsPanel();
            break;
        }
    }
    if (!selectedCube) {
        widget.style.display = 'none';
        updateDetailsPanel();
    }
});

translateBtn.addEventListener('click', () => {
    activeWidgetMode = 'translate';
});
rotateBtn.addEventListener('click', () => {
    activeWidgetMode = 'rotate';
});
scaleBtn.addEventListener('click', () => {
    activeWidgetMode = 'scale';
});

const handleMouseMove = (event) => {
    if (!selectedCube || !activeWidgetMode) return;
    const movementFactor = 0.01;

    switch (activeWidgetMode) {
        case 'translate':
            selectedCube.position.x += event.movementX * movementFactor;
            selectedCube.position.y -= event.movementY * movementFactor;
            break;
        case 'rotate':
            selectedCube.rotation.y += event.movementX * movementFactor;
            selectedCube.rotation.x -= event.movementY * movementFactor;
            break;
        case 'scale':
            selectedCube.scale.x += event.movementX * movementFactor;
            selectedCube.scale.y += event.movementY * movementFactor;
            selectedCube.scale.z += event.movementY * movementFactor;
            break;
    }
    updateDetailsPanel();
};

document.addEventListener('mousemove', handleMouseMove);

document.addEventListener('mouseup', () => {
    activeWidgetMode = null;
});


// Update cube properties from details panel
posXInput.addEventListener('input', () => {
    if (selectedCube) {
        selectedCube.position.x = parseFloat(posXInput.value);
    }
});

posYInput.addEventListener('input', () => {
    if (selectedCube) {
        selectedCube.position.y = parseFloat(posYInput.value);
    }
});

posZInput.addEventListener('input', () => {
    if (selectedCube) {
        selectedCube.position.z = parseFloat(posZInput.value);
    }
});

rotXInput.addEventListener('input', () => {
    if (selectedCube) {
        selectedCube.rotation.x = parseFloat(rotXInput.value);
    }
});

rotYInput.addEventListener('input', () => {
    if (selectedCube) {
        selectedCube.rotation.y = parseFloat(rotYInput.value);
    }
});

rotZInput.addEventListener('input', () => {
    if (selectedCube) {
        selectedCube.rotation.z = parseFloat(rotZInput.value);
    }
});

scaleXInput.addEventListener('input', () => {
    if (selectedCube) {
        selectedCube.scale.x = parseFloat(scaleXInput.value);
    }
});

scaleYInput.addEventListener('input', () => {
    if (selectedCube) {
        selectedCube.scale.y = parseFloat(scaleYInput.value);
    }
});

scaleZInput.addEventListener('input', () => {
    if (selectedCube) {
        selectedCube.scale.z = parseFloat(scaleZInput.value);
    }
});

// Handle camera zoom with mouse wheel
document.addEventListener('wheel', (event) => {
    const zoomFactor = 0.1;
    if (event.deltaY < 0) {
        posZ += zoomFactor;
    } else {
        posZ -= zoomFactor;
    }
    posZ = Math.max(posZ, -10); // Prevent the camera from moving too close to the cubes
    posZ = Math.min(posZ, 10); // Prevent the camera from moving too far away from the cubes
    projection = projectionMatrix(fov, aspect, near, far);
});


let rightMouseDown = false;

document.addEventListener('mousedown', event => {
    if (event.button === 2) { // Right mouse button
        rightMouseDown = true;
    }
});

document.addEventListener('mouseup', event => {
    if (event.button === 2) { // Right mouse button
        rightMouseDown = false;
    }
});

document.addEventListener('mousemove', event => {
    if (rightMouseDown) {
        const movementFactor = 0.01;
        angleY -= event.movementX * movementFactor;
        angleX -= event.movementY * movementFactor;
    }
});

document.addEventListener('keydown', event => {
    const translationStep = 0.1;
    switch (event.key) {
        case 'w':
            camZ += translationStep;
            break;
        case 's':
            camZ -= translationStep;
            break;
        case 'a':
            camX -= translationStep;
            break;
        case 'd':
            camX += translationStep;
            break;
        case 'ArrowUp':
            transY -= translationStep;
            break;
        case 'ArrowDown':
            transY += translationStep;
            break;
        case 'ArrowLeft':
            transX -= translationStep;
            break;
        case 'ArrowRight':
            transX += translationStep;
            break;
    }
});

render();
