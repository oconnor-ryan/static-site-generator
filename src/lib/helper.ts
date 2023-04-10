import fs from "fs";

/**
 * This function syncronously reads each line from a file by
 * using a buffer and detecting where \n is.
 * Each line is sent to the processLineFunc function, which returns
 * true if more lines need to be read and false otherwise.
 * 
 * @param absFilePath - the absolute path of an existing file.
 * @param processLineFunc - the function that processes each line from the
 * file and determines if more lines should be read.
 */
function readLineByLineSync(absFilePath: string, processLineFunc: (line: string) => boolean) {
    const file = fs.openSync(absFilePath, 'r');
    var filePosition = 0;
    var endOfFile = false;
    
    const getLine = function () {
        var buffSize = 64;
        var buffer = Buffer.alloc(buffSize);
        var numBytesToRead = buffSize;
        var buffPosition = 0;

        //readSync returns 0 when readsync reaches EOF
        while(fs.readSync(file, buffer, buffPosition, numBytesToRead, filePosition) != 0) {
            var str = buffer.toString('utf8', buffPosition, buffSize);
            // \n is 1 byte
            for(let i = 0; i < str.length; i++) {
                if(str[i] == "\n") {
                    //next buffer should start at the character after newline
                    filePosition += i + buffPosition + 1
                    //only return portion of buffer before newline
                    return buffer.toString('utf8', 0, i + buffPosition + 1);
                }
            }
            //if newline has been detected:

            // - set the filePosition to a location one byte in front
            // of where the old buffer ends
            filePosition += buffSize;

            // - double the buffer size
            buffSize *= 2;

            // - only read the bytes needed for half of the buffer size
            // (because the first half will contain the old buffer)
            numBytesToRead = buffSize / 2;

            // - set buffer position offset at the halfway mark of new buffer
            buffPosition = buffSize / 2;

            // - create a new buffer twice the size of the old buffer, and 
            // put the old buffer in the first half of the new buffer.
            buffer = Buffer.concat([buffer], buffSize);
        }

        //end of file reached
        endOfFile = true;

        return buffer.toString('utf8');
    };


    //keep processing each line until the EOF is reached or the
    //processLineFunc returns false
    while(!endOfFile && processLineFunc(getLine())) {}

    fs.closeSync(file);
}

export {readLineByLineSync};