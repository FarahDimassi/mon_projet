import React, { useEffect, useState } from "react";
import * as MediaLibrary from 'expo-media-library';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import {
  getAllUsers,
  getToken,
  getUserById,
  deleteUser,
  updateUser,
} from "../../utils/authService";
import { jwtDecode } from "jwt-decode";
import { FontAwesome5 } from "@expo/vector-icons";
import FooterAdmin from "@/components/FooterAdmin";
import NavbarAdmin from "@/components/NavbarAdmin";
import Toast from "react-native-toast-message";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import * as DocumentPicker from 'expo-document-picker';
interface UserFile {
  id: number;
  name: string;
  type: string;
  size: number;
  url: string;
  downloadUrl?: string;
}
interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  active?: boolean;
  fileViewUrl?: string;
  fileDownloadUrl?: string;
  files?: UserFile[];
}


export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editActive, setEditActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteConfirmModalVisible, setIsDeleteConfirmModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [pickedFile, setPickedFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  
  const filteredUsers = users.filter((user) =>
    user.role !== "ADMIN" &&
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  ) .sort((a, b) => {
    if (!a.active && b.active) return -1; // a est inactif, b actif  → a avant b
    if (a.active && !b.active) return 1;  // a est actif, b inactif  → a après b
    return 0;                              // même statut → ordre inchangé
  });

  useEffect(() => {
    async function fetchUsers() {
      try {
        const token = await getToken();
        if (!token) return;
        const decoded: any = jwtDecode(token);
        if (decoded.role !== "ROLE_ADMIN") return;
        const fetchedUsers: User[] = await getAllUsers();
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("❌ Erreur lors de la récupération des utilisateurs :", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);
/*   const uploadFile = async () => {
    if (!selectedUser?.id || !pickedFile) return;
  
    try {
      const token = await getToken();
      const form = new FormData();
      form.append('file', {
        uri: pickedFile.uri.startsWith('file://') 
               ? pickedFile.uri 
               : 'file://' + pickedFile.uri,
        name: pickedFile.name,
        type: pickedFile.type,
      } as any);
  
      const response = await fetch(
        `http://192.168.100.135:8080/api/admin/users/${selectedUser.id}/upload-file`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        }
      );
      console.log('Response status:', response.status);
  
      if (response.ok) {
        Toast.show({ type: 'success', text1: 'Upload réussi !' });
        handleViewUser(selectedUser.id);
      } else {
        const err = await response.text();
        throw new Error(err);
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Upload échoué', text2: e.message });
    }
  };
   */
  /**
 * Télécharge le fichier distant et l'ouvre dans le gestionnaire natif
 */
  /**
 * Télécharge un fichier via JavaScript en web.
 * @param remoteUrl URL protégée REST renvoyant votre fichier (avec JWT si besoin)
 * @param filename  Nom final du fichier (.pdf, .jpg, etc.)
 */
// const downloadAndShare = async (remoteUrl: string, filename: string) => {
//   try {
//     // 1) Récupère le token si votre endpoint est protégé
//     const token = await getToken?.(); // ou supprimez si public

//     // 2) Télécharge le contenu
//     const res = await fetch(remoteUrl, {
//       method: 'GET',
//       headers: token
//         ? { Authorization: `Bearer ${token}` }
//         : undefined
//     });
//     if (!res.ok) throw new Error(`HTTP ${res.status}`);

//     // 3) Convertit en blob
//     const blob = await res.blob();

//     // 4) Crée un objectURL
//     const url = window.URL.createObjectURL(blob);

//     // 5) Crée un <a> caché avec l'attribut download
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = filename;
//     a.style.display = 'none';
//     document.body.appendChild(a);

//     // 6) Simule le clic
//     a.click();

//     // 7) Cleanup
//     a.remove();
//     window.URL.revokeObjectURL(url);

//     Toast.show({ type: 'success', text1: 'Téléchargement démarré' });
//   } catch (err: any) {
//     console.error('Erreur download:', err);
//     Alert.alert('Erreur', err.message);
//   }
// };
 const downloadAndShare = async (remoteUrl: string, filename: string) => {
  try {
    const token = await getToken?.();

    if (Platform.OS === 'web') {
      // — Web: fetch → blob → download via <a download>
      const res = await fetch(remoteUrl, {
        method: 'GET',
        mode: 'cors',
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      Toast.show({ type: 'success', text1: 'Téléchargement démarré' });
      return;
    }

    // — Mobile (iOS/Android): expo-file-system + expo-sharing
    const localUri = FileSystem.documentDirectory! + filename;
    const downloadResumable = FileSystem.createDownloadResumable(
      remoteUrl,
      localUri,
      token ? { headers: { Authorization: `Bearer ${token}` } } : {}
    );
    const { uri } = await downloadResumable.downloadAsync();

    Toast.show({ type: 'success', text1: 'Téléchargement terminé' });

    if (await Sharing.isAvailableAsync()) {
      // ouvre la boîte de dialogue “Enregistrer / Partager”
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Enregistrer ou partager le PDF',
      });
    } else {
      Alert.alert('Fichier prêt', `Vous le trouverez ici : ${uri}`);
    }
  } catch (err: any) {
    console.error('Download/share error:', err);
    Alert.alert('Erreur', err.message);
  }
};

  const handleViewUser = async (id: number) => {
    const user = await getUserById(id);
  
    // seulement si c'est un coach et qu'on a les URLs
    if (user.role === "Coach" && user.fileViewUrl && user.fileDownloadUrl) {
      const filename = user.fileViewUrl.split("/").pop()!;
      const ext = filename.split(".").pop()!.toLowerCase();
      const mimeType = ext === "pdf"
        ? "application/pdf"
        : ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : `application/${ext}`;
  
      user.files = [
        {
          id: 1,
          name: filename,
          type: mimeType,
          size: 0,                    // ou récupère la taille via un autre endpoint
          url: user.fileViewUrl,      // pour l’œil
          downloadUrl: user.fileDownloadUrl // pour la flèche
        }
      ];
    }
  
    setSelectedUser(user);
    setIsViewModalVisible(true);
  };
  
  const handleEditUser = (user: User) => {
    //setEditEmail(user.email);
    //setEditUsername(user.username);
    setEditActive(user.active ?? false);
    setSelectedUser(user);
    setSelectedUserId(user.id);
    setIsEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    try {
      const updatedUser = {
        ...selectedUser,
        email: editEmail,
        username: editUsername,
        active: editActive,
      };
      await updateUser(selectedUser.id, updatedUser);
      setUsers(users.map(u => (u.id === selectedUser.id ? updatedUser : u)));
      setIsEditModalVisible(false);
      Toast.show({
        type: "success",
        text1: "Compte activé",
        text2: `${updatedUser.username} est désormais actif.`,
        position: "bottom",
      });
    } catch (error) {
      Toast.show({
        type: "error",  // Correct - doit être "error" et non "erreur"
        text1: "Compte non activé",
        position: "bottom",
      });
    }
  };

  const confirmDeleteUser = (id: number) => {
    setUserToDelete(id);
    setIsDeleteConfirmModalVisible(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      await deleteUser(userToDelete);
      setUsers(users.filter(user => user.id !== userToDelete));
      if (selectedUser?.id === userToDelete) setSelectedUser(null);
      setIsDeleteConfirmModalVisible(false);
      Alert.alert("Succès", "Utilisateur supprimé avec succès.");
    } catch (error) {
      Alert.alert("Erreur", "Impossible de supprimer l'utilisateur.");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ROLE_ADMIN":
        return <FontAwesome5 name="user-shield" size={16} color="#e74c3c" />;
      case "Coach":
        return <FontAwesome5 name="user-tie" size={16} color="#3498db" />;
      default:
        return <FontAwesome5 name="user" size={16} color="#7f8c8d" />;
    }
  };

  const getUserInitials = (username: string) => {
    return username.charAt(0).toUpperCase();
  };

  const getAvatarColor = (id: number) => {
    const colors = ["#3498db", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];
    return colors[id % colors.length];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return "file-pdf";
    if (fileType.includes('image')) return "file-image";
    if (fileType.includes('word') || fileType.includes('doc')) return "file-word";
    if (fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('csv')) return "file-excel";
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return "file-powerpoint";
    if (fileType.includes('zip') || fileType.includes('archive')) return "file-archive";
    if (fileType.includes('video')) return "file-video";
    if (fileType.includes('audio')) return "file-audio";
    if (fileType.includes('text')) return "file-alt";
    return "file";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleViewFile = (fileUrl: string) => {
    Linking.openURL(fileUrl);
  };

  const handleDownloadFile = (downloadUrl: string) => {
    Linking.openURL(downloadUrl);
  };

  

  return (
    <View style={{ flex: 1 }}>

  <NavbarAdmin />
    <View style={styles.container}>
      
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
       {/*  <Text style={styles.title}>Gestion des Utilisateurs</Text>*/} 
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {users.filter(u => u.role === "Coach").length}
            </Text>
            <Text style={styles.statLabel}>Coachs</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <FontAwesome5 name="search" size={18} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un utilisateur..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearch}>
            <FontAwesome5 name="times-circle" size={16} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Chargement des utilisateurs...</Text>
        </View>
      ) : (
        <>
          {filteredUsers.length === 0 ? (
            <View style={styles.emptyListContainer}>
              <FontAwesome5 name="users-slash" size={50} color="#ccc" />
              <Text style={styles.emptyListText}>Aucun utilisateur trouvé</Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.userItem,
                    selectedUserId === item.id && styles.selectedUserItem,
                    item.role === "Coach" && item.active === false && styles.inactiveCoachItem,
                  ]}
                >
                  <View style={styles.userInfoContainer}>
                    <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.id) }]}>
                      <Text style={styles.avatarText}>{getUserInitials(item.username)}</Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>{item.username}</Text>
                      <View style={styles.userInfo}>
                        <Text style={styles.userEmail}>{item.email}</Text>
                        <View style={styles.roleContainer}>
                          {getRoleIcon(item.role)}
                          <Text style={styles.userRole}> {item.role}</Text>
                          {item.role === "Coach" && (
                            <View style={[styles.statusDot, { backgroundColor: item.active ? "#2ecc71" : "#e74c3c" }]} />
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleViewUser(item.id)}>
                      <FontAwesome5 name="eye" size={16} color="#fff" />
                    </TouchableOpacity>
                    {item.role === "Coach" && (
                      <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => handleEditUser(item)}>
                        <FontAwesome5 name="edit" size={16} color="#fff" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => confirmDeleteUser(item.id)}>
                      <FontAwesome5 name="trash-alt" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </>
      )}

      {/* Modal de visualisation des détails */}
      <Modal visible={isViewModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <FontAwesome5 name="user-circle" size={40} color="#3498db" />
              <Text style={styles.modalTitle}>Détails Utilisateur</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setIsViewModalVisible(false)}>
                <FontAwesome5 name="times" size={20} color="#555" />
              </TouchableOpacity>
            </View>
            
            {selectedUser && (
              <ScrollView style={styles.userDetailsScroll}>
                <View style={[styles.detailAvatar, { backgroundColor: getAvatarColor(selectedUser.id) }]}>
                  <Text style={styles.detailAvatarText}>{getUserInitials(selectedUser.username)}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <FontAwesome5 name="user" size={18} color="#3498db" style={styles.detailIcon} />
                  <View>
                    <Text style={styles.detailLabel}>Nom d'utilisateur</Text>
                    <Text style={styles.detailValue}>{selectedUser.username}</Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <FontAwesome5 name="envelope" size={18} color="#3498db" style={styles.detailIcon} />
                  <View>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedUser.email}</Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <FontAwesome5 name="id-badge" size={18} color="#3498db" style={styles.detailIcon} />
                  <View>
                    <Text style={styles.detailLabel}>ID Utilisateur</Text>
                    <Text style={styles.detailValue}>{selectedUser.id}</Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <FontAwesome5 name="user-tag" size={18} color="#3498db" style={styles.detailIcon} />
                  <View>
                    <Text style={styles.detailLabel}>Rôle</Text>
                    <Text style={styles.detailValue}>{selectedUser.role}</Text>
                  </View>
                </View>
                
                <View style={styles.detailItem}>
                  <FontAwesome5 name={selectedUser.active ? "check-circle" : "times-circle"} size={18} color={selectedUser.active ? "#2ecc71" : "#e74c3c"} style={styles.detailIcon} />
                  <View>
                    <Text style={styles.detailLabel}>Statut</Text>
                    <Text style={[styles.detailValue, { color: selectedUser.active ? "#2ecc71" : "#e74c3c" }]}>
                      {selectedUser.active ? "Actif" : "Inactif"}
                    </Text>
                  </View>
                </View>

                {/* Section pour les fichiers */}
              {/* Section pour les fichiers */}
{selectedUser.role === "Coach" && (
  <View style={styles.filesSection}>
    <View style={styles.filesSectionHeader}>
      <FontAwesome5 name="file-alt" size={18} color="#3498db" />
      <Text style={styles.filesSectionTitle}>Fichiers téléchargés</Text>
    </View>

    {selectedUser.files && selectedUser.files.length > 0 ? (
      <View style={styles.filesContainer}>
        {selectedUser.files.map((file) => (
          <View key={file.id} style={styles.fileItem}>
            <View style={styles.fileInfo}>
              <View style={styles.fileIconContainer}>
                <FontAwesome5 name={getFileIcon(file.type)} size={22} color="#3498db" />
              </View>
              <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                </Text>
                <Text style={styles.fileSize}>
                  {formatFileSize(file.size)}
                </Text>
              </View>
            </View>
            <View style={styles.fileActions}>
     {/* 👁 Vue */}
<TouchableOpacity
  style={[styles.fileActionButton, styles.viewFileButton]}
  onPress={() => handleViewFile(file.url)}
>
  <FontAwesome5 name="eye" size={14} color="#fff" />
</TouchableOpacity>

<TouchableOpacity
  style={[styles.fileActionButton, styles.downloadFileButton]}
  onPress={() => downloadAndShare(file.url, file.name)}
>
  <FontAwesome5 name="download" size={14} color="#fff" />
</TouchableOpacity>

    </View>
          </View>
        ))}
      </View>
    ) : (
      <View style={styles.noFilesContainer}>
        <FontAwesome5 name="file-upload" size={32} color="#ccc" />
        <Text style={styles.noFilesText}>
          Aucun fichier téléchargé
        </Text>
      </View>
    )}
  </View>
)}

                  
                
              </ScrollView>
            )}
            
            <TouchableOpacity style={styles.modalButton} onPress={() => setIsViewModalVisible(false)}>
              <Text style={styles.modalButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal d'édition */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <FontAwesome5 name="user-edit" size={30} color="#f39c12" />
              <Text style={styles.modalTitle}>Modifier l'utilisateur</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setIsEditModalVisible(false)}>
                <FontAwesome5 name="times" size={20} color="#555" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
             {/*  <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom d'utilisateur</Text>
                <View style={styles.inputContainer}>
                  <FontAwesome5 name="user" size={18} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.editInput}
                    value={editUsername}
                    onChangeText={setEditUsername}
                    placeholder="Nom d'utilisateur"
                  />
                </View>
              </View> */}

              {/* <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.inputContainer}>
                  <FontAwesome5 name="envelope" size={18} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.editInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="Email"
                    keyboardType="email-address"
                  />
                </View>
              </View> */}

              {selectedUser?.role === "Coach" && (
                <View style={styles.toggleContainer}>
                  <View>
                    <Text style={styles.toggleLabel}>Statut du compte</Text>
                    <Text style={styles.toggleSubLabel}>Activer ou désactiver ce coach</Text>
                  </View>
                  <View style={styles.toggleSwitch}>
                    <Text style={[styles.toggleOption, !editActive && styles.toggleOptionActive]}>Inactif</Text>
                    <TouchableOpacity 
                      style={[
                        styles.switchTrack, 
                        editActive && styles.switchTrackActive
                      ]}
                      onPress={() => setEditActive(!editActive)}
                    >
                      <View style={[
                        styles.switchThumb,
                        editActive && styles.switchThumbActive
                      ]} />
                    </TouchableOpacity>
                    <Text style={[styles.toggleOption, editActive && styles.toggleOptionActive]}>Actif</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsEditModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSaveEdit}>
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal visible={isDeleteConfirmModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <FontAwesome5 name="exclamation-triangle" size={50} color="#e74c3c" style={styles.confirmIcon} />
            <Text style={styles.confirmTitle}>Confirmer la suppression</Text>
            <Text style={styles.confirmText}>
              Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
            </Text>
            <View style={styles.confirmButtonsContainer}>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.cancelConfirmButton]} 
                onPress={() => setIsDeleteConfirmModalVisible(false)}
              >
                <Text style={styles.cancelConfirmButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.deleteConfirmButton]} 
                onPress={handleDeleteUser}
              >
                <Text style={styles.deleteConfirmButtonText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <FooterAdmin />
      <Toast />
    </View></View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
    paddingTop: 20,
  },
  header: {
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eaeaea",
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  statItem: {
    backgroundColor: "#f8f9fa",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#eaeaea",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#3498db",
  },
  statLabel: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginHorizontal: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  clearSearch: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyListText: {
    marginTop: 15,
    fontSize: 16,
    color: "#888",
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingBottom: 30,
    marginBottom: 70,
  },
  userItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    paddingVertical: 15,
    paddingHorizontal: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inactiveCoachItem: {
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
    backgroundColor: "#fff0f0",
  },
  selectedUserItem: {
    borderLeftWidth: 4,
    borderLeftColor: "#3498db",
    backgroundColor: "#f0f8ff",
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  userInfo: {
    flexDirection: "column",
  },
  userEmail: {
    fontSize: 14,
    color: "#777",
    marginBottom: 2,
  },
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  userRole: {
    fontSize: 13,
    color: "#666",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: "#f39c12",
  },
  deleteButton: {
    backgroundColor: "#e74c3c",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 15,
    width: "85%",
    maxHeight: "80%",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eaeaea",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 10,
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  userDetailsScroll: {
    maxHeight: 350,
  },
  detailAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  detailAvatarText: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "600",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eaeaea",
  },
  detailIcon: {
    marginRight: 15,
    width: 25,
  },
  detailLabel: {
    fontSize: 12,
    color: "#777",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  modalButton: {
    backgroundColor: "#3498db",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  formContainer: {
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f7fa",
    borderRadius: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  inputIcon: {
    marginRight: 10,
  },
  editInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eaeaea",
  },
  toggleLabel: {
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
  },
  toggleSubLabel: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  toggleSwitch: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleOption: {
    fontSize: 12,
    color: "#888",
    paddingHorizontal: 5,
  },
  toggleOptionActive: {
    color: "#3498db",
    fontWeight: "500",
  },
  switchTrack: {
    width: 48,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e0e0e0",
    padding: 2,
  },
  switchTrackActive: {
    backgroundColor: "rgba(52, 152, 219, 0.3)",
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#bbb",
  },
  switchThumbActive: {
    backgroundColor: "#3498db",
    transform: [{ translateX: 24 }],
  },
  modalButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    color: "#555",
  },
  saveButton: {
    backgroundColor: "#3498db",
    flex: 1,
    marginLeft: 8,
  },
  saveButtonText: {
    color: "#fff",
  },
  confirmModalContent: {
    backgroundColor: "#fff",
    borderRadius: 15,
    width: "80%",
    padding: 25,
    alignItems: "center",
  },
  confirmIcon: {
    marginBottom: 15,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
  },
  confirmText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  confirmButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  confirmButton: {
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  cancelConfirmButton: {
    backgroundColor: "#f5f5f5",
    marginRight: 8,
  },
  cancelConfirmButtonText: {
    color: "#555",
    fontWeight: "600",
  },
  deleteConfirmButton: {
    backgroundColor: "#e74c3c",
    marginLeft: 8,
  },
  deleteConfirmButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  filesSection: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filesSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  filesContainer: {
    marginTop: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  viewFileButton: {
    backgroundColor: '#3498db',
  },
  downloadFileButton: {
    backgroundColor: '#2ecc71',
  },
  noFilesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  noFilesText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  uploadBtnSend: {
    backgroundColor: '#2ecc71',
  },  
});