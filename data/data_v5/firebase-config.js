// Public Firebase web configuration. Access is controlled by Auth and Firestore rules.
(() => {
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
  window.ETHICITY_CLASSROOM_CONFIG = local ? {
    previewOnly: true,
    firebase: {apiKey:'demo-ethicity-data-v5',authDomain:'demo-ethicity-data-v5.firebaseapp.com',projectId:'demo-ethicity-data-v5'},
    emulators: {authPort:9099,firestorePort:8085}
  } : {
    previewOnly: false,
    firebase: {
      apiKey: 'AIzaSyC0IsVe_lsolXsJ6J_AhyoSJPrAR3-Kauc',
      authDomain: 'ethicity-reliability-20261114.firebaseapp.com',
      projectId: 'ethicity-reliability-20261114',
      appId: '1:509376484552:web:87b5bbeaec0898b656c1fd',
      messagingSenderId: '509376484552'
    }
  };
})();
