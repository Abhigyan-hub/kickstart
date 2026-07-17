import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import notifee from '@notifee/react-native';

// ADD THIS BLOCK: Keep the service alive for the countdown
notifee.registerForegroundService((notification) => {
  return new Promise(() => {
    // This promise deliberately never resolves so the service
    // stays active while the countdown is running on the notification
  });
});

AppRegistry.registerComponent(appName, () => App);