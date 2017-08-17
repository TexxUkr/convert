const fs = require('fs');
const readline = require('readline');
const yauzl = require("yauzl");
const path = require('path');
const logger = require('winston');
logger.level='info';

// data dataToTemplate.js sets a template we use to cerate a result json object and some additional
// methods of convrting data to the format desiried
const dataToTemplate = require(__dirname + '/dataToTemplate.js') 

// --------------------------------------------------------------------------------------------------
// I add objects to the result json file one by one as '{..},'
// and if object is last then we need not to add , after it 
// as I use stream I do not know if the current pocessed line (object) form the stream is the last one
// so I use a global variable for one step delay with reading/writing streams
// if no more lines and we got all the data from archive then I just write the last object without ','
// and adds ] at the end
// -------------------------------------------------------------------------------------------------
var previousString = '';

// a flag for "nice" output json format. Could be set as argument nice={N|Y}
var niceOutputFormat = false;

// checking if args are ok and if yes opening file stream to write data
var args = checkArgs();
niceOutputFormat = args.nice;
//logger.level = 'debug';

/* logger settings */
if (logger.leve === 'debug'){
logger.add(logger.transports.File, {filename: 'convert.log'});
logger.remove(logger.transports.Console);
}


if (args.err) {
    logger.log ('info','Arguments provided are not ok');
    process.exit(-1);
}
var outfile = fs.createWriteStream(args.outputFile);

// calling main - just like functions :)

main();

function main() {
    //-----------------------------------------------
    // this function
    // opens archive file
    // gets entries one by one
    // puts entry data to the stream
    // provides stream for further processing
    // why streams? - they allow to process big files
    //-----------------------------------------------
    logger.log ('debug', 'main is here. Opening archive ' +  args.inputFile);
    try {
        yauzl.open(args.inputFile, { lazyEntries: true }, function (err, zipfile) {
            if (err) throw err;
            logger.log ('debug', 'main is here. Archive file has bee opened. Reading entries.');
            try {
                // add [ to the beginning of the output file to have a corresct json format
                outfile.write(new Buffer('['));
                // start to read files in the archive
                zipfile.readEntry();
            } catch (err) { throw err };

            // entries processing loop 
            zipfile.on("entry", function (entry) {
                logger.log ('debug', 'main is here. Entry '+ entry.fileName + 'has been opened');
                if (/\/$/.test(entry.fileName)) {
                    // Directory file names end with '/'. 
                    // Note that entires for directories themselves are optional. 
                    // An entry's fileName implicitly requires its parent directories to exist. 
                    zipfile.readEntry();
                } else {
                    // entry is a file 
                    logger.log ('debug', 'main is here. Entry '+ entry.fileName + 'is a file. Opening stream.');
                    zipfile.openReadStream(entry, function (err, readStream) {
                        if (err) throw err;

                        // while no end event processing the data from the stream 
                        logger.log ('debug', 'main is here. Entry '+ entry.fileName + 'stream has been sent to goParse.');
                        goParse(readStream, entry.fileName);

                        // if reached the end of current file need to open next one
                        readStream.on("end", function () {
                            logger.log ('debug', 'main is here. Entry '+ entry.fileName + 'stream finished. Calling next entry.');
                            zipfile.readEntry();
                        });
                    });
                }
            });

            // all the files from archive has been read
            // we need to write the last onject we have and add ] at the end
            zipfile.on("close", function () {
                logger.log ('debug', 'All files from archive has been read');
                outfile.write(new Buffer(previousString + ']'));
                setTimeout(() => { outfile.close() }, 500);
            })
        });
    } catch (err) {
        logger.log('info','Something wrong with main');
    }
}

function goParse(readStream, fileName) {
    //--------------------------------------------------------
    // this function
    // having a stream of unzipped data from some file
    // reads it line by line
    // parses the data into json based ont he template set
    // sends this object to write to file
    //--------------------------------------------------------

    //-----------------------------------------------------------------------------
    // reseting line counters - used just for information in case if something wrong
    // creating format object I will use to fill in with parsed data 
    // and then to create json object based the template set
    // forwarding stream from archive entry to the line reader
    //------------------------------------------------------------------------------

    
    let linesCounter = 0;
    let format = { delimiter: '', columns: [] };
    let rl = readline.createInterface({
        input: readStream,
        terminal: false
    });
   
    logger.log ('debug','goParse is here. Connected stream for ' + fileName + 'to readline');

    // starting to read file and processing lines
    rl.on('line', function (line) {
        logger.log ('debug',"goParse is here. Have a new line to parse \n" + line);
        // first line is a header with column names
        // we need to find delimiter and save column names to the format structure
        if (linesCounter == 0) { format = lineToHeader(line) }
        
        // -----------------------------------------------------------------------------------------
        // line with data should be transformed to the line object {column_name:value,... } using format
        // then this object will be used to create another one based on the template format - dataToWrite
        // this gives us flexibility - we could set the format we want - see later
        // send the result object to write to the file
        // -----------------------------------------------------------------------------------------
        if (linesCounter > 0) {
            let lineObj = lineToData(line, format, linesCounter, fileName);
            let dataToWrite = dataToTemplate(lineObj);
            if (niceOutputFormat){
                 writeObjToFile(JSON.stringify(dataToWrite, null, 2));
            } else {
            writeObjToFile(JSON.stringify(dataToWrite));//, null, 2));
            }
        }

        linesCounter++;
    });

    // stream closed. One file has been read.
    rl.on('close', function () {
        logger.log('info', 'reading of file ' + fileName + ' is finished. Lines processed:' + linesCounter);
    });
}

/* simple functions declarations */

function lineToHeader(formatString) {
    // converts first line that contains column names to a "format" object to use further
    try {
        let normalString = stringNormalize(formatString, '"');
        let delimiter = findDelimiter(normalString);
        let columns = normalString.split(delimiter);
        logger.log('debug', "lineToHeader is here. Converted line \n" + formatString 
        + "\n to :" + { delimiter: delimiter, columns: columns });
        return { delimiter: delimiter, columns: columns }
    }
    catch (err) {
        //console.log('could not parse the header');
    }
}

function findDelimiter(string) {
    // we could find delimiter automatically as it is non word chars 
    try {
        let delimiter = string.match(/\W+/ig)[0];
        return delimiter;
    }
    catch (err) {
        console.log('Delimiter could not be found');
    }
}

function stringNormalize(string, char) {
    // this function removes chars = char from string
    // just useful sometimes
    try {
        return string.replace(new RegExp(char, "ig"), '');
    }
    catch (err) {
        console.log('Could not normalize string');
    }
}

function lineToData(line, format, lineNumber, fileName) {
    // converting a line of csv data to the object in property:value = column:value format
    // based on the delimiter and cloumns info defined in format object
    try {
        let obj = new Object({});
        stringNormalize(line, '"').split(format.delimiter).map((item, index) => {
            obj[format.columns[index]] = item;
        });
        
        // adding some info just in case if it goes worng and we need to know where exactly
        obj.lineNumber = lineNumber;
        obj.fileName = fileName;

        //console.log(obj);
        return obj;
    }
    catch (err) { logger.log('info',"could not process the line:" + lineNumber + ' in file:' + fileName); }
};


function writeObjToFile(dataToWrite) {

    // this function does a delay for one step with writinf json objects into the file
    // because we do not know if the object is last or not
    // if it is not last it should have ',' at the end
    // if it is last then it should not have ','
    // and while we are reading the stream we do not know if the line is last or not
    try{
    if (previousString != '') {
        outfile.write(new Buffer(previousString + ','));
    }
    } catch (err){logger.log('info','was not able to write object to file')}
    previousString = dataToWrite;
}

function checkArgs() {
    // this funcyin checks if arguments provided are ok
    // functionality could be extended 
    try {
        if (process.argv.length < 4) {
            console.log("Usage: " + __filename + " <archive with csv files> <output json file> [nice={Y|N}]");
            process.exit(-1);
        }

        if (process.argv.length > 5) {
            console.log("Usage: " + __filename + " <archive with csv files> <output json file> [nice={Y|N}]");
            console.log("args " + process.argv.slice(5) + " will be ignored");
        }

        let inputFile = process.argv[2];
        let outputFile = process.argv[3];
        let niceArg = process.argv[4];
        nice = (niceArg === 'nice=Y') ? true : false;
        

        if (path.parse(inputFile).dir === '') inputFile = (path.resolve(__dirname, inputFile));
        if (path.parse(outputFile).dir === '') outputFile = (path.resolve(__dirname, outputFile));

        //console.log('Param: ' + inputFile + ' ' + outputFile + ' ' + nice);
        return {
            err: false,
            inputFile: inputFile,
            outputFile: outputFile,
            nice: nice,
            //loglevel: process.argv[5]
        }
    } catch (err) { return { err: true } }
}