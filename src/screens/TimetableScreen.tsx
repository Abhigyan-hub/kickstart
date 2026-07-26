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
  ActivityIndicator,
  Alert,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { TimestampTrigger, TriggerType, AndroidImportance } from '@notifee/react-native';

// Unified Theme Colors
const COLORS = {
  ICE_LATTE: '#E4DDD3',
  THE_MINT: '#00A19B',
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  ABSENT_RED: '#FF6B6B',
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;
const STORAGE_KEY = '@my_college_schedule';

let hasJiggledThisSession = false;

type ScheduleItem = {
  id: string;
  time: string;
  subject: string;
  room: string;
  status: 'pending' | 'attended' | 'absent';
};

const SwipeableClassCard = ({
  item,
  onMarkAttendance,
  onUndo,
  showTutorial, 
}: {
  item: ScheduleItem;
  onMarkAttendance: (id: string, status: 'attended' | 'absent') => void;
  onUndo: (id: string) => void;
  showTutorial?: boolean;
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);

  // Amplified Jiggle to clearly reveal the background text
  useEffect(() => {
    if (showTutorial && item.status === 'pending') {
      setTimeout(() => {
        Animated.sequence([
          // Pull far left to reveal Mint (Attended)
          Animated.timing(pan, { toValue: { x: -60, y: 0 }, duration: 300, useNativeDriver: false }),
          // Pull far right to reveal Red (Absent)
          Animated.timing(pan, { toValue: { x: 60, y: 0 }, duration: 300, useNativeDriver: false }),
          // Snap back to center
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 4, useNativeDriver: false })
        ]).start();
      }, 800); 
    }
  }, [showTutorial]);

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

  // --- Real-time Reveal Animations ---
  const dynamicBackgroundColor = pan.x.interpolate({
    inputRange: [-80, -10, 0, 10, 80],
    outputRange: [COLORS.THE_MINT, COLORS.THE_MINT, COLORS.ICE_LATTE, COLORS.ABSENT_RED, COLORS.ABSENT_RED],
    extrapolate: 'clamp'
  });

  const rightTextOpacity = pan.x.interpolate({
    inputRange: [-80, -20, 0],
    outputRange: [1, 0.8, 0],
    extrapolate: 'clamp'
  });

  const leftTextOpacity = pan.x.interpolate({
    inputRange: [0, 20, 80],
    outputRange: [0, 0.8, 1],
    extrapolate: 'clamp'
  });

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
            style={[styles.undoButton, styles.clayWhite]} 
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
              onUndo(item.id);
              pan.setValue({ x: 0, y: 0 }); 
            }}
          >
            <Text style={styles.undoText}>Undo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    // 1. The Container IS the Background layer now. 
    // It is perfectly locked to the same shape as the card.
    <Animated.View style={[styles.cardContainer, { backgroundColor: dynamicBackgroundColor }]}>
      
      {/* Revealed on Right Swipe (Absent) */}
      <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'center', paddingLeft: 24, opacity: leftTextOpacity }]} pointerEvents="none">
        <Text style={styles.swipeText}>ABSENT</Text>
      </Animated.View>

      {/* Revealed on Left Swipe (Attended) */}
      <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'flex-end', paddingRight: 24, opacity: rightTextOpacity }]} pointerEvents="none">
        <Text style={styles.swipeText}>ATTENDED</Text>
      </Animated.View>

      {/* 2. The Foreground Card sits INSIDE the container and translates over it */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.clayCard, 
          styles.clayWhite,
          { transform: [{ translateX: pan.x }] } 
        ]}
      >
        <Text style={styles.time}>{item.time}</Text>
        <View style={styles.details}>
          <Text style={styles.subject}>{item.subject}</Text>
          <Text style={styles.room}>{item.room}</Text>
        </View>
      </Animated.View>
      
    </Animated.View>
  );
};

const REMINDER_KEY = '@class_reminder_offset';

const parseStartTimeToDate = (timeString: string): Date | null => {
  const firstTime = timeString.split('\n')[0].trim(); 
  const match = firstTime.match(/(\d{1,2})[\.:](\d{2})\s*(am|pm)/i);
  
  if (!match) return null;
  
  let [_, hourStr, minuteStr, modifier] = match;
  let hour = parseInt(hourStr, 10);
  let minute = parseInt(minuteStr, 10);
  
  if (modifier.toLowerCase() === 'pm' && hour !== 12) hour += 12;
  if (modifier.toLowerCase() === 'am' && hour === 12) hour = 0;

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
};

const scheduleClassNotifications = async (schedule: ScheduleItem[]) => {
  await notifee.requestPermission();

  // Recreate the channel with the custom zig-zag vibration pattern
  const channelId = await notifee.createChannel({
    id: 'class-reminders',
    name: 'Class Reminders',
    importance: AndroidImportance.HIGH,
    vibration: true,
    vibrationPattern: [300, 150, 300, 150, 300], // Zig-zag pattern: vibrate, pause, vibrate, pause, vibrate
  });

  await notifee.cancelAllNotifications();

  const savedOffset = await AsyncStorage.getItem(REMINDER_KEY);
  const reminderMinutes = savedOffset ? parseInt(savedOffset, 10) : 30;

  for (const item of schedule) {
    if (item.status !== 'pending') continue; 

    const classTime = parseStartTimeToDate(item.time);
    if (!classTime) continue;

    const triggerTime = new Date(classTime.getTime() - reminderMinutes * 60000);

    if (triggerTime.getTime() > Date.now()) {
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerTime.getTime(),
      };

      await notifee.createTriggerNotification(
        {
          id: `class-${item.id}`,
          title: `Upcoming Class in ${reminderMinutes}m!`,
          body: `${item.subject} is starting in ${item.room}.`,
          android: {
            channelId,
            pressAction: { id: 'default' },
            showTimestamp: true, // Forces Android to show the exact time it was pushed
          },
        },
        trigger,
      );
    }
  }
};

export default function TimetableScreen() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [shouldAnimateJiggle, setShouldAnimateJiggle] = useState(false);

  useEffect(() => {
    const loadSavedSchedule = async () => {
      try {
        const savedDataString = await AsyncStorage.getItem(STORAGE_KEY);
        
        if (savedDataString !== null) {
          // We now parse an object containing { date, schedule }
          const parsedData = JSON.parse(savedDataString); 
          const todayString = new Date().toDateString();

          if (parsedData.date === todayString) {
            // It is still the same day. Load the saved schedule to preserve attendance.
            setSchedule(parsedData.schedule);
            await scheduleClassNotifications(parsedData.schedule);
          } else {
            // It is a NEW day! Generate a fresh schedule matrix.
            const savedRawText = await AsyncStorage.getItem('@raw_ocr_text');
            if (savedRawText) {
              const freshSchedule = parseOCRText(savedRawText);
              setSchedule(freshSchedule);
              saveScheduleToPhone(freshSchedule); // Save the fresh schedule for today
              await scheduleClassNotifications(freshSchedule);
            } else {
               setSchedule([]); // Fallback if raw text was never saved
            }
          }
          
          if (!hasJiggledThisSession) {
            setShouldAnimateJiggle(true);
            hasJiggledThisSession = true; 
          }
        }
      } catch (error) {
        console.error("Failed to load schedule from storage", error);
      }
    };
    loadSavedSchedule();
  }, []);

  const saveScheduleToPhone = async (newSchedule: ScheduleItem[]) => {
    try {
      const dataToSave = {
        date: new Date().toDateString(), // Adds a timestamp like "Mon Jul 20 2026"
        schedule: newSchedule
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error("Failed to save schedule to storage", error);
    }
  };

  const handleMarkAttendance = (id: string, status: 'attended' | 'absent') => {
    setTimeout(() => {
      setSchedule((prev) => {
        const updatedSchedule = prev.map((item) => (item.id === id ? { ...item, status } : item));
        saveScheduleToPhone(updatedSchedule); 
        return updatedSchedule;
      });
    }, 250);
  };

  const handleUndo = (id: string) => {
    setSchedule((prev) => {
      const updatedSchedule = prev.map((item) => (item.id === id ? { ...item, status: 'pending' } : item));
      saveScheduleToPhone(updatedSchedule); 
      return updatedSchedule;
    });
  };

  const parseOCRText = (rawText: string): ScheduleItem[] => {
    // 1. Determine today's day abbreviation to locate the correct row
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const currentDay = dayNames[new Date().getDay()];

    // 2. Extract the header row of times
    const timeRegex = /\d{1,2}(?:\.|\:)\d{2}\s*(?:pm|am)?\s*(?:-|to)\s*\d{1,2}(?:\.|\:)\d{2}\s*(?:pm|am)?/gi;
    const times = rawText.match(timeRegex) || [];
    const cleanTimes = times.map(t => t.replace(/-|to/g, '\n').trim());

    // 3. Extract ONLY the text block for TODAY
    // This regex grabs everything after "MON" until it hits "TUE" (or another day)
    const dayRegex = new RegExp(`${currentDay}[\\s\\S]*?(?=(?:SUN|MON|TUE|WED|THU|FRI|SAT|$))`, 'i');
    const dayMatch = rawText.match(dayRegex);

    if (!dayMatch || cleanTimes.length === 0) {
      return []; // Return empty if it's Sunday or the OCR failed completely
    }

    // Split today's text chunk into individual lines, skipping the day name itself
    let classLines = dayMatch[0].split('\n').map(line => line.trim()).filter(Boolean).slice(1);
    
    const parsedSchedule: ScheduleItem[] = [];
    let timeIndex = 0;

    for (let line of classLines) {
      if (timeIndex >= cleanTimes.length) break;

      // Skip lines that are just "RECESS" or random OCR noise
      if (line.toUpperCase().includes('RECESS') || line.length < 3) {
        continue;
      }

      // 4. FILTER OUT CLASSROOMS (The blue text from your image)
      // This removes C315, A-232A, A303, A017, NF, etc.
      let cleanSubject = line.replace(/\b[A-Z]-?\d{3}[A-Z]?\b|\bNF\d*\b/gi, '').trim();

      // Clean up double spaces or floating parentheses left behind by the removed room codes
      cleanSubject = cleanSubject.replace(/\s+/g, ' ').replace(/\(\s*\)/g, '').trim();

      parsedSchedule.push({
        id: String(timeIndex + 1),
        time: cleanTimes[timeIndex] || "TBA",
        subject: cleanSubject, // Now perfectly holds Subject (Pink), Batch (Orange), and Faculty (Grey)
        room: 'SLIDE TO MARK ATTENDANCE',
        status: 'pending'
      });

      timeIndex++;
    }

    return parsedSchedule;
  };

  const handleUploadImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, async (response) => {
      if (response.didCancel || !response.assets || response.assets.length === 0) {
        return;
      }
      
      const imageUri = response.assets[0].uri;
      if (!imageUri) return;

      setIsScanning(true);
      
      try {
        // 1. Package the image for the AWS backend
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          type: response.assets[0].type || 'image/jpeg',
          name: response.assets[0].fileName || 'timetable.jpg',
        } as any);

        // 2. Send the POST request to your FastAPI EC2 server
        // IMPORTANT: Replace with your actual EC2 IP/Domain
        const awsEndpoint = 'http://16.170.193.134:8000/upload-timetable/'; 
        
        const apiResponse = await fetch(awsEndpoint, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (!apiResponse.ok) {
          throw new Error(`Server responded with status ${apiResponse.status}`);
        }

        // 3. Extract the text payload from the FastAPI JSON response
        const result = await apiResponse.json();
        const extractedText = result.text; 

        if (!extractedText) {
            throw new Error("No text returned from the backend");
        }

        // 4. Save the raw text and process it through the local grid parser
        await AsyncStorage.setItem('@raw_ocr_text', extractedText); 
        
        const extractedClasses = parseOCRText(extractedText);
        
        setSchedule(extractedClasses);
        saveScheduleToPhone(extractedClasses);
        await scheduleClassNotifications(extractedClasses);
        
        // 5. Trigger success interactions
        ReactNativeHapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
        setShouldAnimateJiggle(true);
      } catch (error) {
        console.error("Backend OCR Error: ", error);
        ReactNativeHapticFeedback.trigger('notificationError', { enableVibrateFallback: true });
        Alert.alert("Server Error", "Failed to process the timetable on the backend. Check your EC2 connection.");
      } finally {
        setIsScanning(false);
      }
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      {isScanning ? (
        <>
          <ActivityIndicator size="large" color={COLORS.THE_MINT} />
          <Text style={styles.emptyTitle}>Scanning Timetable...</Text>
          <Text style={styles.emptySub}>Running local Optical Character Recognition</Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>No Classes Loaded</Text>
          <Text style={styles.emptySub}>Tap upload to scan your semester timetable photo and initialize your tracking matrix.</Text>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>My Schedule</Text>
          <Text style={styles.subHeader}>G H Raisoni Skilltech University</Text>
        </View>
        
        {schedule.length === 0 ? (
          <TouchableOpacity style={[styles.uploadBtn, styles.clayMint]} onPress={handleUploadImage}>
            <Text style={styles.uploadBtnText}>Upload</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.changeBtn, styles.clayWhite]} onPress={handleUploadImage}>
            <Text style={styles.changeBtnText}>Change Timetable</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        data={schedule}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <SwipeableClassCard
            item={item}
            onMarkAttendance={handleMarkAttendance}
            onUndo={handleUndo}
            showTutorial={shouldAnimateJiggle && index === 0} 
          />
        )}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={schedule.length === 0 ? styles.emptyList : styles.list}
      />
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
  emptyList: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: COLORS.BLACK, marginTop: 16 },
  emptySub: { fontSize: 15, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 22 },

  // --- UPDATED CONTAINER LAYER ---
  cardContainer: { 
    marginBottom: 16, 
    borderRadius: 28, // Matches the clay card perfectly so background colors don't bleed out
  },
  swipeText: {
    color: COLORS.WHITE,
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 1.5,
  },
  // -----------------------------

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

  time: { fontSize: 16, fontWeight: '900', color: COLORS.THE_MINT, width: 80 },
  details: { flex: 1, borderLeftWidth: 2, borderLeftColor: COLORS.ICE_LATTE, paddingLeft: 16 },
  subject: { fontSize: 17, fontWeight: '800', color: COLORS.BLACK },
  room: { fontSize: 14, color: '#666', marginTop: 4, fontWeight: '600' },
  
  undoButton: { 
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
  undoText: { color: COLORS.BLACK, fontWeight: '900' },
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
  changeBtn: { 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.THE_MINT,
  },
  changeBtnText: { color: COLORS.THE_MINT, fontWeight: '900', fontSize: 12 },
});