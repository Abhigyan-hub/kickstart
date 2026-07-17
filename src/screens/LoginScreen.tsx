import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type LoginScreenProps = { navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>; };

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [campus, setCampus] = useState('GHRSTU');

  const handleLogin = () => {
    ReactNativeHapticFeedback.trigger("impactHeavy", { enableVibrateFallback: true });
    // Authentication logic goes here later
    navigation.replace('MainTabs');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>MyCollege Companion</Text>
        
        <View style={styles.inputContainer}>
          <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="words" />
          <TextInput style={styles.input} placeholder="Registration Number" value={regNumber} onChangeText={setRegNumber} autoCapitalize="none" />
          
          <View style={styles.pickerContainer}>
            <Picker selectedValue={campus} onValueChange={(itemValue) => setCampus(itemValue)}>
              <Picker.Item label="GHRSTU" value="GHRSTU" />
              <Picker.Item label="GHRCEMN" value="GHRCEMN" />
            </Picker>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Secure Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1f2937', textAlign: 'center', marginBottom: 40 },
  inputContainer: { marginBottom: 24 },
  input: { backgroundColor: '#ffffff', padding: 16, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  pickerContainer: { backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  button: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' }
});