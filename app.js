var app = angular.module("App", []);

app.controller('AppController', function( $filter, FileService, $timeout, $log, Debug, Memory, CPU, Disassemble, Screen ) {
    var vm = this;

    // provide access to HTML
    vm.Debug = Debug;
    vm.Memory = Memory;
    vm.CPU = CPU;
    vm.Disassemble = Disassemble;
    vm.RefreshScreen = RefreshScreen;
    vm.Screen = Screen;
    vm.SaveState = SaveState;
    vm.LoadState = LoadState;

    function SaveState(){
      vm.CPU.saveState();
      vm.Memory.saveState();
    }

    function LoadState(){
      vm.CPU.loadState();
      vm.Memory.loadState();
    }    

    // functions
    vm.step = step;
    vm.setRunTo = setRunTo;
    vm.pause = pause;
    vm.poke = poke;
    vm.run = run;





    // data
    vm.tab = 2;
    vm.orderBy = 'Name';
    vm.source = "a9 ff aa 9a a9 01 48 8d 00 02 a9 05 8d 01 02 a9 08 8d 02 02";



    vm.runToAddress = 0;
    vm.stepCount = 1;
    vm.totalSteps = 0;
    vm.WatchMemory = [];
    vm.MemoryRow = [];
    vm.LabelMap = [];

    vm.ScreenMemory = [];
    vm.ScreenRow = []

    vm.disassembleStart = CPU.registers.ProgramCounter;
    vm.disassembleCount = 100;
    


    Init();

    function Init(){
      reset();
      

      for(var i = 0; i <= 0xF; i++){
        vm.MemoryRow.push(i);
      }


      
      FileService.getFile('./data/labels.json')
        .then( function ( data){
          vm.LabelMap = data;
          return FileService.getBinaryFile('./roms/Kernel.rom');
        })
        .then( function (byteArray){
          loadProgram( 0xe000, byteArray ); // Kernel.rom
          return FileService.getBinaryFile('./roms/Basic.rom');
        })
        .then( function (byteArray){
          loadProgram( 0xc000, byteArray ); // Basic.rom
          return FileService.getBinaryFile('./roms/Char.rom');
        })
        .then( function (byteArray){
          loadProgram( 0x8000, byteArray ); // Char.rom
          disassemble(vm.disassembleCount);
          Screen.reset();
          Screen.refresh();
        })
        
        .catch(function (error) {
          console.log('Something went wrong', error);
        });
        
      
      //loadProgram(0xa000, [0x00, 0x00, 0x00, 0x00, 0x41, 0x30, 0xc3, 0xc2, 0xcd]); // simulate autorun cart
    }


    function disassemble(length){
      Disassemble.disassemble( CPU.registers.ProgramCounter, length );
      vm.disassembleStart = CPU.registers.ProgramCounter;
    }

    function reset(){
      Debug.reset();
      Memory.reset();
      CPU.reset();
      Debug.errorMsg = "";
    }

    function loadProgram( startAddress, program ){
      Debug.enable(false);
      for(var i = 0; i < program.length; i++ ){
        Memory.memArray[startAddress + i] = program[i] & 0xff;
        //Memory.write( startAddress + i, program[i] );
      }
    }

    vm.loadHexDump = function(){
      reset();
      if ( vm.source.includes(":") ){
        vm.source = removeLabels(vm.source);
      }

      let byteArray = [];
      let byteCount = 0;
      var byteCode = vm.source.split(" ");
      for ( let i = 0; i < byteCode.length; i++){
        if ( byteCode[i].length > 0 ){
          let hexNum = parseInt( "0x" + byteCode[i] );
          if ( isNaN(hexNum) ){
            Debug.errorMsg += "Bad hex value at " + i + ". ";
            hexNum = 0;
          }
          byteArray[byteCount++] = hexNum;
        }
      }
      CPU.registers.ProgramCounter = 0x600;
      loadProgram( CPU.registers.ProgramCounter, byteArray ); 
      disassemble(byteCount);
      //Disassemble.disassemble( CPU.registers.ProgramCounter, byteCount );
      vm.tab = 2; // switch to Debug tab
    }

    function removeLabels(hexdump){
      let retVal = "";
      let lines = hexdump.split("\n");
      for( let i = 0; i < lines.length; i++ ){
        let parts = lines[i].split(":");
        if ( parts.length == 2 ){
          retVal += parts[1].trim() + " ";
        }
        else{
          retVal += parts[0].trim() + " ";
        }
      }
      return retVal;
    }

    function RefreshScreen(){
      Screen.refresh();
    }

    function poke(){
      let address = parseInt( '0x' + vm.pokeAddress)
      Memory.write( address, parseInt(vm.pokeValue) );
    }
  

    function step(){
      Debug.reset();
      Debug.enable(true);

      var runToAddress = parseInt( '0x' + vm.runToAddress );
      vm.runToStep = Number(vm.totalSteps) + Number(vm.stepCount);
      while( vm.totalSteps < vm.runToStep ){
        vm.totalSteps++;
        CPU.stepInstruction();

        if ( runToAddress == CPU.registers.ProgramCounter ){
          vm.runToAddress = 0;
          break;
        }

      } // end of loop     

      if ( CPU.registers.ProgramCounter < vm.disassembleStart || CPU.registers.ProgramCounter > ( vm.disassembleStart + vm.disassembleCount ) ){
        disassemble(vm.disassembleCount);
        //Disassemble.disassemble( CPU.registers.ProgramCounter, vm.disassembleCount );
      }

      if ( runToAddress != 0 &&  runToAddress != CPU.registers.ProgramCounter ){
        $timeout( step );
      }
    }

    function run(){
      vm.runToAddress = -1;
      step();
    }

    function pause(){
      vm.runToAddress = 0;
    }

    function setRunTo( address ){
      return $filter('hex')(address, 16);
    }

    vm.checkRange = function(start, end, items ){
      var retVal = false;
      for( var i = 0; i < items.length; i++ ){
        if ( items[i] >= start && items[i] <= end ){
          retVal = true;
          break;
        }
      }
      return retVal;
    }

    vm.watch = function(){
      vm.WatchMemory = [];
      var startAddress = parseInt( '0x' + vm.memoryWatchStart);
      var endAddress = parseInt( '0x' + vm.memoryWatchEnd);
      if ( isNaN(endAddress) ){
        endAddress = startAddress;
      }
      if ( endAddress < startAddress){
        var tmp = startAddress;
        startAddress = endAddress;
        endAddress = tmp;
      }
      for( var i = startAddress; i <= endAddress; i+= 16){
        vm.WatchMemory.push(i);
      }
    }    


  });