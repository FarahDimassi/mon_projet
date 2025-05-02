// update-dependencies.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification des dépendances à mettre à jour...');

// Liste des packages à mettre à jour avec leurs versions attendues
const packagesToUpdate = {
  "@react-native-async-storage/async-storage": "2.1.2",
  "expo-av": "~15.1.4",
  "expo-blur": "~14.1.4",
  "expo-camera": "~16.1.6",
  "expo-checkbox": "~4.1.4",
  "expo-constants": "~17.1.5",
  "expo-device": "~7.1.4",
  "expo-document-picker": "~13.1.5",
  "expo-file-system": "~18.1.8",
  "expo-font": "~13.3.0",
  "expo-haptics": "~14.1.4",
  "expo-image-picker": "~16.1.4",
  "expo-linear-gradient": "~14.1.4",
  "expo-linking": "~7.1.4",
  "expo-media-library": "~17.1.6",
  "expo-network": "~7.1.5",
  "expo-notifications": "~0.31.1",
  "expo-sharing": "~13.1.5",
  "expo-splash-screen": "~0.30.8",
  "expo-sqlite": "~15.2.9",
  "expo-status-bar": "~2.2.3"
};

// Construit la commande npm install pour tous les packages
const packagesToInstall = Object.entries(packagesToUpdate)
  .map(([pkg, version]) => `${pkg}@${version}`)
  .join(' ');

try {
  console.log('📦 Mise à jour des dépendances. Cela peut prendre quelques minutes...');
  console.log(`📦 Packages à mettre à jour: ${packagesToInstall}`);
  
  // Affiche un message à l'utilisateur pour comprendre ce qui se passe
  console.log('\n⚠️ ATTENTION: Ne fermez pas cette fenêtre! La mise à jour est en cours...\n');
  
  // On met à jour seulement les packages essentiels qui causent probablement 
  // les erreurs C++ sans toucher aux packages principaux comme react/react-native
  execSync(`npm install ${packagesToInstall} --save --legacy-peer-deps`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('\n✅ Dépendances mises à jour avec succès!');
  console.log('\n🧹 Nettoyage du cache Metro...');
  
  // On nettoie le cache pour garantir que les nouvelles versions soient utilisées
  try {
    execSync('npx expo start --clear --no-dev', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      timeout: 5000 // On limite à 5s car on veut juste lancer le nettoyage
    });
  } catch (e) {
    // C'est normal que ça s'arrête après le nettoyage
    console.log('✅ Cache nettoyé');
  }
  
  console.log('\n🚀 Votre projet est prêt à être redémarré!');
  console.log('🚀 Utilisez la commande: npx expo start --clear');
  
} catch (error) {
  console.error('❌ Erreur lors de la mise à jour:', error.message);
  console.log('\n⚠️ Certains packages n\'ont pas pu être mis à jour.');
  console.log('⚠️ Veuillez essayer de les mettre à jour manuellement un par un.');
}