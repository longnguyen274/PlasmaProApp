import { Alert, Platform } from 'react-native';

export function confirm(title: string, msg: string, onOk: () => void, okLabel = 'Đồng ý') {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${msg}`)) onOk();
    return;
  }
  Alert.alert(title, msg, [{ text: 'Hủy', style: 'cancel' }, { text: okLabel, onPress: onOk }]);
}

export function notify(title: string, msg?: string) {
  if (Platform.OS === 'web') {
    window.alert(msg ? `${title}\n\n${msg}` : title);
    return;
  }
  Alert.alert(title, msg);
}
