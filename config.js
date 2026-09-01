export const FB_CONFIG = {
    apiKey: "AIzaSyAL7Z1D_Lhbu-eW9qgiP4hs25ccv_hRu3w",
    authDomain: "worksync-vilpower.firebaseapp.com",
    databaseURL: "https://worksync-vilpower-default-rtdb.firebaseio.com",
    projectId: "worksync-vilpower",
    storageBucket: "worksync-vilpower.firebasestorage.app",
    messagingSenderId: "738955842044",
    appId: "1:738955842044:web:44d3a76012329578186279"
};

export const ADMIN_ROLES = ['System Admin', 'Administrator', 'Head of Operations', 'MD & Core Team'];
export const ADMIN_EMAILS = ['digitalmarketing@vilpower.com', 'nanjil@vilpower.com', 'murugeshvilpower@gmail.com'];

export const USERS = [
    { email: 'nanjil@vilpower.com', name: 'Nanjil Manohar S', role: 'Head of Operations', avatar: 'Nanjil' },
    { email: 'digitalmarketing@vilpower.com', name: 'Palanirajan R', role: 'Senior Manager - Digital Executions & Delivery', avatar: 'Palanirajan' },
    { email: 'murugeshvilpower@gmail.com', name: 'Murugesh Kumar A', role: 'Manager - Social Media & Client Accounts', avatar: 'Murugesh' },
    { email: 'barathvilpower@gmail.com', name: 'Barath Magesh M', role: 'Manager - Creative Content & Visual', avatar: 'Barath' },
    { email: 'snehavilpower@gmail.com', name: 'Sneha S', role: 'Team Member', avatar: 'Sneha' },
    { email: 'karthikavilpower@gmail.com', name: 'Karthika K', role: 'Graphic Designer Associate', avatar: 'Karthika' },
    { email: 'immanuelvilpower@gmail.com', name: 'Immanuel Raja S', role: 'Video Producer Associate', avatar: 'Immanuel' },
    { email: '123', name: 'Demo User', role: 'Administrator', avatar: 'Demo' }
];

export function knownUserByEmail(email) { return USERS.find(u => u.email.toLowerCase() === (email || '').toLowerCase()); }

export const JIRA = {
    domain: 'vilpowerdigitalmarketing.atlassian.net',
    projectKey: 'SEP',
    projectKeys: ['SEP', 'AUG'],
    apiUrl: '/api/jira',
    gsUrl: 'https://script.google.com/macros/s/AKfycbwk85wuNOnEYt675Rf-6IMwPJFxmLHW2ONQYigtni6AxU-gIdiNY497wxJHDtmd_XD-/exec',
    useLocalApi: false
};

export const CLIENTS = ['3Jo Toys', 'Aladi Ezhilvanan', 'Client', 'DreamDaa', 'Discussion', 'Einstein', 'Iniya', 'IVN', 'Learning', 'Mopower', 'Mr.Millet', 'Nivya', 'NTT', 'Others', 'Quade', 'SalesNaany', 'SKM', 'University', 'Vilpower', 'Vilpower DM'];

export const META_ADS = {
    accessToken: "EAAZBjdDlKPisBR5B2oxcEr7LKIh2hiZAkSyA990xiJ3lTfO93ZAL69WeXWz7V889cFADqB42DciNcOy9UZBIHXENjXVBk5lBbYcXso6MRQF0XZBVKFVu5zAKSxrYXqwcIFTPWnfPJZAeISI4T1LrsckxO0NysnZBzrlaURPMK0BK5jHAkfz8IJSxycUHG2iIdHzJP8ooZADR"
};

// Leave Approval Chains - Different employees have different approval hierarchies
export const LEAVE_APPROVAL_CHAINS = {
    'immanuelvilpower@gmail.com': [
        'digitalmarketing@vilpower.com',
        'nanjil@vilpower.com'
    ],
    'barathvilpower@gmail.com': [
        'digitalmarketing@vilpower.com',
        'nanjil@vilpower.com'
    ],
    'karthikavilpower@gmail.com': [
        'digitalmarketing@vilpower.com',
        'nanjil@vilpower.com'
    ],
    'alex@vilpower.com': [
        'digitalmarketing@vilpower.com',
        'nanjil@vilpower.com'
    ],
    'snehavilpower@gmail.com': [
        'nanjil@vilpower.com'             // Final approval: Nanjil
    ],
    'murugeshvilpower@gmail.com': [
        'nanjil@vilpower.com'             // Final approval: Nanjil
    ],
    // Add more employees as needed
};
