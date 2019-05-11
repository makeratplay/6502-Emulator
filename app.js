var app = angular.module("App", []);

app.controller('AppController', function( $filter, FileService ) {
    var vm = this;

    vm.step = step;

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

    vm.Program = [0xa2, 0xff, 0x78, 0x9a, 0xd8, 0x20, 0x3f, 0xfd, 0xd0, 0x03, 0x6c, 0x00, 0xa0, 0x20, 0x8d, 0xfd, 0x20, 0x52, 0xfd, 0x20, 0xf9, 0xfd, 0x20, 0x18, 
                  0xe5, 0x58, 0x6c, 0x00, 0xc0, 0xa2, 0x05, 0xbd, 0x4c, 0xfd, 0xdd, 0x03, 0xa0, 0xd0, 0x03, 0xca, 0xd0, 0xf5, 0x60, 0x41, 0x30, 0xc3, 0xc2, 0xcd];

     

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
      for(var x = 0; x < 0xFF; x++){
        var address = 0xFD4c 
        var jmpAddress = addByteWithWrapAround(x, address);
        console.log( address.toString(16) + ' -> ' + address + ' -> ' + x + ' -> ' + jmpAddress + ' -> ' + jmpAddress.toString(16) );
      }
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

      FileService.getFile('./Kernel.rom')
        .then(function (byteArray){
          loadProgram( 0xe000, byteArray ); // Kernel.rom
          return FileService.getFile('./Basic.rom');
        })
        .then(function (byteArray){
          loadProgram( 0xc000, byteArray ); // Basic.rom
          return FileService.getFile('./Char.rom');
        })
        .then(function (byteArray){
          loadProgram( 0x8000, byteArray ); // 'Char.rom'
          disassemble( vm.Registers.ProgramCounter, vm.Registers.ProgramCounter + vm.disassembleCount );
        })
        .catch(function (error) {
          console.log('Something went wrong', error);
        });

      
      //loadProgram(vm.startAddress, vm.Program);
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
        codeLine.Byte1 = vm.Memory[i+1];
        codeLine.Byte2 = vm.Memory[i+2];              

        var line = '';
        if (codeLine.OpCode.Length > 1){
          switch(codeLine.OpCode.Mode){
            case 'Absolute':
            {
              line += ' $' + $filter('hex')(codeLine.Byte2);
              line += $filter('hex')(codeLine.Byte1);
              break;
            }
            case 'Absolute,X':
            {
              line += ' $' + $filter('hex')(codeLine.Byte2);
              line += $filter('hex')(codeLine.Byte1);
              line += ',X';
              break;
            }            
            case 'Absolute,Y':
            {
              line += ' $' + $filter('hex')(codeLine.Byte2);
              line += $filter('hex')(codeLine.Byte1);
              line += ',Y';
              break;
            }            
            case 'Accumulator':
            {
              line += ' A';
              break;
            }             
            case 'Immediate':
            {
              line += '#$' + $filter('hex')(codeLine.Byte1);
              break;
            }               
            case 'Indirect':
            {
              line += ' ($' + $filter('hex')(codeLine.Byte2);
              line += $filter('hex')(codeLine.Byte1);
              line += ')';
              break;
            }            
            case 'Indirect,X':
            {
              line += ' ($' + $filter('hex')(codeLine.Byte1);
              line += '),X';
              break;
            }            
            case 'Indirect,Y':
            {
              line += ' ($' + $filter('hex')(codeLine.Byte1);
              line += '),Y';
              break;
            }            
            case 'Zero Page':
            {
              line += ' $' + $filter('hex')(codeLine.Byte1);
              break;
            }             
            case 'Zero Page,X':
            {
              line += ' $' + $filter('hex')(codeLine.Byte1);
              line += ',X';
              break;
            }               
            case 'Zero Page,Y':
            {
              line += ' $' + $filter('hex')(codeLine.Byte1);
              line += ',Y';
              break;
            }             
            case 'Relative':
            {
              line += ' $' + $filter('hex')(codeLine.Byte1);
              break;
            }                
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
      if ( vm.Registers.ProgramCounter < 0 || vm.Registers.ProgramCounter > 0xFFFF ){
        alert( 'Program Counter has gone bad. ' + ProgramCounter  )
        return;
      }

      var jumped = false;
      clearChangedFlags();
      instructionCode = readMem(vm.Registers.ProgramCounter, 'Immediate');
      var instruction = vm.OpCodes[instructionCode];
      if ( instruction != undefined){
        vm.Registers.ProgramCounter++;
        switch(instruction.Name){
          case'LDX':
          {
            setIndexRegisterX( instruction, readMem(vm.Registers.ProgramCounter, instruction.Mode) );
            break;
          }
          case 'SEI':
          {
            setInterruptDisable( instruction, 1 );
            break;
          }
          case 'CLD':
          {
            setDecimalMode( instruction, 0 );
            break;
          }          
          case 'TXS':
          {
            setStackPointer( instruction, vm.Registers.IndexRegisterX);
            break;
          }     
          case 'TAX':
          {
            setIndexRegisterX( instruction, vm.Registers.Accumulator );
            break;
          }
          case 'TXA':
          {
            setAccumulator( instruction, vm.Registers.IndexRegisterX );
            break;
          }            
          case 'DEX':
          {
            setIndexRegisterX( instruction, --vm.Registers.IndexRegisterX );
            break;
          }              
          case 'INX':
          {
            setIndexRegisterX( instruction, ++vm.Registers.IndexRegisterX );
            break;
          }             
          case 'TAY':
          {
            setIndexRegisterY( instruction, vm.Registers.Accumulator );
            break;
          }
          case 'TYA':
          {
            setAccumulator( instruction, vm.Registers.IndexRegisterY );
            break;
          }            
          case 'DEY':
          {
            setIndexRegisterY( instruction, --vm.Registers.IndexRegisterY );
            break;
          }              
          case 'INY':
          {
            setIndexRegisterY( instruction, ++vm.Registers.IndexRegisterY );
            break;
          }  
          case 'LDA':
          {
            setAccumulator( instruction, readMem(vm.Registers.ProgramCounter, instruction.Mode) );
            break;
          }
          case 'LDY':
          {
            setIndexRegisterY( instruction, readMem(vm.Registers.ProgramCounter, instruction.Mode) );
            break;
          }
          case 'STA':
          {
            var address = resolveAddress(vm.Registers.ProgramCounter, instruction.Mode);
            writeMem( address, vm.Registers.Accumulator );
            break;
          }
          case 'JSR':
          {
            // pushes the address-1 of the next operation on to the stack before transferring program control to the following address.
            var jumpAddress = readMem(vm.Registers.ProgramCounter, instruction.Mode);
            var returnAddress =  vm.Registers.ProgramCounter += (instruction.Length - 2);
            pushStack( instruction, getMostSignificantByte(returnAddress));
            pushStack( instruction, getLeastSignificantByte(returnAddress));
            vm.Registers.ProgramCounter = jumpAddress;
            vm.Registers.ProgramCounterChanged = true;
            jumped = true;
            break;
          }     
          case 'RTS':
          {
            // pulls the top two bytes off the stack (low byte first) and transfers program control to that address+1
            var lsb = popStack( instruction );
            var msb = popStack( instruction );
            returnAddress = make16bitNumber( msb, lsb );
            vm.Registers.ProgramCounter = returnAddress + 1;
            vm.Registers.ProgramCounterChanged = true;
            jumped = true;
            break;
          }
          case 'CMP':
          {
            var value = readMem(vm.Registers.ProgramCounter, instruction.Mode);
            if ( vm.Registers.Accumulator < value){
              setCarryFlag( instruction, 0 );
              setZeroFlag( instruction, 0 );
            }
            else if ( vm.Registers.Accumulator > value){
              setCarryFlag( instruction, 1 );
              setZeroFlag( instruction, 0 );
            }
            else {
              setCarryFlag( instruction, 1 );
              setZeroFlag( instruction, 1 );
            }
            break;
          }
          case 'BNE':
          {
            if ( vm.Registers.ZeroFlag == 0){
              var value = readMem(vm.Registers.ProgramCounter, instruction.Mode);
              vm.Registers.ProgramCounter++; // increment program counter to count for parameter 
              vm.Registers.ProgramCounter = addByteWithWrapAround(value, vm.Registers.ProgramCounter);
              vm.Registers.ProgramCounterChanged = true;
              jumped = true;
            }
            break;
          }
          case 'JMP':
          {
            var value = readMem(vm.Registers.ProgramCounter, instruction.Mode);
            vm.Registers.ProgramCounter = value;
            vm.Registers.ProgramCounterChanged = true;
            jumped = true;
            break;
          }
          default:
          {
            alert( instruction.Name + ' not here');
          }
        }
        if (!jumped){
          vm.Registers.ProgramCounter += (instruction.Length - 1);
        }
      }
      else{
        alert( $filter('hex')(instructionCode)  + ' is not a valid opcode.');
      }

      if ( vm.Registers.ProgramCounter < vm.disassembleStart || vm.Registers.ProgramCounter > (vm.disassembleStart + vm.disassembleCount) ){
        disassemble( vm.Registers.ProgramCounter, vm.Registers.ProgramCounter + vm.disassembleCount );
      }
      
    }

    function pushStack( opCode, byte ){
      var address = addByteWithWrapAround(vm.Registers.StackPointer, 0x0100);
      vm.Memory[address] = byte;
      setStackPointer( opCode, --vm.Registers.StackPointer);
      vm.MemoryChange.push(address);
    }

    function popStack( opCode ){
      setStackPointer( opCode, ++vm.Registers.StackPointer);
      var address = addByteWithWrapAround(vm.Registers.StackPointer, 0x0100);
      return vm.Memory[address];
    }

    function getLeastSignificantByte(value){
      return 0x000000FF & value;
    }

    function getMostSignificantByte(value){
      return (0x0000FF00 & value) >> 8;
    }

    function make16bitNumber(msb, lsb){
      return ((msb << 8) |  lsb);
    }

    function addByteWithWrapAround( byte, number){
      var tmp = 0x00FF & number;
      tmp = tmp + byte;
      if ( tmp > 0xFF){
        tmp = tmp - 0x100;
      }
      number = number >> 8;
      return   ((number << 8) | tmp)
    }

    function readMem(address, mode){
      var retVal = 0;
      if (  address >= 0 && address < 0xFFFF ){
        switch(mode){
          case 'Accumulator':
          case 'Absolute':
          {
            retVal = resolveAddress(address, mode);
            break;
          }
          default:
          {
            address = resolveAddress(address, mode);
            retVal = vm.Memory[address];
            break;
          }               
        }
      }
      return retVal;
    }

    function resolveAddress(address, mode){
      var retVal = 0;
      if (  address >= 0 && address < 0xFFFF ){
        switch(mode){
          case 'Immediate':
          case 'Relative':
          case 'Zero Page':
          {
            retVal = address;
            break;
          }               
          case 'Absolute':
          {
            retVal = make16bitNumber( vm.Memory[address+1], vm.Memory[address] );
            break;
          }
          case 'Indirect':
          {
            var pointer = make16bitNumber( vm.Memory[address+1], vm.Memory[address] );
            retVal = vm.Memory[pointer];
            break;
          }  

          case 'Absolute,X':
          {
            retVal = make16bitNumber( vm.Memory[address+1], (vm.Memory[address] + vm.Registers.IndexRegisterX) );
            break;
          }            
          case 'Absolute,Y':
          {
            retVal = make16bitNumber( vm.Memory[address+1], (vm.Memory[address] + vm.Registers.IndexRegisterY) );
            break;
          }            
          case 'Accumulator':
          {
            retVal = vm.Registers.Accumulator;
            break;
          }             
          case 'Zero Page,X':
          {
            retVal = make16bitNumber( 0, (vm.Memory[address] + vm.Registers.IndexRegisterX) );
            break;
          }               
          case 'Zero Page,Y':
          {
            retVal = make16bitNumber( 0, (vm.Memory[address] + vm.Registers.IndexRegisterY) );
            break;
          }             
          
          case 'Indirect,X':
          {
            var pointer = vm.Memory[address]
            retVal = make16bitNumber( 0, (vm.Memory[pointer] + vm.Registers.IndexRegisterX) );
            break;
          }            
          case 'Indirect,Y':
          {
            var pointer = vm.Memory[address]
            retVal = make16bitNumber( 0, (vm.Memory[pointer] + vm.Registers.IndexRegisterY) );
            break;
          }            
        }
      }
      return retVal;
    }    

    function writeMem( address, byte ){
      vm.Memory[address] = byte;
      vm.MemoryChange.push(address);
    }

    function setFlags( opCode, byte ){
      setZeroFlag( opCode, 0 );
      setNegativeFlag( opCode, 0 );

      if ( byte == 0 ){
        setZeroFlag( opCode, 1 );
      }
      if (byte & 0x80){
        setNegativeFlag( opCode, 1 );
      }

      //vm.Registers.CarryFlag = 0;
      //vm.Registers.OverflowFlag = 0;
    }

    function setAccumulator( opCode, value ){
      vm.Registers.Accumulator = value;
      vm.Registers.AccumulatorChanged = true;
      setFlags( opCode, vm.Registers.Accumulator );
    }

    function setStackPointer( opCode, value ){
      vm.Registers.StackPointer = value;
      vm.Registers.StackPointerChanged = true;

      vm.StackMemory = [];
      for( var i = 0x01ff; i > vm.Registers.StackPointer + 0x100; i-- ){
        vm.StackMemory.push(i);
      }      
    }

    function setIndexRegisterX( opCode, value ){
      if ( value < 0){
        value = 0xFF;
      }
      else if ( value > 0xFF ){
        value = 0;
      }
      vm.Registers.IndexRegisterX = value;
      vm.Registers.IndexRegisterXChanged = true;
      setFlags( opCode, value );
    }

    function setIndexRegisterY( opCode, value ){
      if ( value < 0){
        value = 0xFF;
      }
      else if ( value > 0xFF ){
        value = 0;
      }
      vm.Registers.IndexRegisterY = value;
      vm.Registers.IndexRegisterYChanged = true;
      setFlags( opCode, value );
    }    

    function setCarryFlag( opCode, value ){
      vm.Registers.CarryFlag = value;
      vm.Registers.CarryFlagChanged = true;
    } 

    function setZeroFlag( opCode, value ){
      vm.Registers.ZeroFlag = value;
      vm.Registers.ZeroFlagChanged = true;
    } 
    
    function setOverflowFlag( opCode, value ){
      vm.Registers.OverflowFlag = value;
      vm.Registers.OverflowFlagChanged = true;
    }     

    function setNegativeFlag( opCode, value ){
      vm.Registers.NegativeFlag = value;
      vm.Registers.NegativeFlagChanged = true;
    }    

    function setInterruptDisable( opCode, value ){
      vm.Registers.InterruptDisable = value;
      vm.Registers.InterruptDisableChanged = true;
    }

    function setDecimalMode( opCode, value ){
      vm.Registers.DecimalMode = value;
      vm.Registers.DecimalModeChanged = true;
    }    

    function clearChangedFlags(){
      vm.MemoryChange = [];
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