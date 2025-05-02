import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

// Define our navigation types
type RootStackParamList = {
  Welcome: undefined;
  AuthScreen: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProps>();
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<Video>(null);

  const handleGetStarted = () => {
    navigation.navigate('AuthScreen');
  };

  const toggleVideo = () => {
    setShowVideo(!showVideo);
    if (!showVideo) {
      setTimeout(() => {
        videoRef.current?.playAsync();
      }, 100);
    } else {
      videoRef.current?.pauseAsync();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['rgba(195, 0, 0, 0.2)', 'rgba(195, 0, 0, 0.7)']}
        style={styles.background}
      >
        <View style={styles.header}>
          <Text style={styles.logoText}>NutriMind</Text>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="menu" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.mediaContainer}>
          {showVideo ? (
            <Video
              ref={videoRef}
              style={styles.video}
              source={require('../assets/video/nutrition.mp4')} // Replace with your video
              useNativeControls
              resizeMode={ResizeMode.COVER}
              isLooping
            />
          ) : (
            <Image
              source={require('../assets/images/healthy-food.png')} // Replace with your image
              style={styles.image}
              resizeMode="cover"
            />
          )}

          <View style={styles.overlayControls}>
            <TouchableOpacity
              style={styles.videoButton}
              onPress={toggleVideo}
            >
              <Ionicons
                name={showVideo ? "pause" : "play"}
                size={22}
                color="#fff"
              />
              <Text style={styles.videoButtonText}>
                {showVideo ? "Pause" : "Play video"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Floating brand icons like in the reference */}
          <View style={[styles.floatingIcon, { top: '15%', right: '15%' }]}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🥗</Text>
            </View>
          </View>
          <View style={[styles.floatingIcon, { bottom: '28%', left: '10%' }]}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🥑</Text>
            </View>
          </View>
        </View>

        <View style={[
          styles.contentContainer,
          showVideo && styles.contentContainerExpanded
        ]}>
          <View style={styles.ratingCard}>
            <View style={styles.stars}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Ionicons name="star" size={16} color="#FFD700" />
              <Ionicons name="star" size={16} color="#FFD700" />
              <Ionicons name="star" size={16} color="#FFD700" />
              <Ionicons name="star" size={16} color="#FFD700" />
            </View>
            <Text style={styles.ratingText}>5.0 Trusted by 10k+ users</Text>
          </View>

          <Text style={styles.title}>Hire nutritionists</Text>
          <Text style={styles.subtitle}>with better reviews</Text>
          
          <Text style={styles.description}>
            NutriMind is free and open to everyone. Sharing your experiences
            helping others to grow their health journey.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleGetStarted}
              activeOpacity={0.9}
            >
              <Text style={styles.buttonText}>Try for free</Text>
              <Ionicons name="arrow-forward" size={18} color="white" style={styles.buttonIcon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.videoButtonMobile}
              onPress={toggleVideo}
              activeOpacity={0.7}
            >
              <Text style={styles.videoButtonMobileText}>Play video</Text>
              <View style={styles.playIcon}>
                <Ionicons name="play" size={14} color="rgba(195, 0, 0, 0.8)" />
              </View>
            </TouchableOpacity>
          </View>
{/* 
          <View style={styles.socialIcons}>
            <TouchableOpacity style={styles.socialIcon}>
              <Ionicons name="logo-facebook" size={24} color="#3b5998" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon}>
              <Ionicons name="logo-instagram" size={24} color="#C13584" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon}>
              <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon}>
              <Ionicons name="logo-telegram" size={24} color="#0088cc" />
            </TouchableOpacity>
          </View> */}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  background: {
    flex: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
    height: 60,
    zIndex: 10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  menuButton: {
    padding: 8,
  },
  mediaContainer: {
    height: height * 0.47,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: 400,
    height: 400,
    top: -30,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlayControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  videoButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  floatingIcon: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
    zIndex: 9,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    flex: 1,
    // Default size when video is not playing
  },
  contentContainerExpanded: {
    // Expanded size when video is playing
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 48,
    flex: 1.2, // Increase the flex value to make it larger
    marginTop: -30, // Adjust to make the container reach higher
  },
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'rgba(195, 0, 0, 0.8)',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: 'rgba(195, 0, 0, 0.8)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginRight: 16,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  videoButtonMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  videoButtonMobileText: {
    color: '#333',
    marginRight: 8,
    fontWeight: '500',
  },
  playIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIcons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    alignSelf: 'center',
    marginTop: 'auto',
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WelcomeScreen;