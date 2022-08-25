function Screen(Memory) {
    
    let maxColumns = 22;
    let maxRows = 23;
    let pixalWidth = 16;

    /* Color is mapped to $9400-95FF or $9600-$97FF depending upon a setting in the VIC registers. Typically, it is $9600-$97FF 
       on an unexpanded or 3k expanded VIC, otherwise it is at $9400-95FF.
        
       The address of Colour RAM can be determined by looking at Bit 7 of location
       $9002. If this bit is 1, colour memory starts at location 38400. If this bit
       is 0, colour memory starts at location 37888. Use the following formula:

       C = 37888 + 4 * ( PEEK ( 36866 ) AND 128 )

    */
    let ColorMemoryAddressFlag = 0x9002;
    let ColorMemoryAddress = 0x9600;


    /* The Character ROM is 4 KB of onboard ROM used to supply character data to the Video Interface Chip (VIC). A register 
        on the VIC allows the character lookup address to be changed, so that custom characters can be used.

        The character ROM consists of four 1 KB ROMS:

          - $8000-$83FF: 1 KB uppercase/glyphs
          - $8400-$87FF: 1 KB uppercase/lowercase
          - $8800-$8BFF: 1 KB inverse uppercase/glyphs
          - $8C00-$8FFF: 1 KB inverse uppercase/lowercase

        Switching between lowercase and glyphs, or enabling and disabling inverse video, changes the character lookup address.
    */
    let CharacterMemoryAddress = 0x8000;

    /*  The system variable $0288, decimal 648, is used by the operation system to hold the high byte of the current base address 
        of the video RAM and in an unexpanded VIC 20 the value in this location is 30 which corresponds to the base address of $1E00. 
        In the unexpanded VIC 20 the operating system automatically allocates the area of RAM from $1E00-$1FFF for this purpose. 
        However, when extra RAM is added to the system to the system at $2000 it becomes necessary to change the allocation of 
        the video RAM to the area $1000-$11FF.
    */
    let VideoRamAddressHighBytePointer = 0x0288;
    let VideoRamAddress = 0x1E00;

    /*
    CRF: $900F - 36879. Usual value 27.
    This is the main colour selecting register of the VIC and has three distinct
    functions.
    Bits 0-2 are used to hold the border colour. In the VIC 20 there are eight
    colours that can be border colours and these are:

        0 - 000   Black     #000000
        1 - 001   White     #FFFFFF
        2 - 010   Red       #FF0000
        3 - 011   Cyan      #00FFFF
        4 - 100   Purple    #800080    
        5 - 101   Green     #00FF00
        6 - 110   Blue      #0000FF
        7 - 111   Yellow    #FFFF00

    These border colours can be selected by putting the required value into the
    bits 0-2 of control register CRF.
    Bit 3 is the reverse field control bit. At any time the state of this bit
    can be changed to reverse the whole display.
    Bits 4-7 hold the background colour for the display. There are 16 possible
    colours and the following tble fives the colours together with their codes.
    Note that these codes are the same for the auxiliary colours as used in the
    multicolour mode.

        0 - 0000   Black            #000000
        1 - 0001   White            #FFFFFF
        2 - 0010   Red              #FF0000
        3 - 0011   Cyan             #00FFFF
        4 - 0100   Purple           #800080
        5 - 0101   Green            #00FF00
        6 - 0110   Blue             #0000FF
        7 - 0111   Yellow           #FFFF00
        8 - 1000   Orange           #FFA500
        9 - 1001   Light orange     #FED8B1
        10 - 1010   Pink            #FFC0CB
        11 - 1011   Light cyan      #E0FFFF
        12 - 1100   Light purple    #B19CD9
        13 - 1101   Light green     #90EE90
        14 - 1110   Light blue      #ADD8E6
        15 - 1111   Light yellow    #FFFF99
    */
    let ColorRegisterAddress = 0x900F;
    let BorderColor = "#00FFFF";
    let BackgroundColor = "#FFFF00"

    function reset(){
        let value = 0;
        let address = VideoRamAddress;
        for(let row = 0; row < maxRows; row++ ){
            for ( let column = 0; column < maxColumns; column++ ){
                Memory.write(address++, value++);
            }
        }
    }

    function drawCharacter( ctx, row, column ){
        let videoMemoryIndex = (row * maxColumns) + column;
        let characterAddress = (Memory.read( VideoRamAddress + videoMemoryIndex) * 8) + CharacterMemoryAddress; 
        for ( let characterByteIndex = 0; characterByteIndex < 8; characterByteIndex++ ){
            let characterByte = Memory.read(characterAddress + characterByteIndex);
            for ( let charcterBitIndex = 0; charcterBitIndex < 8; charcterBitIndex++){
                if (  (characterByte >> charcterBitIndex) & 1 ) {
                    ctx.fillRect( (column * pixalWidth) + (pixalWidth - (charcterBitIndex*2)) , (row * pixalWidth) + (characterByteIndex*2), 2, 2);
                }            
            }
        }
    }

    function refresh(){
        // update Video RAM Address incase it changed
        let msb = Memory.read(VideoRamAddressHighBytePointer);
        VideoRamAddress = ((msb << 8) | 0) & 0xFFFF;

        // Update Color Memory Address incase it changes
        ColorMemoryAddress = 0x9400;
        if ( (Memory.read(ColorMemoryAddressFlag) >> 8) & 1 ){
            ColorMemoryAddress = 0x9600;
        }
        
        let colorRegValue = Memory.read(ColorRegisterAddress);

        let borderColorFlag = colorRegValue & 7;
        switch(borderColorFlag){
            case 0: BorderColor = "#000000"; break; // - 000   Black     #000000
            case 1: BorderColor = "#FFFFFF"; break; // - 001   White     #FFFFFF
            case 2: BorderColor = "#FF0000"; break; // - 010   Red       #FF0000
            case 3: BorderColor = "#00FFFF"; break; // - 011   Cyan      #00FFFF
            case 4: BorderColor = "#800080"; break; // - 100   Purple    #800080    
            case 5: BorderColor = "#00FF00"; break; // - 101   Green     #00FF00
            case 6: BorderColor = "#0000FF"; break; // - 110   Blue      #0000FF
            case 7: BorderColor = "#FFFF00"; break; // - 111   Yellow    #FFFF00
        }

        let backgroundColorFlag = colorRegValue >> 4;
        switch(backgroundColorFlag){
           case 0: BackgroundColor = "#000000"; break; // - 0000   Black            #000000
           case 1: BackgroundColor = "#FFFFFF"; break; //  - 0001   White            #FFFFFF
           case 2: BackgroundColor = "#FF0000"; break; //  - 0010   Red              #FF0000
           case 3: BackgroundColor = "#00FFFF"; break; //  - 0011   Cyan             #00FFFF
           case 4: BackgroundColor = "#800080"; break; //  - 0100   Purple           #800080
           case 5: BackgroundColor = "#00FF00"; break; //  - 0101   Green            #00FF00
           case 6: BackgroundColor = "#0000FF"; break; //  - 0110   Blue             #0000FF
           case 7: BackgroundColor = "#FFFF00"; break; //  - 0111   Yellow           #FFFF00
           case 8: BackgroundColor = "#FFA500"; break; //  - 1000   Orange           #FFA500
           case 9: BackgroundColor = "#FED8B1"; break; //  - 1001   Light orange     #FED8B1
           case 10: BackgroundColor = "#FFC0CB"; break; //  - 1010   Pink            #FFC0CB
           case 11: BackgroundColor = "#E0FFFF"; break; //  - 1011   Light cyan      #E0FFFF
           case 12: BackgroundColor = "#B19CD9"; break; //  - 1100   Light purple    #B19CD9
           case 13: BackgroundColor = "#90EE90"; break; //  - 1101   Light green     #90EE90
           case 14: BackgroundColor = "#ADD8E6"; break; //  - 1110   Light blue      #ADD8E6
           case 15: BackgroundColor = "#FFFF99"; break; //  - 1111   Light yellow    #FFFF99
        }

        let canvas = document.getElementById("vicScreen");
        canvas.style.borderColor = BorderColor;
        let ctx = canvas.getContext("2d");
        // clear screen
        ctx.fillStyle = BackgroundColor;
        ctx.fillRect(0,0,maxColumns*pixalWidth,maxRows*pixalWidth)

        ctx.fillStyle = "#000000";
        for(let row = 0; row < maxRows; row++ ){
            for ( let column = 0; column < maxColumns; column++ ){
                drawCharacter( ctx, row, column);
            }
        }
    }

    return {
        reset : reset,
        refresh : refresh,
        BorderColor : BorderColor,
        BackgroundColor : BackgroundColor
    };
}

angular.module("App").service("Screen", Screen);