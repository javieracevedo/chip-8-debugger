document.addEventListener('DOMContentLoaded', () => {
    // Initialize memory grid (original functionality)
    const memoryColumnsSettingInput = document.querySelector("#memory-columns-setting");
    const memoryGrid = window.grid.createMemoryGrid(window.chip8.memory, Number(memoryColumnsSettingInput.value));
    window.grid.renderGrid(memoryGrid, 'memory-grid', 25);
  
    // Update memory grid when column settings change
    memoryColumnsSettingInput.addEventListener("input", (e) => {
      const memoryGrid = window.grid.createMemoryGrid(window.chip8.memory, Number(e.target.value));
      window.grid.renderGrid(memoryGrid, 'memory-grid', 25);
    });
  
    // Set up address jumping
    const addressInput = document.querySelector("#address");
    addressInput.addEventListener("keypress", (e) => {
      if (e.key == 'Enter') {
        const address = parseInt(e.target.value, 16);
        const cell = document.getElementById(address);
        if (cell) {
          cell.scrollIntoView();
        }
      }
    });
  
    // Initialize the chip8Debugger
    const chip8Debugger = new Chip8Debugger(window.chip8);
  
    // Set up automatic memory refresh based on emulation state
    function updateMemoryGrid() {
      const memoryGrid = window.grid.createMemoryGrid(window.chip8.memory, Number(memoryColumnsSettingInput.value));
      window.grid.renderGrid(memoryGrid, 'memory-grid', 25);
      
      // Request next frame if we're running
      if (chip8Debugger.running) {
        setTimeout(updateMemoryGrid, 500); // Update memory view every 500ms
      }
    }
  
    // Hook into run/pause to update memory view
    const originalToggleRun = chip8Debugger.toggleRun;
    chip8Debugger.toggleRun = function() {
      originalToggleRun.call(this);
      
      // Start memory updates if running
      if (this.running) {
        updateMemoryGrid();
      }
    };
  
    // Listen for step button to update memory view
    const originalStep = chip8Debugger.step;
    chip8Debugger.step = function() {
      originalStep.call(this);
      updateMemoryGrid();
    };
  
    // Create a simple custom ROM for testing if no ROM is loaded
    function createTestROM() {
      // Create a simple ROM that displays a sprite
      const testROM = new Uint8Array([
        0xA2, 0x02,  // Set I to point to the sprite data at address 0x202
        0x60, 0x0C,  // Set V0 to 12 (X coordinate)
        0x61, 0x08,  // Set V1 to 8 (Y coordinate)
        0xD0, 0x15,  // Draw 5-byte sprite at (V0, V1)
        0xF0, 0x0A,  // Wait for key press
        0x00, 0xE0,  // Clear screen
        0x12, 0x00,  // Jump back to beginning (0x200)
        
        // Sprite data at 0x202 (5 bytes)
        0xF0, 0x90, 0x90, 0x90, 0xF0  // "0" character
      ]);
      
      return testROM;
    }
  
    // Add "Load Test ROM" button
    const buttonsContainer = document.querySelector('.buttons-container');
    
    if (buttonsContainer) {
      const testROMButton = document.createElement('button');
      testROMButton.textContent = 'Load Test ROM';
      testROMButton.addEventListener('click', () => {
        // Reset the emulator
        chip8Debugger.reset();
        
        // Load the test ROM
        const testROM = createTestROM();
        window.chip8.loadROM(testROM);
        
        // Update the UI
        chip8Debugger.updateUI();
        updateMemoryGrid();
        
        console.log('Test ROM loaded successfully.');
      });
      
      buttonsContainer.appendChild(testROMButton);
    }
  });