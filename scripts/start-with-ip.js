// start-with-ip.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// L'adresse IP à utiliser, identique à celle dans authService.ts
const IP_ADDRESS = '192.168.100.135';
const PORT = 8081;

console.log(`📱 Démarrage du serveur Metro sur ${IP_ADDRESS}:${PORT}`);

// Configuration de l'environnement
process.env.REACT_NATIVE_PACKAGER_HOSTNAME = IP_ADDRESS;

// Démarrer Expo avec les paramètres spécifiés
console.log(`🚀 Démarrage d'Expo avec l'adresse IP fixe: ${IP_ADDRESS}:${PORT}`);
console.log('⏳ Veuillez patienter...');

// Options d'Expo - corrigé pour éviter le conflit entre --host et --lan
const expoArgs = [
  'expo', 
  'start', 
  '--clear',           // Nettoyer le cache Metro
  `--host=${IP_ADDRESS}`, // Forcer l'adresse IP (utiliser uniquement cette option)
  '--port=8081'       // Port par défaut
  // Option --lan supprimée pour éviter le conflit
  // Option --localhost=false supprimée aussi
];

// Démarrer le processus Expo
const expoProcess = spawn('npx', expoArgs, { 
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    REACT_NATIVE_PACKAGER_HOSTNAME: IP_ADDRESS
  }
});

// Gestion des événements du processus
expoProcess.on('error', (error) => {
  console.error('❌ Erreur lors du démarrage d\'Expo:', error);
});

// Instructions en cas d'erreur
console.log('\n📝 INSTRUCTIONS EN CAS DE PROBLÈME:');
console.log('1. Si Metro affiche une autre IP, fermez cette fenêtre (Ctrl+C)');
console.log('2. Vérifiez votre connexion réseau et assurez-vous que l\'IP est correcte');
console.log('3. Redémarrez avec "npm run start-fixed-ip"');
console.log('\n✅ Si l\'application ne se connecte pas au serveur Metro, relancez l\'app sur votre appareil\n');