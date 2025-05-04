import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Image,
  Modal,
  Pressable,
  StatusBar
} from "react-native";
import { Platform, Vibration } from "react-native";
// @ts-ignore
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons, AntDesign, Feather } from "@expo/vector-icons";
import { logout, getToken, getUserIdFromToken, getUsersById } from "../utils/authService";
import ProtectedRoute from "../utils/ProtectedRoute";
import FooterR from "../components/FooterR";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import { Video } from "expo-av";
import * as Haptics from "expo-haptics";
import { ResizeMode } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import NavbarUser from "@/components/NavbarUser";

const { width } = Dimensions.get("window");

// Images pour le carrousel
const layeredImages = [
  require("../assets/images/workout1.jpg"),
  require("../assets/images/workout2.jpg"),
  require("../assets/images/workout3.jpg"),
  require("../assets/images/workout4.jpg"),
  require("../assets/images/workout5.jpg"),
];

// Vidéos pour la section vidéos avec URLs
const videoItems = [
  {
    id: "1",
    thumbnail: require("../assets/images/workout1.jpg"),
    title: "Footing matinal",
    subtitle: "Course à pied quotidienne",
    buttonText: "Regarder",
    videoUrl: require("../assets/video/yoga.mp4"),
    duration: "3:45",
    trainer: "Sara Kowalski",
    level: "Débutant",
    category: "Cardio",
  },
  {
    id: "2",
    thumbnail: require("../assets/images/workout2.jpg"),
    title: "Entraînement HIIT",
    subtitle: "Séance courte & intense",
    buttonText: "Démarrer",
    videoUrl: require("../assets/video/yoga.mp4"),
    duration: "2:30",
    trainer: "Alex Martinez",
    level: "Intermédiaire",
    category: "HIIT",
  },
  {
    id: "3",
    thumbnail: require("../assets/images/workout3.jpg"),
    title: "Yoga & étirements",
    subtitle: "Assouplissement complet",
    buttonText: "Explorer",
    videoUrl: require("../assets/video/yoga.mp4"),
    duration: "4:15",
    trainer: "Mia Chen",
    level: "Tous niveaux",
    category: "Yoga",
  },
  {
    id: "4",
    thumbnail: require("../assets/images/workout4.jpg"),
    title: "Renfo musculaire",
    subtitle: "Poids du corps & gainage",
    buttonText: "Voir",
    videoUrl: require("../assets/video/yoga.mp4"),
    duration: "5:20",
    trainer: "Mike Johnson",
    level: "Avancé",
    category: "Musculation",
  },
  {
    id: "5",
    thumbnail: require("../assets/images/workout5.jpg"),
    title: "Récup post‑séance",
    subtitle: "Étirements & relaxation",
    buttonText: "Suivre",
    videoUrl: require("../assets/video/yoga.mp4"),
    duration: "7:10",
    trainer: "Emma Wilson",
    level: "Tous niveaux",
    category: "Récupération",
  },
];


// Types pour les données
interface DailyStat {
  date: string;
  mealCal: number;
  sportCal: number;
  water: number;
}
interface Totals {
  date: string;
  mealCalories: number;
  sportCalories: number;
  waterLiters: number;
  hydrationPercent: number;
}
type SummaryItem = {
  id: string;
  title: string;
  amount: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};
interface User {
  id: number;
  username: string;
  photoUrl?: string;
}

// Mapping titre/icône/couleur selon la clé Totals
const SUMMARY_MAP: Record<
  Exclude<keyof Totals, "date">,
  { title: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  mealCalories:     { title: "Calories repas", icon: "restaurant",  color: "#4CD964" },
  sportCalories:    { title: "Calories sport", icon: "barbell",     color: "#FF9500" },
  waterLiters:      { title: "Eau (L)",        icon: "water",       color: "#80E080" },
  hydrationPercent: { title: "Hydratation (%)",icon: "water",       color: "#3399FF" },
};

// Charge les totaux depuis l'API
async function loadTotals(
  userId: number,
  date: string,
  activity?: string,
  duration?: number
): Promise<Totals> {
  const token = await getToken();

  // 1) URL de base : uniquement date
 // date = "2025-04-18" // fasa5ha ba3ed
  let url = `http://192.168.1.139:8080/api/stat/user/${userId}/totals?date=${date}`;

  // 2) Si on a activity+duration, on les ajoute
  if (activity && duration != null) {
    url += `&activity=${encodeURIComponent(activity)}&duration=${duration}`;
  }

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  console.log(res);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  return await res.json();
}

// Charge les stats journalières des 7 derniers jours
async function loadDailyStats(
  userId: number,
  startDate: string,
  endDate: string
): Promise<DailyStat[]> {
  const token = await getToken();
  const res = await fetch(
    `http://192.168.1.139:8080/api/stat/user/${userId}/stats?startDate=${startDate}&endDate=${endDate}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  console.log(res);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const arr: [string, number, number, number][] = await res.json();
  return arr.map(([date, mealCal, sportCal, water]) => ({
    date,
    mealCal,
    sportCal,
    water,
  }));
}

export default function TransactionDashboard() {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [unreadCount] = useState(3);
  const [summaryData, setSummaryData] = useState<SummaryItem[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoFadeAnim = useRef(new Animated.Value(1)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<typeof videoItems[0] | null>(null);
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPosition, setVideoPosition] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [videoFullscreen, setVideoFullscreen] = useState(false);
  const [videoVolume, setVideoVolume] = useState(1);
  const [relatedVideos, setRelatedVideos] = useState<typeof videoItems>([]);
  const [likedVideo, setLikedVideo] = useState(false);
  const [savedVideo, setSavedVideo] = useState(false);


  // Carrousel auto pour images
  useEffect(() => {
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
      setCurrentImageIndex(i => (i === layeredImages.length - 1 ? 0 : i + 1));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // Fetch données
  useEffect(() => {
    (async () => {
      try {
        const userId = Number(await getUserIdFromToken());
        const today = getLocalFormattedDate(new Date());

        const totals = await loadTotals(userId, today, "course", 10);
        // Génère summaryData dynamiquement
        const summaryArray: SummaryItem[] = (Object.entries(totals) as [keyof Totals, any][])
          .filter(([key]) => key !== "date")
          .map(([key, value]) => ({
            id: key,
            title: SUMMARY_MAP[key as Exclude<keyof Totals, "date">].title,
            icon: SUMMARY_MAP[key as Exclude<keyof Totals, "date">].icon,
            color: SUMMARY_MAP[key as Exclude<keyof Totals, "date">].color,
            amount: Number(value),
          }));
        setSummaryData(summaryArray);

        const past = new Date();
        past.setDate(past.getDate() - 6);
        const stats = await loadDailyStats(
          userId,
          getLocalFormattedDate(past),
          today
        );
        setDailyStats(stats);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);
  
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const userId = await getUserIdFromToken();
          if (userId) {
            const response = await getUsersById(userId);
            setUsername(response?.username ?? "User");
          } else {
            console.error("User ID not found");
          }
        }
      } catch (err) {
        console.error("Impossible de décoder le token :", err);
      }
    })();
  }, []);
  
  // Chaque fois qu'on sélectionne une vidéo, on trouve les vidéos associées
  useEffect(() => {
    if (selectedVideo) {
      // Trouver d'autres vidéos de la même catégorie ou du même niveau
      const similarVideos = videoItems
        .filter(v => 
          v.id !== selectedVideo.id && 
          (v.category === selectedVideo.category || v.level === selectedVideo.level)
        )
        .slice(0, 3);
      setRelatedVideos(similarVideos);
    }
  }, [selectedVideo]);

  // Gère la fermeture du modal vidéo
  const handleCloseModal = () => {
    if (videoRef.current) {
      videoRef.current.pauseAsync();
    }
    setIsPlaying(false);
    setModalVisible(false);
    setVideoProgress(0);
    setVideoFullscreen(false);
    setLikedVideo(false);
    setSavedVideo(false);
  };

  // Gère l'ouverture du modal vidéo et démarre la vidéo automatiquement
  const handleOpenVideoModal = async (video: typeof videoItems[0]) => {
    // 1) Always vibrate (works on web + mobile)
    Vibration.vibrate(50);
  
    // 2) Only call expo‑haptics on native (iOS/Android)
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // ignore if unavailable
      }
    }
  
    // 3) Set video and open modal with video auto-play
    setSelectedVideo(video);
    setModalVisible(true);
    setIsPlaying(true);  // Auto-play is true by default
    
    // Pour assurer que la vidéo démarre après le rendu du modal
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.playAsync();
      }
    }, 500);
  };

  // Toggle la lecture/pause de la vidéo
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setVideoFullscreen(!videoFullscreen);
    // On pourrait ajouter ici la gestion réelle du fullscreen selon la plateforme
  };

  // Toggle le son
  const toggleMute = () => {
    if (videoRef.current) {
      const newVolume = videoVolume > 0 ? 0 : 1;
      videoRef.current.setVolumeAsync(newVolume);
      setVideoVolume(newVolume);
    }
  };

  // Format la durée en MM:SS
  const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Met à jour la progression de la vidéo
  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded && status.durationMillis > 0) {
      setVideoProgress(status.positionMillis / status.durationMillis);
      setVideoDuration(status.durationMillis);
      setVideoPosition(status.positionMillis);
      
      // Auto-play next video when this one finishes
      if (status.didJustFinish && !status.isLooping) {
        // Find next video in the related videos
        if (relatedVideos.length > 0) {
          setTimeout(() => {
            handleOpenVideoModal(relatedVideos[0]);
          }, 1500);
        }
      }
    }
  };

  // Changement de vidéo avec animation
  const handleVideoChange = (index: number) => {
    Animated.sequence([
      Animated.timing(videoFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(videoFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true })
    ]).start();
    setCurrentVideoIndex(index);
  };

  // Pour le graphique circulaire
  const totalAmount = summaryData.reduce((sum, x) => sum + x.amount, 0);
  const renderPieChart = (items: SummaryItem[]) => {
    let startAngle = 0;
    return items.map(cat => {
      const angle = totalAmount ? (cat.amount / totalAmount) * 360 : 0;
      const endAngle = startAngle + angle;
      const x1 = 50 + 35 * Math.cos((startAngle - 90) * Math.PI/180);
      const y1 = 50 + 35 * Math.sin((startAngle - 90) * Math.PI/180);
      const x2 = 50 + 35 * Math.cos((endAngle   - 90) * Math.PI/180);
      const y2 = 50 + 35 * Math.sin((endAngle   - 90) * Math.PI/180);
      const largeArc = angle > 180 ? 1 : 0;
      const d = `M50 50 L${x1} ${y1} A35 35 0 ${largeArc} 1 ${x2} ${y2} Z`;
      startAngle = endAngle;
      return <Path key={cat.id} d={d} fill={cat.color} />;
    });
  };

  // Like une vidéo
  const toggleLikeVideo = () => {
    if (likedVideo) {
      // Haptic feedback pour unlike
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      // Haptic feedback plus fort pour like
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setLikedVideo(!likedVideo);
  };

  // Sauvegarde une vidéo
  const toggleSaveVideo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSavedVideo(!savedVideo);
  };

  // Avancer la vidéo de 10 secondes
  const skipForward = async () => {
    if (videoRef.current && videoPosition < videoDuration) {
      const newPosition = Math.min(videoPosition + 10000, videoDuration);
      await videoRef.current.setPositionAsync(newPosition);
    }
  };

  // Reculer la vidéo de 10 secondes
  const skipBackward = async () => {
    if (videoRef.current && videoPosition > 0) {
      const newPosition = Math.max(videoPosition - 10000, 0);
      await videoRef.current.setPositionAsync(newPosition);
    }
  };

  return (
    <ProtectedRoute>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        {/* HEADER */}
        <NavbarUser />

        {/* CONTENT */}
        <ScrollView 
          style={styles.contentScroll} 
          showsVerticalScrollIndicator={false}
          ref={scrollViewRef}
        >
          <View style={styles.content}>
            {/* Greeting Section */}
            <View style={styles.greetingSection}>
              <Text style={styles.greeting}>Bonjour, {username}<Image
                          source={require('../assets/images/hand.png')}
                          style={{ width: 40, height:40, borderRadius: 8  , top:10}}
                        /></Text>
              <Text style={styles.greetingSubtext}>Voici votre résumé quotidien</Text>
            </View>

            {/* Transaction History */}
            <View style={styles.circleGraphSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Transaction History</Text>
              </View>
              <Text style={styles.sectionSubtitle}>Données du jour</Text>

              <View style={styles.circleGraphContainer}>
                <Svg height="200" width="200" viewBox="0 0 100 100">
                  {renderPieChart(summaryData)}
                  <Circle cx="50" cy="50" r="30" fill="white" />
                  <SvgText x="50" y="48" textAnchor="middle" fontSize="12" fontWeight="bold">
                    {totalAmount}
                  </SvgText>
                  <SvgText x="50" y="60" textAnchor="middle" fontSize="8" fill="#777">
                    TOTAL
                  </SvgText>
                </Svg>
              </View>

              <View style={styles.categoryList}>
                {summaryData.map(cat => (
                  <View key={cat.id} style={styles.categoryItem}>
                    <View style={[styles.categoryIcon, { backgroundColor: cat.color }]}>
                      <Ionicons name={cat.icon} size={16} color="white" />
                    </View>
                    <View style={styles.categoryTextContainer}>
                      <Text style={styles.categoryTitle}>{cat.title}</Text>
                    </View>
                    <Text style={styles.categoryAmount}>{cat.amount}</Text>
                  </View>
                ))}
              </View>

              {/* Stats journalières */}
              <Text style={styles.dailyStatsTitle}>Historique de la semaine</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dailyStatsScroll}>
                {dailyStats.map(ds => (
                  <View key={ds.date} style={styles.dailyStatItem}>
                    <Text style={styles.dailyStatDate}>{ds.date.slice(5)}</Text>
                    <View style={styles.dailyStatValueContainer}>
                      <Ionicons name="restaurant" size={14} color="#4CD964" />
                      <Text style={styles.dailyStatText}>{ds.mealCal}</Text>
                    </View>
                    <View style={styles.dailyStatValueContainer}>
                      <Ionicons name="barbell" size={14} color="#FF9500" />
                      <Text style={styles.dailyStatText}>{ds.sportCal}</Text>
                    </View>
                    <View style={styles.dailyStatValueContainer}>
                      <Ionicons name="water" size={14} color="#3399FF" />
                      <Text style={styles.dailyStatText}>{ds.water}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Section Vidéos - CONCEPTION AMÉLIORÉE */}
            <View style={styles.videosSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Vidéos recommandées</Text>
              </View>
              
              {/* Vidéo principale avec bouton */}
              <View style={styles.videoMainContainer}>
                <Animated.View style={[styles.videoOverlayContainer, { opacity: videoFadeAnim }]}>
                  <Image 
                    source={videoItems[currentVideoIndex].thumbnail} 
                    style={styles.videoImage} 
                  />
                  <View style={styles.videoOverlayGradient} />
                  <View style={styles.videoOverlayContent}>
                    <View style={styles.videoTagContainer}>
                      <Text style={styles.videoTag}>{videoItems[currentVideoIndex].category}</Text>
                      <Text style={styles.videoTag}>{videoItems[currentVideoIndex].level}</Text>
                    </View>
                    <Text style={styles.videoTitle}>{videoItems[currentVideoIndex].title}</Text>
                    <Text style={styles.videoSubtitle}>{videoItems[currentVideoIndex].subtitle}</Text>
                    <View style={styles.videoTrainerInfo}>
                      <Ionicons name="person-circle-outline" size={14} color="#fff" />
                      <Text style={styles.videoTrainerText}>{videoItems[currentVideoIndex].trainer}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.videoButton}
                      onPress={() => handleOpenVideoModal(videoItems[currentVideoIndex])}
                    >
                      <Text style={styles.videoButtonText}>{videoItems[currentVideoIndex].buttonText}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.videoDurationBadge}>
                    <Ionicons name="time-outline" size={12} color="#fff" />
                    <Text style={styles.videoDurationText}>{videoItems[currentVideoIndex].duration}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.playButtonOverlay}
                    onPress={() => handleOpenVideoModal(videoItems[currentVideoIndex])}
                  >
                    <View style={styles.playButton}>
                      <Ionicons name="play" size={24} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* Indicateurs de vidéos (points) */}
              <View style={styles.videoDots}>
                {videoItems.slice(0, 3).map((_, index) => (
                  <TouchableOpacity key={index} onPress={() => handleVideoChange(index)}>
                    <View 
                      style={[
                        styles.videoDot, 
                        currentVideoIndex === index ? styles.videoActiveDot : null
                      ]} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Liste horizontale des vidéos */}
              <Text style={styles.videoCategoryTitle}>Vidéos à ne pas manquer</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.videoHorizontalScroll}
                contentContainerStyle={styles.videoHorizontalScrollContent}
              >
                {videoItems.map((video, index) => (
                  <TouchableOpacity 
                    key={video.id} 
                    style={styles.videoThumbnailContainer}
                    onPress={() => handleOpenVideoModal(video)}
                  >
                    <Image source={video.thumbnail} style={styles.videoThumbnail} />
                    <View style={styles.videoThumbnailOverlay} />
                    <View style={styles.videoInfoContainer}>
                      <Text style={styles.videoThumbnailTitle} numberOfLines={1}>{video.title}</Text>
                      <Text style={styles.videoThumbnailDuration}>{video.duration}</Text>
                    </View>
                    <View style={styles.videoPlayIconContainer}>
                      <Ionicons name="play-circle" size={30} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Carrousel d'images - Amélioré */}
            <View style={styles.layeredImagesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Featured Cards</Text>
              </View>
              
              <TouchableOpacity
                onPress={() => {
                  setCurrentImageIndex(i => (i === layeredImages.length - 1 ? 0 : i + 1));
                  Animated.sequence([
                    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
                  ]).start();
                }}
                activeOpacity={0.9}
                style={styles.layeredImageContainer}
              >
                <Animated.Image
                  source={layeredImages[currentImageIndex]}
                  style={[styles.layeredImage, { opacity: fadeAnim }]}
                />
                <View style={styles.imageOverlayGradient} />
                <View style={styles.imageIndicators}>
                  {layeredImages.map((_, idx) => (
                    <View 
                      key={idx} 
                      style={[
                        styles.imageIndicator, 
                        idx === currentImageIndex ? styles.activeImageIndicator : null
                      ]} 
                    />
                  ))}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* VIDEO MODAL */}
        <Modal
  animationType="slide"
  transparent={true}
  visible={modalVisible}
  onRequestClose={handleCloseModal}
>
  <View style={[styles.modalContainer, videoFullscreen && styles.modalFullscreen]}>
    <StatusBar hidden={videoFullscreen} />
    
    <View style={styles.modalContent}>
      {/* En-tête du modal avec titre et boutons */}
      <View style={[styles.modalHeader, videoFullscreen ? styles.hiddenControl : null]}>
        <TouchableOpacity 
          style={styles.modalCloseButton} 
          onPress={handleCloseModal}
          hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
        >
          <AntDesign name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.modalTitle} numberOfLines={1}>{selectedVideo?.title}</Text>
        <TouchableOpacity
          style={styles.modalHeaderButton}
          onPress={toggleFullscreen}
          hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
        >
          <Ionicons name={videoFullscreen ? "contract" : "expand"} size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Conteneur du lecteur vidéo */}
      <View style={[styles.videoPlayerContainer, videoFullscreen && styles.videoPlayerFullscreen]}>
        {selectedVideo && (
          <Video
            ref={videoRef}
            source={selectedVideo.videoUrl}
            style={styles.videoPlayer}
            resizeMode={videoFullscreen ? ResizeMode.CONTAIN : ResizeMode.COVER}
            shouldPlay={isPlaying}
            isLooping={false}
            volume={videoVolume}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          />
        )}
        
        {/* Overlay pour lecture/pause en cliquant sur la vidéo */}
        <TouchableOpacity 
          style={styles.videoPlayPauseOverlay}
          onPress={togglePlayPause}
          activeOpacity={1}
        >
          {!isPlaying && (
            <LinearGradient 
              colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)']} 
              style={styles.videoOverlayGradient}
            />
          )}
          
          {/* Bouton central play/pause qui s'affiche brièvement au clic */}
          {!isPlaying && (
            <View style={styles.videoPlayPauseButton}>
              <Ionicons name="play" size={40} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Barre de progression avec timing */}
      <View style={[styles.videoProgressSection, videoFullscreen && styles.videoProgressFullscreen]}>
        <Text style={styles.videoTimingText}>
          {formatDuration(videoPosition)}
        </Text>
        
        <View style={styles.videoProgressContainer}>
          <View style={[styles.videoProgress, { width: `${videoProgress * 100}%` }]} />
          <View style={[styles.videoProgressKnob, { left: `${videoProgress * 100}%` }]} />
        </View>
        
        <Text style={styles.videoTimingText}>
          {formatDuration(videoDuration)}
        </Text>
      </View>
      
      {/* Contrôles vidéo */}
      <View style={[styles.videoControls, videoFullscreen && styles.videoControlsFullscreen]}>
        <TouchableOpacity 
          style={styles.videoControlButton}
          onPress={skipBackward}
          hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
        >
          <Ionicons name="play-back" size={26} color="#fff" />
          <Text style={styles.skipText}>10s</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.videoPlayButton}
          onPress={togglePlayPause}
          hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
        >
          <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.videoControlButton}
          onPress={skipForward}
          hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
        >
          <Ionicons name="play-forward" size={26} color="#fff" />
          <Text style={styles.skipText}>10s</Text>
        </TouchableOpacity>
      </View>
      
      {/* Options supplémentaires (volume, favoris, sauvegarder) */}
      <View style={[styles.videoExtraControls, videoFullscreen && styles.hiddenControl]}>
        <TouchableOpacity 
          style={styles.videoExtraButton} 
          onPress={toggleMute}
          hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
        >
          <Ionicons 
            name={videoVolume > 0 ? "volume-high" : "volume-mute"} 
            size={22} 
            color="#fff" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.videoExtraButton}
          onPress={toggleLikeVideo}
          hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
        >
          <AntDesign 
            name={likedVideo ? "heart" : "hearto"} 
            size={22} 
            color={likedVideo ? "#ff3366" : "#fff"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.videoExtraButton}
          onPress={toggleSaveVideo}
          hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
        >
          <Feather 
            name={savedVideo ? "bookmark" : "bookmark"} 
            size={22} 
            color={savedVideo ? "#ff3366" : "#fff"} 
          />
        </TouchableOpacity>
      </View>
      
      {!videoFullscreen && (
        <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
          {/* Infos détaillées sur la vidéo */}
          <View style={styles.modalBody}>
            <Text style={styles.modalVideoTitle}>{selectedVideo?.title}</Text>
            <Text style={styles.modalVideoSubtitle}>{selectedVideo?.subtitle}</Text>
            
            <View style={styles.videoMetaContainer}>
              <View style={styles.videoMetaItem}>
                <Ionicons name="time-outline" size={14} color="#999" />
                <Text style={styles.videoMetaText}>{selectedVideo?.duration}</Text>
              </View>
              <View style={styles.videoMetaItem}>
                <Ionicons name="person-outline" size={14} color="#999" />
                <Text style={styles.videoMetaText}>{selectedVideo?.trainer}</Text>
              </View>
              <View style={styles.videoMetaItem}>
                <Ionicons name="fitness-outline" size={14} color="#999" />
                <Text style={styles.videoMetaText}>{selectedVideo?.level}</Text>
              </View>
              <View style={styles.videoMetaItem}>
                <Ionicons name="grid-outline" size={14} color="#999" />
                <Text style={styles.videoMetaText}>{selectedVideo?.category}</Text>
              </View>
            </View>
            
            <Text style={styles.modalVideoDescription}>
              Cette séance {selectedVideo?.title.toLowerCase()} vous permet de travailler l'ensemble de votre corps 
              avec des exercices adaptés à votre niveau. Idéal pour maintenir votre condition physique 
              et améliorer vos performances au quotidien.
            </Text>
            
            {/* Section vidéos connexes */}
            {relatedVideos.length > 0 && (
              <View style={styles.relatedVideosSection}>
                <Text style={styles.relatedVideosTitle}>Vidéos similaires</Text>
                
                <View style={styles.relatedVideosList}>
                  {relatedVideos.map((video) => (
                    <TouchableOpacity 
                      key={video.id}
                      style={styles.relatedVideoItem}
                      onPress={() => handleOpenVideoModal(video)}
                    >
                      <Image source={video.thumbnail} style={styles.relatedVideoThumbnail} />
                      <View style={styles.relatedVideoOverlay} />
                      <View style={styles.relatedVideoPlayIcon}>
                        <Ionicons name="play-circle" size={24} color="#fff" />
                      </View>
                      <View style={styles.relatedVideoInfo}>
                        <Text style={styles.relatedVideoTitle} numberOfLines={2}>{video.title}</Text>
                        <Text style={styles.relatedVideoDuration}>{video.duration}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  </View>
</Modal>

        {/* FOOTER */}
        <FooterR />
      </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f5f5f7" 
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoutButton: { 
    backgroundColor: "#f8f8f8", 
    padding: 8, 
    borderRadius: 50 
  },
  iconBtn: { 
    padding: 8, 
    borderRadius: 50, 
    backgroundColor: "#f8f8f8" 
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    backgroundColor: "#ff3b30",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { 
    color: "white", 
    fontSize: 10, 
    fontWeight: "bold" 
  },
  contentScroll: { 
    flex: 1 
  },
  content: { 
    padding: 16, 
    paddingBottom: 32 
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "flex-end",
  },
  modalFullscreen: {
    backgroundColor: "#000",
  },
  videoTrainerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 4,
  },
  videoTrainerText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },
  videoSubtitle: {
    fontSize: 14,
    color: "#eee",
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Greeting section
  greetingSection: {
    marginBottom: 20,
    marginTop: -20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  greetingSubtext: {
    fontSize: 15,
    color: "#666",
    marginTop: 4,
  },

  // Circle Graph Section
  circleGraphSection: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: "600", 
    color: "#333" 
  },
  detailsText: { 
    fontSize: 14, 
    color: "#007aff",
    fontWeight: "500", 
  },
  sectionSubtitle: { 
    fontSize: 14, 
    color: "#888", 
    marginBottom: 15 
  },
  circleGraphContainer: { 
    alignItems: "center", 
    justifyContent: "center", 
    marginVertical: 15 
  },
  categoryList: { 
    marginTop: 20 
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  categoryTextContainer: { 
    flex: 1 
  },
  categoryTitle: { 
    fontSize: 14, 
    color: "#333",
    fontWeight: "500", 
  },
  categoryAmount: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#333" 
  },
  
  // Daily Stats
  dailyStatsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 12,
  },
  dailyStatsScroll: {
    marginBottom: 10,
  },
  dailyStatItem: {
    backgroundColor: "#f8f8fa",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 10,
    width: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  dailyStatDate: { 
    fontWeight: "600", 
    marginBottom: 8,
    fontSize: 13,
    color: "#333", 
  },
  dailyStatValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
  },
  dailyStatText: { 
    fontSize: 13,
    marginLeft: 4, 
    color: "#555" 
  },

  // Vidéos Section - NOUVELLE CONCEPTION
  videosSection: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  videoMainContainer: {
    height: 220,
    width: "100%",
    borderRadius: 15,
    overflow: "hidden",
    position: "relative",
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  videoOverlayContainer: {
    height: "100%",
    width: "100%",
    borderRadius: 15,
    overflow: "hidden",
    position: "relative",
  },
  videoImage: {
    width: "100%", 
    height: "100%", 
    resizeMode: "cover"
  },
  videoOverlayContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
  },

  videoButton: {
    backgroundColor: "#ff3366",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  videoButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  videoDots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
  },
  videoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ddd",
    marginHorizontal: 4,
  },
  videoActiveDot: {
    backgroundColor: "#ff3366",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  videoDurationBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  videoDurationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  playButtonOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 60,
    height: 60,
    backgroundColor: "rgba(255, 51, 102, 0.8)",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  videoCategoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 24,
    marginBottom: 12,
  },
  videoHorizontalScroll: {
    marginBottom: 10,
  },
  videoHorizontalScrollContent: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  videoThumbnailContainer: {
    width: 160,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  videoThumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  videoThumbnailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  videoInfoContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  videoThumbnailTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  videoThumbnailDuration: {
    color: "#eee",
    fontSize: 11,
  },
  videoPlayIconContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -15 }, { translateY: -15 }],
    opacity: 0.9,
  },

  // Layered Images Section
  layeredImagesSection: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  layeredImageContainer: { 
    marginTop: 15, 
    borderRadius: 15, 
    overflow: "hidden", 
    height: 200,
    position: "relative",
  },
  layeredImage: { 
    width: "100%", 
    height: 200, 
    borderRadius: 15, 
    resizeMode: "cover" 
  },
  imageOverlayGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "30%",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  imageIndicators: {
    position: "absolute",
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  activeImageIndicator: {
    backgroundColor: "#fff",
    width: 16,
    height: 8,
    borderRadius: 4,
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#111",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: "rgba(17, 17, 17, 0.95)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  modalHeaderButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  
  // Conteneur du lecteur vidéo
  videoPlayerContainer: {
    width: "100%",
    aspectRatio: 16/9,
    backgroundColor: "#000",
    position: "relative",
  },
  videoPlayerFullscreen: {
    flex: 1,
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  
  // Overlay et contrôles de lecture/pause
  videoPlayPauseOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  videoOverlayGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoPlayPauseButton: {
    width: 80,
    height: 80,
    backgroundColor: "rgba(255, 51, 102, 0.8)",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Barre de progression
  videoProgressSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#111",
  },
  videoProgressFullscreen: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
  },
  videoProgressContainer: {
    flex: 1,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    marginHorizontal: 8,
    position: "relative",
  },
  videoProgress: {
    height: "100%",
    backgroundColor: "#ff3366",
    borderRadius: 2,
  },
  videoProgressKnob: {
    position: "absolute",
    top: -6,
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ff3366",
    borderWidth: 2,
    borderColor: "#fff",
  },
  videoTimingText: {
    color: "#bbb",
    fontSize: 12,
    width: 44,
    textAlign: "center",
  },
  
  // Contrôles vidéo
  videoControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#111",
  },
  videoControlsFullscreen: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    paddingBottom: 20,
  },
  videoControlButton: {
    padding: 8,
    alignItems: "center",
  },
  skipText: {
    color: "#ddd",
    fontSize: 10,
    marginTop: 2,
  },
  videoPlayButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 51, 102, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 20,
  },
  
  // Contrôles supplémentaires
  videoExtraControls: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#222",
    backgroundColor: "#111",
  },
  videoExtraButton: {
    padding: 10,
    borderRadius: 24,
    backgroundColor: "#222",
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  hiddenControl: {
    opacity: 0,
    height: 0,
    overflow: "hidden",
  },
  
  // Contenu modal
  modalBodyScroll: {
    flex: 1,
    backgroundColor: "#111",
  },
  modalBody: {
    padding: 20,
  },
  modalVideoTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  modalVideoSubtitle: {
    color: "#aaa",
    fontSize: 16,
    marginBottom: 12,
  },
  videoMetaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 12,
  },
  videoMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  videoMetaText: {
    color: "#999",
    fontSize: 14,
  },
  modalVideoDescription: {
    color: "#ddd",
    fontSize: 14,
    lineHeight: 22,
    marginVertical: 16,
  },
  
  // Section vidéos connexes
  relatedVideosSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  relatedVideosTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  relatedVideosList: {
    gap: 16,
  },
  relatedVideoItem: {
    flexDirection: "row",
    height: 80,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#222",
  },
  relatedVideoThumbnail: {
    width: 120,
    height: 80,
    resizeMode: "cover",
  },
  relatedVideoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 120,
    height: 80,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  relatedVideoPlayIcon: {
    position: "absolute",
    top: 28,
    left: 48,
  },
  relatedVideoInfo: {
    flex: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  relatedVideoTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  relatedVideoDuration: {
    color: "#999",
    fontSize: 12,
  },
  videoTagContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  videoTag: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    backgroundColor: "rgba(255,51,102,0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
});

// Utilitaire date locale
function getLocalFormattedDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}