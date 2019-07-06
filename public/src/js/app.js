var deferredPrompt;
var enableNotificationsButtons = document.querySelectorAll('.enable-notifications');

if (!window.Promise) {
    window.Promise = Promise; 
}

if('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(function() {
            console.log('Service worker registered! ');
        })
        .catch(function(err) {
            console.log(err);
        }); 
}

window.addEventListener('beforeinstallprompt', function(event){
    console.log('beforeinstallprompt fired'); 
    event.preventDefault();
    deferredPrompt = event; 
    return false; 
});

function displayConfirmNotification() {
    var options = {
        body: 'You successfully subscribed to our Notification service!', 
        icon: '/src/images/icons/app-icon-96X96.png',
        image: '/src/images/sf-boat.jpg',
        dir: 'ltr', 
        lang: 'en-US', // BCP 47
        vibrate: [100, 50, 200], 
        badge: '/src/images/icons/app-icon-96x96.png',
        tag: 'confirm-notification', 
        renotify: true,
        actions: [
            { action: 'confirm', title: 'Okay', icon: '/src/images/icons/app-icon-96x96.png' },
            { action: 'cancel', title: 'Cancel', icon: '/src/images/icons/app-icon-96x96.png' }
        ]
    }; 

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
            .then(function(swreg) {
                swreg.showNotification('Successfully subscribed demo', options);
            });
    }
    else {
        new Notification('Successfully subscribed!', options); 
    }
}

function configurePushSub() {
    if(!('serviceWorker' in navigator)) {
        return;
    }

    var reg; 
    navigator.serviceWorker.ready
        .then(function(swreg) {
            reg = swreg; 
            return swreg.pushManager.getSubscription(); //session scope is one per browser 
        })
        .then(function(sub) {
            if (sub === null) {
                //create a new subscription
                //subscriptions tie to a service worker so if you clear a service worker clear the 
                //subscripton stored in the db
                var vapidPublicKey = 'BO_2-lWu6Ye9463SI1iS0l4Cl6pTIcDsxgwec0zWpoa1_J--coQnApiBzLS7sW0wajJCld0jprxRAX6mw-LOses';
                var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);
                return reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidPublicKey
                }); 
            }
            else {
                // We have a subscription 
            }
        })
        .then(function(newSub){
            return fetch('https://pwagram-1c0ae.firebaseio.com/subscriptions.json', {
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(newSub)
            })
        })
        .then(function(res){
            if (res.ok) {
                displayConfirmNotification();
            }
        })
        .catch(function(err) {
            console.log(err); 
        });
}

function askForNotificationPermission() {
    Notification.requestPermission(function(result) {
        console.log('User Choice', result);
        if (result !== 'granted') {
            console.log('No notification permission granted!'); 
        }
        else {
            configurePushSub(); 
            // displayConfirmNotification();
        }
    });
}

if ('Notification' in window && 'serviceWorker' in navigator) {
    for (var i=0; i < enableNotificationsButtons.length; i++) {
        enableNotificationsButtons[i].style.display = 'inline-block';
        enableNotificationsButtons[i].addEventListener('click', askForNotificationPermission);
    }
}