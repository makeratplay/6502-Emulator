function CPU($log, $filter, Memory, Debug, OpCodes) {
    let registers = {};
    let instructions = {};

    function reset() {
        registers.ProgramCounter = 0xfd22;
        registers.StackPointer = 0xfffff;
        registers.Accumulator = 0xfffff;
        registers.IndexRegisterX = 0x1;
        registers.IndexRegisterY = 0x2;

        registers.CarryFlag = 0;
        registers.ZeroFlag = 0;
        registers.InterruptDisable = 0;
        registers.DecimalMode = 0;
        registers.OverflowFlag = 0;
        registers.NegativeFlag = 0;
    }

    function saveState(){
        localStorage.setItem("registers", JSON.stringify(registers));
    }

    function loadState(){
        let savedData = JSON.parse(localStorage.getItem("registers"));
        Object.keys(savedData).forEach(key => registers[key] = savedData[key]);
    }

    function stepInstruction() {
        instructionCode = popByte();
        var instruction = OpCodes.OpCodeList[instructionCode];
        if (instruction != undefined) {
            instructions[instruction.Name](instruction);
        } else {
            $log.error($filter('hex')(instructionCode) + ' is not a valid opcode.');
            Debug.errorMsg = $filter('hex')(instructionCode) + ' is not a valid opcode.';
        }
    }

    function pushStack(byte) {
        var address = 0x0100 + (registers.StackPointer & 0xFF);
        Memory.write(address, byte);
        setStackPointer(--registers.StackPointer);
    }

    function pushStackWord(word){
        //The program counter is loaded least signifigant byte first. 
        //Therefore the most signifigant byte must be pushed first when creating a false return address.
        pushStack((word >> 8) & 0xFF ); // Most Significant Byte (MSB)
        pushStack(word  & 0xFF ); // Least Significant Byte (LSB)
    }

    function popStack() {
        setStackPointer(++registers.StackPointer);
        var address = 0x0100 + (registers.StackPointer & 0xFF);
        return Memory.read(address);
    }

    function popStackWord(){
        //The program counter is loaded least signifigant byte first. 
        //Therefore the most signifigant byte must be pushed first when creating a false return address.
        let lsb = popStack();
        let msb = popStack();
        return ((msb << 8) | lsb) & 0xFFFF;
    }

    // fetch next byte from memory based on Program Counter
    function popByte(){
        return (Memory.read(registers.ProgramCounter++) & 0xFF);
    }

    // fetch next 16 bit word from memory based on Program Counter
    function popWord() {
        return popByte() + (popByte() << 8);
    }

    function writeToMemory(address, byte) {
        if (address >= 0 && address <= 0xFFFF) {
            if (address >= 0x2000 && address <= 0x7fff) {
                $log.error('Blocked memory write to adress ' + $filter('hex')(address, 16))
            } else if (address >= 0xa000) {
                $log.error('Blocked memory write to adress ' + $filter('hex')(address, 16))
            } else {
                Memory.write(address, byte);
            }
        } else {
            $log.error('Bad write to memory address: ' + address);
        }
    }

    function readFromMemory(address) {
        var retVal = 0;
        if (address >= 0 && address <= 0xFFFF) {
            retVal = Memory.read(address);
        } else {
            $log.error('Bad read from memory address :' + address);
        }
        return retVal;
    }

    function resolveAddress(mode) {
        var retVal = 0;
        switch (mode) {
            case 'Implicit':
                {
                    // For many 6502 instructions the source and destination of the information to be manipulated is implied directly by the 
                    // function of the instruction itself and no further operand needs to be specified. Operations like 'Clear Carry Flag' (CLC) 
                    // and 'Return from Subroutine' (RTS) are implicit.
                    retVal = null;
                    break;
                }
            case 'Accumulator': // A
                {
                    // Instruction to operate directly upon the accumulator. The programmer specifies this by using a special operand value, 'A'
                    retVal = null;
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
            case 'Immediate': // #$c0
                {
                    // Immediate addressing allows the programmer to directly specify an 8 bit constant within the instruction. It is indicated 
                    // by a '#' symbol followed by an numeric expression. Return the address provided as this should be the address of the byte 
                    // right after the OpCode
                    retVal = registers.ProgramCounter++;
                    break;
                }
            case 'Zero Page': // zp  -- $c0
                {
                    // An instruction using zero page addressing mode has only an 8 bit address operand. This limits it to addressing only the 
                    // first 256 bytes of memory (e.g. $0000 to $00FF) where the most significant byte of the address is always zero. In zero 
                    // page mode only the least significant byte of the address is held in the instruction making it shorter by one byte 
                    // (important for space saving) and one less memory fetch during execution (important for speed). 
                    retVal = popByte();
                    break;
                }
            case 'Zero Page,X': //  zp,X -- $c0,X
                {
                    // The address to be accessed by an instruction using indexed zero page addressing is calculated by taking the 8 bit zero 
                    // page address from the instruction and adding the current value of the X register to it. For example if the X register 
                    // contains $0F and the instruction LDA $80,X is executed then the accumulator will be loaded from $008F (e.g. $80 + $0F => $8F).  
                    // The address calculation wraps around if the sum of the base address and the register exceed $FF. If we repeat the last 
                    // example but with $FF in the X register then the accumulator will be loaded from $007F (e.g. $80 + $FF => $7F) and not $017F.
                    retVal = (popByte() + registers.IndexRegisterX) & 0xFF;
                    break;
                }
            case 'Zero Page,Y': // $c0,Y
                {
                    // The address to be accessed by an instruction using indexed zero page addressing is calculated by taking the 8 bit zero 
                    // page address from the instruction and adding the current value of the Y register to it. Same as 'Zero Page,X'. This mode 
                    // can only be used with the LDX and STX instructions.
                    retVal = (popByte() + registers.IndexRegisterY) & 0xFF;
                    break;
                }
            case 'Absolute': // $c000
                {
                    // Instructions using absolute addressing contain a full 16 bit address to identify the target location.
                    retVal = popWord();
                    break;
                }
            case 'Absolute,X': // $c000,X
                {
                    // The address to be accessed by an instruction using X register indexed absolute addressing is computed by taking the 
                    // 16 bit address from the instruction and added the contents of the X register. For example if X contains $92 then an 
                    // STA $2000,X instruction will store the accumulator at $2092 (e.g. $2000 + $92). 
                    retVal = popWord() + registers.IndexRegisterX;
                    break;
                }
            case 'Absolute,Y': // $c000,Y
                {
                    // The Y register indexed absolute addressing mode is the same as the previous mode only with the contents of the 
                    // Y register added to the 16 bit address from the instruction.
                    retVal = popWord() + registers.IndexRegisterY;
                    break;
                }
            case 'Indirect': // ($c000)
                {
                    // JMP is the only 6502 instruction to support indirection. The instruction contains a 16 bit address which identifies 
                    // the location of the least significant byte of another 16 bit memory address which is the real target of the instruction.
                    // For example if location $0120 contains $FC and location $0121 contains $BA then the instruction JMP ($0120) will cause 
                    // the next instruction execution to occur at $BAFC (e.g. the contents of $0120 and $0121).
                    retVal = Memory.readWord(popWord());
                    break;
                }
            case 'Indirect,X': // (zp,X) Indexed indirect: ($c0,X) 
                {
                    // Indexed indirect addressing is normally used in conjunction with a table of address held on zero page. The address 
                    // of the table is taken from the instruction and the X register added to it (with zero page wrap around) to give the 
                    // location of the least significant byte of the target address.
                    retVal = Memory.readWord((popByte() + registers.IndexRegisterX) & 0xFF);
                    break;
                }
            case 'Indirect,Y': // Indirect indexed: ($c0),Y
                {
                    // Indirect addressing is the most common indirection mode used on the 6502. The instruction contains the zero page
                    // location of the least significant byte of 16 bit address. The Y register is dynamically added to this value to 
                    // generated the actual target address for operation.
                    retVal = Memory.readWord(popByte()) + registers.IndexRegisterY;
                    break;
                }
        }
        return retVal;
    }


    /* #region set registers methods */

    function setAccumulator(value) {
        registers.Accumulator = value & 0xFF;
        Debug.registerChanged("Accumulator");
    }

    function setStackPointer(value) {
        registers.StackPointer = value & 0xFF;
        Debug.stackPointerChanged(registers.StackPointer);
    }

    function setIndexRegisterX(value) {
        registers.IndexRegisterX = value & 0xFF;
        Debug.registerChanged("IndexRegisterX");
    }

    function setIndexRegisterY(value) {
        registers.IndexRegisterY = value & 0xFF;
        Debug.registerChanged("IndexRegisterY");
    }

    function setCarryFlag(value) {
        registers.CarryFlag = value == 0 ? false : true;
        Debug.registerChanged("CarryFlag");
    }

    function setZeroFlag(value) {
        registers.ZeroFlag = value == 0 ? false : true;
        Debug.registerChanged("ZeroFlag");
    }

    function setOverflowFlag(value) {
        registers.OverflowFlag = value == 0 ? false : true;
        Debug.registerChanged("OverflowFlag");
    }

    function setNegativeFlag(value) {
        registers.NegativeFlag = value == 0 ? false : true;
        Debug.registerChanged("NegativeFlag");
    }

    function setInterruptDisable(value) {
        registers.InterruptDisable = value == 0 ? false : true;
        Debug.registerChanged("InterruptDisable");
    }

    function setDecimalMode(value) {
        registers.DecimalMode = value == 0 ? false : true;
        Debug.registerChanged("DecimalMode");
    }

    /* #endregion */

    function relativeBranch(offset){
        if (offset > 127) {
            offset -= 256;
        }
        registers.ProgramCounter = registers.ProgramCounter + offset;
        Debug.registerChanged("ProgramCounter");
    }

    function addOnlyLSB(byte, number) {
        var lsb = number & 0xFF;
        lsb = byteAdd(lsb, byte);
        number = number & 0xFF00;
        return (number | lsb)
    }

    function byteAdd(byte1, byte2) {
        var retVal = byte1 + byte2;
        return retVal & 0xFF;
    }

    function ALU(byte) {
        var sum = registers.Accumulator + byte + registers.CarryFlag;
        if (registers.DecimalMode) {
            if (((registers.Accumulator ^ byte ^ sum) & 0x10) == 0x10) {
                sum += 0x06;
            }
            if ((sum & 0xf0) > 0x90) {
                sum += 0x60;
            }
        }

        setOverflowFlag(((registers.Accumulator ^ sum) & (byte ^ sum) & 0x80) == 0x80);
        setCarryFlag(sum & 0x100);
        setNegativeFlag(sum & 0x80);
        setAccumulator(sum & 0xFF);
        setZeroFlag(registers.Accumulator == 0);
    }

    function byteROR(byte, bit7) {
        // bit7 -> [76543210] -> C
        if (bit7) {
            byte = (byte | 0x100);
        }
        byte = byte >>> 1;
        return byte;
    }

    function byteROL(byte, bit0) {
        // C <- [76543210] <- bit0

        let bit7 = ((byte >> 7) & 1);
        byte = (byte << 1) & 0xFF;
        if (bit0) {
            byte = (byte | 0x1);
        }
        setCarryFlag(bit7); // Set to contents of old bit 7
        setNZFlags(byte);
        return byte;
    }

    function printBits(byte) {
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


    /* #region instructions */

    instructions.ADC = function(instruction) // Add with Carry                   
    {
        // A,Z,C,N = A+M+C
        // This instruction adds the contents of a memory location to the accumulator together with the carry bit. If overflow occurs the carry 
        // bit is set, this enables multiple byte addition to be performed.
        let address = resolveAddress(instruction.Mode);
        let byte = readFromMemory(address);
        ALU(byte);
    }

    instructions.AND = function(instruction) // Logical AND
    {
        // A,Z,N = A&M
        // A logical AND is performed, bit by bit, on the accumulator contents using the contents of a byte of memory.
        let address = resolveAddress(instruction.Mode);
        let byte = readFromMemory(address);          
        setAccumulator(registers.Accumulator & byte);
        setNZFlags(registers.Accumulator);
    }

    instructions.ASL = function(instruction) // Arithmetic Shift Left
    {
        // A,Z,C,N = M*2 or M,Z,C,N = M*2
        // This operation shifts all the bits of the accumulator or memory contents one bit left. Bit 0 is set to 0 and bit 7 is placed 
        // in the carry flag. The effect of this operation is to multiply the memory contents by 2 (ignoring 2's complement considerations), 
        // setting the carry if the result will not fit in 8 bits.
        // c <- [76543210] <- 0
        if (instruction.Mode == 'Accumulator') {
            var byte = registers.Accumulator;
            byte = byteROL(byte, 0);
            setAccumulator(byte);
        } else {
            var address = resolveAddress(instruction.Mode);
            var byte = readFromMemory(address);
            byte = byteROL(byte, 0);
            writeToMemory(address, byte);
        }
    }

    instructions.BCC = function(instruction) // Branch if Carry Clear
    {
        // If the carry flag is clear then add the relative displacement to the program counter to cause a branch to a new location.
        var byte = popByte();
        if (registers.CarryFlag == 0) {
            relativeBranch(byte);
        }
    }

    instructions.BCS = function(instruction) // Branch if Carry Set
    {
        // If the carry flag is set then add the relative displacement to the program counter to cause a branch to a new location.
        var byte = popByte();
        if (registers.CarryFlag == 1) {
            relativeBranch(byte);
        }
    }

    instructions.BEQ = function(instruction) // Branch if Equal
    {
        // If the zero flag is set then add the relative displacement to the program counter to cause a branch to a new location.
        var byte = popByte();
        if (registers.ZeroFlag == 1) {
            relativeBranch(byte);
        }
    }

    instructions.BIT = function(instruction) // Bit Test                  
    {
        // A & M, N = M7, V = M6, Z 
        // This instructions is used to test if one or more bits are set in a target memory location. The mask pattern in A is ANDed with the value in 
        // memory to set or clear the zero flag, but the result is not kept. Bits 7 and 6 of the value from memory are copied into the N and V flags.
        let address = resolveAddress(instruction.Mode);
        let byte = readFromMemory(address);
        setZeroFlag(registers.Accumulator & byte);
        setOverflowFlag((byte >> 6) & 1); // Set if bit 6 set)
        setNegativeFlag((byte >> 7) & 1); // Set if bit 7 set
    }

    instructions.BMI = function(instruction) // Branch if Minus
    {
        // If the negative flag is set then add the relative displacement to the program counter to cause a branch to a new location.
        var byte = popByte();
        if (registers.NegativeFlag == 1) {
            relativeBranch(byte);
        }
    }

    instructions.BNE = function(instruction) // Branch if Not Equal
    {
        // If the zero flag is clear then add the relative displacement to the program counter to cause a branch to a new location.
        var byte = popByte();
        if (registers.ZeroFlag == 0) {
            relativeBranch(byte);
        }
    }

    instructions.BPL = function(instruction) // Branch if Positive
    {
        // If the negative flag is clear then add the relative displacement to the program counter to cause a branch to a new location.
        var byte = popByte();
        if (registers.NegativeFlag == 0) {
            relativeBranch(byte);
        }
    }

    instructions.BRK = function(instruction) // Force Interrupt                    
        {
            // B set to 1
            // The BRK instruction advances the program counter by 2, then forces the generation of an interrupt request. The program counter and 
            // processor status are pushed on the stack. The processor status register on the stack with bit 4 set to 1. This way, the program can 
            // distinguish a BRK from an IRQ, which pushes the status with bit 4 cleared to 0. Then the IRQ interrupt vector at $FFFE/$FFFF is loaded into the PC.

            var returnAddress = registers.ProgramCounter += 1;
            pushStackWord(returnAddress);

            var byte = 0x10; // set bit 4
            if (registers.NegativeFlag) {
                byte = byte | 0x80; // bit 7
            }
            if (registers.OverflowFlag) {
                byte = byte | 0x40; // bit 6
            }
            if (registers.DecimalMode) {
                byte = byte | 0x08; // bit 3
            }
            if (registers.InterruptDisable) {
                byte = byte | 0x04; // bit 2
            }
            if (registers.ZeroFlag) {
                byte = byte | 0x02; // bit 1
            }
            if (registers.CarryFlag) {
                byte = byte | 0x01; // bit 0
            }
            pushStack(byte);

            var jumpAddress = resolveAddress(0xFFFE, 'Absolute');
            registers.ProgramCounter = jumpAddress;
            Debug.registerChanged("ProgramCounter");


        }

    instructions.BVC = function(instruction) // Branch if Overflow Clear
    {
        // If the overflow flag is clear then add the relative displacement to the program counter to cause a branch to a new location.
        var byte = popByte();
        if (registers.OverflowFlag == 0) {
            relativeBranch(byte);
        }
    }

    instructions.BVS = function(instruction) // Branch if Overflow Set
    {
        // If the overflow flag is set then add the relative displacement to the program counter to cause a branch to a new location.
        var byte = popByte();
        if (registers.OverflowFlag == 1) {
            relativeBranch(byte);
        }
    }

    instructions.CLC = function(instruction) // Clear Carry Flag
    {
        // C = 0
        // Set the carry flag to zero.
        setCarryFlag(0);
    }

    instructions.CLD = function(instruction) // Clear Decimal Mode
    {
        // D = 0
        // Sets the decimal mode flag to zero.
        setDecimalMode(0);
    }

    instructions.CLI = function(instruction) // Clear Interrupt Disable
    {
        // I = 0
        // Clears the interrupt disable flag allowing normal interrupt requests to be serviced.
        setInterruptDisable(0);
    }

    instructions.CLV = function(instruction) // Clear Overflow Flag
    {
        // V = 0
        // Clears the overflow flag.
        setOverflowFlag(0);
    }

    instructions.CMP = function(instruction) // Compare
    {
        // Z,C,N = A-M  Set C if A >= M, Set Z if A = M, Set N if bit 7 of the result is set
        // This instruction compares the contents of the accumulator with another memory held value and sets the zero and carry flags as appropriate.
        let address = resolveAddress(instruction.Mode);
        let byte = readFromMemory(address);
        setCarryFlag(registers.Accumulator >= byte); // Set if A >= M
        setNZFlags((registers.Accumulator - byte) & 0xFF);
    }

    instructions.CPX = function(instruction) // Compare X Register
    {
        // Z,C,N = X-M Set C if A >= M, Set Z if A = M, Set N if bit 7 of the result is set
        // This instruction compares the contents of the X register with another memory held value and sets the zero and carry flags as appropriate.
        let address = resolveAddress(instruction.Mode);
        let byte = readFromMemory(address);
        setCarryFlag(registers.IndexRegisterX >= byte); // Set if X >= M
        setNZFlags((registers.IndexRegisterX - byte) & 0xFF);
    }

    instructions.CPY = function(instruction) // Compare Y Register
    {
        // Z,C,N = Y-M Set C if A >= M, Set Z if A = M, Set N if bit 7 of the result is set
        // This instruction compares the contents of the Y register with another memory held value and sets the zero and carry flags as appropriate.
        let address = resolveAddress(instruction.Mode);
        let byte = readFromMemory(address);        
        setCarryFlag(registers.IndexRegisterY >= byte); // Set if Y >= M
        setNZFlags((registers.IndexRegisterY - byte) & 0xFF);
    }

    instructions.DEC = function(instruction) // Decrement Memory
    {
        // M,Z,N = M-1
        // Subtracts one from the value held at a specified memory location setting the zero and negative flags as appropriate.
        let address = resolveAddress(instruction.Mode);
        let byte = readFromMemory(address);        
        byte = byteAdd(byte, -1);
        writeToMemory(address, byte);
        setNZFlags(byte);
    }

    instructions.DEX = function(instruction) // Decrement X Register
    {
        // X,Z,N = X-1
        // Subtracts one from the X register setting the zero and negative flags as appropriate.
        var byte = byteAdd(registers.IndexRegisterX, -1);
        setIndexRegisterX(byte);
        setNZFlags(registers.IndexRegisterX);
    }

    instructions.DEY = function(instruction) // Decrement Y Register
    {
        // Y,Z,N = Y-1
        // Subtracts one from the Y register setting the zero and negative flags as appropriate.
        var byte = byteAdd(registers.IndexRegisterY, -1);
        setIndexRegisterY(byte);
        setNZFlags(registers.IndexRegisterY);
    }

    instructions.EOR = function(instruction) // Exclusive OR
    {
        // A,Z,N = A^M
        // An exclusive OR is performed, bit by bit, on the accumulator contents using the contents of a byte of memory.
        let address = resolveAddress(instruction.Mode);
        let byte = readFromMemory(address);
        setAccumulator(registers.Accumulator ^ byte);
        setNZFlags(registers.Accumulator);
    }

    instructions.INC = function(instruction) // Increment Memory
    {
        // M,Z,N = M+1
        // Adds one to the value held at a specified memory location setting the zero and negative flags as appropriate.
        let address = resolveAddress(instruction.Mode);
        let byte = readFromMemory(address);        
        byte = byteAdd(byte, 1);
        writeToMemory(address, byte);
        setNZFlags(byte);
    }

    instructions.INX = function(instruction) // Increment X Register
    {
        // X,Z,N = X+1
        // Adds one to the X register setting the zero and negative flags as appropriate.
        var byte = byteAdd(registers.IndexRegisterX, 1);
        setIndexRegisterX(byte);
        setNZFlags(registers.IndexRegisterX);         
    }

    instructions.INY = function(instruction) // Increment Y Register
    {
        // Y,Z,N = Y+1
        // Adds one to the Y register setting the zero and negative flags as appropriate.
        var byte = byteAdd(registers.IndexRegisterY, 1);
        setIndexRegisterY(byte);
        setNZFlags(registers.IndexRegisterY);
    }

    instructions.JMP = function(instruction) // Jump
    {
        // Sets the program counter to the address specified by the operand.
        var jumpAddress = resolveAddress(instruction.Mode);
        registers.ProgramCounter = jumpAddress;
        Debug.registerChanged("ProgramCounter");
    }

    instructions.JSR = function(instruction) // Jump to Subroutine
    {
        // The JSR instruction pushes the address (minus one) of the return point on to the stack and then sets the program counter to the target memory address.
        var jumpAddress = resolveAddress(instruction.Mode);
        var returnAddress = registers.ProgramCounter - 1;
        pushStackWord(returnAddress);
        registers.ProgramCounter = jumpAddress;
        Debug.registerChanged("ProgramCounter");
    }

    instructions.LDA = function(instruction) // Load Accumulator
    {
        // A,Z,N = M
        // Loads a byte of memory into the accumulator setting the zero and negative flags as appropriate.
        let address = resolveAddress(instruction.Mode);
        let byte = readFromMemory(address);
        setAccumulator(byte);
        setNZFlags(registers.Accumulator);
    }

    instructions.LDX = function(instruction) // Load X Register
    {
        // X,Z,N = M
        // Loads a byte of memory into the X register setting the zero and negative flags as appropriate.
        let address = resolveAddress(instruction.Mode);
        let byte = readFromMemory(address);
        setIndexRegisterX(byte);
        setNZFlags(registers.IndexRegisterX);
    }

    instructions.LDY = function(instruction) // Load Y Register
    {
        // Y,Z,N = M
        // Loads a byte of memory into the Y register setting the zero and negative flags as appropriate.
        let address = resolveAddress(instruction.Mode);
        let byte = readFromMemory(address);
        setIndexRegisterY(byte);
        setNZFlags(registers.IndexRegisterY);
    }

    instructions.LSR = function(instruction) // Logical Shift Right
    {
        // A,C,Z,N = A/2 or M,C,Z,N = M/2
        // Each of the bits in A or M is shift one place to the right. The bit that was in bit 0 is shifted into the carry flag. Bit 7 is set to zero.
        // 0 -> [76543210] -> C
        if (instruction.Mode == 'Accumulator') {
            var byte = registers.Accumulator;
            var bit0 = byte & 0x1;
            byte = byteROR(byte, 0);
            setCarryFlag(instruction, bit0); // Set to contents of old bit 0
            setAccumulator(byte);
            setZeroFlag(byte == 0); // Set if A = 0
            setNegativeFlag(byte & 0x80); // Set if bit 7 of the result is set
        } else {
            let address = resolveAddress(instruction.Mode);
            let byte = readFromMemory(address);
            var bit0 = byte & 0x1;
            byte = byteROR(byte, 0);
            setCarryFlag(bit0); // Set to contents of old bit 0
            writeToMemory(address, byte);
            setNegativeFlag(byte & 0x80); // Set if bit 7 of the result is set
        }
    }

    instructions.NOP = function(instruction) // No Operation
    {
        // The NOP instruction causes no changes to the processor other than the normal incrementing of the program counter to the next instruction.
    }

    instructions.ORA = function(instruction) // Logical Inclusive OR
    {
        // A,Z,N = A|M
        // An inclusive OR is performed, bit by bit, on the accumulator contents using the contents of a byte of memory.
        let address = resolveAddress(instruction.Mode);
        let byte = readFromMemory(address);        
        setAccumulator(registers.Accumulator | byte);
        setNZFlags(registers.Accumulator);
    }

    instructions.PHA = function(instruction) // Push Accumulator
    {
        // Pushes a copy of the accumulator on to the stack.
        pushStack(registers.Accumulator);
    }

    instructions.PHP = function(instruction) // Push Processor Status
    {
        // Pushes a copy of the status flags on to the stack.
        var byte = 0;
        if (registers.NegativeFlag) {
            byte = byte | 0x80;
        }
        if (registers.OverflowFlag) {
            byte = byte | 0x40;
        }
        if (registers.DecimalMode) {
            byte = byte | 0x08;
        }
        if (registers.InterruptDisable) {
            byte = byte | 0x04;
        }
        if (registers.ZeroFlag) {
            byte = byte | 0x02;
        }
        if (registers.CarryFlag) {
            byte = byte | 0x01;
        }
        pushStack(byte);
    }

    instructions.PLA = function(instruction) // Pull Accumulator
    {
        // A,Z,N
        // Pulls an 8 bit value from the stack and into the accumulator. The zero and negative flags are set as appropriate.
        var byte = popStack();
        setAccumulator(byte);
        setNZFlags(byte);
    }

    instructions.PLP = function(instruction) // Pull Processor Status
    {
        // all set from stack
        // Pulls an 8 bit value from the stack and into the processor flags. The flags will take on new states as determined by the value pulled.
        var byte = popStack();
        setNegativeFlag(byte & 0x80);
        setOverflowFlag(byte & 0x40);
        setDecimalMode(byte & 0x08);
        setInterruptDisable(byte & 0x04);
        setZeroFlag(byte & 0x02);
        setCarryFlag(byte & 0x01);
    }
   
    instructions.ROL = function(instruction) // Rotate Left
    {
        // C,Z,N
        // Move each of the bits in either A or M one place to the left. Bit 0 is filled with the current value of the carry flag whilst 
        // the old bit 7 becomes the new carry flag value.
        // C <- [76543210] <- C 
        let byte = 0;
        if (instruction.Mode == 'Accumulator') {
            byte = registers.Accumulator;
            byte = byteROL(byte, registers.CarryFlag);
            setAccumulator(byte);
        } else {
            let address = resolveAddress(instruction.Mode);
            byte = readFromMemory(address);
            byte = byteROL(byte, registers.CarryFlag);
            writeToMemory(address, byte);
        }
    }

//TOOD test this OpCode    
    instructions.ROR = function(instruction) // Rotate Right
    {
        // C,Z,N
        // Move each of the bits in either A or M one place to the right. Bit 7 is filled with the current value of the carry flag whilst the old bit 0 
        // becomes the new carry flag value.
        // C -> [76543210] -> C 
        let byte = 0;
        if (instruction.Mode == 'Accumulator') {
            byte = registers.Accumulator;
            let bit0 = byte & 0x1;
            byte = byteROR(byte, registers.CarryFlag);
            setCarryFlag(instruction, bit0); // Set to contents of old bit 0
            setAccumulator(byte);
        } else {
            let address = resolveAddress(instruction.Mode);
            byte = readFromMemory(address);            
            let bit0 = byte & 0x1;
            byte = byteROR(byte, registers.CarryFlag);
            setCarryFlag(bit0); // Set to contents of old bit 0
            writeToMemory(address, byte);
        }
        setNZFlags(byte);
    }

    instructions.RTI = function(instruction) // Return from Interrupt 
    {
        // all set from stack
        // The RTI instruction is used at the end of an interrupt processing routine. It pulls the processor flags from the stack followed by the program counter.
        let byte = popStack();
        setNegativeFlag(byte & 0x80);
        setOverflowFlag(byte & 0x40);
        setDecimalMode(byte & 0x08);
        setInterruptDisable(byte & 0x04);
        setZeroFlag(byte & 0x02);
        setCarryFlag(byte & 0x01);

        let returnAddress = popStackWord();
        registers.ProgramCounter = returnAddress + 1;
        Debug.registerChanged("ProgramCounter");
    }

    instructions.RTS = function(instruction) // Return from Subroutine
    {
        // The RTS instruction is used at the end of a subroutine to return to the calling routine. It pulls the program counter (minus one) from the stack.
        let returnAddress = popStackWord();
        registers.ProgramCounter = returnAddress + 1;
        Debug.registerChanged("ProgramCounter");
    }

    instructions.SBC = function(instruction) // Subtract with Carry                
    {
        // A,Z,C,N = A-M-(1-C)
        // This instruction subtracts the contents of a memory location to the accumulator together with the not of the carry bit. If overflow occurs the carry 
        // bit is clear, this enables multiple byte subtraction to be performed.
        let address = resolveAddress(instruction.Mode);
        let byte = readFromMemory(address);
        byte = ~byte + 1; // Two's complement
        ALU(byte);
    }

    instructions.SEC = function(instruction) // Set Carry Flag
    {
        // C = 1
        // Set the carry flag to one.
        setCarryFlag(1);
    }

    instructions.SED = function(instruction) // Set Decimal Flag
    {
        // D = 1
        // Set the decimal mode flag to one.
        setDecimalMode(1);
    }

    instructions.SEI = function(instruction) // Set Interrupt Disable
    {
        // I = 1
        // Set the interrupt disable flag to one.
        setInterruptDisable(1);
    }

    instructions.STA = function(instruction) // Store Accumulator
    {
        // M = A
        // Stores the contents of the accumulator into memory.
        let address = resolveAddress(instruction.Mode);
        writeToMemory(address, registers.Accumulator);
    }

    instructions.STX = function(instruction) // Store X Register
    {
        // M = X
        // Stores the contents of the X register into memory.
        var address = resolveAddress(instruction.Mode);
        writeToMemory(address, registers.IndexRegisterX);
    }

    instructions.STY = function(instruction) // Store Y Register
    {
        // M = Y
        // Stores the contents of the Y register into memory.
        var address = resolveAddress(instruction.Mode);
        writeToMemory(address, registers.IndexRegisterY);
    }

    instructions.TAX = function(instruction) // Transfer Accumulator to X
    {
        // Z,N, X = A
        // Copies the current contents of the accumulator into the X register and sets the zero and negative flags as appropriate.
        setIndexRegisterX(registers.Accumulator);
        setNZFlags(registers.IndexRegisterX);
    }

    instructions.TAY = function(instruction) // Transfer Accumulator to Y
    {
        // Z,N, Y = A
        // Copies the current contents of the accumulator into the Y register and sets the zero and negative flags as appropriate.
        setIndexRegisterY(registers.Accumulator);
        setNZFlags(registers.IndexRegisterY);
    }

    instructions.TSX = function(instruction) // Transfer Stack Pointer to X
    {
        // Z,N, X = S
        // Copies the current contents of the stack register into the X register and sets the zero and negative flags as appropriate.
        setIndexRegisterX(registers.Stack);
        setNZFlags(registers.IndexRegisterX);
    }

    instructions.TXA = function(instruction) // Transfer X to Accumulator
    {
        // Z,N, A = X
        // Copies the current contents of the X register into the accumulator and sets the zero and negative flags as appropriate.
        setAccumulator(registers.IndexRegisterX);
        setNZFlags(registers.Accumulator);
    }

    instructions.TXS = function(instruction) // Transfer X to Stack Pointer
    {
        // S = X
        // Copies the current contents of the X register into the stack register.
        setStackPointer(registers.IndexRegisterX);
    }

    instructions.TYA = function(instruction) // Transfer Y to Accumulator
    {
        // Z,N, A = Y
        // Copies the current contents of the Y register into the accumulator and sets the zero and negative flags as appropriate.
        setAccumulator(registers.IndexRegisterY);
        setNZFlags(registers.Accumulator);
    }

    /* #endregion */

    function setNZFlags(byte){
        setNegativeFlag((byte >> 7) & 1);
        setZeroFlag(byte == 0);
    }

    return {
        reset: reset,
        registers: registers,
        instructions: instructions,
        stepInstruction: stepInstruction,
        saveState : saveState,
        loadState : loadState
    }
}

angular.module("App").service("CPU", CPU);