var app = angular.module("App", []);

app.controller('AppController', function( $filter, FileService, $timeout, $log ) {
    var vm = this;

    vm.step = step;
    vm.setRunTo = setRunTo;

    vm.Registers = {};
    vm.Registers.ProgramCounter = 0xfd22;
    vm.Registers.StackPointer = 0xfffff;
    vm.Registers.Accumulator = 0xfffff;
    vm.Registers.IndexRegisterX = 0xfffff;
    vm.Registers.IndexRegisterY = 0xfffff;

    vm.Registers.CarryFlag = 0;
    vm.Registers.ZeroFlag = 0;
    vm.Registers.InterruptDisable = 0;
    vm.Registers.DecimalMode = 0;
    vm.Registers.OverflowFlag = 0;
    vm.Registers.NegativeFlag = 0;

    vm.stepCount = 1;
    vm.totalSteps = 0;
    vm.Registers.BreakCommand = 0;
    vm.Stack = [];
    vm.ZeroPage = [];
    vm.WatchMemory = [];
    vm.StackMemory = [];

    vm.disassembleStart = vm.Registers.ProgramCounter;
    vm.disassembleCount = 100;
    
    
    vm.AssemblyCode = [];
    vm.Memory = [];
    vm.MemoryRow = [];

    vm.memoryMap = [
      { Start : 0x0000, End : 0x00ff, Name : 'Zeropage', Block : 0, class : 'zeropage' },
      { Start : 0x0100, End : 0x01ff, Name : 'Stack',    Block : 0, class : 'stack' },
      { Start : 0x0200, End : 0x03ff, Name : 'KERNAL/BASIC working area', Block : 0 },
      { Start : 0x0400, End : 0x07ff, Name : 'RAM1', Block : 0 },
      { Start : 0x0800, End : 0x0bff, Name : 'RAM2', Block : 0 },
      { Start : 0x0c00, End : 0x0fff, Name : 'RAM3', Block : 0 },
      { Start : 0x1000, End : 0x1fff, Name : 'Main RAM', Block : 0 },
      { Start : 0x2000, End : 0x3fff, Name : 'BLK1', Block : 1 },
      { Start : 0x4000, End : 0x5fff, Name : 'BLK2', Block : 2 },
      { Start : 0x6000, End : 0x7fff, Name : 'BLK3', Block : 3 },

      { Start : 0x8000, End : 0x8fff, Name : 'Character ROM', Block : 4 },
      { Start : 0x9000, End : 0x900f, Name : 'VIC Chip Registers', Block : 4 },
      { Start : 0x9110, End : 0x911f, Name : 'VIA Chip #1 Registers', Block : 4 },
      { Start : 0x9120, End : 0x912f, Name : 'VIA Chip #2 Registers', Block : 4 },
      { Start : 0x9400, End : 0x97ff, Name : 'Color RAM', Block : 4 },
      { Start : 0x9800, End : 0x9bff, Name : 'I/O2', Block : 4 },
      { Start : 0x9c00, End : 0x9fff, Name : 'I/O3', Block : 4 },

      { Start : 0xa000, End : 0xbfff, Name : 'BLK5', Block : 5 },

      { Start : 0xc000, End : 0xdfff, Name : 'BASIC ROM', Block : 6 },
      { Start : 0xe000, End : 0xffff, Name : 'KERNAL ROM', Block : 7 }
    ]
     
    vm.LabelMap = [];

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

    //#region OpCodes
    vm.OpCodes = [];
    vm.OpCodes[0x6D] = { Name : "ADC", OpCode : 0x6D, Length : 3, Mode : 'Absolute',  Flags : 'N V Z C', Descripton : 'ADd with Carry' };
    vm.OpCodes[0x7D] = { Name : "ADC", OpCode : 0x7D, Length : 3, Mode : 'Absolute,X',  Flags : 'N V Z C', Descripton : 'ADd with Carry' };
    vm.OpCodes[0x79] = { Name : "ADC", OpCode : 0x79, Length : 3, Mode : 'Absolute,Y',  Flags : 'N V Z C', Descripton : 'ADd with Carry' };
    vm.OpCodes[0x69] = { Name : "ADC", OpCode : 0x69, Length : 2, Mode : 'Immediate',  Flags : 'N V Z C', Descripton : 'ADd with Carry' };
    vm.OpCodes[0x61] = { Name : "ADC", OpCode : 0x61, Length : 2, Mode : 'Indirect,X',  Flags : 'N V Z C', Descripton : 'ADd with Carry' };
    vm.OpCodes[0x71] = { Name : "ADC", OpCode : 0x71, Length : 2, Mode : 'Indirect,Y',  Flags : 'N V Z C', Descripton : 'ADd with Carry' };
    vm.OpCodes[0x65] = { Name : "ADC", OpCode : 0x65, Length : 2, Mode : 'Zero Page',  Flags : 'N V Z C', Descripton : 'ADd with Carry' };
    vm.OpCodes[0x75] = { Name : "ADC", OpCode : 0x75, Length : 2, Mode : 'Zero Page,X',  Flags : 'N V Z C', Descripton : 'ADd with Carry' };
    vm.OpCodes[0x2D] = { Name : "AND", OpCode : 0x2D, Length : 3, Mode : 'Absolute',  Flags : 'N Z', Descripton : 'bitwise AND with accumulator' };
    vm.OpCodes[0x3D] = { Name : "AND", OpCode : 0x3D, Length : 3, Mode : 'Absolute,X',  Flags : 'N Z', Descripton : 'bitwise AND with accumulator' };
    vm.OpCodes[0x39] = { Name : "AND", OpCode : 0x39, Length : 3, Mode : 'Absolute,Y',  Flags : 'N Z', Descripton : 'bitwise AND with accumulator' };
    vm.OpCodes[0x29] = { Name : "AND", OpCode : 0x29, Length : 2, Mode : 'Immediate',  Flags : 'N Z', Descripton : 'bitwise AND with accumulator' };
    vm.OpCodes[0x21] = { Name : "AND", OpCode : 0x21, Length : 2, Mode : 'Indirect,X',  Flags : 'N Z', Descripton : 'bitwise AND with accumulator' };
    vm.OpCodes[0x31] = { Name : "AND", OpCode : 0x31, Length : 2, Mode : 'Indirect,Y',  Flags : 'N Z', Descripton : 'bitwise AND with accumulator' };
    vm.OpCodes[0x25] = { Name : "AND", OpCode : 0x25, Length : 2, Mode : 'Zero Page',  Flags : 'N Z', Descripton : 'bitwise AND with accumulator' };
    vm.OpCodes[0x35] = { Name : "AND", OpCode : 0x35, Length : 2, Mode : 'Zero Page,X',  Flags : 'N Z', Descripton : 'bitwise AND with accumulator' };
    vm.OpCodes[0x0E] = { Name : "ASL", OpCode : 0x0E, Length : 3, Mode : 'Absolute',  Flags : 'N Z C', Descripton : 'Arithmetic Shift Left' };
    vm.OpCodes[0x1E] = { Name : "ASL", OpCode : 0x1E, Length : 3, Mode : 'Absolute,X',  Flags : 'N Z C', Descripton : 'Arithmetic Shift Left' };
    vm.OpCodes[0x0A] = { Name : "ASL", OpCode : 0x0A, Length : 1, Mode : 'Accumulator',  Flags : 'N Z C', Descripton : 'Arithmetic Shift Left' };
    vm.OpCodes[0x06] = { Name : "ASL", OpCode : 0x06, Length : 2, Mode : 'Zero Page',  Flags : 'N Z C', Descripton : 'Arithmetic Shift Left' };
    vm.OpCodes[0x16] = { Name : "ASL", OpCode : 0x16, Length : 2, Mode : 'Zero Page,X',  Flags : 'N Z C', Descripton : 'Arithmetic Shift Left' };
    vm.OpCodes[0x90] = { Name : "BCC", OpCode : 0x90, Length : 2, Mode : 'Relative',  Flags : '', Descripton : 'Branch on Carry Clear' };
    vm.OpCodes[0xB0] = { Name : "BCS", OpCode : 0xB0, Length : 2, Mode : 'Relative',  Flags : '', Descripton : 'Branch on Carry Set' };
    vm.OpCodes[0xF0] = { Name : "BEQ", OpCode : 0xF0, Length : 2, Mode : 'Relative',  Flags : '', Descripton : 'Branch on Equal' };
    vm.OpCodes[0x2C] = { Name : "BIT", OpCode : 0x2C, Length : 3, Mode : 'Absolute',  Flags : 'N V Z', Descripton : 'test BITs' };
    vm.OpCodes[0x24] = { Name : "BIT", OpCode : 0x24, Length : 2, Mode : 'Zero Page',  Flags : 'N V Z', Descripton : 'test BITs' };
    vm.OpCodes[0x30] = { Name : "BMI", OpCode : 0x30, Length : 2, Mode : 'Relative',  Flags : '', Descripton : 'Branch on Minus' };
    vm.OpCodes[0xD0] = { Name : "BNE", OpCode : 0xD0, Length : 2, Mode : 'Relative',  Flags : '', Descripton : 'Branch on Not Equal' };
    vm.OpCodes[0x10] = { Name : "BPL", OpCode : 0x10, Length : 2, Mode : 'Relative',  Flags : '', Descripton : 'Branch on Plus' };
    vm.OpCodes[0x00] = { Name : "BRK", OpCode : 0x00, Length : 1, Mode : 'Implied',  Flags : 'B', Descripton : 'BReaK' };
    vm.OpCodes[0x50] = { Name : "BVC", OpCode : 0x50, Length : 2, Mode : 'Relative',  Flags : '', Descripton : 'Branch on oVerflow Clear' };
    vm.OpCodes[0x70] = { Name : "BVS", OpCode : 0x70, Length : 2, Mode : 'Relative',  Flags : '', Descripton : 'Branch on oVerflow Set' };
    vm.OpCodes[0xCD] = { Name : "CMP", OpCode : 0xCD, Length : 3, Mode : 'Absolute',  Flags : 'N Z C', Descripton : 'CoMPare accumulator' };
    vm.OpCodes[0xDD] = { Name : "CMP", OpCode : 0xDD, Length : 3, Mode : 'Absolute,X',  Flags : 'N Z C', Descripton : 'CoMPare accumulator' };
    vm.OpCodes[0xD9] = { Name : "CMP", OpCode : 0xD9, Length : 3, Mode : 'Absolute,Y',  Flags : 'N Z C', Descripton : 'CoMPare accumulator' };
    vm.OpCodes[0xC9] = { Name : "CMP", OpCode : 0xC9, Length : 2, Mode : 'Immediate',  Flags : 'N Z C', Descripton : 'CoMPare accumulator' };
    vm.OpCodes[0xC1] = { Name : "CMP", OpCode : 0xC1, Length : 2, Mode : 'Indirect,X',  Flags : 'N Z C', Descripton : 'CoMPare accumulator' };
    vm.OpCodes[0xD1] = { Name : "CMP", OpCode : 0xD1, Length : 2, Mode : 'Indirect,Y',  Flags : 'N Z C', Descripton : 'CoMPare accumulator' };
    vm.OpCodes[0xC5] = { Name : "CMP", OpCode : 0xC5, Length : 2, Mode : 'Zero Page',  Flags : 'N Z C', Descripton : 'CoMPare accumulator' };
    vm.OpCodes[0xD5] = { Name : "CMP", OpCode : 0xD5, Length : 2, Mode : 'Zero Page,X',  Flags : 'N Z C', Descripton : 'CoMPare accumulator' };
    vm.OpCodes[0xEC] = { Name : "CPX", OpCode : 0xEC, Length : 3, Mode : 'Absolute',  Flags : 'N Z C', Descripton : 'ComPare X register' };
    vm.OpCodes[0xE0] = { Name : "CPX", OpCode : 0xE0, Length : 2, Mode : 'Immediate',  Flags : 'N Z C', Descripton : 'ComPare X register' };
    vm.OpCodes[0xE4] = { Name : "CPX", OpCode : 0xE4, Length : 2, Mode : 'Zero Page',  Flags : 'N Z C', Descripton : 'ComPare X register' };
    vm.OpCodes[0xCC] = { Name : "CPY", OpCode : 0xCC, Length : 3, Mode : 'Absolute',  Flags : 'N Z C', Descripton : 'ComPare Y register' };
    vm.OpCodes[0xC0] = { Name : "CPY", OpCode : 0xC0, Length : 2, Mode : 'Immediate',  Flags : 'N Z C', Descripton : 'ComPare Y register' };
    vm.OpCodes[0xC4] = { Name : "CPY", OpCode : 0xC4, Length : 2, Mode : 'Zero Page',  Flags : 'N Z C', Descripton : 'ComPare Y register' };
    vm.OpCodes[0xCE] = { Name : "DEC", OpCode : 0xCE, Length : 3, Mode : 'Absolute',  Flags : 'N Z', Descripton : 'DECrement memory' };
    vm.OpCodes[0xDE] = { Name : "DEC", OpCode : 0xDE, Length : 3, Mode : 'Absolute,X',  Flags : 'N Z', Descripton : 'DECrement memory' };
    vm.OpCodes[0xC6] = { Name : "DEC", OpCode : 0xC6, Length : 2, Mode : 'Zero Page',  Flags : 'N Z', Descripton : 'DECrement memory' };
    vm.OpCodes[0xD6] = { Name : "DEC", OpCode : 0xD6, Length : 2, Mode : 'Zero Page,X',  Flags : 'N Z', Descripton : 'DECrement memory' };
    vm.OpCodes[0xCA] = { Name : "DEX", OpCode : 0xCA, Length : 1, Mode : 'Implied',  Flags : 'N Z', Descripton : 'DEcrement X' };
    vm.OpCodes[0x88] = { Name : "DEY", OpCode : 0x88, Length : 1, Mode : 'Implied',  Flags : 'N Z', Descripton : 'DEcrement Y' };
    vm.OpCodes[0x4D] = { Name : "EOR", OpCode : 0x4D, Length : 3, Mode : 'Absolute',  Flags : 'N Z', Descripton : 'bitwise Exclusive OR' };
    vm.OpCodes[0x5D] = { Name : "EOR", OpCode : 0x5D, Length : 3, Mode : 'Absolute,X',  Flags : 'N Z', Descripton : 'bitwise Exclusive OR' };
    vm.OpCodes[0x59] = { Name : "EOR", OpCode : 0x59, Length : 3, Mode : 'Absolute,Y',  Flags : 'N Z', Descripton : 'bitwise Exclusive OR' };
    vm.OpCodes[0x49] = { Name : "EOR", OpCode : 0x49, Length : 2, Mode : 'Immediate',  Flags : 'N Z', Descripton : 'bitwise Exclusive OR' };
    vm.OpCodes[0x41] = { Name : "EOR", OpCode : 0x41, Length : 2, Mode : 'Indirect,X',  Flags : 'N Z', Descripton : 'bitwise Exclusive OR' };
    vm.OpCodes[0x51] = { Name : "EOR", OpCode : 0x51, Length : 2, Mode : 'Indirect,Y',  Flags : 'N Z', Descripton : 'bitwise Exclusive OR' };
    vm.OpCodes[0x45] = { Name : "EOR", OpCode : 0x45, Length : 2, Mode : 'Zero Page',  Flags : 'N Z', Descripton : 'bitwise Exclusive OR' };
    vm.OpCodes[0x55] = { Name : "EOR", OpCode : 0x55, Length : 2, Mode : 'Zero Page,X',  Flags : 'N Z', Descripton : 'bitwise Exclusive OR' };
    vm.OpCodes[0xEE] = { Name : "INC", OpCode : 0xEE, Length : 3, Mode : 'Absolute',  Flags : 'N Z', Descripton : 'INCrement memory' };
    vm.OpCodes[0xFE] = { Name : "INC", OpCode : 0xFE, Length : 3, Mode : 'Absolute,X',  Flags : 'N Z', Descripton : 'INCrement memory' };
    vm.OpCodes[0xE6] = { Name : "INC", OpCode : 0xE6, Length : 2, Mode : 'Zero Page',  Flags : 'N Z', Descripton : 'INCrement memory' };
    vm.OpCodes[0xF6] = { Name : "INC", OpCode : 0xF6, Length : 2, Mode : 'Zero Page,X',  Flags : 'N Z', Descripton : 'INCrement memory' };
    vm.OpCodes[0xE8] = { Name : "INX", OpCode : 0xE8, Length : 1, Mode : 'Implied',  Flags : 'N Z', Descripton : 'INcrement X' };
    vm.OpCodes[0xC8] = { Name : "INY", OpCode : 0xC8, Length : 1, Mode : 'Implied',  Flags : 'N Z', Descripton : 'INcrement Y' };
    vm.OpCodes[0x4C] = { Name : "JMP", OpCode : 0x4C, Length : 3, Mode : 'Absolute',  Flags : '', Descripton : 'JuMP' };
    vm.OpCodes[0x6C] = { Name : "JMP", OpCode : 0x6C, Length : 3, Mode : 'Indirect',  Flags : '', Descripton : 'JuMP' };
    vm.OpCodes[0x20] = { Name : "JSR", OpCode : 0x20, Length : 3, Mode : 'Absolute',  Flags : '', Descripton : 'Jump to SubRoutine' };
    vm.OpCodes[0xAD] = { Name : "LDA", OpCode : 0xAD, Length : 3, Mode : 'Absolute',  Flags : 'N Z', Descripton : 'LoaD Accumulator' };
    vm.OpCodes[0xBD] = { Name : "LDA", OpCode : 0xBD, Length : 3, Mode : 'Absolute,X',  Flags : 'N Z', Descripton : 'LoaD Accumulator' };
    vm.OpCodes[0xB9] = { Name : "LDA", OpCode : 0xB9, Length : 3, Mode : 'Absolute,Y',  Flags : 'N Z', Descripton : 'LoaD Accumulator' };
    vm.OpCodes[0xA9] = { Name : "LDA", OpCode : 0xA9, Length : 2, Mode : 'Immediate',  Flags : 'N Z', Descripton : 'LoaD Accumulator' };
    vm.OpCodes[0xA1] = { Name : "LDA", OpCode : 0xA1, Length : 2, Mode : 'Indirect,X',  Flags : 'N Z', Descripton : 'LoaD Accumulator' };
    vm.OpCodes[0xB1] = { Name : "LDA", OpCode : 0xB1, Length : 2, Mode : 'Indirect,Y',  Flags : 'N Z', Descripton : 'LoaD Accumulator' };
    vm.OpCodes[0xA5] = { Name : "LDA", OpCode : 0xA5, Length : 2, Mode : 'Zero Page',  Flags : 'N Z', Descripton : 'LoaD Accumulator' };
    vm.OpCodes[0xB5] = { Name : "LDA", OpCode : 0xB5, Length : 2, Mode : 'Zero Page,X',  Flags : 'N Z', Descripton : 'LoaD Accumulator' };
    vm.OpCodes[0xAE] = { Name : "LDX", OpCode : 0xAE, Length : 3, Mode : 'Absolute',  Flags : 'N Z', Descripton : 'LoaD X register' };
    vm.OpCodes[0xBE] = { Name : "LDX", OpCode : 0xBE, Length : 3, Mode : 'Absolute,Y',  Flags : 'N Z', Descripton : 'LoaD X register' };
    vm.OpCodes[0xA2] = { Name : "LDX", OpCode : 0xA2, Length : 2, Mode : 'Immediate',  Flags : 'N Z', Descripton : 'LoaD X register' };
    vm.OpCodes[0xA6] = { Name : "LDX", OpCode : 0xA6, Length : 2, Mode : 'Zero Page',  Flags : 'N Z', Descripton : 'LoaD X register' };
    vm.OpCodes[0xB6] = { Name : "LDX", OpCode : 0xB6, Length : 2, Mode : 'Zero Page,Y',  Flags : 'N Z', Descripton : 'LoaD X register' };
    vm.OpCodes[0xAC] = { Name : "LDY", OpCode : 0xAC, Length : 3, Mode : 'Absolute',  Flags : 'N Z', Descripton : 'LoaD Y register' };
    vm.OpCodes[0xBC] = { Name : "LDY", OpCode : 0xBC, Length : 3, Mode : 'Absolute,X',  Flags : 'N Z', Descripton : 'LoaD Y register' };
    vm.OpCodes[0xA0] = { Name : "LDY", OpCode : 0xA0, Length : 2, Mode : 'Immediate',  Flags : 'N Z', Descripton : 'LoaD Y register' };
    vm.OpCodes[0xA4] = { Name : "LDY", OpCode : 0xA4, Length : 2, Mode : 'Zero Page',  Flags : 'N Z', Descripton : 'LoaD Y register' };
    vm.OpCodes[0xB4] = { Name : "LDY", OpCode : 0xB4, Length : 2, Mode : 'Zero Page,X',  Flags : 'N Z', Descripton : 'LoaD Y register' };
    vm.OpCodes[0x4E] = { Name : "LSR", OpCode : 0x4E, Length : 3, Mode : 'Absolute',  Flags : 'N Z C', Descripton : 'Logical Shift Right' };
    vm.OpCodes[0x5E] = { Name : "LSR", OpCode : 0x5E, Length : 3, Mode : 'Absolute,X',  Flags : 'N Z C', Descripton : 'Logical Shift Right' };
    vm.OpCodes[0x4A] = { Name : "LSR", OpCode : 0x4A, Length : 1, Mode : 'Accumulator',  Flags : 'N Z C', Descripton : 'Logical Shift Right' };
    vm.OpCodes[0x46] = { Name : "LSR", OpCode : 0x46, Length : 2, Mode : 'Zero Page',  Flags : 'N Z C', Descripton : 'Logical Shift Right' };
    vm.OpCodes[0x56] = { Name : "LSR", OpCode : 0x56, Length : 2, Mode : 'Zero Page,X',  Flags : 'N Z C', Descripton : 'Logical Shift Right' };
    vm.OpCodes[0xEA] = { Name : "NOP", OpCode : 0xEA, Length : 1, Mode : 'Implied',  Flags : '', Descripton : 'No Operation' };
    vm.OpCodes[0x0D] = { Name : "ORA", OpCode : 0x0D, Length : 3, Mode : 'Absolute',  Flags : 'N Z', Descripton : 'bitwise OR with Accumulator' };
    vm.OpCodes[0x1D] = { Name : "ORA", OpCode : 0x1D, Length : 3, Mode : 'Absolute,X',  Flags : 'N Z', Descripton : 'bitwise OR with Accumulator' };
    vm.OpCodes[0x19] = { Name : "ORA", OpCode : 0x19, Length : 3, Mode : 'Absolute,Y',  Flags : 'N Z', Descripton : 'bitwise OR with Accumulator' };
    vm.OpCodes[0x09] = { Name : "ORA", OpCode : 0x09, Length : 2, Mode : 'Immediate',  Flags : 'N Z', Descripton : 'bitwise OR with Accumulator' };
    vm.OpCodes[0x01] = { Name : "ORA", OpCode : 0x01, Length : 2, Mode : 'Indirect,X',  Flags : 'N Z', Descripton : 'bitwise OR with Accumulator' };
    vm.OpCodes[0x11] = { Name : "ORA", OpCode : 0x11, Length : 2, Mode : 'Indirect,Y',  Flags : 'N Z', Descripton : 'bitwise OR with Accumulator' };
    vm.OpCodes[0x05] = { Name : "ORA", OpCode : 0x05, Length : 2, Mode : 'Zero Page',  Flags : 'N Z', Descripton : 'bitwise OR with Accumulator' };
    vm.OpCodes[0x15] = { Name : "ORA", OpCode : 0x15, Length : 2, Mode : 'Zero Page,X',  Flags : 'N Z', Descripton : 'bitwise OR with Accumulator' };
    vm.OpCodes[0x48] = { Name : "PHA", OpCode : 0x48, Length : 1, Mode : 'Implied',  Flags : '', Descripton : 'PusH Accumulator' };
    vm.OpCodes[0x08] = { Name : "PHP", OpCode : 0x08, Length : 1, Mode : 'Implied',  Flags : '', Descripton : 'PusH Processor status' };
    vm.OpCodes[0x68] = { Name : "PLA", OpCode : 0x68, Length : 1, Mode : 'Implied',  Flags : '', Descripton : 'PuLl Accumulator' };
    vm.OpCodes[0x28] = { Name : "PLP", OpCode : 0x28, Length : 1, Mode : 'Implied',  Flags : '', Descripton : 'PuLl Processor status' };
    vm.OpCodes[0x2E] = { Name : "ROL", OpCode : 0x2E, Length : 3, Mode : 'Absolute',  Flags : 'N Z C', Descripton : 'ROtate Left' };
    vm.OpCodes[0x3E] = { Name : "ROL", OpCode : 0x3E, Length : 3, Mode : 'Absolute,X',  Flags : 'N Z C', Descripton : 'ROtate Left' };
    vm.OpCodes[0x2A] = { Name : "ROL", OpCode : 0x2A, Length : 1, Mode : 'Accumulator',  Flags : 'N Z C', Descripton : 'ROtate Left' };
    vm.OpCodes[0x26] = { Name : "ROL", OpCode : 0x26, Length : 2, Mode : 'Zero Page',  Flags : 'N Z C', Descripton : 'ROtate Left' };
    vm.OpCodes[0x36] = { Name : "ROL", OpCode : 0x36, Length : 2, Mode : 'Zero Page,X',  Flags : 'N Z C', Descripton : 'ROtate Left' };
    vm.OpCodes[0x6E] = { Name : "ROR", OpCode : 0x6E, Length : 3, Mode : 'Absolute',  Flags : 'N Z C', Descripton : 'ROtate Right' };
    vm.OpCodes[0x7E] = { Name : "ROR", OpCode : 0x7E, Length : 3, Mode : 'Absolute,X',  Flags : 'N Z C', Descripton : 'ROtate Right' };
    vm.OpCodes[0x6A] = { Name : "ROR", OpCode : 0x6A, Length : 1, Mode : 'Accumulator',  Flags : 'N Z C', Descripton : 'ROtate Right' };
    vm.OpCodes[0x66] = { Name : "ROR", OpCode : 0x66, Length : 2, Mode : 'Zero Page',  Flags : 'N Z C', Descripton : 'ROtate Right' };
    vm.OpCodes[0x76] = { Name : "ROR", OpCode : 0x76, Length : 2, Mode : 'Zero Page,X',  Flags : 'N Z C', Descripton : 'ROtate Right' };
    vm.OpCodes[0x40] = { Name : "RTI", OpCode : 0x40, Length : 1, Mode : 'Implied',  Flags : 'All', Descripton : 'ReTurn from Interrupt' };
    vm.OpCodes[0x60] = { Name : "RTS", OpCode : 0x60, Length : 1, Mode : 'Implied',  Flags : '', Descripton : 'ReTurn from Subroutine' };
    vm.OpCodes[0xED] = { Name : "SBC", OpCode : 0xED, Length : 3, Mode : 'Absolute',  Flags : 'N V Z C', Descripton : 'SuBtract with Carry' };
    vm.OpCodes[0xFD] = { Name : "SBC", OpCode : 0xFD, Length : 3, Mode : 'Absolute,X',  Flags : 'N V Z C', Descripton : 'SuBtract with Carry' };
    vm.OpCodes[0xF9] = { Name : "SBC", OpCode : 0xF9, Length : 3, Mode : 'Absolute,Y',  Flags : 'N V Z C', Descripton : 'SuBtract with Carry' };
    vm.OpCodes[0xE9] = { Name : "SBC", OpCode : 0xE9, Length : 2, Mode : 'Immediate',  Flags : 'N V Z C', Descripton : 'SuBtract with Carry' };
    vm.OpCodes[0xE1] = { Name : "SBC", OpCode : 0xE1, Length : 2, Mode : 'Indirect,X',  Flags : 'N V Z C', Descripton : 'SuBtract with Carry' };
    vm.OpCodes[0xF1] = { Name : "SBC", OpCode : 0xF1, Length : 2, Mode : 'Indirect,Y',  Flags : 'N V Z C', Descripton : 'SuBtract with Carry' };
    vm.OpCodes[0xE5] = { Name : "SBC", OpCode : 0xE5, Length : 2, Mode : 'Zero Page',  Flags : 'N V Z C', Descripton : 'SuBtract with Carry' };
    vm.OpCodes[0xF5] = { Name : "SBC", OpCode : 0xF5, Length : 2, Mode : 'Zero Page,X',  Flags : 'N V Z C', Descripton : 'SuBtract with Carry' };
    vm.OpCodes[0x8D] = { Name : "STA", OpCode : 0x8D, Length : 3, Mode : 'Absolute',  Flags : '', Descripton : 'STore Accumulator' };
    vm.OpCodes[0x9D] = { Name : "STA", OpCode : 0x9D, Length : 3, Mode : 'Absolute,X',  Flags : '', Descripton : 'STore Accumulator' };
    vm.OpCodes[0x99] = { Name : "STA", OpCode : 0x99, Length : 3, Mode : 'Absolute,Y',  Flags : '', Descripton : 'STore Accumulator' };
    vm.OpCodes[0x81] = { Name : "STA", OpCode : 0x81, Length : 2, Mode : 'Indirect,X',  Flags : '', Descripton : 'STore Accumulator' };
    vm.OpCodes[0x91] = { Name : "STA", OpCode : 0x91, Length : 2, Mode : 'Indirect,Y',  Flags : '', Descripton : 'STore Accumulator' };
    vm.OpCodes[0x85] = { Name : "STA", OpCode : 0x85, Length : 2, Mode : 'Zero Page',  Flags : '', Descripton : 'STore Accumulator' };
    vm.OpCodes[0x95] = { Name : "STA", OpCode : 0x95, Length : 2, Mode : 'Zero Page,X',  Flags : '', Descripton : 'STore Accumulator' };
    vm.OpCodes[0x8E] = { Name : "STX", OpCode : 0x8E, Length : 3, Mode : 'Absolute',  Flags : '', Descripton : 'STore X register' };
    vm.OpCodes[0x86] = { Name : "STX", OpCode : 0x86, Length : 2, Mode : 'Zero Page',  Flags : '', Descripton : 'STore X register' };
    vm.OpCodes[0x96] = { Name : "STX", OpCode : 0x96, Length : 2, Mode : 'Zero Page,Y',  Flags : '', Descripton : 'STore X register' };
    vm.OpCodes[0x8C] = { Name : "STY", OpCode : 0x8C, Length : 3, Mode : 'Absolute',  Flags : '', Descripton : 'STore Y register' };
    vm.OpCodes[0x84] = { Name : "STY", OpCode : 0x84, Length : 2, Mode : 'Zero Page',  Flags : '', Descripton : 'STore Y register' };
    vm.OpCodes[0x94] = { Name : "STY", OpCode : 0x94, Length : 2, Mode : 'Zero Page,X',  Flags : '', Descripton : 'STore Y register' };
    vm.OpCodes[0xAA] = { Name : "TAX", OpCode : 0xAA, Length : 1, Mode : 'Implied',  Flags : 'N Z', Descripton : 'Transfer A to X' };
    vm.OpCodes[0xA8] = { Name : "TAY", OpCode : 0xA8, Length : 1, Mode : 'Implied',  Flags : 'N Z', Descripton : 'Transfer A to Y' };
    vm.OpCodes[0xBA] = { Name : "TSX", OpCode : 0xBA, Length : 1, Mode : 'Implied',  Flags : '', Descripton : 'Transfer Stack ptr to X' };
    vm.OpCodes[0x8A] = { Name : "TXA", OpCode : 0x8A, Length : 1, Mode : 'Implied',  Flags : 'N Z', Descripton : 'Transfer X to A' };
    vm.OpCodes[0x9A] = { Name : "TXS", OpCode : 0x9A, Length : 1, Mode : 'Implied',  Flags : '', Descripton : 'Transfer X to Stack ptr' };
    vm.OpCodes[0x98] = { Name : "TYA", OpCode : 0x98, Length : 1, Mode : 'Implied',  Flags : 'N Z', Descripton : 'Transfer Y to A' };
    vm.OpCodes[0x18] = { Name : "CLC", OpCode : 0x18, Length : 1, Mode : 'Implied',  Flags : '', Descripton : 'CLear Carry' };
    vm.OpCodes[0x38] = { Name : "SEC", OpCode : 0x38, Length : 1, Mode : 'Implied',  Flags : '', Descripton : 'SEt Carry' };
    vm.OpCodes[0x58] = { Name : "CLI", OpCode : 0x58, Length : 1, Mode : 'Implied',  Flags : '', Descripton : 'CLear Interrupt' };
    vm.OpCodes[0x78] = { Name : "SEI", OpCode : 0x78, Length : 1, Mode : 'Implied',  Flags : '', Descripton : 'SEt Interrupt' };
    vm.OpCodes[0xB8] = { Name : "CLV", OpCode : 0xB8, Length : 1, Mode : 'Implied',  Flags : '', Descripton : 'CLear oVerflow' };
    vm.OpCodes[0xD8] = { Name : "CLD", OpCode : 0xD8, Length : 1, Mode : 'Implied',  Flags : '', Descripton : 'CLear Decimal' };
    vm.OpCodes[0xF8] = { Name : "SED", OpCode : 0xF8, Length : 1, Mode : 'Implied',  Flags : '', Descripton : 'SEt Decimal' };
    
    

    //vm.OpCodes[0x{3}] = {{ Name : "{1}", OpCode : 0x{3}, Length : {4}, Mode : '{0}',  Flags : '{5}', Descripton : '{6}' }}; 
    //#endregion

    vm.startAddress = 0xfd22;

    $(function () {
      $('[data-toggle="tooltip"]').tooltip()
    })




    Init();

    function Init(){
      clearChangedFlags();

      /*
      for( var t = 0; t <= 0xff; t++ ){
        vm.Registers.CarryFlag = false;
        twoComplement = ~1 + 1;
        ALU( t , twoComplement );
        var output = t + ' - 1 = ' + vm.Registers.Accumulator + ' ';
        if ( vm.Registers.CarryFlag ){
          output += 'Carry ';
        }
        if ( vm.Registers.ZeroFlag ){
          output += 'Zero ';
        }
        if ( vm.Registers.NegativeFlag ){
          output += 'Negative ';
        }
        if ( vm.Registers.OverflowFlag ){
          output += 'Overflow ';
        }                

        console.log( output );
      }
      return;
      */

      for(var i = 0; i <= 0xF; i++){
        vm.MemoryRow.push(i);
      }
      

      for(var i = 0; i < 0xFFFF; i++){
          vm.Memory[i] = 0x10000;
      }

   //   for( var i = 0x01ff; i >= 0x0100; i-- ){
   //     vm.StackMemory.push(i);
   //   }

      FileService.getFile('./data/labels.json')
        .then( function ( data){
          vm.LabelMap = data;
          return FileService.getBinaryFile('./roms/Kernel.rom');
        })
        .then(function (byteArray){
          loadProgram( 0xe000, byteArray ); // Kernel.rom
          return FileService.getBinaryFile('./roms/Basic.rom');
        })
        .then(function (byteArray){
          loadProgram( 0xc000, byteArray ); // Basic.rom
          return FileService.getBinaryFile('./roms/Char.rom');
        })
        .then(function (byteArray){
          loadProgram( 0x8000, byteArray ); // 'Char.rom'
          disassemble( vm.Registers.ProgramCounter, vm.Registers.ProgramCounter + vm.disassembleCount );
        })
        .catch(function (error) {
          console.log('Something went wrong', error);
        });

      
      //loadProgram(0xa000, [0x00, 0x00, 0x00, 0x00, 0x41, 0x30, 0xc3, 0xc2, 0xcd]);
    }

    function loadProgram( startAddress, program ){
      for(var i = 0; i < program.length; i++ ){
        vm.Memory[ startAddress + i] = program[i];
      }
    }

    function disassemble( startAddress, endAddress ){
      vm.disassembleStart = startAddress;
      vm.AssemblyCode = [];
      for( var i = startAddress; i < endAddress; ){
        var value = vm.Memory[i];

        var codeLine = {};
        codeLine.OpCode = vm.OpCodes[value];
        if ( codeLine.OpCode == null){
          codeLine.OpCode = { Name :  $filter('hex')(value), OpCode : value, Length : 1, Mode : 'Implied',  Flags : '', Descripton : 'Data' };
        }

        codeLine.Address = i;

        var label = null; //_.find(vm.LabelMap, function(o) { o.Address == codeLine.Address } );
        for ( var x = 0; x < vm.LabelMap.length; x++ ){
          if ( vm.LabelMap[x].Address == codeLine.Address ){
            label = vm.LabelMap[x];
            break;
          }
        }
        if ( label != null ){
          codeLine.Label = label.Label;
          codeLine.Comment = label.Comment;
        }
        
        codeLine.msbHex = $filter('hex')(vm.Memory[i+2]);              
        codeLine.lsbHex = $filter('hex')(vm.Memory[i+1]);
        codeLine.bytes = '';

        for(var y = 0; y < codeLine.OpCode.Length; y++){
          codeLine.bytes += $filter('hex')( vm.Memory[i+y]) + ' ';
        }

        var line = '';
        switch(codeLine.OpCode.Mode){
          case 'Absolute':  // $c000
          {
            line = ' $' + codeLine.msbHex + codeLine.lsbHex;
            break;
          }
          case 'Absolute,X':  // $c000,X
          {
            line = ' $' + codeLine.msbHex + codeLine.lsbHex + ',X';
            break;
          }            
          case 'Absolute,Y':  // $c000,Y
          {
            line = ' $' + codeLine.msbHex + codeLine.lsbHex +  ',Y';
            break;
          }            
          case 'Accumulator': // A
          {
            line += ' A';
            break;
          }             
          case 'Immediate': // #$c0
          {
            line += '#$' + codeLine.lsbHex;
            break;
          }               
          case 'Indirect':  // ($c000)
          {
            line += ' ($' + codeLine.msbHex + codeLine.lsbHex + ')';
            break;
          }            
          case 'Indirect,X': // Indexed indirect ($c0,X)
          {
            line += ' ($' + codeLine.lsbHex + ',X)';
            break;
          }            
          case 'Indirect,Y': // Indirect indexed ($c0),Y
          {
            line += ' ($' + codeLine.lsbHex + '),Y';
            break;
          }            
          case 'Zero Page': // $c0
          {
            line += ' $' + codeLine.lsbHex;
            break;
          }             
          case 'Zero Page,X': // $c0,X
          {
            line += ' $' + codeLine.lsbHex + ',X';
            break;
          }               
          case 'Zero Page,Y': // $c0,Y
          {
            line += ' $' + codeLine.lsbHex + ',Y';
            break;
          }             
          case 'Relative': // $c0
          {
            line += ' $' + codeLine.lsbHex;
            break;
          }       
          case 'Implied':
          {
            line = '';
            break;
          }         
          default:
          {
            line += codeLine.OpCode.Mode;
            break;
          }
        }
        codeLine.Params = line;
        vm.AssemblyCode.push(codeLine);
        i += codeLine.OpCode.Length;
      }
    }

    vm.watch = function(){
      vm.WatchMemory = [];
      var startAddress = parseInt( '0x' + vm.memoryWatchStart);
      var endAddress = parseInt( '0x' + vm.memoryWatchEnd);
      if ( endAddress < startAddress){
        var tmp = startAddress;
        startAddress = endAddress;
        endAddress = tmp;
      }
      for( var i = startAddress; i <= endAddress; i+= 16){
        vm.WatchMemory.push(i);
      }
    }

    function step(){
      clearChangedFlags();
      vm.runToStep = Number(vm.totalSteps) + Number(vm.stepCount);
      while( vm.totalSteps < vm.runToStep ){
        vm.Registers.ProgramCounterChanged = false;
        vm.totalSteps++;
        if ( vm.Registers.ProgramCounter < 0 || vm.Registers.ProgramCounter > 0xFFFF ){
          $log.error( 'Program Counter has gone bad. ' + ProgramCounter  );
          alert( 'Program Counter has gone bad. ' + ProgramCounter  )
          return;
        }

       
        instructionCode = readFromMemory( vm.Registers.ProgramCounter );
        var instruction = vm.OpCodes[instructionCode];
        if ( instruction != undefined){
          vm.Registers.ProgramCounter++;
          switch(instruction.Name){
            case 'ADC': // Add with Carry                   
            {
              // A,Z,C,N = A+M+C
              // This instruction adds the contents of a memory location to the accumulator together with the carry bit. If overflow occurs the carry 
              // bit is set, this enables multiple byte addition to be performed.
            
              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              var byte = readFromMemory( address );
              ALU(byte);
              break;
            }          
            case 'AND': // Logical AND
            {
              // A,Z,N = A&M
              // A logical AND is performed, bit by bit, on the accumulator contents using the contents of a byte of memory.
              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              var byte = readFromMemory( address );
              setAccumulator( vm.Registers.Accumulator & byte );
              setZeroFlag( vm.Registers.Accumulator == 0 ); // Set if A = 0
              setNegativeFlag(  vm.Registers.Accumulator & 0x80 ); // Set if bit 7 set
              break;   
            }
            case 'ASL': // Arithmetic Shift Left
            {
              // A,Z,C,N = M*2 or M,Z,C,N = M*2
              // This operation shifts all the bits of the accumulator or memory contents one bit left. Bit 0 is set to 0 and bit 7 is placed 
              // in the carry flag. The effect of this operation is to multiply the memory contents by 2 (ignoring 2's complement considerations), 
              // setting the carry if the result will not fit in 8 bits.
              // c <- [76543210] <- 0
              if ( instruction.Mode == 'Accumulator' ){
                var byte = vm.Registers.Accumulator;
                var bit7 = byte & 0x80;
                byte = byteROL( byte, 0 );
                setCarryFlag( bit7 ); // Set to contents of old bit 7
                setAccumulator( byte );
                setZeroFlag( byte == 0 );  // Set if A = 0
                setNegativeFlag( byte & 0x80 ); // Set if bit 7 of the result is set
              }
              else{
                var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
                var byte = readFromMemory( address );
                var bit7 = byte & 0x80;
                byte = byteROL( byte, 0 );
                setCarryFlag( bit7 ); // Set to contents of old bit 7
                writeToMemory( address, byte );
                setNegativeFlag( byte & 0x80 ); // Set if bit 7 of the result is set
              }
              break;            break;
            }
            case 'BCC': // Branch if Carry Clear
            {
              // If the carry flag is clear then add the relative displacement to the program counter to cause a branch to a new location.
              if ( vm.Registers.CarryFlag == 0 ){
                var byte = readFromMemory( vm.Registers.ProgramCounter );
                vm.Registers.ProgramCounter++; // increment program counter to count for parameter 
                vm.Registers.ProgramCounter = addOnlyLSB( byte, vm.Registers.ProgramCounter );
                vm.Registers.ProgramCounterChanged = true;
              }
              break;
            }
            case 'BCS': // Branch if Carry Set
            {
              // If the carry flag is set then add the relative displacement to the program counter to cause a branch to a new location.
              if ( vm.Registers.CarryFlag == 1 ){
                var byte = readFromMemory( vm.Registers.ProgramCounter );
                vm.Registers.ProgramCounter++; // increment program counter to count for parameter 
                vm.Registers.ProgramCounter = addOnlyLSB( byte, vm.Registers.ProgramCounter );
                vm.Registers.ProgramCounterChanged = true;
              }
              break;
            }
            case 'BEQ': // Branch if Equal
            {
              // If the zero flag is set then add the relative displacement to the program counter to cause a branch to a new location.
              if ( vm.Registers.ZeroFlag == 1 ){
                var byte = readFromMemory( vm.Registers.ProgramCounter );
                vm.Registers.ProgramCounter++; // increment program counter to count for parameter 
                vm.Registers.ProgramCounter = addOnlyLSB( byte, vm.Registers.ProgramCounter );
                vm.Registers.ProgramCounterChanged = true;
              }
              break;
            }
            case 'BIT': // Bit Test                  
            {
              // A & M, N = M7, V = M6, Z 
              // This instructions is used to test if one or more bits are set in a target memory location. The mask pattern in A is ANDed with the value in 
              // memory to set or clear the zero flag, but the result is not kept. Bits 7 and 6 of the value from memory are copied into the N and V flags.
              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              var byte = readFromMemory( address );
              setZeroFlag( vm.Registers.Accumulator & byte ); 
              setOverflowFlag(  byte & 0x40 ); // Set if bit 6 set)
              setNegativeFlag(  byte & 0x80 ); // Set if bit 7 set
              break;
            }
            case 'BMI': // Branch if Minus
            {
              // If the negative flag is set then add the relative displacement to the program counter to cause a branch to a new location.
              if ( vm.Registers.NegativeFlag == 1 ){
                var byte = readFromMemory( vm.Registers.ProgramCounter );
                vm.Registers.ProgramCounter++; // increment program counter to count for parameter 
                vm.Registers.ProgramCounter = addOnlyLSB( byte, vm.Registers.ProgramCounter );
                vm.Registers.ProgramCounterChanged = true;
              } 
              break;
            }
            case 'BNE': // Branch if Not Equal
            {
              // If the zero flag is clear then add the relative displacement to the program counter to cause a branch to a new location.
              if ( vm.Registers.ZeroFlag == 0 ){
                var byte = readFromMemory( vm.Registers.ProgramCounter );
                vm.Registers.ProgramCounter++; // increment program counter to count for parameter 
                vm.Registers.ProgramCounter = addOnlyLSB( byte, vm.Registers.ProgramCounter );
                vm.Registers.ProgramCounterChanged = true;
              }
              break;
            }
            case 'BPL': // Branch if Positive
            {
              // If the negative flag is clear then add the relative displacement to the program counter to cause a branch to a new location.
              if ( vm.Registers.NegativeFlag == 0 ){
                var byte = readFromMemory( vm.Registers.ProgramCounter );
                vm.Registers.ProgramCounter++; // increment program counter to count for parameter 
                vm.Registers.ProgramCounter = addOnlyLSB( byte, vm.Registers.ProgramCounter );
                vm.Registers.ProgramCounterChanged = true;
              } 
              break;
            }
            case 'BRK': // Force Interrupt                    
            {
              // B set to 1
              // The BRK instruction advances the program counter by 2, then forces the generation of an interrupt request. The program counter and 
              // processor status are pushed on the stack. The processor status register on the stack with bit 4 set to 1. This way, the program can 
              // distinguish a BRK from an IRQ, which pushes the status with bit 4 cleared to 0. Then the IRQ interrupt vector at $FFFE/$FFFF is loaded into the PC.

              var returnAddress =  vm.Registers.ProgramCounter += 1;
              pushStack( getMostSignificantByte(returnAddress) );
              pushStack( getLeastSignificantByte(returnAddress) );

              var byte  = 0x10; // set bit 4
              if ( vm.Registers.NegativeFlag ){
                byte = byte | 0x80; // bit 7
              }
              if ( vm.Registers.OverflowFlag ){
                byte = byte | 0x40; // bit 6
              }
              if ( vm.Registers.DecimalMode ){
                byte = byte | 0x08; // bit 3
              }
              if ( vm.Registers.InterruptDisable ){
                byte = byte | 0x04; // bit 2
              }
              if ( vm.Registers.ZeroFlag ){
                byte = byte | 0x02; // bit 1
              }
              if ( vm.Registers.CarryFlag ){
                byte = byte | 0x01; // bit 0
              }
              pushStack( byte );

              var jumpAddress = resolveAddress( 0xFFFE, 'Absolute' );
              vm.Registers.ProgramCounter = jumpAddress;
              vm.Registers.ProgramCounterChanged = true;

              break;
            }
            case 'BVC': // Branch if Overflow Clear
            {
              // If the overflow flag is clear then add the relative displacement to the program counter to cause a branch to a new location.
              if ( vm.Registers.OverflowFlag == 0 ){
                var byte = readFromMemory( vm.Registers.ProgramCounter );
                vm.Registers.ProgramCounter++; // increment program counter to count for parameter 
                vm.Registers.ProgramCounter = addOnlyLSB( byte, vm.Registers.ProgramCounter );
                vm.Registers.ProgramCounterChanged = true;
              } 
              break;
            }
            case 'BVS': // Branch if Overflow Set
            {
              // If the overflow flag is set then add the relative displacement to the program counter to cause a branch to a new location.
              if ( vm.Registers.OverflowFlag == 1 ){
                var byte = readFromMemory( vm.Registers.ProgramCounter );
                vm.Registers.ProgramCounter++; // increment program counter to count for parameter 
                vm.Registers.ProgramCounter = addOnlyLSB( byte, vm.Registers.ProgramCounter );
                vm.Registers.ProgramCounterChanged = true;
              }            
              break;
            }
            case 'CLC': // Clear Carry Flag
            {
              // C = 0
              // Set the carry flag to zero.
              setCarryFlag( 0 );
              break;
            }
            case 'CLD': // Clear Decimal Mode
            {
              // D = 0
              // Sets the decimal mode flag to zero.
              setDecimalMode( 0 );
              break;
            }  
            case 'CLI': // Clear Interrupt Disable
            {
              // I = 0
              // Clears the interrupt disable flag allowing normal interrupt requests to be serviced.
              setInterruptDisable( 0 );
              break;
            }
            case 'CLV': // Clear Overflow Flag
            {
              // V = 0
              // Clears the overflow flag.
              setOverflowFlag( 0 );
              break;
            }
            case 'CMP': // Compare
            {
              // Z,C,N = A-M  Set C if A >= M, Set Z if A = M, Set N if bit 7 of the result is set
              // This instruction compares the contents of the accumulator with another memory held value and sets the zero and carry flags as appropriate.
              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              var byte = readFromMemory( address );
              setCarryFlag( vm.Registers.Accumulator >= byte ); // Set if Y >= M
              setZeroFlag( vm.Registers.Accumulator == byte ); // Set if Y = M
              setNegativeFlag( (vm.Registers.Accumulator - byte) & 0x80 ); // Set if bit 7 of the result is set  
              break;
            }
            case 'CPX': // Compare X Register
            {
              // Z,C,N = X-M Set C if A >= M, Set Z if A = M, Set N if bit 7 of the result is set
              // This instruction compares the contents of the X register with another memory held value and sets the zero and carry flags as appropriate.
              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              var byte = readFromMemory( address );
              setCarryFlag( vm.Registers.IndexRegisterX >= byte ); // Set if Y >= M
              setZeroFlag( vm.Registers.IndexRegisterX == byte ); // Set if Y = M
              setNegativeFlag( (vm.Registers.IndexRegisterX - byte) & 0x80 ); // Set if bit 7 of the result is set   
              break;
            }
            case 'CPY': // Compare Y Register
            {
              // Z,C,N = Y-M Set C if A >= M, Set Z if A = M, Set N if bit 7 of the result is set
              // This instruction compares the contents of the Y register with another memory held value and sets the zero and carry flags as appropriate.
              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              var byte = readFromMemory( address );
              setCarryFlag( vm.Registers.IndexRegisterY >= byte ); // Set if Y >= M
              setZeroFlag( vm.Registers.IndexRegisterY == byte ); // Set if Y = M
              setNegativeFlag( (vm.Registers.IndexRegisterY - byte) & 0x80 ); // Set if bit 7 of the result is set   
              break;
            }
            case 'DEC': // Decrement Memory
            {
              // M,Z,N = M-1
              // Subtracts one from the value held at a specified memory location setting the zero and negative flags as appropriate.
              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              var byte = readFromMemory( address );
              byte = byteAdd( byte, -1 );
              writeToMemory( address, byte );
              setZeroFlag( byte == 0 ); // Set if Y is zero
              setNegativeFlag( byte & 0x80 ); // Set if bit 7 of Y is set   
              break;
            }
            case 'DEX': // Decrement X Register
            {
              // X,Z,N = X-1
              // Subtracts one from the X register setting the zero and negative flags as appropriate.
              var byte = byteAdd( vm.Registers.IndexRegisterX, -1 );
              setIndexRegisterX( byte );
              setZeroFlag( byte == 0 ); // Set if Y is zero
              setNegativeFlag( byte & 0x80 ); // Set if bit 7 of Y is set            
              break;
            } 
            case 'DEY': // Decrement Y Register
            {
              // Y,Z,N = Y-1
              // Subtracts one from the Y register setting the zero and negative flags as appropriate.
              var byte = byteAdd( vm.Registers.IndexRegisterY, -1 );
              setIndexRegisterY( byte );
              setZeroFlag( byte == 0 ); // Set if Y is zero
              setNegativeFlag( byte & 0x80 ); // Set if bit 7 of Y is set
              break;
            } 
            case 'EOR': // Exclusive OR
            {
              // A,Z,N = A^M
              // An exclusive OR is performed, bit by bit, on the accumulator contents using the contents of a byte of memory.
              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              var byte = readFromMemory( address );
              setAccumulator( vm.Registers.Accumulator ^ byte );
              setZeroFlag( vm.Registers.Accumulator == 0 ); // Set if A = 0
              setNegativeFlag(  vm.Registers.Accumulator & 0x80 ); // Set if bit 7 set
              break;          
            }
            case 'INC': // Increment Memory
            {
              // M,Z,N = M+1
              // Adds one to the value held at a specified memory location setting the zero and negative flags as appropriate.
              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              var byte = readFromMemory( address );
              byte = byteAdd( byte, 1 );
              writeToMemory( address, byte );
              setZeroFlag( byte == 0 ); // Set if Y is zero
              setNegativeFlag( byte & 0x80 ); // Set if bit 7 of Y is set      
              break;
            }
            case 'INX': // Increment X Register
            {
              // X,Z,N = X+1
              // Adds one to the X register setting the zero and negative flags as appropriate.
              var byte = byteAdd( vm.Registers.IndexRegisterX, 1 );
              setIndexRegisterX( byte );
              setZeroFlag( byte == 0 ); // Set if Y is zero
              setNegativeFlag( byte & 0x80 ); // Set if bit 7 of Y is set            
              break;
            }
            case 'INY': // Increment Y Register
            {
              // Y,Z,N = Y+1
              // Adds one to the Y register setting the zero and negative flags as appropriate.
              var byte = byteAdd( vm.Registers.IndexRegisterY, 1 );
              setIndexRegisterY( byte );
              setZeroFlag( byte == 0 ); // Set if Y is zero
              setNegativeFlag( byte & 0x80 ); // Set if bit 7 of Y is set
              break;
            }  
            case 'JMP': // Jump
            {
              // Sets the program counter to the address specified by the operand.
              var jumpAddress = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              vm.Registers.ProgramCounter = jumpAddress;
              vm.Registers.ProgramCounterChanged = true;
              break;
            }
            case 'JSR': // Jump to Subroutine
            {
              // The JSR instruction pushes the address (minus one) of the return point on to the stack and then sets the program counter to the target memory address.
              var jumpAddress = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              var returnAddress =  vm.Registers.ProgramCounter += (instruction.Length - 2);
              pushStack( getMostSignificantByte(returnAddress) );
              pushStack( getLeastSignificantByte(returnAddress) );
              vm.Registers.ProgramCounter = jumpAddress;
              vm.Registers.ProgramCounterChanged = true;
              break;
            } 
            case 'LDA': // Load Accumulator
            {
              // A,Z,N = M
              // Loads a byte of memory into the accumulator setting the zero and negative flags as appropriate.
              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              var byte = readFromMemory( address );
              setAccumulator( byte );
              setZeroFlag( byte == 0 ); // Set if Y = 0
              setNegativeFlag( byte & 0x80 ); // Set if bit 7 of Y is set                 
              break;
            }
            case 'LDX':  // Load X Register
            {
              // X,Z,N = M
              // Loads a byte of memory into the X register setting the zero and negative flags as appropriate.
              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              var byte = readFromMemory( address );
              setIndexRegisterX( byte );
              setZeroFlag( byte == 0 ); // Set if Y = 0
              setNegativeFlag( byte & 0x80 ); // Set if bit 7 of Y is set            
              break;
            }
            case 'LDY': // Load Y Register
            {
              // Y,Z,N = M
              // Loads a byte of memory into the Y register setting the zero and negative flags as appropriate.
              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              var byte = readFromMemory( address );
              setIndexRegisterY( byte );
              setZeroFlag( byte == 0 ); // Set if Y = 0
              setNegativeFlag( byte & 0x80 ); // Set if bit 7 of Y is set
              break;
            }
            case 'LSR': // Logical Shift Right
            {
              // A,C,Z,N = A/2 or M,C,Z,N = M/2
              // Each of the bits in A or M is shift one place to the right. The bit that was in bit 0 is shifted into the carry flag. Bit 7 is set to zero.
              // 0 -> [76543210] -> C
              if ( instruction.Mode == 'Accumulator' ){
                var byte = vm.Registers.Accumulator;
                var bit0 = byte & 0x1;
                byte = byteROR( byte, 0 );
                setCarryFlag( instruction, bit0 ); // Set to contents of old bit 0
                setAccumulator( byte );
                setZeroFlag( byte == 0 );  // Set if A = 0
                setNegativeFlag(  byte & 0x80 ); // Set if bit 7 of the result is set
              }
              else{
                var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
                var byte = readFromMemory( address );
                var bit0 = byte & 0x1;
                byte = byteROR( byte, 0 );
                setCarryFlag( bit0 ); // Set to contents of old bit 0
                writeToMemory( address, byte );
                setNegativeFlag(  byte & 0x80 ); // Set if bit 7 of the result is set
              }
              break;
            }
            case 'NOP': // No Operation
            {
              // The NOP instruction causes no changes to the processor other than the normal incrementing of the program counter to the next instruction.
              break;
            }
            case 'ORA': // Logical Inclusive OR
            {
              // A,Z,N = A|M
              // An inclusive OR is performed, bit by bit, on the accumulator contents using the contents of a byte of memory.
              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              var byte = readFromMemory( address );
              setAccumulator( vm.Registers.Accumulator | byte );
              setZeroFlag( vm.Registers.Accumulator == 0 ); // Set if A = 0
              setNegativeFlag(  vm.Registers.Accumulator & 0x80 ); // Set if bit 7 set
              break;
            }
            case 'PHA': // Push Accumulator
            {
              // Pushes a copy of the accumulator on to the stack.
              pushStack( vm.Registers.Accumulator );
              break;
            }
            case 'PHP': // Push Processor Status
            {
              // Pushes a copy of the status flags on to the stack.
              var byte  = 0;
              if ( vm.Registers.NegativeFlag ){
                byte = byte | 0x80;
              }
              if ( vm.Registers.OverflowFlag ){
                byte = byte | 0x40;
              }
              if ( vm.Registers.DecimalMode ){
                byte = byte | 0x08;
              }
              if ( vm.Registers.InterruptDisable ){
                byte = byte | 0x04;
              }
              if ( vm.Registers.ZeroFlag ){
                byte = byte | 0x02;
              }
              if ( vm.Registers.CarryFlag ){
                byte = byte | 0x01;
              }
              pushStack( byte );
              break;
            }
            case 'PLA': // Pull Accumulator
            {
              // A,Z,N
              // Pulls an 8 bit value from the stack and into the accumulator. The zero and negative flags are set as appropriate.
              var byte = popStack( instruction );
              setAccumulator( byte );
              setZeroFlag( byte == 0 );
              setNegativeFlag ( byte & 0x80 );
              break;
            }
            case 'PLP': // Pull Processor Status
            {
              // all set from stack
              // Pulls an 8 bit value from the stack and into the processor flags. The flags will take on new states as determined by the value pulled.
              var byte = popStack( instruction );
              setNegativeFlag( byte & 0x80 );
              setOverflowFlag( byte & 0x40 );
              setDecimalMode( byte & 0x08 );
              setInterruptDisable( byte & 0x04 );
              setZeroFlag( byte & 0x02 );
              setCarryFlag( byte & 0x01 );
              break;
            }
            case 'ROL': // Rotate Left
            {
              // C,Z,N
              // Move each of the bits in either A or M one place to the left. Bit 0 is filled with the current value of the carry flag whilst 
              // the old bit 7 becomes the new carry flag value.
              // C <- [76543210] <- C 
              if ( instruction.Mode == 'Accumulator' ){
                var byte = vm.Registers.Accumulator;
                var bit7 = byte & 0x80;
                byte = byteROL( byte, vm.Registers.CarryFlag );
                setCarryFlag( bit7 ); // Set to contents of old bit 7
                setAccumulator( byte );
                setZeroFlag( byte == 0 );  // Set if A = 0
                setNegativeFlag( byte & 0x80 ); // Set if bit 7 of the result is set
              }
              else{
                var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
                var byte = readFromMemory( address );
                var bit7 = byte & 0x80;
                byte = byteROL( byte, vm.Registers.CarryFlag );
                setCarryFlag( bit7 ); // Set to contents of old bit 7
                writeToMemory( address, byte );
                setNegativeFlag( byte & 0x80 ); // Set if bit 7 of the result is set
              }
              break;
            }
            case 'ROR': // Rotate Right
            {
              // C,Z,N
              // Move each of the bits in either A or M one place to the right. Bit 7 is filled with the current value of the carry flag whilst the old bit 0 
              // becomes the new carry flag value.
              // C -> [76543210] -> C 
              if ( instruction.Mode == 'Accumulator' ){
                var byte = vm.Registers.Accumulator;
                var bit0 = byte & 0x1;
                byte = byteROR( byte, vm.Registers.CarryFlag );
                setCarryFlag( instruction, bit0 ); // Set to contents of old bit 0
                setAccumulator( byte );
                setZeroFlag( byte == 0 );  // Set if A = 0
                setNegativeFlag( byte & 0x80 ); // Set if bit 7 of the result is set
              }
              else{
                var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
                var byte = readFromMemory( address );
                var bit0 = byte & 0x1;
                byte = byteROR( byte, vm.Registers.CarryFlag );
                setCarryFlag( bit0 ); // Set to contents of old bit 0
                writeToMemory( address, byte );
                setNegativeFlag( byte & 0x80 ); // Set if bit 7 of the result is set
              }
              break;
            }
            case 'RTI': // Return from Interrupt 
            {
              // all set from stack
              // The RTI instruction is used at the end of an interrupt processing routine. It pulls the processor flags from the stack followed by the program counter.

              var byte = popStack( instruction );
              setNegativeFlag( byte & 0x80 );
              setOverflowFlag( byte & 0x40 );
              setDecimalMode( byte & 0x08 );
              setInterruptDisable( byte & 0x04 );
              setZeroFlag( byte & 0x02 );
              setCarryFlag( byte & 0x01 );

              var lsb = popStack( instruction );
              var msb = popStack( instruction );
              var returnAddress = make16bitNumber( msb, lsb );
              vm.Registers.ProgramCounter = returnAddress + 1;
              vm.Registers.ProgramCounterChanged = true;
              break;
            }
            case 'RTS': // Return from Subroutine
            {
              // The RTS instruction is used at the end of a subroutine to return to the calling routine. It pulls the program counter (minus one) from the stack.
              var lsb = popStack( instruction );
              var msb = popStack( instruction );
              var returnAddress = make16bitNumber( msb, lsb );
              vm.Registers.ProgramCounter = returnAddress + 1;
              vm.Registers.ProgramCounterChanged = true;
              break;
            }
            case 'SBC': // Subtract with Carry                
            {
              // A,Z,C,N = A-M-(1-C)
              // This instruction subtracts the contents of a memory location to the accumulator together with the not of the carry bit. If overflow occurs the carry 
              // bit is clear, this enables multiple byte subtraction to be performed.

              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              var byte = readFromMemory( address );
              byte = ~byte + 1; // Two's complement
              ALU(byte);
              break;
            }
            case 'SEC': // Set Carry Flag
            {
              // C = 1
              // Set the carry flag to one.
              setCarryFlag( 1 );
              break;
            }
            case 'SED': // Set Decimal Flag
            {
              // D = 1
              // Set the decimal mode flag to one.
              setDecimalMode( 1 );
              break;
            }
            case 'SEI': // Set Interrupt Disable
            {
              // I = 1
              // Set the interrupt disable flag to one.
              setInterruptDisable( 1 );
              break;
            }
            case 'STA': // Store Accumulator
            {
              // M = A
              // Stores the contents of the accumulator into memory.
              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              writeToMemory( address, vm.Registers.Accumulator );
              break;
            }
            case 'STX': // Store X Register
            {
              // M = X
              // Stores the contents of the X register into memory.
              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              writeToMemory( address, vm.Registers.IndexRegisterX );
              break;
            } 
            case 'STY': // Store Y Register
            {
              // M = Y
              // Stores the contents of the Y register into memory.
              var address = resolveAddress( vm.Registers.ProgramCounter, instruction.Mode );
              writeToMemory( address, vm.Registers.IndexRegisterY );
              break;
            }   
            case 'TAX': // Transfer Accumulator to X
            {
              // Z,N, X = A
              // Copies the current contents of the accumulator into the X register and sets the zero and negative flags as appropriate.
              setIndexRegisterX( vm.Registers.Accumulator );
              setZeroFlag( vm.Registers.IndexRegisterX == 0 );
              setNegativeFlag( vm.Registers.IndexRegisterX & 0x80 );
              break;
            }
            case 'TAY': // Transfer Accumulator to Y
            {
              // Z,N, Y = A
              // Copies the current contents of the accumulator into the Y register and sets the zero and negative flags as appropriate.
              setIndexRegisterY( vm.Registers.Accumulator );
              setZeroFlag( vm.Registers.IndexRegisterY == 0 );
              setNegativeFlag( vm.Registers.IndexRegisterY & 0x80 );
              break;
            }
            case 'TSX': // Transfer Stack Pointer to X
            {
              // Z,N, X = S
              // Copies the current contents of the stack register into the X register and sets the zero and negative flags as appropriate.
              setIndexRegisterX( vm.Registers.Stack );
              setZeroFlag( vm.Registers.IndexRegisterX == 0 );
              setNegativeFlag( vm.Registers.IndexRegisterX & 0x80 );
              break;
            }
            case 'TXA': // Transfer X to Accumulator
            {
              // Z,N, A = X
              // Copies the current contents of the X register into the accumulator and sets the zero and negative flags as appropriate.
              setAccumulator( vm.Registers.IndexRegisterX );
              setZeroFlag( vm.Registers.Accumulator == 0 );
              setNegativeFlag( vm.Registers.Accumulator & 0x80 );
              break;
            }  
            case 'TXS': // Transfer X to Stack Pointer
            {
              // S = X
              // Copies the current contents of the X register into the stack register.
              setStackPointer( vm.Registers.IndexRegisterX );
              break;
            }         
            case 'TYA': // Transfer Y to Accumulator
            {
              // Z,N, A = Y
              // Copies the current contents of the Y register into the accumulator and sets the zero and negative flags as appropriate.
              setAccumulator( vm.Registers.IndexRegisterY );
              setZeroFlag( vm.Registers.Accumulator == 0 );
              setNegativeFlag( vm.Registers.Accumulator & 0x80 );
              break;
            }           
            default:
            {
              $log.error( instruction.Name + ' is not an optin the step method.' );
              alert( instruction.Name + ' is unknown in these parts' );
            }
          }
          if ( !vm.Registers.ProgramCounterChanged ){
            vm.Registers.ProgramCounter += ( instruction.Length - 1 );
          }
        }
        else{
          $log.error( $filter('hex')(instructionCode)  + ' is not a valid opcode.' );
          alert( $filter('hex')(instructionCode)  + ' is not a valid opcode.' );
        }


      }      
      var runTo = parseInt( '0x' + vm.runToAddress );
      if ( runTo > 0 && vm.Registers.ProgramCounter != runTo){
        $timeout( step );
      }
      else
      {
        vm.runToAddress = '';
      }

      if ( vm.Registers.ProgramCounter < vm.disassembleStart || vm.Registers.ProgramCounter > ( vm.disassembleStart + vm.disassembleCount ) ){
        disassemble( vm.Registers.ProgramCounter, vm.Registers.ProgramCounter + vm.disassembleCount );
      }

    }

    function setRunTo( address ){
      return $filter('hex')(address, 16);
    }

    function pushStack( byte ){
      var address = addOnlyLSB( vm.Registers.StackPointer, 0x0100 );
      vm.Memory[address] = byte;
      setStackPointer( --vm.Registers.StackPointer );
      vm.MemoryChange.push( address );
    }

    function popStack(){
      setStackPointer( ++vm.Registers.StackPointer );
      var address = addOnlyLSB( vm.Registers.StackPointer, 0x0100 );
      return vm.Memory[address];
    }

    function writeToMemory( address, byte ){
      if (  address >= 0 && address <= 0xFFFF ){
        if ( address >= 0x2000 && address <= 0x7fff ){
          $log.error( 'Blocked memory write to adress ' + $filter('hex')(address, 16))
        }
        else if ( address >= 0xa000){
          $log.error( 'Blocked memory write to adress ' + $filter('hex')(address, 16))
        }
        else{
          vm.Memory[address] = byte & 0xFF;
          vm.MemoryChange.push( address );
        }
      }
      else {
        $log.error( 'Bad write to memory address: ' + address );
      }
    } 

    function readFromMemory( address ){
      var retVal = 0;
      if (  address >= 0 && address <= 0xFFFF ){
          retVal = vm.Memory[address] & 0xFF;
          vm.MemoryRead.push( address );
      }
      else {
        $log.error( 'Bad read from memory address :' + address );
      }
      return retVal;
    }

    function resolveAddress( address, mode ){
      var retVal = 0;
      if (  address >= 0 && address < 0xFFFF ){
        switch(mode){
          case 'Implicit':
          {
            // For many 6502 instructions the source and destination of the information to be manipulated is implied directly by the function of the instruction 
            // itself and no further operand needs to be specified. Operations like 'Clear Carry Flag' (CLC) and 'Return from Subroutine' (RTS) are implicit.
            retVal = null;
            break;
          }
          case 'Accumulator': // A
          {
            // Instruction to operate directly upon the accumulator. The programmer specifies this by using a special operand value, 'A'
            retVal = null;
            break;
          }
          case 'Immediate': // #$c0
          {
            // Immediate addressing allows the programmer to directly specify an 8 bit constant within the instruction. It is indicated by a '#' symbol followed by an numeric expression.
            // Return the address provided as this should be the address of the byte right after the OpCode
            retVal = address;
            break;
          }
          case 'Zero Page': // $c0
          {
            // An instruction using zero page addressing mode has only an 8 bit address operand. This limits it to addressing only the first 256 bytes of memory (e.g. $0000 to $00FF) 
            // where the most significant byte of the address is always zero. In zero page mode only the least significant byte of the address is held in the instruction making it 
            // shorter by one byte (important for space saving) and one less memory fetch during execution (important for speed).
            // Return the value at the address 
            retVal =  make16bitNumber( 0 /*MSB*/, vm.Memory[address] );
            vm.MemoryRead.push( address );
            break;
          }
          case 'Zero Page,X': // $c0,X
          {
            // The address to be accessed by an instruction using indexed zero page addressing is calculated by taking the 8 bit zero page address from the instruction and adding the 
            // current value of the X register to it. For example if the X register contains $0F and the instruction LDA $80,X is executed then the accumulator will be loaded from 
            // $008F (e.g. $80 + $0F => $8F).  The address calculation wraps around if the sum of the base address and the register exceed $FF. If we repeat the last example but with 
            // $FF in the X register then the accumulator will be loaded from $007F (e.g. $80 + $FF => $7F) and not $017F.
            retVal = make16bitNumber( 0 /*MSB*/, (vm.Memory[address] + vm.Registers.IndexRegisterX) /*LSB*/ );
            vm.MemoryRead.push( address );
            break;
          }               
          case 'Zero Page,Y': // $c0,Y
          {
            // The address to be accessed by an instruction using indexed zero page addressing is calculated by taking the 8 bit zero page address from the instruction and adding the 
            // current value of the Y register to it. This mode can only be used with the LDX and STX instructions.
            retVal = make16bitNumber( 0/*MSB*/, (vm.Memory[address] + vm.Registers.IndexRegisterY) /*LSB*/ );
            vm.MemoryRead.push( address );
            break;
          }   
          case 'Relative': // $c0 (or label)
          {
            // Relative addressing mode is used by branch instructions (e.g. BEQ, BNE, etc.) which contain a signed 8 bit relative offset (e.g. -128 to +127) which is added to program 
            // counter if the condition is true. As the program counter itself is incremented during instruction execution by two the effective address range for the target instruction 
            // must be with -126 to +129 bytes of the branch.
            retVal = null;
            break;
          }               
          case 'Absolute': // $c000
          {
            // Instructions using absolute addressing contain a full 16 bit address to identify the target location.
            retVal = make16bitNumber( vm.Memory[address+1] /*MSB*/, vm.Memory[address] /*LSB*/ );
            vm.MemoryRead.push( address );
            vm.MemoryRead.push( address + 1 );
            break;
          }
          case 'Absolute,X': // $c000,X
          {
            // The address to be accessed by an instruction using X register indexed absolute addressing is computed by taking the 16 bit address from the instruction and added the 
            // contents of the X register. For example if X contains $92 then an STA $2000,X instruction will store the accumulator at $2092 (e.g. $2000 + $92).
            retVal = make16bitNumber( vm.Memory[address+1] /*MSB*/, (vm.Memory[address] + vm.Registers.IndexRegisterX) /*LSB*/ );
            vm.MemoryRead.push( address );
            vm.MemoryRead.push( address + 1 );            
            break;
          }            
          case 'Absolute,Y': // $c000,Y
          {
            // The Y register indexed absolute addressing mode is the same as the previous mode only with the contents of the Y register added to the 16 bit address from the instruction.
            retVal = make16bitNumber( vm.Memory[address+1] /*MSB*/, (vm.Memory[address] + vm.Registers.IndexRegisterY) /*LSB*/ );
            vm.MemoryRead.push( address );
            vm.MemoryRead.push( address + 1 );
            break;
          }
          case 'Indirect': // ($c000)
          {
            // JMP is the only 6502 instruction to support indirection. The instruction contains a 16 bit address which identifies the location of the least significant byte of another 
            // 16 bit memory address which is the real target of the instruction.
            // For example if location $0120 contains $FC and location $0121 contains $BA then the instruction JMP ($0120) will cause the next instruction execution to occur at 
            // $BAFC (e.g. the contents of $0120 and $0121).
            var pointer = make16bitNumber( vm.Memory[address+1] /*MSB*/, vm.Memory[address] /*LSB*/ );
            retVal = make16bitNumber( vm.Memory[pointer+1] /*MSB*/,  vm.Memory[pointer] /*LSB*/ );
            vm.MemoryRead.push( address );
            vm.MemoryRead.push( address + 1 );
            vm.MemoryRead.push( pointer );
            vm.MemoryRead.push( pointer + 1 );                        
            break;
          }  
          case 'Indirect,X': // Indexed indirect: ($c0,X)
          {
            // Indexed indirect addressing is normally used in conjunction with a table of address held on zero page. The address of the table is taken from the instruction and 
            // the X register added to it (with zero page wrap around) to give the location of the least significant byte of the target address.
            var pointer = make16bitNumber( 0  /*MSB*/, (vm.Memory[address] + vm.Registers.IndexRegisterX) /*LSB*/ );
            retVal = make16bitNumber( vm.Memory[pointer+1] /*MSB*/,  vm.Memory[pointer] /*LSB*/ );
            vm.MemoryRead.push( address );
            vm.MemoryRead.push( pointer );
            vm.MemoryRead.push( pointer + 1 );                        
            break;
          }            
          case 'Indirect,Y': // Indirect indexed: ($c0),Y
          {
            // Indirect indirect addressing is the most common indirection mode used on the 6502. In instruction contains the zero page location of the least significant byte of 
            // 16 bit address. The Y register is dynamically added to this value to generated the actual target address for operation.
            var pointer = vm.Memory[address];
            retVal = make16bitNumber( vm.Memory[pointer+1] /*MSB*/, (vm.Memory[pointer] + vm.Registers.IndexRegisterY) /*LSB*/ );
            vm.MemoryRead.push( address );
            vm.MemoryRead.push( address + 1 );            
            break;
          }            
        }
      }
      return retVal;
    }    

    function setAccumulator( value ){
      vm.Registers.Accumulator = value & 0xFF;
      vm.Registers.AccumulatorChanged = true;
    }

    function setStackPointer( value ){
      vm.Registers.StackPointer = value & 0xFFFF;
      vm.Registers.StackPointerChanged = true;
      vm.StackMemory = [];
      for( var i = 0x01ff; i > vm.Registers.StackPointer + 0x100; i-- ){
        vm.StackMemory.push(i);
      }      
    }

    function setIndexRegisterX( value ){
      vm.Registers.IndexRegisterX = value & 0xFF;
      vm.Registers.IndexRegisterXChanged = true;
    }

    function setIndexRegisterY( value ){
      vm.Registers.IndexRegisterY = value & 0xFF;
      vm.Registers.IndexRegisterYChanged = true;
    }    

    function setCarryFlag( value ){
      vm.Registers.CarryFlag = value == 0 ? false : true;
      vm.Registers.CarryFlagChanged = true;
    } 

    function setZeroFlag( value ){
      vm.Registers.ZeroFlag = value == 0 ? false : true;
      vm.Registers.ZeroFlagChanged = true;
    } 
    
    function setOverflowFlag( value ){
      vm.Registers.OverflowFlag = value == 0 ? false : true;
      vm.Registers.OverflowFlagChanged = true;
    }     

    function setNegativeFlag( value ){
      vm.Registers.NegativeFlag = value == 0 ? false : true;
      vm.Registers.NegativeFlagChanged = true;
    }    

    function setInterruptDisable( value ){
      vm.Registers.InterruptDisable = value == 0 ? false : true;
      vm.Registers.InterruptDisableChanged = true;
    }

    function setDecimalMode( value ){
      vm.Registers.DecimalMode = value == 0 ? false : true;
      vm.Registers.DecimalModeChanged = true;
    }    

    function clearChangedFlags(){
      vm.MemoryChange = [];
      vm.MemoryRead = [];
      vm.Registers.ProgramCounterChanged = false;
      vm.Registers.StackPointerChanged = false;
      vm.Registers.AccumulatorChanged = false;
      vm.Registers.IndexRegisterXChanged = false;
      vm.Registers.IndexRegisterYChanged = false;
      vm.Registers.CarryFlagChanged = false;
      vm.Registers.ZeroFlagChanged = false;
      vm.Registers.InterruptDisableChanged = false;
      vm.Registers.DecimalModeChanged = false;
      vm.Registers.OverflowFlagChanged = false;
      vm.Registers.NegativeFlagChanged = false;
    }

    function getLeastSignificantByte( value ){
      return value & 0xFF;
    }

    function getMostSignificantByte( value ){
      return (value >> 8) & 0xFF;
    }

    function make16bitNumber( msb, lsb ){
      return ((msb << 8) |  lsb) & 0xFFFF;
    }

    function addOnlyLSB( byte, number ){
      var lsb = number & 0xFF;
      lsb = byteAdd( lsb, byte );
      number = number & 0xFF00;
      return   (number | lsb )
    }

    function byteAdd( byte1, byte2 ){
      var retVal = byte1 + byte2;
      return retVal & 0xFF;
    }

    function ALU( byte ){
      var sum = vm.Registers.Accumulator + byte + vm.Registers.CarryFlag;
      if ( vm.Registers.DecimalMode ){
        if ((( vm.Registers.Accumulator ^ byte ^ sum ) & 0x10) == 0x10)
        {
          sum += 0x06;
        }
        if (( sum & 0xf0) > 0x90)
        {
          sum += 0x60;
        }
      }  

      setOverflowFlag( ( ( vm.Registers.Accumulator ^ sum ) & ( byte ^ sum ) & 0x80 ) == 0x80 );
      setCarryFlag( sum & 0x100 );
      setNegativeFlag( sum & 0x80 );
      setAccumulator( sum & 0xFF );
      setZeroFlag( vm.Registers.Accumulator == 0 );
    }    

    function byteROR( byte, bit7 ){
      // bit7 -> [76543210] -> C
      if ( bit7 ){
        byte = (byte | 0x100);
      }
      byte = byte >>> 1;
      return byte;
    }

    function byteROL( byte, bit0 ){
      // C <- [76543210] <- bit0
      byte = byte << 1;
      if ( bit0 ){
        byte = (byte | 0x1);
      }
      return byte;
    }    

    function printBits(byte){
      var output = '';
      output += byte & 0x80 ? '1' : '0';
      output += byte & 0x40 ? '1' : '0';
      output += byte & 0x20 ? '1' : '0';
      output += byte & 0x10 ? '1' : '0';
      output += byte & 0x08 ? '1' : '0';
      output += byte & 0x04 ? '1' : '0';
      output += byte & 0x02 ? '1' : '0';
      output += byte & 0x01 ? '1' : '0';
      return output;
    }

  });


  



app.filter('hex', function () {
  return function(input, size) {
    switch(size)
    {
      case 16:
      {
        if ( input == null || input == undefined || input > 0xffff ){
          retVal = 'XXXX';
        }
        else{
          var retVal = (input).toString(16);
          while( retVal.length < 4){
            retVal = '0' + retVal;
          }
        }        
        break;
      }
      case 8:
      default:
      {
        if ( input == null || input == undefined || input > 0xff ){
          retVal = 'XX';
        }
        else{
          var retVal = (input).toString(16);
          if ( retVal.length == 1){
            retVal = '0' + retVal;
          }
        }        
        break;
      }      
    }
    return retVal;
  };
});

app.filter('bool', function () {
  return function(input) {
    var retVal = 'On';
    if (input == 0 ){
      retVal = 'Off';
    }
    return retVal;
  };
});

app.filter('bit', function () {
  return function(input) {
    var retVal = '1';
    if (input == 0 ){
      retVal = '0';
    }
    return retVal;
  };
});

app.directive('step', function () {
  return function (scope, element, attrs) {
      element.bind("keydown keypress", function (event) {
          if(event.which === 121) {  // F10 Key
            scope.$apply( scope.vm.step );
            event.preventDefault();
          }
      });
  };
});