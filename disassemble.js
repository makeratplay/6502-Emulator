function Disassemble(Memory, OpCodes) {
    let ProgramCounter = 0;
    let AssemblyCode = [1, 2, 3];

    //function init() {}

    function disassemble(startAddress, length) {
        AssemblyCode.length = 0;
        ProgramCounter = startAddress;
        endAddress = startAddress + length;
        while (ProgramCounter < endAddress) {
            let instruction = {};
            instruction.Address = ProgramCounter;
            instruction.OpCode = OpCodes.OpCodeList[popByte()];
            if (instruction.OpCode != undefined) {
                instruction.HexDump = twoDigitHex(instruction.OpCode.OpCode);
                switch (instruction.OpCode.Length) {
                    case 2:
                        instruction.Params = twoDigitHex(popByte());
                        instruction.HexDump += " " + instruction.Params;
                        break;
                    case 3:
                        instruction.Params = fourDigitHex(popWord());
                        instruction.HexDump += " " + instruction.Params.substr(-2);
                        instruction.HexDump += " " + instruction.Params.substr(0, 2);
                        break;
                }
                instruction.Params = formatParam(instruction);
                AssemblyCode.push(instruction);
            }
        }
    }

    function formatParam(instruction) {
        let retVal = "";
        switch (instruction.OpCode.Mode) {
            case 'Absolute': // $c000
                {
                    retVal = ' $' + instruction.Params;
                    break;
                }
            case 'Zero Page': // $c0
                {
                    retVal = ' $' + instruction.Params;
                    break;
                }
            case 'Absolute,X': // $c000,X
                {
                    retVal = ' $' + instruction.Params + ',X';
                    break;
                }
            case 'Absolute,Y': // $c000,Y
                {
                    retVal = ' $' + instruction.Params + ',Y';
                    break;
                }
            case 'Accumulator': // A
                {
                    retVal = ' A';
                    break;
                }
            case 'Immediate': // #$c0
                {
                    retVal = '#$' + instruction.Params;
                    break;
                }
            case 'Indirect': // ($c000)
                {
                    retVal = ' ($' + instruction.Params + ')';
                    break;
                }
            case 'Indirect,X': // Indexed indirect ($c0,X)
                {
                    retVal = ' ($' + instruction.Params + ',X)';
                    break;
                }
            case 'Indirect,Y': // Indirect indexed ($c0),Y
                {
                    retVal = ' ($' + instruction.Params + '),Y';
                    break;
                }
            case 'Zero Page,X': // $c0,X
                {
                    retVal = ' $' + instruction.Params + ',X';
                    break;
                }
            case 'Zero Page,Y': // $c0,Y
                {
                    retVal = ' $' + instruction.Params + ',Y';
                    break;
                }
            case 'Relative': // $c0
                {
                    let address = instruction.Address + 2;
                    let offset = parseInt("0x" + instruction.Params);
                    if (offset > 127) {
                        offset -= 256;
                    }
                    retVal = ' L_' + fourDigitHex(address + offset);
                    break;
                }
            case 'Implied':
                {
                    retVal = '';
                    break;
                }
        }
        return retVal;
    }

    function twoDigitHex(value) {
        return ("00" + value.toString(16)).substr(-2);
    }

    function fourDigitHex(value) {
        return ("0000" + value.toString(16)).substr(-4);
    }

    function popByte() {
        return (Memory.read(ProgramCounter++));
    }

    function popWord() {
        return popByte() + (popByte() << 8);
    }



    return {
        disassemble: disassemble,
        AssemblyCode: AssemblyCode
    }
}

angular.module("App").service("Disassemble", Disassemble);