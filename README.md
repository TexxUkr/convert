# convert
This application converts data from archived CSV files to json according tot he template set

1. Installation
   1.1. copy the repository
   1.2. start npm install

2. Usage

   2.1. Command Line.
     node convert.js <archive_with_csv_files> <output_json_file> [nice=Y]
     where 
        archive_with_csv_files - is a filename of the file that contains csv files. Mandatory.
        output_json_file - is a filename of the output file with json data. Mandatory.
        nice - nice=Y forces to write json file in a nice readable format. Optional. Disabled by default.
    
   2.2. Format of data.
     Output is going to be [{},{},...{}] json file.
     Input CSV should have first line set as header with column names wrapped in "" and divided by any \W delimiters.
     However it works if header columns are not wrapped in "" and with any set of headers if they are \w.
     Delimiter is found automatically.
     It is expected that all CSV files should have same set of headers.
     Application should work fine even if sequence of headers is different.
     
   2.2. Template and functionality related.
      
      By default it is expected that CSV data contains headers
      "first_name"||"last_name"||"user"||"email"||"name"||"phone"||"cc"||"amount"||"date"
      and every line should be converted into the JSON object with the follwoing structure:
     
      {
      "name": "string",
      "phone": "string",
      "person": {
      "firstName": {
      "type": "string"
      },
      "lastName": {
      "type": "string"
      },
      },
      "amount": "number",
      "date": "date",
      "costCenterNum":"string"}

      where
      name - <last_name> + <first_name>
      phone - normalized <phone> (numbers only)
      date - <date> in YYYY-MM-DD format
      costCenterNum - <cc> without prefix (i.e. ACN00006 00006)

      This is set up by dataToTemplate function defined in dataToTemplate.js module.
      
      The template is :
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
        
        This template will be used to fullfill by csv data in the following way:
        
        objToWrite.name = line.first_name + ' ' + line.last_name;
        objToWrite.phone = line.phone.replace(/\D/ig, '');
        objToWrite.person.firstName = line.first_name;
        objToWrite.person.lastName = line.last_name;
        objToWrite.amount = Number(line.amount);
        objToWrite.costCenterNum = line.cc.replace(/\D/ig, '');
        objToWrite.date = dateConversion(line.date);

        It is quite easy to change template to any you want and adopt to any CSV headers.
        For example we have another CSV with headers 
        
         "name"||"weight"||"height"||"salary"
        
        lets define the template
        
        let objToWrite = new Object({
            name: "",
            person: {
                weight: {
                    type: ""
                },
                height: {
                    type: ""
                },
            },
            salary: undefined,
        });
        objToWrite.name = line.name;
        objToWrite.person.weight.type = line.weight;
        objToWrite.person.height.type = line.height;
        objToWrite.salary = Number(line.salary);
       
 3.0 Problems. Issues. Wishes.
     Did not introduce check if all the files have the same set of headers.
     Did not introduce good command line arguments using. For example logging.
     A lot of things could/should be improved.
     Needs to add tests. I did not find npm module that could check json file structure for a whole file, like https://jsonlint.com/
     I found json validation for strings only. Could check if needs.
