import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { Child } from "../../domain/entities/Child";
import type { Task } from "../../domain/entities/Task";
import { ChildSelector } from "../components/ChildSelector";
import { DonateModal } from "../components/DonateModal";
import { ParentalGateModal } from "../components/ParentalGateModal";
import { TaskCard } from "../components/TaskCard";
import { useTaskStore } from "../state/useTaskStore";

interface HomeScreenProps {
  onOpenAdmin: () => void;
}

export function HomeScreen({ onOpenAdmin }: HomeScreenProps): React.JSX.Element {
  const [isGateVisible, setIsGateVisible] = useState<boolean>(false);
  const [isDonateVisible, setIsDonateVisible] = useState<boolean>(false);
  const children: Child[] = useTaskStore((state) => state.children ?? []);
  const selectedChildId: string | null = useTaskStore((state) => state.selectedChildId);
  const tasks: Task[] = useTaskStore((state) => state.tasks ?? []);
  const totalStars: number = useTaskStore((state) => state.totalStars ?? 0);
  const isLoading: boolean = useTaskStore((state) => state.isLoading);
  const errorMessage: string | null = useTaskStore((state) => state.errorMessage);
  const fetchChildren: () => Promise<void> = useTaskStore((state) => state.fetchChildren);
  const loadPin: () => Promise<void> = useTaskStore((state) => state.loadPin);
  const selectChild: (childId: string) => Promise<void> = useTaskStore((state) => state.selectChild);
  const completeTask: (taskId: string) => Promise<void> = useTaskStore(
    (state) => state.completeTask,
  );

  useEffect(() => {
    void fetchChildren();
    void loadPin();
  }, [fetchChildren, loadPin]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.appName}>Bé Tự Lập</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.donateButton}
                onPress={(): void => setIsDonateVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.donateButtonText}>☕ Mời Cafe</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminButton}
                onPress={(): void => setIsGateVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.adminButtonText}>⚙️ Bố mẹ</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.starVault}>{`Kho báu của bé: ${totalStars ?? 0} ⭐`}</Text>
          <ChildSelector
            children={Array.isArray(children) ? children : []}
            selectedChildId={selectedChildId}
            onSelectChild={(childId: string): void => {
              void selectChild(childId);
            }}
          />
        </View>

        <View style={styles.body}>
          {isLoading ? <ActivityIndicator size="large" color="#0EA5E9" /> : null}

          {errorMessage !== null ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          {!isLoading ? (
            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
              {!Array.isArray(tasks) || tasks.length === 0 ? (
                <Text style={styles.emptyMessage}>
                  Hôm nay chưa có nhiệm vụ nào, bố mẹ hãy thêm việc cho bé nhé!
                </Text>
              ) : (
                tasks
                  .filter((task): task is Task => task !== null && task !== undefined)
                  .map((task: Task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={(taskId: string): void => {
                        void completeTask(taskId);
                      }}
                    />
                  ))
              )}
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={styles.todayText}>{formatToday()}</Text>
        </View>
      </View>
      <ParentalGateModal
        isVisible={isGateVisible}
        onClose={(): void => setIsGateVisible(false)}
        onSuccess={(): void => {
          setIsGateVisible(false);
          onOpenAdmin();
        }}
      />
      <DonateModal
        isVisible={isDonateVisible}
        onClose={(): void => setIsDonateVisible(false)}
      />
    </SafeAreaView>
  );
}

function formatToday(): string {
  return new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EFF6FF",
  },
  page: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  donateButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  donateButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  appName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  adminButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#7DD3FC",
  },
  adminButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0C4A6E",
  },
  starVault: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0369A1",
    marginBottom: 10,
  },
  body: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },
  emptyMessage: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: "#475569",
    textAlign: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  errorText: {
    color: "#B91C1C",
    marginBottom: 10,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  footer: {
    marginTop: 10,
    alignItems: "center",
  },
  todayText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "500",
    textTransform: "capitalize",
  },
});
