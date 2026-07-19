import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
  Alert,
} from 'react-native';
import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  ICE_LATTE: '#E4DDD3',
  THE_MINT: '#00A19B',
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  TEXT_MUTED: '#666666',
  ABSENT_RED: '#FF6B6B',
};

// IMPORTANT API NOTE FOR REACT NATIVE:
// If using Android Emulator, use 'http://10.0.2.2:8000'
// If using iOS Simulator or physical device, use your computer's Wi-Fi IP (e.g., 'http://192.168.1.X:8000')
const API_BASE_URL = 'http://16.170.193.134:8000'; 

export default function LoginScreen({ navigation }: any) {
  const [isResetMode, setIsResetMode] = useState(false);
  const [regNumber, setRegNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async () => {
    if (!regNumber || !password) return;

    // 1. Front-End Hashing Protocol
    const hashedPassword = CryptoJS.SHA256(password).toString();

    if (isResetMode) {
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match. Please try again.');
        return;
      }
      
      Alert.alert('Notice', 'Admin setup route not yet connected to frontend.');
    } else {
      setIsLoading(true);
      try {
        // 2. Call the FastAPI Backend
        const response = await fetch(`${API_BASE_URL}/login/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reg_number: regNumber,
            password_hash: hashedPassword,
          }),
        });

        if (response.ok) {
          const userData = await response.json();
          
          // 3. Save dynamic data to device storage
          await AsyncStorage.setItem('@cascade_user', JSON.stringify(userData));
          
          // 4. Send user to the main app
          navigation.replace('MainTabs'); 
        } else {
          const errorData = await response.json();
          Alert.alert('Login Failed', errorData.detail || 'Invalid credentials');
        }
      } catch (error) {
        Alert.alert('Network Error', 'Could not connect to the CASCADE server.');
        console.error("API Error:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleMode = () => {
    setIsResetMode(!isResetMode);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>CASCADE</Text>
            </View>
            <Text style={styles.title}>{isResetMode ? 'Account Setup' : 'Welcome Back'}</Text>
            <Text style={styles.subtitle}>G. H. Raisoni Skilltech University</Text>
          </View>

          {/* Input Section */}
          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Registration Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. STU-2024-8992"
                placeholderTextColor="#A0A0A0"
                value={regNumber}
                onChangeText={setRegNumber}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{isResetMode ? 'New Password' : 'Password'}</Text>
              <TextInput
                style={styles.input}
                placeholder={isResetMode ? "Create a secure password" : "Enter your password"}
                placeholderTextColor="#A0A0A0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {isResetMode && (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#A0A0A0"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            )}

            {!isResetMode && (
              <TouchableOpacity style={styles.forgotPassword} onPress={toggleMode}>
                <Text style={styles.forgotText}>First time here? / Forgot Password?</Text>
              </TouchableOpacity>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                (!regNumber || !password || isLoading || (isResetMode && !confirmPassword)) && styles.actionButtonDisabled
              ]}
              onPress={handleAction}
              disabled={!regNumber || !password || isLoading || (isResetMode && !confirmPassword)}
            >
              <Text style={styles.actionButtonText}>
                {isLoading ? 'Connecting...' : (isResetMode ? 'Set Secure Password' : 'Log In')}
              </Text>
            </TouchableOpacity>

            {isResetMode && (
              <TouchableOpacity style={styles.backToLogin} onPress={toggleMode}>
                <Text style={styles.backToLoginText}>Nevermind, I remember my password</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.ICE_LATTE },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  headerContainer: { alignItems: 'center', marginBottom: 40 },
  logoPlaceholder: { backgroundColor: COLORS.THE_MINT, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 16, marginBottom: 20, shadowColor: COLORS.THE_MINT, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  logoText: { color: COLORS.WHITE, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  title: { fontSize: 32, fontWeight: '900', color: COLORS.BLACK, marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.THE_MINT, fontWeight: '700', textAlign: 'center' },
  formContainer: { backgroundColor: COLORS.WHITE, borderRadius: 32, padding: 30, shadowColor: '#A39B8F', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  inputWrapper: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: COLORS.BLACK, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#F8F9FA', borderWidth: 2, borderColor: '#EFEFEF', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, fontSize: 16, fontWeight: '600', color: COLORS.BLACK },
  forgotPassword: { alignSelf: 'center', marginBottom: 24, marginTop: 8 },
  forgotText: { color: COLORS.THE_MINT, fontSize: 14, fontWeight: '800' },
  actionButton: { backgroundColor: COLORS.BLACK, borderRadius: 20, paddingVertical: 18, alignItems: 'center', shadowColor: COLORS.BLACK, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5, marginTop: 8 },
  actionButtonDisabled: { backgroundColor: '#999999', shadowOpacity: 0, elevation: 0 },
  actionButtonText: { color: COLORS.WHITE, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  backToLogin: { alignItems: 'center', marginTop: 20 },
  backToLoginText: { color: COLORS.TEXT_MUTED, fontSize: 14, fontWeight: '700' },
});