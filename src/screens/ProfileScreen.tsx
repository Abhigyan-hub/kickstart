import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  ICE_LATTE: '#E4DDD3',
  THE_MINT: '#00A19B',
  BLACK: '#000000',
  WHITE: '#FFFFFF',
};

const REMINDER_KEY = '@class_reminder_offset';
const REMINDER_OPTIONS = [10, 20, 30, 60];

export default function ProfileScreen({ navigation }: any) {
  const [reminderOffset, setReminderOffset] = useState<number>(30); // Default to 30

  useEffect(() => {
    const loadSettings = async () => {
      const savedOffset = await AsyncStorage.getItem(REMINDER_KEY);
      if (savedOffset) {
        setReminderOffset(parseInt(savedOffset, 10));
      }
    };
    loadSettings();
  }, []);

  const handleReminderChange = async (minutes: number) => {
    setReminderOffset(minutes);
    await AsyncStorage.setItem(REMINDER_KEY, String(minutes));
    // Note: The Timetable screen will automatically apply this new offset 
    // the next time it calculates the schedule!
  };

  const handleLogout = () => {
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>AV</Text>
        </View>
        <Text style={styles.name}>Abhigyan R. Varma</Text>
        <Text style={styles.subtitle}>G. H. Raisoni Skilltech University, Nagpur</Text>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Department</Text>
          <Text style={styles.infoValue}>B.Tech CSE</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Semester</Text>
          <Text style={styles.infoValue}>4th (Section A)</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Reg Number</Text>
          <Text style={styles.infoValue}>STU-2024-8992</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Preferences</Text>
      <View style={styles.preferencesCard}>
        <Text style={styles.preferenceLabel}>Class Reminder (Minutes Before)</Text>
        <View style={styles.optionsRow}>
          {REMINDER_OPTIONS.map((min) => (
            <TouchableOpacity
              key={min}
              style={[
                styles.optionButton,
                reminderOffset === min && styles.optionButtonActive
              ]}
              onPress={() => handleReminderChange(min)}
            >
              <Text style={[
                styles.optionText,
                reminderOffset === min && styles.optionTextActive
              ]}>{min}m</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.ICE_LATTE, padding: 20 },
  headerContainer: { alignItems: 'center', marginTop: 40, marginBottom: 30 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.THE_MINT, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowOpacity: 0.2, elevation: 5 },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: COLORS.WHITE },
  name: { fontSize: 24, fontWeight: '900', color: COLORS.BLACK },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4, textAlign: 'center', fontWeight: '600' },
  
  infoCard: { backgroundColor: COLORS.WHITE, borderRadius: 20, padding: 20, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5, marginBottom: 24 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  infoLabel: { fontSize: 16, color: '#666', fontWeight: '600' },
  infoValue: { fontSize: 16, color: COLORS.BLACK, fontWeight: '800' },
  
  sectionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.BLACK, marginBottom: 12, marginLeft: 4 },
  preferencesCard: { backgroundColor: COLORS.WHITE, borderRadius: 20, padding: 20, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, elevation: 5 },
  preferenceLabel: { fontSize: 15, color: '#666', fontWeight: '700', marginBottom: 16 },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  optionButton: { paddingVertical: 10, flex: 1, marginHorizontal: 4, borderRadius: 12, borderWidth: 2, borderColor: COLORS.ICE_LATTE, alignItems: 'center' },
  optionButtonActive: { backgroundColor: COLORS.THE_MINT, borderColor: COLORS.THE_MINT },
  optionText: { fontWeight: '800', color: '#666' },
  optionTextActive: { color: COLORS.WHITE },

  logoutButton: { marginTop: 'auto', backgroundColor: COLORS.BLACK, padding: 18, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  logoutText: { color: COLORS.WHITE, fontSize: 16, fontWeight: 'bold' }
});