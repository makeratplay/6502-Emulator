  function Memory(Debug) {
    // http://sleepingelephant.com/denial/wiki/index.php?title=Memory_Map

    //let memArray = new Array(0xffff);
    let memArray = new Uint8Array(0xffff);
    

    let RAM1 = [0x0400, 0x07FF]
    let RAM2 = [0x0800, 0x0BFF]
    let RAM3 = [0x0C00, 0x0FFF]
    let BLK1 = [0x2000, 0x3FFF];
    let BLK2 = [0x4000, 0x5FFF];
    let BLK3 = [0x6000, 0x7FFF];
    let BLK5 = [0xA000, 0xBFFF];
    let Basic_ROM = [0xC000, 0xDFFF];
    let Kernal_ROM = [0xE000, 0xFFFF];

    function write(address, value) {
      Debug.memoryWrite( address );
      if ( address >= Basic_ROM ){
        return;
      }

      // disable the following memory addresses
      if ( address >= RAM1[0] && address <= RAM1[1] ){
        return;
      }      
      if ( address >= RAM2[0] && address <= RAM2[1] ){
        return;
      }   
      if ( address >= RAM3[0] && address <= RAM3[1] ){
        return;
      }   
      if ( address >= BLK1[0] && address <= BLK1[1] ){
        return;
      }   
      if ( address >= BLK2[0] && address <= BLK2[1] ){
        return;
      }   
      if ( address >= BLK3[0] && address <= BLK3[1] ){
        return;
      }   
      if ( address >= BLK5[0] && address <= BLK5[1] ){
        return;
      }   
      if ( address >= Basic_ROM[0] && address <= Basic_ROM[1] ){
        return;
      }   
      if ( address >= Kernal_ROM[0] && address <= Kernal_ROM[1] ){
        return;
      }   

      memArray[address] = value & 0xff;
     
    }

    function reset() {
      for(var i = 0; i < 0xFFFF; i++){
        memArray[i] = 0x10000;
        //memArray[i] = (i + 1) & 0xFF;
      }
    }

    function read(address) {
      Debug.memoryRead( address );
      return memArray[address] & 0xFF;
    }

    function readWord(address) {
      Debug.memoryRead( address );
      Debug.memoryRead( address + 1);
      return read(address) + (read(address + 1) << 8);
    }

    function saveState(){
      localStorage.setItem("memory", JSON.stringify(memArray));
  }

  function loadState(){
      let savedData = JSON.parse(localStorage.getItem("memory"));
      savedData.forEach( (value, index) => memArray[index] = value );
  }

    return {
        reset : reset,
        write: write,
        read: read,
        readWord: readWord,
        memArray : memArray,
        saveState : saveState, 
        loadState : loadState
    };
  }

  angular.module("App").service("Memory", Memory);