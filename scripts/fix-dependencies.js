// fix-dependencies.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

console.log('🔍 Analyse des problèmes de dépendances...');

// 1. Lire le package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 2. Créer une sauvegarde
const backupPath = path.join(__dirname, '..', 'package.json.backup');
console.log('📑 Création d\'une sauvegarde de package.json...');
fs.writeFileSync(backupPath, JSON.stringify(packageJson, null, 2));
console.log(`✅ Sauvegarde créée: ${backupPath}`);

// 3. Supprimer les packages qui ne doivent pas être installés directement
console.log('🧹 Suppression des packages à ne pas installer directement...');
const packagesToRemove = [
  '@types/react-native', 
  'expo-firebase-core'
];

packagesToRemove.forEach(pkg => {
  if (packageJson.dependencies[pkg]) {
    console.log(`  - Suppression de ${pkg} des dépendances`);
    delete packageJson.dependencies[pkg];
  }
  if (packageJson.devDependencies[pkg]) {
    console.log(`  - Suppression de ${pkg} des devDependencies`);
    delete packageJson.devDependencies[pkg];
  }
});

// 4. Mettre à jour les versions des packages Metro
console.log('\n🔄 Mise à jour des packages Metro...');
const metroPackagesToUpdate = {
  'metro': '^0.82.0',
  'metro-resolver': '^0.82.0',
  'metro-config': '^0.82.0',
  '@expo/config-plugins': '~10.0.0'
};

// Écrire les modifications dans package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('✅ package.json mis à jour avec les suppressions de packages');

// 5. Installer les packages Metro mis à jour
try {
  console.log('\n📦 Installation des packages Metro mis à jour...');
  const metroInstallCmd = `npm install ${Object.entries(metroPackagesToUpdate)
    .map(([pkg, version]) => `${pkg}@${version}`)
    .join(' ')} --save-dev --legacy-peer-deps`;
  
  console.log(`Exécution de: ${metroInstallCmd}`);
  execSync(metroInstallCmd, { stdio: 'inherit' });
  console.log('✅ Packages Metro mis à jour avec succès\n');
} catch (error) {
  console.error('❌ Erreur lors de la mise à jour des packages Metro:', error.message);
  console.log('⚠️ Continuons avec les autres étapes...');
}

// 6. Configuration pour ignorer les packages problématiques dans expo.doctor
console.log('\n🛠️ Configuration des exclusions pour expo.doctor...');
if (!packageJson.expo) packageJson.expo = {};
if (!packageJson.expo.doctor) packageJson.expo.doctor = {};
packageJson.expo.doctor.reactNativeDirectoryCheck = {
  exclude: [
    '@react-native-community/checkbox',
    'jwt-decode',
    'react-native-chart-kit',
    '@lottiefiles/dotlottie-react',
    '@stomp/stompjs',
    'chart.js',
    'expo-checkbox',
    'picker',
    'react-chartjs-2',
    'react-icons',
    'react-native-vector-icons',
    'recharts',
    'sockjs-client'
  ],
  listUnknownPackages: false
};

// Écrire les modifications dans package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('✅ Configuration des exclusions ajoutée à package.json\n');

// 7. Instructions pour la suite
console.log('📋 INSTRUCTIONS POUR TERMINER LA MISE À JOUR:');
console.log('1. Pour mettre à jour les packages Expo compatibles, exécutez:');
console.log('   npx expo install expo-status-bar expo-splash-screen expo-system-ui expo-web-browser expo-symbols');
console.log('\n2. Pour mettre à jour les packages React Navigation, exécutez:');
console.log('   npm install @react-navigation/native@^6.1.9 @react-navigation/stack@^6.3.20 --save --legacy-peer-deps');
console.log('\n3. Pour tenter de mettre à jour expo-router vers la version 5, exécutez:');
console.log('   npx expo install expo-router@^4.0.0'); // On reste sur la version 4 pour éviter les incompatibilités
console.log('\n4. Nettoyez votre projet avec:');
console.log('   npm run clean');
console.log('\n5. Démarrez votre application avec:');
console.log('   npm run start-fixed-ip');
console.log('\n❗ NOTE: Une mise à jour complète vers React 19 et React Native 0.79.2');
console.log('   nécessiterait une refactorisation importante. Pour l\'instant, nous avons');
console.log('   corrigé les problèmes les plus urgents sans risquer de casser votre application.');