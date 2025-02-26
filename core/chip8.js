const MEM_SIZE_KB = 4096;
let memory = new Array(MEM_SIZE_KB).fill("0x00");

const chip8 = { memory }

window.chip8 = chip8