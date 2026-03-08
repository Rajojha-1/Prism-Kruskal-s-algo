const verticesInput = document.getElementById('vertices');
const edgeListInput = document.getElementById('edgeListInput');
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
const edgeTableDisplay = document.getElementById('edgeTableDisplay');
const resultOutput = document.getElementById('resultOutput');

canvas.width = 550;
canvas.height = 400;

let numVertices = 0;
let adjacencyMatrix = [];
let vertices = [];
let edges = [];
let mstEdges = [];
let totalCost = 0;

let animationPaused = false;
let animationInProgress = false;
let animationSteps = [];
let currentStepIndex = -1;
let manualMode = false;

edgeListInput.value = `4
5
0 1 10
0 2 6
0 3 5
1 3 15
2 3 4`;

function parseEdgeListInput() {
    const raw = edgeListInput.value.trim();
    if (!raw) {
        return false;
    }

    const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) {
        alert('Edge-list input must include V and E on the first two lines');
        return false;
    }

    const n = parseInt(lines[0], 10);
    const m = parseInt(lines[1], 10);

    if (!Number.isInteger(n) || !Number.isInteger(m) || n < 2 || n > 10 || m < 0) {
        alert('Invalid V or E values in edge-list input');
        return false;
    }

    if (lines.length < 2 + m) {
        alert(`Expected ${m} edge lines after V and E`);
        return false;
    }

    const matrix = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < m; i++) {
        const parts = lines[i + 2].split(/\s+/).map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) {
            alert(`Invalid edge format on line ${i + 3}. Use: u v w`);
            return false;
        }
        const [u, v, w] = parts;
        if (u < 0 || v < 0 || u >= n || v >= n || w <= 0) {
            alert(`Invalid edge values on line ${i + 3}`);
            return false;
        }
        matrix[u][v] = w;
        matrix[v][u] = w;
    }

    numVertices = n;
    adjacencyMatrix = matrix;
    verticesInput.value = String(n);
    return true;
}

function calculateVertexPositions() {
    vertices = [];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 60;

    for (let i = 0; i < numVertices; i++) {
        const angle = (2 * Math.PI * i) / numVertices - Math.PI / 2;
        vertices.push({
            id: i,
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        });
    }
}

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
                    rejected: false,
                    isCurrent: false
                });
            }
        }
    }
    edges.sort((a, b) => a.weight - b.weight);
}

function drawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const labelPositionUsage = new Map();

    edges.forEach(edge => {
        const fromVertex = vertices[edge.from];
        const toVertex = vertices[edge.to];

        ctx.beginPath();
        ctx.moveTo(fromVertex.x, fromVertex.y);
        ctx.lineTo(toVertex.x, toVertex.y);

        if (edge.isCurrent) {
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 4;
        } else if (edge.inMST) {
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 4;
        } else if (edge.rejected) {
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
        }
        ctx.stroke();

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

        let labelColor = '#1f2937';
        if (edge.inMST) {
            labelColor = '#166534';
        } else if (edge.rejected) {
            labelColor = '#7f1d1d';
        } else if (edge.isCurrent) {
            labelColor = '#92400e';
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(labelX - 12, labelY - 10, 24, 20);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(labelX - 12, labelY - 10, 24, 20);
        ctx.fillStyle = labelColor;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(edge.weight, labelX, labelY);
    });

    vertices.forEach(vertex => {
        ctx.beginPath();
        ctx.arc(vertex.x, vertex.y, 20, 0, 2 * Math.PI);
        ctx.fillStyle = '#4f46e5';
        ctx.fill();
        ctx.strokeStyle = '#3730a3';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(vertex.id, vertex.x, vertex.y);
    });
}

function edgeMatches(a, b) {
    return (a.from === b.from && a.to === b.to) || (a.from === b.to && a.to === b.from);
}

function edgeKey(edge) {
    const a = Math.min(edge.from, edge.to);
    const b = Math.max(edge.from, edge.to);
    return `${a}-${b}`;
}

function renderEdgeTable(takenEdges = [], rejectedEdges = [], currentEdge = null) {
    if (edges.length === 0) {
        edgeTableDisplay.innerHTML = '';
        return;
    }

    const takenSet = new Set(takenEdges.map(edgeKey));
    const rejectedSet = new Set(rejectedEdges.map(edgeKey));
    const currentKey = currentEdge ? edgeKey(currentEdge) : '';

    let html = '<table class="matrix-table edge-table"><thead><tr><th>#</th><th>u</th><th>v</th><th>w</th><th>Status</th></tr></thead><tbody>';

    edges.forEach((edge, index) => {
        const key = edgeKey(edge);
        let status = 'pending';
        let rowClass = '';

        if (key === currentKey) {
            status = 'considering';
            rowClass = 'edge-row-current';
        } else if (takenSet.has(key)) {
            status = 'selected';
            rowClass = 'edge-row-taken';
        } else if (rejectedSet.has(key)) {
            status = 'rejected';
            rowClass = 'edge-row-rejected';
        }

        html += `<tr class="${rowClass}"><td>${index + 1}</td><td>${edge.from}</td><td>${edge.to}</td><td>${edge.weight}</td><td>${status}</td></tr>`;
    });

    html += '</tbody></table>';
    edgeTableDisplay.innerHTML = html;
}

function updateMSTInfo() {
    totalCostSpan.textContent = totalCost;
    mstEdgesList.innerHTML = '';
    mstEdges.forEach(edge => {
        const li = document.createElement('li');
        li.textContent = `${edge.from}->${edge.to} = ${edge.weight}`;
        mstEdgesList.appendChild(li);
    });
}

function formatExactOutput(isFinal) {
    if (!isFinal || mstEdges.length !== numVertices - 1) {
        return '';
    }
    const lines = mstEdges.map(edge => `${edge.from} ${edge.to} ${edge.weight}`);
    lines.push(String(totalCost));
    return lines.join('\n');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function buildComponents(parent) {
    const groups = new Map();
    for (let i = 0; i < numVertices; i++) {
        const root = find(parent, i);
        if (!groups.has(root)) {
            groups.set(root, []);
        }
        groups.get(root).push(i);
    }
    return Array.from(groups.values()).map(group => `{${group.join(',')}}`).join(' ');
}

function captureStep(message, consideredEdges, currentEdge, takenEdges, rejectedEdges, parent, processedCount) {
    return {
        message,
        edges: edges.map(e => ({ ...e })),
        mstEdges: deepCopy(mstEdges),
        totalCost,
        consideredEdges: deepCopy(consideredEdges),
        currentEdge: currentEdge ? { ...currentEdge } : null,
        takenEdges: deepCopy(takenEdges),
        rejectedEdges: deepCopy(rejectedEdges),
        components: buildComponents(parent),
        processedCount
    };
}

function applyStep(step) {
    edges = step.edges.map(e => ({ ...e }));
    mstEdges = deepCopy(step.mstEdges);
    totalCost = step.totalCost;

    currentStepP.textContent = step.message;
    stepNumberSpan.textContent = currentStepIndex + 1;
    totalStepsSpan.textContent = animationSteps.length;
    visitedVerticesSpan.textContent = step.components;
    unvisitedVerticesSpan.textContent = `${step.processedCount} / ${edges.length}`;

    edgesListUl.innerHTML = '';
    if (step.consideredEdges.length === 0) {
        edgesListUl.innerHTML = '<li style="border-left-color:#94a3b8;">No edges processed yet</li>';
    } else {
        step.consideredEdges.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.from}->${item.to} = ${item.weight} (${item.status})`;
            if (item.status === 'selected') {
                li.classList.add('minimum-edge');
            }
            if (item.status === 'rejected') {
                li.style.borderLeftColor = '#dc2626';
                li.style.background = '#fee2e2';
            }
            if (item.status === 'considering') {
                li.style.borderLeftColor = '#f59e0b';
                li.style.background = '#fef3c7';
            }
            edgesListUl.appendChild(li);
        });
    }

    renderEdgeTable(step.takenEdges, step.rejectedEdges, step.currentEdge);
    updateMSTInfo();
    drawGraph();

    const finalStep = step.mstEdges.length === numVertices - 1 || step.message.startsWith('Algorithm completed');
    resultOutput.textContent = formatExactOutput(finalStep);
}

function find(parent, x) {
    if (parent[x] !== x) {
        parent[x] = find(parent, parent[x]);
    }
    return parent[x];
}

function union(parent, rank, a, b) {
    const rootA = find(parent, a);
    const rootB = find(parent, b);

    if (rootA === rootB) {
        return false;
    }

    if (rank[rootA] < rank[rootB]) {
        parent[rootA] = rootB;
    } else if (rank[rootA] > rank[rootB]) {
        parent[rootB] = rootA;
    } else {
        parent[rootB] = rootA;
        rank[rootA]++;
    }
    return true;
}

function generateKruskalSteps() {
    animationSteps = [];
    mstEdges = [];
    totalCost = 0;

    edges.forEach(edge => {
        edge.inMST = false;
        edge.rejected = false;
        edge.isCurrent = false;
    });

    const parent = Array.from({ length: numVertices }, (_, i) => i);
    const rank = Array(numVertices).fill(0);
    const takenEdges = [];
    const rejectedEdges = [];
    const consideredEdges = [];

    animationSteps.push(captureStep(
        'Step 0: Sort edges by weight and start processing from smallest.',
        consideredEdges,
        null,
        takenEdges,
        rejectedEdges,
        parent,
        0
    ));

    let processedCount = 0;

    for (const edge of edges) {
        edge.isCurrent = true;
        processedCount++;

        consideredEdges.push({
            from: edge.from,
            to: edge.to,
            weight: edge.weight,
            status: 'considering'
        });

        animationSteps.push(captureStep(
            `Considering edge ${edge.from}->${edge.to} with weight ${edge.weight}`,
            consideredEdges,
            edge,
            takenEdges,
            rejectedEdges,
            parent,
            processedCount
        ));

        const accepted = union(parent, rank, edge.from, edge.to);
        const current = consideredEdges[consideredEdges.length - 1];

        if (accepted) {
            edge.inMST = true;
            current.status = 'selected';
            mstEdges.push({
                from: Math.min(edge.from, edge.to),
                to: Math.max(edge.from, edge.to),
                weight: edge.weight
            });
            takenEdges.push({ from: edge.from, to: edge.to, weight: edge.weight });
            totalCost += edge.weight;

            animationSteps.push(captureStep(
                `Selected edge ${edge.from}->${edge.to}. No cycle formed. Total cost = ${totalCost}`,
                consideredEdges,
                edge,
                takenEdges,
                rejectedEdges,
                parent,
                processedCount
            ));
        } else {
            edge.rejected = true;
            current.status = 'rejected';
            rejectedEdges.push({ from: edge.from, to: edge.to, weight: edge.weight });

            animationSteps.push(captureStep(
                `Rejected edge ${edge.from}->${edge.to}. It forms a cycle.`,
                consideredEdges,
                edge,
                takenEdges,
                rejectedEdges,
                parent,
                processedCount
            ));
        }

        edge.isCurrent = false;

        if (mstEdges.length === numVertices - 1) {
            break;
        }
    }

    animationSteps.push(captureStep(
        `Algorithm completed. MST cost = ${totalCost}`,
        consideredEdges,
        null,
        takenEdges,
        rejectedEdges,
        parent,
        processedCount
    ));
}

async function runAnimation() {
    for (let i = 0; i < animationSteps.length; i++) {
        while (animationPaused && animationInProgress) {
            await sleep(100);
        }

        if (!animationInProgress) {
            return;
        }

        currentStepIndex = i;
        applyStep(animationSteps[i]);
        updateStepButtons();
        await sleep(1300);
    }

    animationInProgress = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    updateStepButtons();
}

function updateStepButtons() {
    if (manualMode || !animationInProgress) {
        prevBtn.disabled = currentStepIndex <= 0;
        nextBtn.disabled = currentStepIndex >= animationSteps.length - 1;
    } else {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
    }
}

startBtn.addEventListener('click', async () => {
    if (!parseEdgeListInput()) {
        return;
    }

    calculateVertexPositions();
    extractEdges();
    renderEdgeTable([], [], null);
    generateKruskalSteps();

    currentStepIndex = -1;
    manualMode = false;
    animationPaused = false;
    animationInProgress = true;

    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;

    await runAnimation();
});

resetBtn.addEventListener('click', () => {
    animationInProgress = false;
    animationPaused = false;
    manualMode = false;
    animationSteps = [];
    currentStepIndex = -1;

    mstEdges = [];
    totalCost = 0;

    edges.forEach(edge => {
        edge.inMST = false;
        edge.rejected = false;
        edge.isCurrent = false;
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    currentStepP.textContent = 'Ready to start...';
    stepNumberSpan.textContent = '0';
    totalStepsSpan.textContent = '0';
    visitedVerticesSpan.textContent = '{}';
    unvisitedVerticesSpan.textContent = '0';
    edgesListUl.innerHTML = '';
    totalCostSpan.textContent = '0';
    mstEdgesList.innerHTML = '';
    resultOutput.textContent = '';

    renderEdgeTable([], [], null);

    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
});

pauseBtn.addEventListener('click', () => {
    animationPaused = true;
    manualMode = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
    currentStepP.textContent = 'Animation paused. Use Next/Previous to navigate.';
    updateStepButtons();
});

resumeBtn.addEventListener('click', () => {
    animationPaused = false;
    manualMode = false;
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    currentStepP.textContent = 'Animation resumed...';
    updateStepButtons();
});

prevBtn.addEventListener('click', () => {
    if (currentStepIndex > 0) {
        currentStepIndex--;
        applyStep(animationSteps[currentStepIndex]);
        updateStepButtons();
    }
});

nextBtn.addEventListener('click', () => {
    if (currentStepIndex < animationSteps.length - 1) {
        currentStepIndex++;
        applyStep(animationSteps[currentStepIndex]);
        updateStepButtons();
    }
});

verticesInput.addEventListener('change', () => {
    const n = parseInt(verticesInput.value, 10);
    if (n >= 2 && n <= 10) {
        const rows = [];
        for (let i = 0; i < n; i++) {
            rows.push(Array(n).fill(0).join(' '));
        }
        matrixInput.value = rows.join('\n');
    }
});

window.addEventListener('load', () => {
    stepNumberSpan.textContent = '0';
    totalStepsSpan.textContent = '0';
    visitedVerticesSpan.textContent = '{}';
    unvisitedVerticesSpan.textContent = '0';
    resultOutput.textContent = '';
});
