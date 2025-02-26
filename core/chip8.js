// CHIP-8 System Constants
const MEM_SIZE = 4096;          // 4KB memory
const DISPLAY_WIDTH = 64;       // Display width (pixels)
const DISPLAY_HEIGHT = 32;      // Display height (pixels)
const STACK_SIZE = 16;          // 16 levels of stack
const NUM_REGISTERS = 16;       // 16 8-bit registers (V0-VF)
const NUM_KEYS = 16;            // 16 input keys
const FONTSET_SIZE = 80;        // 5 bytes per character, 16 characters

// Fontset (0-F hex characters, 5 bytes each)
const fontset = [
  0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
  0x20, 0x60, 0x20, 0x20, 0x70, // 1
  0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
  0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
  0x90, 0x90, 0xF0, 0x10, 0x10, // 4
  0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
  0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
  0xF0, 0x10, 0x20, 0x40, 0x40, // 7
  0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
  0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
  0xF0, 0x90, 0xF0, 0x90, 0x90, // A
  0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
  0xF0, 0x80, 0x80, 0x80, 0xF0, // C
  0xE0, 0x90, 0x90, 0x90, 0xE0, // D
  0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
  0xF0, 0x80, 0xF0, 0x80, 0x80  // F
];

class Chip8 {
  constructor() {
    this.reset();
  }

  reset() {
    // Main components
    this.memory = new Array(MEM_SIZE).fill(0);      // Memory
    this.v = new Array(NUM_REGISTERS).fill(0);      // Registers V0-VF
    this.i = 0;                                     // Index register
    this.pc = 0x200;                                // Program counter starts at 0x200
    this.stack = new Array(STACK_SIZE).fill(0);     // Stack
    this.sp = 0;                                    // Stack pointer
    this.delayTimer = 0;                            // Delay timer
    this.soundTimer = 0;                            // Sound timer
    
    // I/O
    this.display = Array(DISPLAY_HEIGHT).fill().map(() => Array(DISPLAY_WIDTH).fill(0));
    this.keys = new Array(NUM_KEYS).fill(false);
    this.drawFlag = false;                         // Flag to indicate display needs update
    
    // State variables for debugging
    this.paused = false;                           // Emulation paused flag
    this.speed = 10;                               // Instructions per cycle
    this.lastInstruction = null;                   // Last executed instruction
    this.waitingForKeyPress = false;               // Flag for key input
    this.keyRegister = 0;                          // Register to store key in
    
    // Load fontset into memory
    for (let i = 0; i < FONTSET_SIZE; i++) {
      this.memory[i] = fontset[i];
    }
  }

  // Load a ROM file into memory
  loadROM(romBuffer) {
    // ROM data starts at 0x200 (512)
    for (let i = 0; i < romBuffer.length; i++) {
      this.memory[0x200 + i] = romBuffer[i];
    }
  }

  // Emulate one CPU cycle
  emulateCycle() {
    if (this.paused) return;
    
    // Execute multiple instructions per cycle based on speed
    for (let i = 0; i < this.speed; i++) {
      if (!this.waitingForKeyPress) {
        this.executeInstruction();
      }
    }
    
    // Update timers at 60Hz (separate from instruction execution)
    if (this.delayTimer > 0) {
      this.delayTimer--;
    }
    
    if (this.soundTimer > 0) {
      // TODO: Implement sound
      this.soundTimer--;
    }
  }

  // Execute a single instruction
  executeInstruction() {
    // Fetch opcode (2 bytes)
    const opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
    this.lastInstruction = opcode;
    
    // Increment PC before execution (most instructions are 2 bytes)
    this.pc += 2;
    
    // Decode and execute opcode
    // Using the first nibble (4 bits) to determine the instruction type
    const x = (opcode & 0x0F00) >> 8;    // Second nibble
    const y = (opcode & 0x00F0) >> 4;    // Third nibble
    const n = opcode & 0x000F;           // Fourth nibble
    const nn = opcode & 0x00FF;          // Last byte
    const nnn = opcode & 0x0FFF;         // Last 12 bits
    
    switch (opcode & 0xF000) {
      case 0x0000:
        switch (opcode) {
          case 0x00E0: // 00E0: Clear the display
            this.display = Array(DISPLAY_HEIGHT).fill().map(() => Array(DISPLAY_WIDTH).fill(0));
            this.drawFlag = true;
            break;
            
          case 0x00EE: // 00EE: Return from a subroutine
            this.sp--;
            this.pc = this.stack[this.sp];
            break;
            
          default:
            console.warn(`Unknown opcode: ${opcode.toString(16)}`);
        }
        break;
        
      case 0x1000: // 1NNN: Jump to address NNN
        this.pc = nnn;
        break;
        
      case 0x2000: // 2NNN: Call subroutine at NNN
        this.stack[this.sp] = this.pc;
        this.sp++;
        this.pc = nnn;
        break;
        
      case 0x3000: // 3XNN: Skip next instruction if VX == NN
        if (this.v[x] === nn) {
          this.pc += 2;
        }
        break;
        
      case 0x4000: // 4XNN: Skip next instruction if VX != NN
        if (this.v[x] !== nn) {
          this.pc += 2;
        }
        break;
        
      case 0x5000: // 5XY0: Skip next instruction if VX == VY
        if (this.v[x] === this.v[y]) {
          this.pc += 2;
        }
        break;
        
      case 0x6000: // 6XNN: Set VX = NN
        this.v[x] = nn;
        break;
        
      case 0x7000: // 7XNN: Add NN to VX (no carry flag)
        this.v[x] = (this.v[x] + nn) & 0xFF;
        break;
        
      case 0x8000:
        switch (opcode & 0x000F) {
          case 0x0000: // 8XY0: Set VX = VY
            this.v[x] = this.v[y];
            break;
            
          case 0x0001: // 8XY1: Set VX = VX OR VY
            this.v[x] |= this.v[y];
            break;
            
          case 0x0002: // 8XY2: Set VX = VX AND VY
            this.v[x] &= this.v[y];
            break;
            
          case 0x0003: // 8XY3: Set VX = VX XOR VY
            this.v[x] ^= this.v[y];
            break;
            
          case 0x0004: // 8XY4: Add VY to VX with carry
            const sum = this.v[x] + this.v[y];
            this.v[0xF] = sum > 0xFF ? 1 : 0;  // Set carry flag
            this.v[x] = sum & 0xFF;
            break;
            
          case 0x0005: // 8XY5: Subtract VY from VX
            this.v[0xF] = this.v[x] > this.v[y] ? 1 : 0;  // Set borrow flag
            this.v[x] = (this.v[x] - this.v[y]) & 0xFF;
            break;
            
          case 0x0006: // 8XY6: Shift VX right by 1
            this.v[0xF] = this.v[x] & 0x1;  // Store LSB in VF
            this.v[x] >>= 1;
            break;
            
          case 0x0007: // 8XY7: Set VX = VY - VX
            this.v[0xF] = this.v[y] > this.v[x] ? 1 : 0;  // Set borrow flag
            this.v[x] = (this.v[y] - this.v[x]) & 0xFF;
            break;
            
          case 0x000E: // 8XYE: Shift VX left by 1
            this.v[0xF] = (this.v[x] & 0x80) >> 7;  // Store MSB in VF
            this.v[x] = (this.v[x] << 1) & 0xFF;
            break;
            
          default:
            console.warn(`Unknown opcode: ${opcode.toString(16)}`);
        }
        break;
        
      case 0x9000: // 9XY0: Skip next instruction if VX != VY
        if (this.v[x] !== this.v[y]) {
          this.pc += 2;
        }
        break;
        
      case 0xA000: // ANNN: Set I = NNN
        this.i = nnn;
        break;
        
      case 0xB000: // BNNN: Jump to address NNN + V0
        this.pc = nnn + this.v[0];
        break;
        
      case 0xC000: // CXNN: Set VX = random byte AND NN
        this.v[x] = Math.floor(Math.random() * 0xFF) & nn;
        break;
        
      case 0xD000: // DXYN: Draw sprite at (VX, VY) with N bytes of sprite data starting at I
        const xCoord = this.v[x] & 0xFF;
        const yCoord = this.v[y] & 0xFF;
        const height = n;
        
        this.v[0xF] = 0; // Reset collision flag
        
        for (let row = 0; row < height; row++) {
          const spriteByte = this.memory[this.i + row];
          
          for (let col = 0; col < 8; col++) {
            if ((spriteByte & (0x80 >> col)) !== 0) {
              const pixelY = (yCoord + row) % DISPLAY_HEIGHT;
              const pixelX = (xCoord + col) % DISPLAY_WIDTH;
              
              // If pixel is already set, we have a collision
              if (this.display[pixelY][pixelX] === 1) {
                this.v[0xF] = 1;
              }
              
              // XOR the pixel
              this.display[pixelY][pixelX] ^= 1;
            }
          }
        }
        
        this.drawFlag = true;
        break;
        
      case 0xE000:
        switch (opcode & 0x00FF) {
          case 0x009E: // EX9E: Skip next instruction if key with value VX is pressed
            if (this.keys[this.v[x]]) {
              this.pc += 2;
            }
            break;
            
          case 0x00A1: // EXA1: Skip next instruction if key with value VX is not pressed
            if (!this.keys[this.v[x]]) {
              this.pc += 2;
            }
            break;
            
          default:
            console.warn(`Unknown opcode: ${opcode.toString(16)}`);
        }
        break;
        
      case 0xF000:
        switch (opcode & 0x00FF) {
          case 0x0007: // FX07: Set VX = delay timer value
            this.v[x] = this.delayTimer;
            break;
            
          case 0x000A: // FX0A: Wait for a key press, store key value in VX
            this.waitingForKeyPress = true;
            this.keyRegister = x;
            break;
            
          case 0x0015: // FX15: Set delay timer = VX
            this.delayTimer = this.v[x];
            break;
            
          case 0x0018: // FX18: Set sound timer = VX
            this.soundTimer = this.v[x];
            break;
            
          case 0x001E: // FX1E: Add VX to I
            this.i += this.v[x];
            // Some implementations set VF if I exceeds 0xFFF
            if (this.i > 0xFFF) {
              this.v[0xF] = 1;
              this.i &= 0xFFF;
            }
            break;
            
          case 0x0029: // FX29: Set I to the location of the sprite for character VX
            // Each character is 5 bytes
            this.i = this.v[x] * 5;
            break;
            
          case 0x0033: // FX33: Store BCD representation of VX in memory at I, I+1, I+2
            this.memory[this.i] = Math.floor(this.v[x] / 100);
            this.memory[this.i + 1] = Math.floor((this.v[x] % 100) / 10);
            this.memory[this.i + 2] = this.v[x] % 10;
            break;
            
          case 0x0055: // FX55: Store registers V0 through VX in memory starting at I
            for (let reg = 0; reg <= x; reg++) {
              this.memory[this.i + reg] = this.v[reg];
            }
            // On original CHIP-8, I would be incremented by X+1
            // this.i += x + 1;
            break;
            
          case 0x0065: // FX65: Read registers V0 through VX from memory starting at I
            for (let reg = 0; reg <= x; reg++) {
              this.v[reg] = this.memory[this.i + reg];
            }
            // On original CHIP-8, I would be incremented by X+1
            // this.i += x + 1;
            break;
            
          default:
            console.warn(`Unknown opcode: ${opcode.toString(16)}`);
        }
        break;
        
      default:
        console.warn(`Unknown opcode: ${opcode.toString(16)}`);
    }
  }

  // Handle key press
  keyPress(keyCode) {
    this.keys[keyCode] = true;
    
    // If waiting for key press, store key and continue
    if (this.waitingForKeyPress) {
      this.v[this.keyRegister] = keyCode;
      this.waitingForKeyPress = false;
    }
  }

  // Handle key release
  keyRelease(keyCode) {
    this.keys[keyCode] = false;
  }

  // Get disassembly of current instruction (for debugging)
  disassembleInstruction(opcode) {
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;
    const n = opcode & 0x000F;
    const nn = opcode & 0x00FF;
    const nnn = opcode & 0x0FFF;
    
    switch (opcode & 0xF000) {
      case 0x0000:
        switch (opcode) {
          case 0x00E0: return "CLS";
          case 0x00EE: return "RET";
          default: return `SYS ${nnn.toString(16)}`;
        }
      case 0x1000: return `JP ${nnn.toString(16)}`;
      case 0x2000: return `CALL ${nnn.toString(16)}`;
      case 0x3000: return `SE V${x.toString(16)}, ${nn.toString(16)}`;
      case 0x4000: return `SNE V${x.toString(16)}, ${nn.toString(16)}`;
      case 0x5000: return `SE V${x.toString(16)}, V${y.toString(16)}`;
      case 0x6000: return `LD V${x.toString(16)}, ${nn.toString(16)}`;
      case 0x7000: return `ADD V${x.toString(16)}, ${nn.toString(16)}`;
      case 0x8000:
        switch (n) {
          case 0x0: return `LD V${x.toString(16)}, V${y.toString(16)}`;
          case 0x1: return `OR V${x.toString(16)}, V${y.toString(16)}`;
          case 0x2: return `AND V${x.toString(16)}, V${y.toString(16)}`;
          case 0x3: return `XOR V${x.toString(16)}, V${y.toString(16)}`;
          case 0x4: return `ADD V${x.toString(16)}, V${y.toString(16)}`;
          case 0x5: return `SUB V${x.toString(16)}, V${y.toString(16)}`;
          case 0x6: return `SHR V${x.toString(16)}`;
          case 0x7: return `SUBN V${x.toString(16)}, V${y.toString(16)}`;
          case 0xE: return `SHL V${x.toString(16)}`;
        }
        break;
      case 0x9000: return `SNE V${x.toString(16)}, V${y.toString(16)}`;
      case 0xA000: return `LD I, ${nnn.toString(16)}`;
      case 0xB000: return `JP V0, ${nnn.toString(16)}`;
      case 0xC000: return `RND V${x.toString(16)}, ${nn.toString(16)}`;
      case 0xD000: return `DRW V${x.toString(16)}, V${y.toString(16)}, ${n}`;
      case 0xE000:
        switch (nn) {
          case 0x9E: return `SKP V${x.toString(16)}`;
          case 0xA1: return `SKNP V${x.toString(16)}`;
        }
        break;
      case 0xF000:
        switch (nn) {
          case 0x07: return `LD V${x.toString(16)}, DT`;
          case 0x0A: return `LD V${x.toString(16)}, K`;
          case 0x15: return `LD DT, V${x.toString(16)}`;
          case 0x18: return `LD ST, V${x.toString(16)}`;
          case 0x1E: return `ADD I, V${x.toString(16)}`;
          case 0x29: return `LD F, V${x.toString(16)}`;
          case 0x33: return `LD B, V${x.toString(16)}`;
          case 0x55: return `LD [I], V${x.toString(16)}`;
          case 0x65: return `LD V${x.toString(16)}, [I]`;
        }
        break;
    }
    
    return `UNKNOWN (${opcode.toString(16)})`;
  }
  
  // Get a description of what the current instruction does
  getInstructionDescription(opcode) {
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;
    const n = opcode & 0x000F;
    const nn = opcode & 0x00FF;
    const nnn = opcode & 0x0FFF;
    
    switch (opcode & 0xF000) {
      case 0x0000:
        switch (opcode) {
          case 0x00E0: return "Clear the display";
          case 0x00EE: return "Return from subroutine";
          default: return `Call machine code routine at address ${nnn.toString(16)}`;
        }
      case 0x1000: return `Jump to address ${nnn.toString(16)}`;
      case 0x2000: return `Call subroutine at address ${nnn.toString(16)}`;
      case 0x3000: return `Skip next instruction if V${x.toString(16)} equals ${nn.toString(16)}`;
      case 0x4000: return `Skip next instruction if V${x.toString(16)} doesn't equal ${nn.toString(16)}`;
      case 0x5000: return `Skip next instruction if V${x.toString(16)} equals V${y.toString(16)}`;
      case 0x6000: return `Set V${x.toString(16)} to ${nn.toString(16)}`;
      case 0x7000: return `Add ${nn.toString(16)} to V${x.toString(16)}`;
      case 0x8000:
        switch (n) {
          case 0x0: return `Set V${x.toString(16)} to the value of V${y.toString(16)}`;
          case 0x1: return `Set V${x.toString(16)} to V${x.toString(16)} OR V${y.toString(16)}`;
          case 0x2: return `Set V${x.toString(16)} to V${x.toString(16)} AND V${y.toString(16)}`;
          case 0x3: return `Set V${x.toString(16)} to V${x.toString(16)} XOR V${y.toString(16)}`;
          case 0x4: return `Add V${y.toString(16)} to V${x.toString(16)} with carry`;
          case 0x5: return `Subtract V${y.toString(16)} from V${x.toString(16)}`;
          case 0x6: return `Shift V${x.toString(16)} right by 1`;
          case 0x7: return `Set V${x.toString(16)} to V${y.toString(16)} - V${x.toString(16)}`;
          case 0xE: return `Shift V${x.toString(16)} left by 1`;
        }
        break;
      case 0x9000: return `Skip next instruction if V${x.toString(16)} doesn't equal V${y.toString(16)}`;
      case 0xA000: return `Set I to address ${nnn.toString(16)}`;
      case 0xB000: return `Jump to address ${nnn.toString(16)} + V0`;
      case 0xC000: return `Set V${x.toString(16)} to a random number AND ${nn.toString(16)}`;
      case 0xD000: return `Draw ${n}-byte sprite at (V${x.toString(16)}, V${y.toString(16)})`;
      case 0xE000:
        switch (nn) {
          case 0x9E: return `Skip next instruction if key V${x.toString(16)} is pressed`;
          case 0xA1: return `Skip next instruction if key V${x.toString(16)} is not pressed`;
        }
        break;
      case 0xF000:
        switch (nn) {
          case 0x07: return `Set V${x.toString(16)} to the value of the delay timer`;
          case 0x0A: return `Wait for key press and store in V${x.toString(16)}`;
          case 0x15: return `Set delay timer to V${x.toString(16)}`;
          case 0x18: return `Set sound timer to V${x.toString(16)}`;
          case 0x1E: return `Add V${x.toString(16)} to I`;
          case 0x29: return `Set I to the location of sprite for digit V${x.toString(16)}`;
          case 0x33: return `Store BCD representation of V${x.toString(16)} in memory at I, I+1, I+2`;
          case 0x55: return `Store V0 to V${x.toString(16)} in memory starting at address I`;
          case 0x65: return `Load V0 to V${x.toString(16)} from memory starting at address I`;
        }
        break;
    }
    
    return `Unknown instruction (${opcode.toString(16)})`;
  }
}

// Create a single instance of the Chip8 emulator
const chip8 = new Chip8();

// Export for use in other modules
window.chip8 = chip8;