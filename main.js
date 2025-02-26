const memoryColumnsSettingInput = document.querySelector("#memory-columns-setting")
console.log(window.createMemoryGrid)
const memoryGrid = createMemoryGrid(memory, Number(memoryColumnsSettingInput.value))
renderGrid(memoryGrid, 'memory-grid', 40)

memoryColumnsSettingInput.addEventListener("input", (e) => {
    const memoryGrid = createMemoryGrid(memory, Number(e.target.value))
    renderGrid(memoryGrid, 'memory-grid', 40)
})

const addressInput = document.querySelector("#address")
addressInput.addEventListener("keypress", (e) => {
    if (e.key == 'Enter') {
        const address = e.target.value;
        const cell = document.getElementById(address);
        cell.scrollIntoView()
    }
})