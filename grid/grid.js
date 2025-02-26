function renderGrid(grid, elementId, cellSize) {
    deleteGrid(elementId)

    const container = document.querySelector(`#${elementId}`)
    if (!container) {
        console.warn("Grid container element with id " + elementId + " was not found.")
        return;
    }

    container.style.gridTemplateColumns = `repeat(${grid[0].length}, ${cellSize}px)`
    container.style.gridTemplateRows = `repeat(${grid.length}, ${cellSize}px)`

    grid.forEach((row) => {
        row.forEach((cell) => {
            const cellDiv = document.createElement('div')
            if (cell.type == "ADDRESS_CELL") {
                cellDiv.style.background = "pink"
                cellDiv.id = cell.value
            }
            cellDiv.innerHTML = cell.value
            container.appendChild(cellDiv)
        })
    })
}

function createGrid(w, h) {
    const grid = []
    for (let i=0; i<h; i++) {
        const row = [{ type: "ADDRESS_CELL", value: i*w } ]
        for (let j=1; j<=w; j++) {
            row.push({ type: "MEMORY_CELL", value: '0x00' }) 
        }
        grid.push(row)
    }

    function setGridCell(x, y, val) {
        grid[x][y] = val;
        return grid;
    }

    function removeGridCell(x, y) {
        grid[x][y] = null;
        return grid;
    }

    return { grid, setGridCell, removeGridCell }
}

function createMemoryGrid(memory, columns) {
    const grid = [];
    for (let i=0; i<memory.length; i+=columns) {
        const row = [{ type: "ADDRESS_CELL", value: i }]
        for (let j=i; j<i+columns; j++) {
            if (memory[j]) {
                row.push({ type: 'MEMORY_CELL', value: memory[j] })
            }
        }
        grid.push(row)
    }

    function setGridCell(x, y, val) {
        grid[x][y] = val;
        return grid;
    }

    function removeGridCell(x, y) {
        grid[x][y] = null;
        return grid;
    }

    return grid;
}

function deleteGrid(elementId) {
    const element = document.getElementById(elementId);
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

window.grid = { createGrid, createMemoryGrid, deleteGrid, renderGrid }