// update-major-deps.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Préparation de la mise à jour des dépendances majeures...');

// Les paquets sont divisés en groupes pour minimiser les risques
// Groupe 1: Les packages Expo secondaires (moins risqués)
const phase1Packages = {
  "expo-symbols": "~0.4.4",
  "expo-system-ui": "~5.0.7",
  "expo-web-browser": "~14.1.6",
  "react-native-webview": "13.13.5"
};

// Groupe 2: Bibliothèques de navigation et d'interface (risque modéré)
const phase2Packages = {
  "react-native-gesture-handler": "~2.24.0",
  "react-native-reanimated": "~3.17.4",
  "react-native-safe-area-context": "5.4.0",
  "react-native-screens": "~4.10.0",
  "react-native-web": "~0.20.0"
};

// Groupe 3: Packages critiques (haut risque)
const phase3Packages = {
  "expo-router": "~5.0.4",
  "react": "19.0.0",
  "react-dom": "19.0.0",
  "react-native": "0.79.2"
};

/**
 * Fonction qui installe un groupe de packages
 */
async function installPackageGroup(phase, packages) {
  const packagesToInstall = Object.entries(packages)
    .map(([pkg, version]) => `${pkg}@${version}`)
    .join(' ');

  if (!packagesToInstall) return;

  console.log(`\n📦 PHASE ${phase}: Installation de ${Object.keys(packages).length} packages`);
  console.log(`📋 Packages: ${packagesToInstall}`);
  
  try {
    console.log('⏳ Installation en cours...');
    execSync(`npm install ${packagesToInstall} --save --legacy-peer-deps`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log(`✅ Phase ${phase} terminée avec succès`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la Phase ${phase}:`, error.message);
    return false;
  }
}

/**
 * Fonction principale qui exécute les mises à jour en phases
 */
async function updateInPhases() {
  console.log('🚀 MISE À JOUR DES DÉPENDANCES EN PLUSIEURS PHASES');
  console.log('⚠️ Ce processus peut prendre plusieurs minutes et nécessiter des ajustements manuels');
  
  // Sauvegarde du package.json avant modifications
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const backupPath = path.join(__dirname, '..', 'package.json.backup');
  
  console.log('📑 Création d\'une sauvegarde de package.json...');
  fs.copyFileSync(packageJsonPath, backupPath);
  console.log(`✅ Sauvegarde créée: ${backupPath}`);
  
  // Phase 1: Packages Expo secondaires
  console.log('\n🔄 Démarrage de la Phase 1: Packages Expo secondaires');
  const phase1Success = await installPackageGroup(1, phase1Packages);
  
  if (!phase1Success) {
    console.log('⚠️ La Phase 1 a échoué, arrêt du processus');
    console.log('📑 Vous pouvez restaurer la sauvegarde si nécessaire');
    return;
  }
  
  // Phase 2: Bibliothèques de navigation
  console.log('\n🔄 Démarrage de la Phase 2: Bibliothèques de navigation');
  const phase2Success = await installPackageGroup(2, phase2Packages);
  
  if (!phase2Success) {
    console.log('⚠️ La Phase 2 a échoué, nous ne passerons pas à la phase 3');
    console.log('📑 Vous pouvez restaurer la sauvegarde si nécessaire');
    return;
  }
  
  // Avertissement avant la phase critique
  console.log('\n⚠️ ATTENTION: La Phase 3 va mettre à jour React, React Native et expo-router');
  console.log('⚠️ Ces mises à jour peuvent nécessiter des modifications importantes dans votre code');
  console.log('⚠️ Il est recommandé de committer vos changements avant de continuer');
  
  // Nous ne lançons pas automatiquement la phase 3
  console.log('\n📌 Pour continuer avec la Phase 3 (packages critiques), exécutez:');
  console.log('📌 npm run update-major-phase3');
  
  // Mise à jour de package.json pour ajouter le script de phase 3
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath));
  if (!packageJson.scripts) packageJson.scripts = {};
  packageJson.scripts['update-major-phase3'] = 'node ./scripts/update-major-phase3.js';
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

// Exécution de la fonction principale
updateInPhases().catch(console.error);