import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { useTaskStore } from "../state/useTaskStore";

interface ParentalGateModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ParentalGateModal({
  isVisible,
  onClose,
  onSuccess,
}: ParentalGateModalProps): React.JSX.Element {
  const parentPin: string | null = useTaskStore((state) => state.parentPin);
  const savePin: (pin: string) => void = useTaskStore((state) => state.savePin);
  const verifyPin: (pin: string) => boolean = useTaskStore((state) => state.verifyPin);

  const [pin, setPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [biometricChecked, setBiometricChecked] = useState<boolean>(false);

  const isSetupMode: boolean = useMemo(() => parentPin === null, [parentPin]);

  useEffect(() => {
    if (!isVisible) {
      setPin("");
      setConfirmPin("");
      setError(null);
      setBiometricChecked(false);
      return;
    }

    const tryBiometricAuth = async (): Promise<void> => {
      if (Platform.OS === "web") {
        setBiometricChecked(true);
        return;
      }

      try {
        const hasHardware: boolean = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled: boolean = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) {
          setBiometricChecked(true);
          return;
        }

        const authResult = await LocalAuthentication.authenticateAsync({
          promptMessage: "Xác thực quyền cha mẹ",
          fallbackLabel: "Dùng mã PIN",
          cancelLabel: "Hủy",
        });

        if (authResult.success) {
          onSuccess();
          return;
        }
      } catch {
        // Fallback to PIN form for every unexpected runtime situation.
      }

      setBiometricChecked(true);
    };

    void tryBiometricAuth();
  }, [isVisible, onSuccess]);

  const handleSubmitPin = (): void => {
    if (!/^\d{4}$/.test(pin)) {
      setError("Mã PIN phải gồm đúng 4 chữ số.");
      return;
    }

    if (isSetupMode) {
      if (pin !== confirmPin) {
        setError("Xác nhận PIN không khớp.");
        return;
      }
      savePin(pin);
      setPin("");
      setConfirmPin("");
      setError(null);
      onSuccess();
      return;
    }

    const isValid: boolean = verifyPin(pin);
    if (!isValid) {
      setError("PIN không chính xác.");
      return;
    }
    setPin("");
    setError(null);
    onSuccess();
  };

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Chế độ bố mẹ</Text>
          <Text style={styles.subtitle}>
            {isSetupMode
              ? "Thiết lập mã PIN 4 số để bảo vệ khu vực quản trị."
              : "Nhập mã PIN 4 số để tiếp tục."}
          </Text>

          {!biometricChecked && Platform.OS !== "web" ? (
            <Text style={styles.hint}>Đang xác thực vân tay/khuôn mặt...</Text>
          ) : (
            <>
              <TextInput
                value={pin}
                onChangeText={setPin}
                placeholder="Nhập PIN 4 số"
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                style={styles.input}
              />
              {isSetupMode ? (
                <TextInput
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  placeholder="Xác nhận PIN"
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  style={styles.input}
                />
              ) : null}
              {error !== null ? <Text style={styles.error}>{error}</Text> : null}
            </>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSubmitPin}
              disabled={!biometricChecked && Platform.OS !== "web"}
            >
              <Text style={styles.primaryText}>{isSetupMode ? "Lưu PIN" : "Xác nhận"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 12,
  },
  hint: {
    fontSize: 14,
    color: "#0369A1",
    marginBottom: 12,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: "#0F172A",
  },
  error: {
    color: "#B91C1C",
    fontSize: 13,
    marginBottom: 6,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  secondaryText: {
    color: "#334155",
    fontWeight: "700",
  },
  primaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#0EA5E9",
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});

