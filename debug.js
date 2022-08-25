/*
    Debug object keeps track for memory address that have been read or written as
    well has tracking registers that have changed.
*/
function Debug() {
    let memory = {};
    let registers = {};
    let enabled = false;
    let errorMsg = null;

    function enable(value){
        enabled = value;
    }

    function reset(){
        memory.read = [];
        memory.write = [];
        registers.ProgramCounter = false;
        registers.StackPointer = false;
        registers.Accumulator = false;
        registers.IndexRegisterX = false;
        registers.IndexRegisterY = false;
        registers.CarryFlag = false;
        registers.ZeroFlag = false;
        registers.InterruptDisable = false;
        registers.DecimalMode = false;
        registers.OverflowFlag = false;
        registers.NegativeFlag = false;    
    }

    function memoryRead(address)
    {
        if ( enabled ){
            memory.read.push(address);
        }
    }

    function memoryWrite(address)
    {
        if ( enabled ){
            memory.write.push(address);
        }
    }

    function registerChanged( registerName ){
        registerName = registerName.trim();
        if (  registers[registerName] != undefined ){
            registers[registerName] = true;
        }
    }

    function stackPointerChanged(value){
        registerChanged("StackPointer");
        memory.stack = [];
        for( var i = 0x01ff; i > value + 0x100; i-- ){
            memory.stack.push(i);
        }  
    }

    return {
        enable : enable,
        reset : reset,
        memoryRead : memoryRead,
        memoryWrite : memoryWrite,
        registerChanged : registerChanged,
        stackPointerChanged : stackPointerChanged,
        memory : memory,
        registers : registers,
        errorMsg : errorMsg
    };
}

angular.module("App").service("Debug", Debug);