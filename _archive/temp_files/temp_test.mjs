
        let initializeApp, getDatabase, ref, onValue, onChildAdded, off, set, push, update, remove, onDisconnect, query, orderByChild, equalTo, limitToLast, get;
        let getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged;
        let getStorage, sRef, uploadBytes, getDownloadURL;

        try {
            ({ initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"));
            ({ getDatabase, ref, onValue, onChildAdded, off, set, push, update, remove, onDisconnect, query, orderByChild, equalTo, limitToLast, get } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"));

