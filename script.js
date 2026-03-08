// Get DOM elements
const verticesInput = document.getElementById('vertices');
const matrixInput = document.getElementById('matrix');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const totalCostSpan = document.getElementById('totalCost');
const mstEdgesList = document.getElementById('mstEdges');
const currentStepP = document.getElementById('currentStep');
const stepNumberSpan = document.getElementById('stepNumber');
const totalStepsSpan = document.getElementById('totalSteps');
const visitedVerticesSpan = document.getElementById('visitedVertices');
const unvisitedVerticesSpan = document.getElementById('unvisitedVertices');
const edgesListUl = document.getElementById('edgesList');
const matrixDisplay = document.getElementById('matrixDisplay');

// Canvas settings
canvas.width = 550;
canvas.height = 400;

// Graph data
let numVertices = 0;
let adjacencyMatrix = [];
let vertices = [];
let edges = [];
let mstEdges = [];
let totalCost = 0;

// Animation control
let animationPaused = false;
let animationInProgress = false;
let animationSteps = [];
let currentStepIndex = -1;
let manualMode = false;

// Set default example matrix
const defaultMatrix = `0 2 0 6 0
2 0 3 8 5
0 3 0 0 7
6 8 0 0 9
0 5 7 9 0`;
matrixInput.value = defaultMatrix;

// Parse user input
function parseInput() {
    numVertices = parseInt(verticesInput.value);
    
    if (numVertices < 2 || numVertices > 10) {
        alert('Please enter a number of vertices between 2 and 10');
        return false;
    }
    
    const lines = matrixInput.value.trim().split('\n');
    adjacencyMatrix = [];
    
    for (let i = 0; i < numVertices; i++) {
        const row = lines[i].trim().split(/\s+/).map(Number);
        if (row.length !== numVertices) {
            alert(`Row ${i} should have ${numVertices} values`);
            return false;
        }
        adjacencyMatrix.push(row);
    }
    
    // Validate matrix is symmetric
    for (let i = 0; i < numVertices; i++) {
        for (let j = 0; j < numVertices; j++) {
            if (adjacencyMatrix[i][j] !== adjacencyMatrix[j][i]) {
                alert('Adjacency matrix must be symmetric (undirected graph)');
                return false;
            }
        }
    }
    
    return true;
}

// Calculate vertex positions in a circle
function calculateVertexPositions() {
    vertices = [];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 60;
    
    for (let i = 0; i < numVertices; i++) {
        const angle = (2 * Math.PI * i) / numVertices - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        vertices.push({ x, y, id: i });
    }
}

// Extract edges from adjacency matrix
function extractEdges() {
    edges = [];
    for (let i = 0; i < numVertices; i++) {
        for (let j = i + 1; j < numVertices; j++) {
            if (adjacencyMatrix[i][j] > 0) {
                edges.push({
                    from: i,
                    to: j,
                    weight: adjacencyMatrix[i][j],
                    inMST: false,
                    isCurrent: false
                });
            }
        }
    }
}

// Draw the graph
function drawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const labelPositionUsage = new Map();
    
    // Draw edges
    edges.forEach(edge => {
        const fromVertex = vertices[edge.from];
        const toVertex = vertices[edge.to];
        
        ctx.beginPath();
        ctx.moveTo(fromVertex.x, fromVertex.y);
        ctx.lineTo(toVertex.x, toVertex.y);
        
        if (edge.isCurrent) {
            ctx.strokeStyle = '#f39c12';
            ctx.lineWidth = 4;
        } else if (edge.inMST) {
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 4;
        } else {
            ctx.strokeStyle = '#bdc3c7';
            ctx.lineWidth = 2;
        }
        
        ctx.stroke();
        
        // Draw edge weight
        const midX = (fromVertex.x + toVertex.x) / 2;
        const midY = (fromVertex.y + toVertex.y) / 2;
        const slotKey = `${Math.round(midX / 10)}:${Math.round(midY / 10)}`;
        const slotCount = labelPositionUsage.get(slotKey) || 0;
        labelPositionUsage.set(slotKey, slotCount + 1);

        const dx = toVertex.x - fromVertex.x;
        const dy = toVertex.y - fromVertex.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const offsetPattern = [0, 1, -1, 2, -2, 3, -3];
        const offsetScale = offsetPattern[slotCount] !== undefined ? offsetPattern[slotCount] : slotCount;
        const labelX = midX + nx * offsetScale * 12;
        const labelY = midY + ny * offsetScale * 12;
        
        ctx.fillStyle = edge.inMST || edge.isCurrent ? '#27ae60' : '#34495e';
        ctx.font = 'bold 14px Arial';
        ctx.fillRect(labelX - 12, labelY - 10, 24, 20);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(edge.weight, labelX, labelY);
    });
    
    // Draw vertices
    vertices.forEach(vertex => {
        ctx.beginPath();
        ctx.arc(vertex.x, vertex.y, 20, 0, 2 * Math.PI);
        ctx.fillStyle = '#667eea';
        ctx.fill();
        ctx.strokeStyle = '#5568d3';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw vertex label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(vertex.id, vertex.x, vertex.y);
    });
}

// Display adjacency matrix with color coding
function displayMatrix(takenEdges = [], rejectedEdges = []) {
    let html = '<table class="matrix-table"><thead><tr><th></th>';
    
    // Header row
    for (let i = 0; i < numVertices; i++) {
        html += `<th>${i}</th>`;
    }
    html += '</tr></thead><tbody>';
    
    // Data rows
    for (let i = 0; i < numVertices; i++) {
        html += `<tr><th class="header-col">${i}</th>`;
        for (let j = 0; j < numVertices; j++) {
            let cellClass = '';
            const weight = adjacencyMatrix[i][j];
            
            // Check if this edge is taken
            const isTaken = takenEdges.some(e => 
                (e.from === i && e.to === j) || (e.from === j && e.to === i)
            );
            
            // Check if this edge is rejected
            const isRejected = rejectedEdges.some(e => 
                (e.from === i && e.to === j) || (e.from === j && e.to === i)
            );
            
            if (weight === 0) {
                cellClass = 'cell-zero';
            } else if (isTaken) {
                cellClass = 'cell-taken';
            } else if (isRejected) {
                cellClass = 'cell-rejected';
            }
            
            html += `<td class="${cellClass}">${weight}</td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    
    matrixDisplay.innerHTML = html;
}

// Update MST information display
function updateMSTInfo() {
    totalCostSpan.textContent = totalCost;
    
    mstEdgesList.innerHTML = '';
    mstEdges.forEach(edge => {
        const li = document.createElement('li');
        li.textContent = `${edge.from}→${edge.to} = ${edge.weight}`;
        mstEdgesList.appendChild(li);
    });
}

// Sleep function for animation
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to capture current state as a step
function captureStep(message, visitedSet, availableEdgesList = [], minimumEdge = null, takenEdges = [], rejectedEdges = []) {
    const step = {
        message: message,
        edges: edges.map(e => ({ ...e })),
        mstEdges: JSON.parse(JSON.stringify(mstEdges)),
        totalCost: totalCost,
        visited: [...visitedSet],
        availableEdges: [...availableEdgesList],
        minimumEdge: minimumEdge,
        takenEdges: JSON.parse(JSON.stringify(takenEdges)),
        rejectedEdges: JSON.parse(JSON.stringify(rejectedEdges))
    };
    return step;
}

// Function to apply a step
function applyStep(step) {
    edges = step.edges.map(e => ({ ...e }));
    mstEdges = JSON.parse(JSON.stringify(step.mstEdges));
    totalCost = step.totalCost;
    currentStepP.textContent = step.message;
    
    // Update visited/unvisited vertices
    const allVertices = new Set([...Array(numVertices).keys()]);
    const unvisited = [...allVertices].filter(v => !step.visited.includes(v));
    
    visitedVerticesSpan.textContent = '{' + step.visited.join(', ') + '}';
    unvisitedVerticesSpan.textContent = '{' + unvisited.join(', ') + '}';
    
    // Update available edges list
    edgesListUl.innerHTML = '';
    if (step.availableEdges.length > 0) {
        step.availableEdges.forEach(edge => {
            const li = document.createElement('li');
            const isMinimum = step.minimumEdge && 
                              edge.from === step.minimumEdge.from && 
                              edge.to === step.minimumEdge.to;
            
            li.textContent = `${edge.from}→${edge.to} = ${edge.weight}`;
            if (isMinimum) {
                li.classList.add('minimum-edge');
            }
            edgesListUl.appendChild(li);
        });
    } else {
        edgesListUl.innerHTML = '<li style="border-left-color: #95a5a6;">No edges available</li>';
    }
    
    // Update step counter
    stepNumberSpan.textContent = currentStepIndex + 1;
    totalStepsSpan.textContent = animationSteps.length;
    
    // Update matrix with color coding
    displayMatrix(step.takenEdges || [], step.rejectedEdges || []);
    
    updateMSTInfo();
    drawGraph();
}

// Prim's Algorithm - Generate all steps
function generatePrimSteps() {
    animationSteps = [];
    mstEdges = [];
    totalCost = 0;
    
    // Reset all edges
    edges.forEach(edge => {
        edge.inMST = false;
        edge.isCurrent = false;
    });
    
    const visited = new Array(numVertices).fill(false);
    const parent = new Array(numVertices).fill(-1);
    const key = new Array(numVertices).fill(Infinity);
    
    // Track taken and rejected edges
    const takenEdges = [];
    const rejectedEdges = [];
    
    // Start from vertex 0
    key[0] = 0;
    const visitedSet = new Set();
    animationSteps.push(captureStep('Step 0: Starting from vertex 0', visitedSet, [], null, takenEdges, rejectedEdges));
    
    for (let count = 0; count < numVertices; count++) {
        // Find minimum key vertex not yet included in MST
        let minKey = Infinity;
        let minVertex = -1;
        
        for (let v = 0; v < numVertices; v++) {
            if (!visited[v] && key[v] < minKey) {
                minKey = key[v];
                minVertex = v;
            }
        }
        
        visited[minVertex] = true;
        visitedSet.add(minVertex);
        
        // Collect available edges from visited to unvisited
        const availableEdges = [];
        for (const v of visitedSet) {
            for (let u = 0; u < numVertices; u++) {
                if (!visited[u] && adjacencyMatrix[v][u] > 0) {
                    availableEdges.push({
                        from: v,
                        to: u,
                        weight: adjacencyMatrix[v][u]
                    });
                }
            }
        }
        
        // Sort by weight to show them in order
        availableEdges.sort((a, b) => a.weight - b.weight);
        
        // If not the first vertex, add edge to MST
        if (parent[minVertex] !== -1) {
            const edge = edges.find(e => 
                (e.from === parent[minVertex] && e.to === minVertex) ||
                (e.from === minVertex && e.to === parent[minVertex])
            );
            
            if (edge) {
                const minimumEdgeInfo = {
                    from: parent[minVertex],
                    to: minVertex,
                    weight: edge.weight
                };
                
                // Show available edges before adding
                const prevAvailableEdges = [];
                for (const v of [...visitedSet].filter(x => x !== minVertex)) {
                    for (let u = 0; u < numVertices; u++) {
                        if (!visited[u] && adjacencyMatrix[v][u] > 0) {
                            prevAvailableEdges.push({
                                from: v,
                                to: u,
                                weight: adjacencyMatrix[v][u]
                            });
                        }
                    }
                }
                // Add the edge that will be selected
                prevAvailableEdges.push(minimumEdgeInfo);
                prevAvailableEdges.sort((a, b) => a.weight - b.weight);
                
                // Mark non-minimum edges as rejected
                prevAvailableEdges.forEach(e => {
                    if (e.from !== minimumEdgeInfo.from || e.to !== minimumEdgeInfo.to) {
                        const alreadyRejected = rejectedEdges.some(r => 
                            (r.from === e.from && r.to === e.to) || (r.from === e.to && r.to === e.from)
                        );
                        if (!alreadyRejected) {
                            rejectedEdges.push({ from: e.from, to: e.to, weight: e.weight });
                        }
                    }
                });
                
                animationSteps.push(captureStep(
                    `Step ${count}: Considering edges from visited {${[...visitedSet].filter(x => x !== minVertex).join(', ')}} → unvisited. Minimum edge: ${parent[minVertex]}→${minVertex} = ${edge.weight} ✅`,
                    new Set([...visitedSet].filter(x => x !== minVertex)),
                    prevAvailableEdges,
                    minimumEdgeInfo,
                    takenEdges,
                    rejectedEdges
                ));
                
                // Highlight current edge
                edge.isCurrent = true;
                
                // Add to MST
                edge.inMST = true;
                edge.isCurrent = false;
                mstEdges.push({
                    from: Math.min(edge.from, edge.to),
                    to: Math.max(edge.from, edge.to),
                    weight: edge.weight
                });
                totalCost += edge.weight;
                
                // Add to taken edges
                takenEdges.push({ from: parent[minVertex], to: minVertex, weight: edge.weight });
                
                animationSteps.push(captureStep(
                    `Added edge ${parent[minVertex]}→${minVertex} to MST. Total cost = ${totalCost}`,
                    visitedSet,
                    availableEdges,
                    null,
                    takenEdges,
                    rejectedEdges
                ));
            }
        }
        
        // Update keys of adjacent vertices
        for (let v = 0; v < numVertices; v++) {
            if (adjacencyMatrix[minVertex][v] > 0 && !visited[v] && adjacencyMatrix[minVertex][v] < key[v]) {
                key[v] = adjacencyMatrix[minVertex][v];
                parent[v] = minVertex;
            }
        }
    }
    
    animationSteps.push(captureStep(
        `✅ Algorithm completed! All vertices visited. Total MST cost: ${totalCost}`,
        visitedSet,
        [],
        null,
        takenEdges,
        rejectedEdges
    ));
}

// Prim's Algorithm with animation
async function primsAlgorithm() {
    for (let i = 0; i < animationSteps.length; i++) {
        // Check if paused
        while (animationPaused && animationInProgress) {
            await sleep(100);
        }
        
        if (!animationInProgress) return; // Animation was stopped
        
        currentStepIndex = i;
        applyStep(animationSteps[i]);
        updateStepButtons();
        await sleep(1500);
    }
    
    animationInProgress = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
}

// Update step navigation buttons
function updateStepButtons() {
    if (manualMode || !animationInProgress) {
        prevBtn.disabled = currentStepIndex <= 0;
        nextBtn.disabled = currentStepIndex >= animationSteps.length - 1;
    } else {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
    }
}

// Start button handler
startBtn.addEventListener('click', async () => {
    if (!parseInput()) return;
    
    calculateVertexPositions();
    extractEdges();
    displayMatrix([], []);
    
    mstEdges = [];
    totalCost = 0;
    updateMSTInfo();
    drawGraph();
    
    // Generate all steps
    generatePrimSteps();
    currentStepIndex = -1;
    manualMode = false;
    
    animationInProgress = true;
    animationPaused = false;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    prevBtn.disabled = false;
    nextBtn.disabled = false;
    
    await primsAlgorithm();
});

// Reset button handler
resetBtn.addEventListener('click', () => {
    animationInProgress = false;
    animationPaused = false;
    manualMode = false;
    currentStepIndex = -1;
    animationSteps = [];
    
    mstEdges = [];
    totalCost = 0;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    totalCostSpan.textContent = '0';
    mstEdgesList.innerHTML = '';
    currentStepP.textContent = 'Ready to start...';
    stepNumberSpan.textContent = '0';
    totalStepsSpan.textContent = '0';
    visitedVerticesSpan.textContent = '{}';
    unvisitedVerticesSpan.textContent = '{}';
    edgesListUl.innerHTML = '';
    matrixDisplay.innerHTML = '';
    
    // Reset matrix colors
    if (adjacencyMatrix.length > 0) {
        displayMatrix([], []);
    }
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
});

// Pause button handler
pauseBtn.addEventListener('click', () => {
    animationPaused = true;
    manualMode = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
    updateStepButtons();
    currentStepP.textContent = 'Animation paused. Use Next/Previous to navigate.';
});

// Resume button handler
resumeBtn.addEventListener('click', () => {
    animationPaused = false;
    manualMode = false;
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    updateStepButtons();
    currentStepP.textContent = 'Animation resumed...';
});

// Previous button handler
prevBtn.addEventListener('click', () => {
    if (currentStepIndex > 0) {
        currentStepIndex--;
        applyStep(animationSteps[currentStepIndex]);
        updateStepButtons();
    }
});

// Next button handler
nextBtn.addEventListener('click', () => {
    if (currentStepIndex < animationSteps.length - 1) {
        currentStepIndex++;
        applyStep(animationSteps[currentStepIndex]);
        updateStepButtons();
    }
});

// Update vertex count when input changes
verticesInput.addEventListener('change', () => {
    const n = parseInt(verticesInput.value);
    if (n >= 2 && n <= 10) {
        // Generate empty matrix template
        let template = '';
        for (let i = 0; i < n; i++) {
            let row = [];
            for (let j = 0; j < n; j++) {
                row.push('0');
            }
            template += row.join(' ') + '\n';
        }
        matrixInput.value = template.trim();
    }
});

// Initial display
window.addEventListener('load', () => {
    visitedVerticesSpan.textContent = '{}';
    unvisitedVerticesSpan.textContent = '{}';
    stepNumberSpan.textContent = '0';
    totalStepsSpan.textContent = '0';
});