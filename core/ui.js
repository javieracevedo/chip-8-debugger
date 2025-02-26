/**
 * Chip8Debugger - A visual debugger for the CHIP-8 emulator
 * 
 * This class provides a UI for debugging CHIP-8 programs:
 * - Instruction stepping and execution
 * - Register and memory visualization
 * - Display output
 * - Keyboard input visualization
 * - ROM loading
 */
class Chip8Debugger {
    constructor(chip8) {
      this.chip8 = chip8;
      this.lastPC = null;
      this.lastInstruction = null;
      this.breakpoints = new Set();
      this.running = false;
      this.runIntervalId = null;
      this.displayScale = 10; // Scale factor for display pixels
      
      // Set up the UI after initializing other properties
      this.setupUI();
    }
  
    /**
     * Set up the debugger UI components
     */
    setupUI() {
      // Create debugger container
      const debuggerSection = document.createElement('section');
      debuggerSection.className = 'debugger-section';
      document.body.appendChild(debuggerSection);
  
      // Create heading
      const heading = document.createElement('h2');
      heading.textContent = 'CHIP-8 Debugger';
      debuggerSection.appendChild(heading);
  
      // Create instruction display
      this.instructionDisplay = document.createElement('div');
      this.instructionDisplay.className = 'instruction-display';
      debuggerSection.appendChild(this.instructionDisplay);
  
      // Create registers display
      this.registersDisplay = document.createElement('div');
      this.registersDisplay.className = 'registers-display';
      debuggerSection.appendChild(this.registersDisplay);
  
      // Create buttons container
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'buttons-container';
      debuggerSection.appendChild(buttonsContainer);
  
      // Create control buttons
      const stepButton = document.createElement('button');
      stepButton.textContent = 'Step';
      stepButton.addEventListener('click', () => this.step());
      buttonsContainer.appendChild(stepButton);
  
      const runButton = document.createElement('button');
      runButton.textContent = 'Run';
      runButton.addEventListener('click', () => this.toggleRun());
      this.runButton = runButton;
      buttonsContainer.appendChild(runButton);
  
      const resetButton = document.createElement('button');
      resetButton.textContent = 'Reset';
      resetButton.addEventListener('click', () => this.reset());
      buttonsContainer.appendChild(resetButton);
  
      // Create ROM loader
      const romLoader = document.createElement('div');
      romLoader.className = 'rom-loader';
      
      const romFileInput = document.createElement('input');
      romFileInput.type = 'file';
      romFileInput.id = 'rom-file';
      romFileInput.addEventListener('change', (e) => this.loadROM(e));
      
      const romFileLabel = document.createElement('label');
      romFileLabel.htmlFor = 'rom-file';
      romFileLabel.textContent = 'Load ROM';
      
      romLoader.appendChild(romFileLabel);
      romLoader.appendChild(romFileInput);
      debuggerSection.appendChild(romLoader);
      
      // Add speed control
      const speedControl = document.createElement('div');
      speedControl.className = 'speed-control';
      
      const speedLabel = document.createElement('label');
      speedLabel.htmlFor = 'speed-slider';
      speedLabel.textContent = 'Emulation Speed: ';
      
      const speedValue = document.createElement('span');
      speedValue.id = 'speed-value';
      speedValue.textContent = this.chip8.speed;
      
      const speedSlider = document.createElement('input');
      speedSlider.id = 'speed-slider';
      speedSlider.type = 'range';
      speedSlider.min = '1';
      speedSlider.max = '100';
      speedSlider.value = this.chip8.speed;
      speedSlider.addEventListener('input', (e) => {
        const speed = parseInt(e.target.value);
        this.chip8.speed = speed;
        speedValue.textContent = speed;
      });
      
      speedLabel.appendChild(speedValue);
      speedControl.appendChild(speedLabel);
      speedControl.appendChild(speedSlider);
      debuggerSection.appendChild(speedControl);
  
      // Create display grid for CHIP-8 screen
      const displaySection = document.createElement('section');
      displaySection.className = 'display-section';
      document.body.appendChild(displaySection);
  
      const displayHeading = document.createElement('h2');
      displayHeading.textContent = 'CHIP-8 Display';
      displaySection.appendChild(displayHeading);
  
      this.displayGrid = document.createElement('div');
      this.displayGrid.id = 'display-grid';
      displaySection.appendChild(this.displayGrid);
  
      // Set up keyboard mapping
      this.setupKeyboard();
  
      // Initial UI update
      this.updateUI();
    }
  
    /**
     * Set up keyboard input for the CHIP-8
     */
    setupKeyboard() {
      // CHIP-8 uses a 16-key hex keyboard (0-F)
      // We'll map it to the following keys on a standard QWERTY keyboard:
      // 1 2 3 4   ->   1 2 3 C
      // Q W E R   ->   4 5 6 D
      // A S D F   ->   7 8 9 E
      // Z X C V   ->   A 0 B F
      const keyMap = {
        '1': 0x1, '2': 0x2, '3': 0x3, '4': 0xC,
        'q': 0x4, 'w': 0x5, 'e': 0x6, 'r': 0xD,
        'a': 0x7, 's': 0x8, 'd': 0x9, 'f': 0xE,
        'z': 0xA, 'x': 0x0, 'c': 0xB, 'v': 0xF
      };
  
      // Create visual keyboard for debugging
      const keyboardContainer = document.createElement('div');
      keyboardContainer.className = 'keyboard-container';
      document.body.appendChild(keyboardContainer);
      
      const keyboardHeading = document.createElement('h2');
      keyboardHeading.textContent = 'CHIP-8 Keyboard';
      keyboardContainer.appendChild(keyboardHeading);
      
      const keyboardGrid = document.createElement('div');
      keyboardGrid.className = 'keyboard-grid';
      keyboardContainer.appendChild(keyboardGrid);
      
      // Create visual keys
      const keyLayout = [
        ['1', '2', '3', 'C'],
        ['4', '5', '6', 'D'],
        ['7', '8', '9', 'E'],
        ['A', '0', 'B', 'F']
      ];
      
      keyLayout.forEach((row, rowIndex) => {
        row.forEach((key, colIndex) => {
          const keyButton = document.createElement('button');
          keyButton.className = 'key-button';
          keyButton.textContent = key;
          keyButton.dataset.key = key.toLowerCase();
          
          // Map hex values A-F to corresponding keyboard keys
          const pcKey = key === 'A' ? 'z' : 
                       key === 'B' ? 'c' : 
                       key === 'C' ? '4' : 
                       key === 'D' ? 'r' : 
                       key === 'E' ? 'f' : 
                       key === 'F' ? 'v' : 
                       key.toLowerCase();
                       
          keyButton.dataset.pcKey = pcKey;
          
          keyButton.addEventListener('mousedown', () => {
            // Convert hex string to number
            const hexValue = parseInt(key, 16);
            this.chip8.keyPress(hexValue);
            keyButton.classList.add('pressed');
          });
          
          keyButton.addEventListener('mouseup', () => {
            const hexValue = parseInt(key, 16);
            this.chip8.keyRelease(hexValue);
            keyButton.classList.remove('pressed');
          });
          
          keyButton.addEventListener('mouseleave', () => {
            if (keyButton.classList.contains('pressed')) {
              const hexValue = parseInt(key, 16);
              this.chip8.keyRelease(hexValue);
              keyButton.classList.remove('pressed');
            }
          });
          
          keyboardGrid.appendChild(keyButton);
        });
      });
  
      // Handle key down events
      document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        if (keyMap[key] !== undefined) {
          this.chip8.keyPress(keyMap[key]);
          
          // Update visual keyboard
          const buttons = document.querySelectorAll('.key-button');
          buttons.forEach(button => {
            if (button.dataset.pcKey === key) {
              button.classList.add('pressed');
            }
          });
          
          // Prevent default actions for these keys
          event.preventDefault();
        }
      });
  
      // Handle key up events
      document.addEventListener('keyup', (event) => {
        const key = event.key.toLowerCase();
        if (keyMap[key] !== undefined) {
          this.chip8.keyRelease(keyMap[key]);
          
          // Update visual keyboard
          const buttons = document.querySelectorAll('.key-button');
          buttons.forEach(button => {
            if (button.dataset.pcKey === key) {
              button.classList.remove('pressed');
            }
          });
          
          event.preventDefault();
        }
      });
    }
  
    /**
     * Execute a single instruction and update the UI
     */
    step() {
      if (!this.chip8.paused) {
        // Store the current PC for highlighting in memory view
        this.lastPC = this.chip8.pc;
        
        // Execute one instruction
        this.chip8.executeInstruction();
        
        // Update display if needed
        if (this.chip8.drawFlag) {
          this.updateDisplay();
          this.chip8.drawFlag = false;
        }
        
        // Update debugger UI
        this.updateUI();
      }
    }
  
    /**
     * Toggle continuous execution
     */
    toggleRun() {
      this.running = !this.running;
      
      if (this.running) {
        this.runButton.textContent = 'Pause';
        
        // Start continuous execution
        this.runIntervalId = setInterval(() => {
          // Run one emulation cycle (multiple instructions based on speed)
          this.chip8.emulateCycle();
          
          // Update display if needed
          if (this.chip8.drawFlag) {
            this.updateDisplay();
            this.chip8.drawFlag = false;
          }
          
          // Update UI less frequently to avoid overloading the browser
          if (Math.random() < 0.1) { // Update UI with 10% probability each cycle
            this.updateUI();
          }
          
          // Check for breakpoints
          if (this.breakpoints.has(this.chip8.pc)) {
            this.toggleRun(); // Pause execution
            this.updateUI();  // Force UI update
            alert(`Breakpoint hit at address 0x${this.chip8.pc.toString(16).padStart(4, '0')}`);
          }
        }, 16); // ~60 Hz (16.67ms)
      } else {
        this.runButton.textContent = 'Run';
        clearInterval(this.runIntervalId);
        this.updateUI(); // Make sure UI is up to date
      }
    }
  
    /**
     * Reset the emulator
     */
    reset() {
      if (this.running) {
        this.toggleRun(); // Stop execution if running
      }
      
      this.chip8.reset();
      this.updateUI();
      this.updateDisplay();
    }
  
    /**
     * Load a ROM file
     */
    loadROM(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const buffer = new Uint8Array(e.target.result);
        
        // Reset before loading ROM
        this.reset();
        
        // Load ROM into memory
        this.chip8.loadROM(buffer);
        
        // Update UI to show loaded ROM
        this.updateUI();
        
        console.log(`Loaded ROM: ${file.name}, size: ${buffer.length} bytes`);
      };
      
      reader.readAsArrayBuffer(file);
    }
  
    /**
     * Update the instruction and register displays
     */
    updateUI() {
      // Get current instruction
      const currentPC = this.chip8.pc;
      const currentOpcode = (this.chip8.memory[currentPC] << 8) | this.chip8.memory[currentPC + 1];
      
      // Format PC and instruction
      const pcHex = currentPC.toString(16).padStart(4, '0');
      const opcodeHex = currentOpcode.toString(16).padStart(4, '0');
      
      // Get instruction metadata
      const instruction = this.chip8.disassembleInstruction(currentOpcode);
      const description = this.chip8.getInstructionDescription(currentOpcode);
      
      // Update instruction display
      this.instructionDisplay.innerHTML = `
        <div class="instruction-info">
          <div><strong>PC:</strong> 0x${pcHex}</div>
          <div><strong>Opcode:</strong> 0x${opcodeHex}</div>
          <div><strong>Instruction:</strong> ${instruction}</div>
        </div>
        <div class="instruction-description">
          <strong>Description:</strong> ${description}
        </div>
        <div class="memory-view">
          <strong>Memory around PC:</strong>
          <div class="memory-bytes">
            ${this.formatMemoryView(currentPC - 6, currentPC + 10)}
          </div>
        </div>
      `;
      
      // Update registers display
      let registersHTML = '<div class="registers">';
      
      // V registers
      registersHTML += '<div class="register-column">';
      for (let i = 0; i < 16; i++) {
        const regName = `V${i.toString(16).toUpperCase()}`;
        const regValue = this.chip8.v[i].toString(16).padStart(2, '0');
        registersHTML += `<div><strong>${regName}:</strong> 0x${regValue}</div>`;
      }
      registersHTML += '</div>';
      
      // Special registers and timers
      registersHTML += '<div class="register-column">';
      registersHTML += `<div><strong>I:</strong> 0x${this.chip8.i.toString(16).padStart(4, '0')}</div>`;
      registersHTML += `<div><strong>PC:</strong> 0x${this.chip8.pc.toString(16).padStart(4, '0')}</div>`;
      registersHTML += `<div><strong>SP:</strong> ${this.chip8.sp}</div>`;
      registersHTML += `<div><strong>Delay Timer:</strong> ${this.chip8.delayTimer}</div>`;
      registersHTML += `<div><strong>Sound Timer:</strong> ${this.chip8.soundTimer}</div>`;
      registersHTML += '</div>';
      
      // Stack
      registersHTML += '<div class="register-column">';
      registersHTML += '<div><strong>Stack:</strong></div>';
      for (let i = 0; i < Math.min(this.chip8.sp, 8); i++) {
        registersHTML += `<div>${i}: 0x${this.chip8.stack[i].toString(16).padStart(4, '0')}</div>`;
      }
      registersHTML += '</div>';
      
      registersHTML += '</div>'; // Close registers div
      
      this.registersDisplay.innerHTML = registersHTML;
      
      // Update memory view to highlight current PC
      if (this.lastPC !== null) {
        this.highlightMemoryAddress(this.lastPC);
      }
    }
  
    /**
     * Format a view of memory around a specific address
     */
    formatMemoryView(startAddr, endAddr) {
      // Ensure addresses are within memory bounds
      startAddr = Math.max(0, startAddr);
      endAddr = Math.min(this.chip8.memory.length - 1, endAddr);
      
      let html = '';
      
      for (let addr = startAddr; addr <= endAddr; addr += 2) {
        // Format address
        const addrHex = addr.toString(16).padStart(4, '0');
        
        // Get opcode (2 bytes) if possible
        let opcodeStr = '??';
        if (addr + 1 < this.chip8.memory.length) {
          const opcode = (this.chip8.memory[addr] << 8) | this.chip8.memory[addr + 1];
          opcodeStr = opcode.toString(16).padStart(4, '0');
        }
        
        // Highlight current PC
        const isCurrentPC = (addr === this.chip8.pc);
        const pcMarker = isCurrentPC ? '→ ' : '  ';
        const highlightClass = isCurrentPC ? 'class="current-pc"' : '';
        
        // Try to disassemble
        let disasm = '';
        if (addr + 1 < this.chip8.memory.length) {
          const opcode = (this.chip8.memory[addr] << 8) | this.chip8.memory[addr + 1];
          disasm = this.chip8.disassembleInstruction(opcode);
        }
        
        html += `<div id="mem-${addrHex}" ${highlightClass}>${pcMarker}0x${addrHex}: 0x${opcodeStr} ${disasm}</div>`;
      }
      
      return html;
    }
  
    /**
     * Highlight a memory address in the memory view
     */
    highlightMemoryAddress(address) {
      // Find existing memory view cells
      const cells = document.querySelectorAll('#memory-grid div');
      
      // Remove previous highlighting
      cells.forEach(cell => {
        cell.classList.remove('current-instruction');
      });
      
      // Add highlighting to the correct cell
      const cellToHighlight = document.getElementById(address.toString());
      if (cellToHighlight) {
        cellToHighlight.classList.add('current-instruction');
        cellToHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  
    /**
     * Update the CHIP-8 display
     */
    updateDisplay() {
      // Create a grid for the display
      const displayGrid = document.getElementById('display-grid');
      
      // Clear existing display
      while (displayGrid.firstChild) {
        displayGrid.removeChild(displayGrid.firstChild);
      }
      
      // Set grid size based on CHIP-8 display dimensions
      displayGrid.style.display = 'grid';
      displayGrid.style.gridTemplateColumns = `repeat(${DISPLAY_WIDTH}, ${this.displayScale}px)`;
      displayGrid.style.gridTemplateRows = `repeat(${DISPLAY_HEIGHT}, ${this.displayScale}px)`;
      
      // Draw each pixel
      for (let y = 0; y < DISPLAY_HEIGHT; y++) {
        for (let x = 0; x < DISPLAY_WIDTH; x++) {
          const pixel = document.createElement('div');
          pixel.style.width = `${this.displayScale}px`;
          pixel.style.height = `${this.displayScale}px`;
          
          // Set pixel color based on display memory
          if (this.chip8.display[y][x] === 1) {
            pixel.style.backgroundColor = 'white';
          } else {
            pixel.style.backgroundColor = 'black';
          }
          
          displayGrid.appendChild(pixel);
        }
      }
    }
  }