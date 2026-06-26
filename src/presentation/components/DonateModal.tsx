import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  DONATE_QR_SOURCE,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
} from "../../config/donate.config";

// ─── Types ────────────────────────────────────────────────────────────────────
type SendStatus = "idle" | "loading" | "success" | "error" | "no_network";

interface DonateModalProps {
  isVisible: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function DonateModal({ isVisible, onClose }: DonateModalProps): React.JSX.Element {
  const [suggestion, setSuggestion] = useState<string>("");
  const [status, setStatus] = useState<SendStatus>("idle");

  const resetAndClose = (): void => {
    setSuggestion("");
    setStatus("idle");
    onClose();
  };

  const handleSubmit = async (): Promise<void> => {
    const text = suggestion.trim();
    if (!text) {
      // Không có gì để gửi, chỉ đóng
      resetAndClose();
      return;
    }

    setStatus("loading");

    try {
      const message = `☕ Góp ý từ Bé Tự Lập:\n\n${text}`;
      const url =
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage` +
        `?chat_id=${encodeURIComponent(TELEGRAM_CHAT_ID)}` +
        `&text=${encodeURIComponent(message)}`;

      const response = await fetch(url, { method: "GET" });

      if (response.ok) {
        setStatus("success");
        setSuggestion("");
      } else {
        setStatus("error");
      }
    } catch {
      // Network unavailable or fetch threw
      setStatus("no_network");
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={resetAndClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* ── Header ── */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>☕ Mời cafe</Text>
            <TouchableOpacity onPress={resetAndClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* ── Message ── */}
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>
                💡 Nếu bạn thấy ứng dụng hữu ích, bạn có thể mời tôi một ly cafe để tôi có động lực tiếp tục phát triển. Cảm ơn bạn rất nhiều! 🙏
              </Text>
            </View>

            {/* ── QR Code ── */}
            <View style={styles.qrContainer}>
              <Text style={styles.qrLabel}>Quét mã để chuyển khoản</Text>
              <Image
                source={DONATE_QR_SOURCE}
                style={styles.qrImage}
                resizeMode="contain"
              />
              <Text style={styles.qrHint}>📱 Dùng app ngân hàng để quét</Text>
            </View>

            {/* ── Divider ── */}
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>Góp ý cho ứng dụng</Text>
              <View style={styles.divider} />
            </View>

            {/* ── Suggestion input ── */}
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={4}
              placeholder="Bạn muốn góp ý điều gì? (tùy chọn)"
              placeholderTextColor="#94A3B8"
              value={suggestion}
              onChangeText={setSuggestion}
              textAlignVertical="top"
              editable={status !== "loading" && status !== "success"}
            />

            {/* ── Status feedback ── */}
            {status === "no_network" && (
              <View style={styles.networkErrorBox}>
                <Text style={styles.networkErrorText}>
                  📵 Thiết bị không có internet, không thể gửi góp ý.
                </Text>
              </View>
            )}
            {status === "error" && (
              <View style={styles.networkErrorBox}>
                <Text style={styles.networkErrorText}>
                  ❌ Gửi thất bại, vui lòng thử lại.
                </Text>
              </View>
            )}
            {status === "success" && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>
                  ✅ Gửi thành công! Cảm ơn góp ý của bạn 💙
                </Text>
              </View>
            )}

            {/* ── Actions ── */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={resetAndClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>Đóng</Text>
              </TouchableOpacity>

              {status !== "success" && (
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (status === "loading" || suggestion.trim() === "") && styles.submitButtonDisabled,
                  ]}
                  onPress={(): void => { void handleSubmit(); }}
                  activeOpacity={0.8}
                  disabled={status === "loading" || suggestion.trim() === ""}
                >
                  {status === "loading" ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitText}>📨 Gửi góp ý</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: "92%",
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "700",
  },
  messageBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#92400E",
    fontWeight: "500",
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#F0F9FF",
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  qrLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0369A1",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  qrHint: {
    marginTop: 10,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
    minHeight: 100,
    marginBottom: 12,
    backgroundColor: "#F8FAFC",
  },
  networkErrorBox: {
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  networkErrorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
  },
  successBox: {
    backgroundColor: "#DCFCE7",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  successText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  cancelText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 14,
  },
  submitButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F59E0B",
    minWidth: 110,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
});
