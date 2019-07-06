var functions = require('firebase-functions');
var admin = require('firebase-admin'); 
var cors = require('cors')({origin: true});
var webpush = require('web-push');
//var formidable = require('formidable'); 
var fs = require('fs');
var UUID = require('uuid-v4'); 
var os = require("os");
var busboy = require("busboy"); 
var path = require(path); 

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

var serviceAccount = require("./pwagram-fb-key.json");

var gcconfig = { 
    projectId: 'pwagram-1c0ae',
    keyFilename: 'pwagram-fb-key.json'
}; 

var gcs = require('@google-cloud/storage')(gcconfig); 


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount), 
    databaseURL: 'https://pwagram-1c0ae.firebaseio.com/'
}); 

exports.storePostData = functions.https.onRequest(function(request, response) {
 cors(request, response, function() {
     var uuid = UUID(); 
     var formData = new formidable.IncomingForm(); 
     formData.parse(request, function(err, fields, files) {
        fs.rename(files.file.path, '/tmp/' + files.file.name); 
        var bucket = gcs.bucket('pwagram-1c0ae.appspot.com'); 

        bucket.upload('/tmp/' + files.file.name, {
            uploadType: 'media',
            metadata: {
                metadata: {
                    contentType: files.file.type, 
                    firebaseStorageDownloadTokens: uuid
                }
            }
        }, function(err, file) {
            if(!err) {
                admin.database().ref('posts').push({
                    id: fields.id,
                    title: fields.title,
                    location: fields.location,
                    image: 'https://firebasestorage.googleapis.com/v0/b/' + bucket.name + '/o/' + encodeURIComponent(file.name) + '?alt=media&token=' + uuid
                })
                .then(function(){
                    webpush.setVapidDetails('mailTo:murrowblue24@yahoo.com', 'BO_2-lWu6Ye9463SI1iS0l4Cl6pTIcDsxgwec0zWpoa1_J--coQnApiBzLS7sW0wajJCld0jprxRAX6mw-LOses', '7T68pV7CFbsk2NxnrxJ7bGA9O-zsLbC-V_Zvx0v7Zdc');
                    return admin.database().ref('subscriptions').once('value');
                })
                .then(function(subscriptions) {
                    subscriptions.forEach(function(sub) {
                        var pushConfig = {
                            endpoint: sub.val().endpoint,
                            keys: {
                                auth: sub.val().keys.auth,
                                p256dh: sub.val().keys.p256dh
                            }
                        };
           
                        webpush.sendNotification(pushConfig, JSON.stringify({
                            title: 'New Post', 
                            content: 'New Post added!', 
                            openUrl: '/help'
                        }))
                        .catch(function(err) {
                            console.log(err); 
                        })
                    });
                    return response.status(201).json({message: 'Data stored', id: fields.id});
                })
                .catch(function(err) {
                    response.status(500).json({error: err}); 
                }); 
            }
            else {
                console.log(err); 
            }
        });
     });
 });
});
