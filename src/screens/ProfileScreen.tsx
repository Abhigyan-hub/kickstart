import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export default function ProfileScreen({ navigation }: any) {
  // Mock data for UI development
  const student = {
    name: 'Abhigyan R. Varma',
    regNo: '2024CS1001',
    course: 'B.Tech CSE',
    campus: 'GHRSTU'
  };

  const handleLogout = () => {
    ReactNativeHapticFeedback.trigger("notificationWarning");
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{student.name.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{student.name}</Text>
        <Text style={styles.subText}>{student.course}</Text>
        
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Registration No:</Text>
            <Text style={styles.infoValue}>{student.regNo}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Campus:</Text>
            <Text style={styles.infoValue}>{student.campus}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  avatarPlaceholder: { width: 80, height: 80, backgroundColor: '#2563eb', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  subText: { fontSize: 16, color: '#6b7280', marginBottom: 24 },
  infoBox: { width: '100%', backgroundColor: '#f9fafb', padding: 16, borderRadius: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  infoLabel: { color: '#6b7280', fontSize: 14 },
  infoValue: { color: '#1f2937', fontWeight: '600', fontSize: 14 },
  logoutBtn: { marginTop: 'auto', backgroundColor: '#fee2e2', padding: 16, borderRadius: 12, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 }
});