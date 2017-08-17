function dataToTemplate(line) {
    // ------------------------------------------------------------------------------------------
    // this function sets the template we use to create a result json record we will write to file
    // line here is an object in {column_name:value,...} build on corresponding line of csv
    // objToWrite sets a template 
    // asigning after it says how exactly we convert data to fill in the template
    // it is possible to change te template and assignings on your own
    // the only thing ther is no check if the requested colums exists - could be added in future 
    // --------------------------------------------------------------------------------------------
    try {
        let objToWrite = new Object({
            name: "",
            phone: "",
            person: {
                firstName: {
                    type: ""
                },
                lastName: {
                    type: ""
                },
            },
            amount: undefined,
            date: undefined,
            costCenterNum: ""
        });
        objToWrite.name = line.first_name + ' ' + line.last_name;
        objToWrite.phone = line.phone.replace(/\D/ig, '');
        objToWrite.person.firstName = line.first_name;
        objToWrite.person.lastName = line.last_name;
        objToWrite.amount = Number(line.amount);
        objToWrite.costCenterNum = line.cc.replace(/\D/ig, '');
        objToWrite.date = dateConversion(line.date);
        //console.log(objToWrite);
        return objToWrite;
    } catch (err) {
        console.log("An error occured while filling the template for object line " + line.lineNumber + 'of file:' + line.fielName);
    }
}


function dateConversion(dateString) {
    // we could set additional functions on converting data before sending it to the template 
    // this one is used to convert date format
    try {
        // converting dateString to YYYY-MM-DD format
        // parsinf dateString to get DD, MM, YYYY
        /* based on regex 
        let date = dateString.replace (/\//ig,'-');
        let day = date.match (/^\d{1,2}/ig).lenght ===2 ? date.match (/^\d{1,2}/ig) : +0 + date.match (/^\d{1,2}/ig);
        let month = date.match (/-\d{1,2}-/ig).toString();
        month = month.match(/\d{1,2}/ig).length === 2 ? month.match (/\d{1,2}/ig) : +0 + month.match (/\d{1,2}/ig);
        let year = date.match (/\d\d\d\d/ig);
        */

        // based on string
        let year = dateString.slice(-4);
        let day = dateString.slice(0, dateString.indexOf('/', 0));
        day = day.length === 2 ? day : +0 + day;
        indexOne = dateString.indexOf('/', 0);
        indexTwo = dateString.indexOf('/', indexOne + 1);
        //console.log(indexOne + ' ' + indexTwo);
        let month = dateString.slice(indexOne + 1, indexTwo);
        month = month.length === 2 ? month : +0 + month;
        return year + '-' + month + '-' + day;
    } catch (err) { console.log('could not convert date as should') };
}


module.exports = dataToTemplate;