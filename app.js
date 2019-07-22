//HOW TO INSTALL SSOCR
//https://www.unix-ag.uni-kl.de/~auerswal/ssocr/
//https://ourcodeworld.com/articles/read/741/how-to-recognize-seven-segment-displays-content-with-ssocr-seven-segment-optical-character-recognition-in-ubuntu-1604

const nodemailer = require('nodemailer');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fsPromises = require('fs/promises');
const fs = require('fs');
const request = require('request');

const ssocrExec="~/Desktop/dev/git/seven-segment-ocr/ssocr/ssocr"
const mockupImageUri="~/Downloads/IMG_20171101_213137.jpg"
const dataDirectory="./data"
const downloadDircetory=dataDirectory+"/rawimages"
const latestDataFile=dataDirectory+"/.latest"
const ssocrCmd = `${ssocrExec} crop 1530 1066 1300 355 grayscale -t 70 ${mockupImageUri}`
const ssocrConfigs={
    images:[
        {
            uri: "~/Downloads/IMG_20171101_213137.jpg",
            crop: "1530 1066 1300 355",
            threashold: 70,
            grayscale: ""
        }
    ]
}
const ipCamReqOptions={
    url:"http://server/stream/snapshot.jpg",
    auth:{
        user: '',
        pass: '',
        sendImmediately: false
    }
}

console.log(buildSsocrCmd(ssocrConfigs.images[0]))

downloadImageFromCam(ipCamReqOptions, downloadDircetory)
var fileName = getFilename();
ssocr(ssocrCmd, dataDirectory, fileName+".png").then((ssocrResult)=>{
    readLatestDataFile(latestDataFile).then((latestData)=>{
        saveToFile(fileName+".json", dataDirectory, ssocrResult)
        .then((file)=>console.log(`SSOCRResult: ${ssocrResult}, LatestData: ${latestData}\n\n****Done!****`))
        .catch((err)=>console.log(err));
    })
})

function buildSsocrCmd(config){
    if (!config.uri)
        throw new Error('Missing manadatory attribute in ssocr config: uri')
    var cmd = ssocrExec
    for (var key in config){
        if (key!='uri'){
            cmd += " " + key
            if (config[key]){
                    cmd += " " + config[key]
            }
        }
    }
    cmd += " " + config.uri
    return cmd
}

function downloadImageFromCam(opts, pathToDownload){
    return new Promise((resolve, reject) => {
        request.head(opts, function(err, res, body){     
          request(opts).pipe(fs.createWriteStream(pathToDownload+"/"+getFilename()+".jpg")).on('close', resolve)
        })
    })
}

function ssocr(cmd, dataDirectory, imageOutputUri) {
    if (imageOutputUri) cmd=`${cmd} -o ${dataDirectory}/${imageOutputUri}`
    return new Promise(function(resolve, reject){
        exec(cmd)
            .then((result) => {
                if (result.stderr) 
                    reject (result.stderr)
                else
                    resolve (result.stdout.trim())
            })
            .catch((err) =>
                console.log(err)
            );
    })
  }

  function getFilename(){
      var date = new Date();
      return `${date.getUTCDate()}${date.getUTCMonth()}${date.getUTCFullYear()}_${date.getUTCHours()}${date.getUTCMinutes()}`;
  }

  function readLatestDataFile(latestDataFile){
    return new Promise(function(resolve, reject){
        fsPromises.readlink(latestDataFile)
            .then((resolvedPath) =>{
                if (resolvedPath){
                    fsPromises.readFile(resolvedPath)
                        .then((data)=>{
                            resolve(JSON.parse(data.toString()))
                        })
                        .catch((err)=>reject(err))
                }
            })
            .catch((err)=>{
                console.log(err)
            })
        })
  }

  function saveToFile(fileName, path, data){
      return new Promise(function(resolve, reject){
        var uri = path + "/" + fileName
        fsPromises.writeFile(uri, JSON.stringify(data))
         .then(function() {
            console.log(`Save to disk :: ${JSON.stringify(data)} :: ${path}/${fileName}`);
            fsPromises.readlink(latestDataFile)
                .then((resolvedPath)=>{
                    if (resolvedPath){
                        fsPromises.unlink(latestDataFile).then(link)
                        //TODO: Read and return linked file
                    }
                    else 
                        link()
                });
            function link(){
                fsPromises.symlink(uri, latestDataFile)
                    .then(()=>{
                            console.log(`Symlink updated :: ${uri} -> ${latestDataFile}`)    
                            resolve(uri);
                    })
                    .catch((err)=>reject(err))
            }
        }); 
      });

  }

function sendEmail(){
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'youremail@gmail.com',
          pass: 'yourpassword'
        }
      });
      
      var mailOptions = {
        from: 'youremail@gmail.com',
        to: 'myfriend@yahoo.com, myotherfriend@yahoo.com',
        subject: 'Sending Email using Node.js',
        html: '<h1>Welcome</h1><p>That was easy!</p>'
      };

    transporter.sendMail(mailOptions, function(error, info){
    if (error) {
        console.log(error);
    } else {
        console.log('Email sent: ' + info.response);
    }
    });
}