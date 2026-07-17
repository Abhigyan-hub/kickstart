import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import notifee, { 
  AndroidImportance, 
  AndroidCategory 
} from '@notifee/react-native';

// Unified Theme Colors
const COLORS = {
  ICE_LATTE: '#E4DDD3',
  THE_MINT: '#00A19B',
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  ABSENT_RED: '#FF6B6B',
  NOTE_YELLOW: '#FCD34D',
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;

const INITIAL_SCHEDULE = [
  { id: '1', time: '09:00 AM', subject: 'Data Structures & Algorithms', room: 'Lab 1', status: 'pending', hasNotes: true },
  { id: '2', time: '11:00 AM', subject: 'Full-Stack Web Dev (React)', room: 'Room 302', status: 'pending', hasNotes: false },
  { id: '3', time: '01:00 PM', subject: 'Database Management Systems', room: 'Room 305', status: 'pending', hasNotes: false },
];

type ScheduleItem = typeof INITIAL_SCHEDULE[0];

const SwipeableClassCard = ({
  item,
  onMarkAttendance,
  onUndo,
  isFirstItem,
}: {
  item: ScheduleItem;
  onMarkAttendance: (id: string, status: 'attended' | 'absent') => void;
  onUndo: (id: string) => void;
  isFirstItem: boolean;
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);

  useEffect(() => {
    if (isFirstItem && item.status === 'pending') {
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(pan, { toValue: { x: -30, y: 0 }, duration: 200, useNativeDriver: false }),
          Animated.timing(pan, { toValue: { x: 30, y: 0 }, duration: 250, useNativeDriver: false }),
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: false }),
        ]).start();
      }, 500);
    }
  }, [isFirstItem, pan, item.status]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gesture) => {
        pan.setValue({ x: gesture.dx, y: 0 });

        if (Math.abs(gesture.dx) > SWIPE_THRESHOLD && !hasTriggeredHaptic) {
          ReactNativeHapticFeedback.trigger('impactHeavy', { enableVibrateFallback: true });
          setHasTriggeredHaptic(true);
        } else if (Math.abs(gesture.dx) <= SWIPE_THRESHOLD) {
          setHasTriggeredHaptic(false);
        }
      },
      onPanResponderRelease: (e, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          onMarkAttendance(item.id, 'absent');
          Animated.spring(pan, { toValue: { x: SCREEN_WIDTH, y: 0 }, useNativeDriver: false }).start();
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          onMarkAttendance(item.id, 'attended');
          Animated.spring(pan, { toValue: { x: -SCREEN_WIDTH, y: 0 }, useNativeDriver: false }).start();
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  const renderSwipeBackground = () => (
    <View style={styles.swipeBackground}>
      <View style={{ flex: 1, backgroundColor: COLORS.ABSENT_RED }} />
      <View style={{ flex: 1, backgroundColor: COLORS.THE_MINT }} />
    </View>
  );

  if (item.status !== 'pending') {
    return (
      <View style={styles.cardContainer}>
        <View style={[styles.clayCard, item.status === 'absent' ? styles.clayRed : styles.clayMint]}>
          <View style={styles.details}>
            <Text style={[styles.subject, { color: COLORS.WHITE }]}>{item.subject}</Text>
            <Text style={[styles.room, { color: COLORS.WHITE, opacity: 0.9 }]}>
              Marked: {item.status.toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.actionButton, styles.clayWhite]} 
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
              onUndo(item.id);
              pan.setValue({ x: 0, y: 0 }); 
            }}
          >
            <Text style={styles.actionText}>Undo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cardContainer}>
      {renderSwipeBackground()}
      <Animated.View
        {...panResponder.panHandlers}
        style={[pan.getLayout(), styles.clayCard, styles.clayWhite]}
      >
        <View style={styles.timeContainer}>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.subject}>{item.subject}</Text>
          <Text style={styles.room}>{item.room}</Text>
          
          {/* PRD Phase 2 Features: Notes & Reminders */}
          <View style={styles.utilitiesRow}>
            <TouchableOpacity style={styles.utilityIcon}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.THE_MINT }}>+ Reminder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.utilityIcon}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: item.hasNotes ? COLORS.NOTE_YELLOW : '#999' }}>
                {item.hasNotes ? '📖 View Notes' : '+ Add Note'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

export default function TimetableScreen() {
  const [schedule, setSchedule] = useState(INITIAL_SCHEDULE);

  useEffect(() => {
    return notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === 1 && detail.pressAction?.id === 'stop_navigation') {
        await notifee.stopForegroundService();
        if (detail.notification?.id) {
          await notifee.cancelNotification(detail.notification.id);
        }
      }
    });
  }, []);

  const handleMarkAttendance = (id: string, status: 'attended' | 'absent') => {
    setTimeout(() => {
      setSchedule((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item))
      );
    }, 250);
  };

  const handleUndo = (id: string) => {
    setSchedule((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'pending' } : item))
    );
  };

  // Fixed mapping for the Upload button
  const handleFileSelection = () => {
    // Temporarily stubbed out until a React Native 0.86+ compatible file picker is installed
    Alert.alert("Coming Soon", "File upload will be connected in the next phase.");
  };

  const triggerNativeNotification = async () => {
    ReactNativeHapticFeedback.trigger('notificationSuccess');

    try {
      await notifee.requestPermission();

      const channelId = await notifee.createChannel({
        id: 'class-alerts-nav',
        name: 'Upcoming Class Navigation',
        importance: AndroidImportance.HIGH,
      });

      const upcomingClass = schedule.find(s => s.status === 'pending') || schedule[0];
      const targetTime = Date.now() + 10000; 
      const notificationId = 'class-countdown-ticker';

      await notifee.displayNotification({
        id: notificationId,
        title: `<p style="font-size: 18px;"><b>10 m</b></p>`, 
        body: `Head to ${upcomingClass.room}`, 
        android: {
          channelId,
          asForegroundService: true,
          ongoing: true,
          category: AndroidCategory.NAVIGATION,
          importance: AndroidImportance.HIGH,
          largeIcon: 'ic_launcher',
          circularLargeIcon: true,
          timestamp: targetTime,
          showTimestamp: true,
          showChronometer: true,
          chronometerDirection: 'down',
          actions: [
            { title: 'Exit navigation', pressAction: { id: 'stop_navigation' } },
          ],
        },
      });

      setTimeout(async () => {
        await notifee.stopForegroundService();
        await notifee.displayNotification({
          id: notificationId,
          title: `✅ Arrived at ${upcomingClass.subject}`,
          body: `You are in ${upcomingClass.room}. Swipe to dismiss.`,
          android: { channelId, asForegroundService: false, ongoing: false, color: COLORS.THE_MINT },
        });
        ReactNativeHapticFeedback.trigger('impactHeavy');
      }, 10000);

    } catch (error) {
      console.error("Notification Error: ", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>My Schedule</Text>
          <Text style={styles.subHeader}>G. H. Raisoni Skilltech University</Text>
        </View>
        {/* Wired properly to handleFileSelection */}
        <TouchableOpacity style={[styles.uploadBtn, styles.clayMint]} onPress={handleFileSelection}>
          <Text style={styles.uploadBtnText}>Upload</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={schedule}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <SwipeableClassCard
            item={item}
            onMarkAttendance={handleMarkAttendance}
            onUndo={handleUndo}
            isFirstItem={index === 0}
          />
        )}
        contentContainerStyle={styles.list}
      />

      <TouchableOpacity style={[styles.testPushBtn, styles.clayBlack]} onPress={triggerNativeNotification}>
        <Text style={styles.testPushText}>Test Native Push Notification</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.ICE_LATTE },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  header: { fontSize: 28, fontWeight: '900', paddingHorizontal: 20, color: COLORS.BLACK, letterSpacing: -1 },
  subHeader: { fontSize: 14, color: COLORS.THE_MINT, paddingHorizontal: 20, paddingBottom: 20, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  
  clayCard: {
    padding: 22,
    borderRadius: 28, 
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderBottomWidth: 5, 
    borderRightWidth: 3,
    shadowOffset: { width: 4, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  clayWhite: {
    backgroundColor: COLORS.WHITE,
    borderTopColor: 'rgba(255, 255, 255, 1)',
    borderLeftColor: 'rgba(255, 255, 255, 1)',
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    borderRightColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#A39B8F', 
  },
  clayMint: {
    backgroundColor: COLORS.THE_MINT,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    borderLeftColor: 'rgba(255, 255, 255, 0.4)',
    borderBottomColor: 'rgba(0, 0, 0, 0.15)',
    borderRightColor: 'rgba(0, 0, 0, 0.15)',
    shadowColor: COLORS.THE_MINT,
  },
  clayRed: {
    backgroundColor: COLORS.ABSENT_RED,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    borderLeftColor: 'rgba(255, 255, 255, 0.4)',
    borderBottomColor: 'rgba(0, 0, 0, 0.15)',
    borderRightColor: 'rgba(0, 0, 0, 0.15)',
    shadowColor: COLORS.ABSENT_RED,
  },
  clayBlack: {
    backgroundColor: COLORS.BLACK,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    borderLeftColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomColor: 'rgba(0, 0, 0, 1)',
    borderRightColor: 'rgba(0, 0, 0, 1)',
    shadowColor: COLORS.BLACK,
  },
  
  cardContainer: { marginBottom: 16, position: 'relative' },
  swipeBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28, 
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent', 
  },
  timeContainer: { width: 80 },
  time: { fontSize: 16, fontWeight: '900', color: COLORS.THE_MINT },
  details: { flex: 1, borderLeftWidth: 2, borderLeftColor: COLORS.ICE_LATTE, paddingLeft: 16 },
  subject: { fontSize: 17, fontWeight: '800', color: COLORS.BLACK },
  room: { fontSize: 14, color: '#666', marginTop: 4, fontWeight: '600' },
  
  utilitiesRow: { flexDirection: 'row', marginTop: 12, gap: 12 },
  utilityIcon: { paddingVertical: 4, paddingHorizontal: 8, backgroundColor: COLORS.ICE_LATTE, borderRadius: 8 },
  
  actionButton: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    borderTopWidth: 2, 
    borderLeftWidth: 2, 
    borderBottomWidth: 4, 
    borderRightWidth: 2,
    shadowOpacity: 0.1,
    elevation: 3,
  },
  actionText: { color: COLORS.BLACK, fontWeight: '900' },
  uploadBtn: { 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    borderRadius: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 4,
    borderRightWidth: 2,
    elevation: 5,
  },
  uploadBtnText: { color: COLORS.WHITE, fontWeight: '900' },
  testPushBtn: {
    margin: 20,
    padding: 18,
    borderRadius: 24,
    alignItems: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 5,
    borderRightWidth: 2,
  },
  testPushText: { color: COLORS.WHITE, fontWeight: '900', fontSize: 16 },
});