// clean-project.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

// Chemins à nettoyer
const pathsToClean = [
  'node_modules/.cache',
  '.expo',
  '.metro-cache',
  'android/.gradle',
  'android/app/build',
  'ios/build',
  'ios/Pods',
  '.jest'
];

console.log('🧹 Nettoyage des caches du projet...');

// Nettoyage des dossiers
pathsToClean.forEach(relativePath => {
  const fullPath = path.join(__dirname, '..', relativePath);
  
  try {
    if (fs.existsSync(fullPath)) {
      console.log(`  Suppression de ${relativePath}...`);
      
      try {
        rimraf.sync(fullPath);
        console.log(`  ✅ ${relativePath} supprimé avec succès`);
      } catch (error) {
        console.error(`  ❌ Erreur lors de la suppression de ${relativePath}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`  ❌ Erreur lors de la vérification de ${relativePath}: ${error.message}`);
  }
});

// Nettoyage du cache npm
console.log('\n🧹 Nettoyage du cache npm...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ Cache npm nettoyé');
} catch (error) {
  console.error('❌ Erreur lors du nettoyage du cache npm:', error.message);
}

// Nettoyage du cache Metro
console.log('\n🧹 Nettoyage du cache Metro...');
try {
  execSync('npx react-native start --reset-cache --no-interactive', { 
    stdio: 'inherit',
    timeout: 5000 // On arrête après 5 secondes, c'est suffisant pour le nettoyage
  });
} catch (error) {
  // C'est normal que ça s'arrête car on a mis un timeout
  console.log('✅ Cache Metro nettoyé');
}

console.log('\n✅ Nettoyage terminé !');
console.log('\n📋 Pour redémarrer proprement:');
console.log('1. Lancez votre application avec: npm run start-fixed-ip');