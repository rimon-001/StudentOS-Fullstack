import React, { useRef, useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ActivityIndicator, 
  StatusBar, 
  BackHandler, 
  Platform,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ToastAndroid
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';

const WEB_APP_URL = 'http://192.168.76.37:5173';

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [errorOccurred, setErrorOccurred] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const lastBackPressTime = useRef<number>(0);

  // Hardware Back button support for Android
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      // 1. If WebView can go back in its history, navigate back inside the web app
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }

      // 2. If at the root screen, require a double-tap within 2s to exit
      const now = Date.now();
      if (now - lastBackPressTime.current < 2000) {
        return false; // Exits app
      }

      lastBackPressTime.current = now;
      ToastAndroid.show('Press back again to exit StudentOS', ToastAndroid.SHORT);
      return true; // Prevents exit on the first tap
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [canGoBack]);

  const handleRefresh = () => {
    setRefreshing(true);
    setErrorOccurred(false);
    webViewRef.current?.reload();
    setTimeout(() => setRefreshing(false), 1200);
  };

  const handleRetry = () => {
    setErrorOccurred(false);
    setLoading(true);
    webViewRef.current?.reload();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" translucent={false} />

      {errorOccurred ? (
        <ScrollView 
          contentContainerStyle={styles.errorContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh} 
              tintColor="#3b82f6" 
              colors={['#3b82f6']}
              progressBackgroundColor="#1e293b"
            />
          }
        >
          <View style={styles.errorBadge}>
            <Text style={styles.errorBadgeText}>Connection Lost</Text>
          </View>
          <Text style={styles.errorTitle}>StudentOS Unreachable</Text>
          <Text style={styles.errorSubtitle}>
            Unable to connect to the academic server at:
          </Text>
          <Text style={styles.urlBadge}>{WEB_APP_URL}</Text>

          <Text style={styles.errorHint}>
            • Ensure your laptop and phone are on the same Wi-Fi.{"\n"}
            • Ensure "npm run dev" is active in the web project.
          </Text>

          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Reconnect Workspace</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.webviewWrapper}>
          <WebView
            ref={webViewRef}
            source={{ uri: WEB_APP_URL }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            startInLoadingState={true}
            allowsBackForwardNavigationGestures={true}
            pullToRefreshEnabled={true}
            overScrollMode="never"
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
            }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setErrorOccurred(true);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              if (nativeEvent.statusCode >= 500) {
                setLoading(false);
                setErrorOccurred(true);
              }
            }}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Initializing StudentOS...</Text>
              </View>
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  webviewWrapper: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0B132B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  errorContainer: {
    flexGrow: 1,
    backgroundColor: '#0B132B',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 16,
  },
  errorBadgeText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 8,
  },
  urlBadge: {
    fontSize: 12,
    color: '#60a5fa',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorHint: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});