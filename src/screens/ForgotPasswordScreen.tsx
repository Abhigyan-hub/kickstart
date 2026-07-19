import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import CryptoJS from 'crypto-js';

const API_BASE_URL = 'http://16.170.193.134:8000';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState<1 | 2>(1); 
  const [regNumber, setRegNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleRequestOTP = async () => {
    if (!regNumber) {
      Alert.alert('Error', 'Please enter your Registration Number');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reg_number: regNumber }),
      });
      if (response.ok) {
        setStep(2); 
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorData = await response.json();
          Alert.alert('Request Failed', errorData.detail || 'Could not process your request.');
        } else {
          const errorText = await response.text();
          Alert.alert('Server Error', `${response.status} - ${errorText.substring(0, 40)}...`);
        }
      }
    } catch (error) {
      Alert.alert('Network Error', 'Check your connection to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || !newPassword) {
      Alert.alert('Error', 'Please enter the OTP and a new password.');
      return;
    }
    setIsLoading(true);
    const hashedNewPassword = CryptoJS.SHA256(newPassword).toString();
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reg_number: regNumber,
          otp: otp,
          new_password_hash: hashedNewPassword,
        }),
      });
      if (response.ok) {
        Alert.alert('Success', 'Your password has been updated.', [
          { text: 'Log In', onPress: () => navigation.goBack() }
        ]);
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorData = await response.json();
          Alert.alert('Reset Failed', errorData.detail || 'Invalid OTP');
        } else {
          const errorText = await response.text();
          Alert.alert('Server Error', `${response.status} - ${errorText.substring(0, 40)}...`);
        }
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row' }}>
              <Text style={[styles.logoText, { color: '#FF6B9E' }]}>MyCollege</Text>
              <Text style={[styles.logoText, { color: '#FFD166' }]}> Companion</Text>
            </View>
            <View style={styles.iconPlaceholder}>
              <Text style={styles.iconText}>🧠</Text>
            </View>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>Welcome back.</Text>
            <Text style={styles.titleText}>Forgot Password?</Text>
          </View>

          <View style={styles.inputContainer}>
            {step === 1 ? (
              <TextInput
                style={styles.input}
                placeholder="Registration Number"
                placeholderTextColor="#666"
                value={regNumber}
                onChangeText={setRegNumber}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="6-Digit OTP"
                  placeholderTextColor="#666"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TextInput
                  style={[styles.input, { marginTop: 30 }]}
                  placeholder="New Password"
                  placeholderTextColor="#666"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </>
            )}
          </View>

          <TouchableOpacity 
            style={styles.buttonWrapper} 
            onPress={step === 1 ? handleRequestOTP : handleResetPassword} 
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#FF6B9E', '#FFD166']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.buttonText}>
                  {step === 1 ? 'REQUEST OTP' : 'RESET PASSWORD'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.linkText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </View>

          {!isKeyboardVisible && (
            <View style={styles.bottomArcContainer}>
              <LinearGradient
                colors={['#FF6B9E', '#FFD166']}
                style={styles.bottomArc}
              />
            </View>
          )}
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  iconPlaceholder: { width: 35, height: 35, borderWidth: 1, borderColor: '#FFF', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 18 },
  titleContainer: { marginBottom: 50 },
  titleText: { fontSize: 32, fontWeight: 'bold', color: '#FFF' },
  inputContainer: { marginBottom: 40 },
  input: { borderBottomWidth: 1, borderBottomColor: '#444', color: '#FFF', fontSize: 16, paddingVertical: 10, marginBottom: 10 },
  buttonWrapper: { width: 200, marginBottom: 30 },
  gradientButton: { paddingVertical: 14, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  linksContainer: { marginTop: 10 },
  linkText: { color: '#444', fontSize: 14, marginBottom: 15, textDecorationLine: 'underline' },
  bottomArcContainer: { position: 'absolute', bottom: -100, left: 0, right: 0, alignItems: 'center' },
  bottomArc: { width: 400, height: 200, borderRadius: 200 },
});