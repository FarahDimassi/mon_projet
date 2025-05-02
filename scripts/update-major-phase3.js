// update-major-phase3.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Préparation de la mise à jour des dépendances critiques (Phase 3)...');

// Packages critiques qui nécessitent plus d'attention
const phase3Packages = {
  "expo-router": "~5.0.4",
  "react": "19.0.0",
  "react-dom": "19.0.0",
  "react-native": "0.79.2"
};

/**
 * Fonction qui installe les packages de la phase 3
 */
async function installPhase3Packages() {
  const packagesToInstall = Object.entries(phase3Packages)
    .map(([pkg, version]) => `${pkg}@${version}`)
    .join(' ');

  console.log(`\n⚠️ PHASE 3: Installation des packages critiques`);
  console.log(`📋 Packages à installer: ${packagesToInstall}`);
  
  try {
    console.log('\n⚠️ ATTENTION: Cette mise à jour peut nécessiter des ajustements significatifs dans votre code.');
    console.log('⚠️ Assurez-vous d\'avoir sauvegardé votre projet et/ou utilisé git avant de continuer.');
    console.log('\n⏳ Installation en cours...');
    
    execSync(`npm install ${packagesToInstall} --save --legacy-peer-deps`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log(`\n✅ Installation des packages critiques terminée!`);
    
    return true;
  } catch (error) {
    console.error(`\n❌ Erreur lors de la Phase 3:`, error.message);
    return false;
  }
}

/**
 * Vérifications post-installation et instructions
 */
function showPostUpdateInstructions() {
  console.log('\n📋 INSTRUCTIONS APRÈS LA MISE À JOUR:');
  console.log('1. Assurez-vous de vérifier les fichiers suivants pour les incompatibilités:');
  console.log('   - app/_layout.tsx et autres fichiers utilisant expo-router');
  console.log('   - Composants utilisant React 19 (nouveaux hooks, etc.)');
  console.log('   - Vérifiez les avertissements de dépréciation dans la console');
  console.log('\n2. Nettoyez le cache Metro avant de lancer l\'application:');
  console.log('   npm run start-clean');
  console.log('\n3. Si vous rencontrez des erreurs, vous pouvez:');
  console.log('   - Restaurer le fichier package.json.backup');
  console.log('   - Exécuter npm install pour revenir à l\'état précédent');
}

/**
 * Fonction principale
 */
async function updatePhase3() {
  console.log('🚀 PHASE 3: MISE À JOUR DES PACKAGES CRITIQUES');
  
  // Vérification de la sauvegarde
  const backupPath = path.join(__dirname, '..', 'package.json.backup');
  if (!fs.existsSync(backupPath)) {
    console.log('⚠️ Aucune sauvegarde de package.json trouvée!');
    console.log('⚠️ Veuillez exécuter npm run update-major-deps avant cette étape.');
    return;
  }
  
  const success = await installPhase3Packages();
  
  if (success) {
    showPostUpdateInstructions();
  } else {
    console.log('\n⚠️ La mise à jour a échoué. Vous pouvez:');
    console.log('1. Restaurer le fichier package.json.backup');
    console.log('2. Exécuter npm install pour revenir à l\'état précédent');
  }
}

// Exécution de la fonction principale
updatePhase3().catch(console.error);