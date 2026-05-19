import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { Child } from "../../domain/entities/Child";
import type { Task } from "../../domain/entities/Task";
import { useTaskStore } from "../state/useTaskStore";

interface AdminScreenProps {
  onBackHome: () => void;
}

type AdminTab = "children" | "tasks" | "history";

const QUICK_AVATARS: readonly string[] = ["🦁", "🦊", "🐼", "🐯", "🐨", "🐵"];
const QUICK_ICONS: readonly string[] = ["🪥", "📚", "🧸", "🧹", "🫧", "🥛"];

export function AdminScreen({ onBackHome }: AdminScreenProps): React.JSX.Element {
  const children: Child[] = useTaskStore((state) => state.children);
  const isLoading: boolean = useTaskStore((state) => state.isLoading);
  const errorMessage: string | null = useTaskStore((state) => state.errorMessage);
  const adminTasks: Task[] = useTaskStore((state) => state.adminTasks);
  const addChild = useTaskStore((state) => state.addChild);
  const deleteChild = useTaskStore((state) => state.deleteChild);
  const createTask = useTaskStore((state) => state.createTask);
  const updateChildName = useTaskStore((state) => state.updateChildName);
  const fetchTasksForChild = useTaskStore((state) => state.fetchTasksForChild);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const taskLogs = useTaskStore((state) => state.taskLogs);
  const rewards = useTaskStore((state) => state.rewards);
  const rewardLogs = useTaskStore((state) => state.rewardLogs);
  const loadHistoryAndRewards = useTaskStore((state) => state.loadHistoryAndRewards);
  const addReward = useTaskStore((state) => state.addReward);
  const redeemReward = useTaskStore((state) => state.redeemReward);

  const [activeTab, setActiveTab] = useState<AdminTab>("children");
  const [childName, setChildName] = useState<string>("");
  const [childAvatar, setChildAvatar] = useState<string>(QUICK_AVATARS[0]);
  const [taskChildId, setTaskChildId] = useState<string>("");
  const [taskTitle, setTaskTitle] = useState<string>("");
  const [taskIcon, setTaskIcon] = useState<string>(QUICK_ICONS[0]);
  const [taskPoints, setTaskPoints] = useState<string>("10");
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editingChildName, setEditingChildName] = useState<string>("");
  const [rewardChildId, setRewardChildId] = useState<string>("");
  const [rewardTitle, setRewardTitle] = useState<string>("");
  const [rewardPoints, setRewardPoints] = useState<string>("20");

  const selectedTaskChild: Child | undefined = useMemo(
    () => children.find((child) => child.id === taskChildId),
    [children, taskChildId],
  );

  React.useEffect(() => {
    if (children.length > 0 && taskChildId.length === 0) {
      setTaskChildId(children[0].id);
    }
    if (children.length > 0 && rewardChildId.length === 0) {
      setRewardChildId(children[0].id);
    }
  }, [children, taskChildId, rewardChildId]);

  React.useEffect(() => {
    if (activeTab === "tasks" && taskChildId.length > 0) {
      void fetchTasksForChild(taskChildId);
    }
  }, [activeTab, taskChildId, fetchTasksForChild]);

  React.useEffect(() => {
    if (activeTab === "history" && rewardChildId.length > 0) {
      void loadHistoryAndRewards(rewardChildId);
    }
  }, [activeTab, rewardChildId, loadHistoryAndRewards]);

  const handleAddChild = async (): Promise<void> => {
    await addChild(childName, childAvatar);
    setChildName("");
  };

  const handleCreateTask = async (): Promise<void> => {
    const points: number = Number(taskPoints);
    await createTask(taskChildId, taskTitle, taskIcon, points);
    setTaskTitle("");
    setTaskPoints("10");
    await fetchTasksForChild(taskChildId);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <View style={styles.topBar}>
          <Text style={styles.title}>Bảng điều khiển bố mẹ</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBackHome} activeOpacity={0.8}>
            <Text style={styles.backText}>← Về Home</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "children" ? styles.tabButtonActive : undefined]}
            onPress={(): void => setActiveTab("children")}
          >
            <Text style={[styles.tabText, activeTab === "children" ? styles.tabTextActive : undefined]}>
              Quản lý các con
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "tasks" ? styles.tabButtonActive : undefined]}
            onPress={(): void => setActiveTab("tasks")}
          >
            <Text style={[styles.tabText, activeTab === "tasks" ? styles.tabTextActive : undefined]}>
              Quản lý nhiệm vụ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "history" ? styles.tabButtonActive : undefined]}
            onPress={(): void => setActiveTab("history")}
          >
            <Text style={[styles.tabText, activeTab === "history" ? styles.tabTextActive : undefined]}>
              Phần thưởng & Lịch sử
            </Text>
          </TouchableOpacity>
        </View>

        {errorMessage !== null ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <ScrollView contentContainerStyle={styles.body}>
          {activeTab === "children" ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Danh sách bé hiện tại</Text>
              {children.map((child: Child) => (
                <View key={child.id} style={styles.childRow}>
                  <View style={styles.childInfoCol}>
                    <Text style={styles.childAvatarLabel}>{child.avatar}</Text>
                    {editingChildId === child.id ? (
                      <TextInput
                        value={editingChildName}
                        onChangeText={setEditingChildName}
                        style={styles.inlineInput}
                        placeholder="Tên mới của bé"
                      />
                    ) : (
                      <Text style={styles.childRowText}>{`${child.name} (${child.totalStars} ⭐)`}</Text>
                    )}
                  </View>

                  {editingChildId === child.id ? (
                    <View style={styles.inlineActionRow}>
                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={(): void => {
                          void updateChildName(child.id, editingChildName);
                          setEditingChildId(null);
                          setEditingChildName("");
                        }}
                        disabled={isLoading}
                      >
                        <Text style={styles.saveButtonText}>Lưu</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={(): void => {
                          setEditingChildId(null);
                          setEditingChildName("");
                        }}
                        disabled={isLoading}
                      >
                        <Text style={styles.cancelButtonText}>Hủy</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.inlineActionRow}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={(): void => {
                          setEditingChildId(child.id);
                          setEditingChildName(child.name);
                        }}
                        disabled={isLoading}
                      >
                        <Text style={styles.editButtonText}>✏️ Sửa</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={(): void => {
                          void deleteChild(child.id);
                        }}
                        disabled={isLoading}
                      >
                        <Text style={styles.deleteButtonText}>Xóa</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}

              <Text style={styles.sectionTitle}>Thêm bé mới</Text>
              <TextInput
                placeholder="Tên bé"
                value={childName}
                onChangeText={setChildName}
                style={styles.input}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {QUICK_AVATARS.map((avatar) => (
                  <TouchableOpacity
                    key={avatar}
                    style={[styles.pill, childAvatar === avatar ? styles.pillActive : undefined]}
                    onPress={(): void => setChildAvatar(avatar)}
                  >
                    <Text style={styles.pillText}>{avatar}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={(): void => {
                  void handleAddChild();
                }}
                disabled={isLoading}
              >
                <Text style={styles.primaryButtonText}>Thêm con</Text>
              </TouchableOpacity>
            </View>
          ) : activeTab === "tasks" ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chọn bé để thêm nhiệm vụ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {children.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    style={[styles.pill, taskChildId === child.id ? styles.pillActive : undefined]}
                    onPress={(): void => setTaskChildId(child.id)}
                  >
                    <Text style={styles.pillText}>{`${child.avatar} ${child.name}`}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.helperText}>
                {selectedTaskChild !== undefined
                  ? `Đang thêm cho: ${selectedTaskChild.name}`
                  : "Vui lòng tạo hoặc chọn một bé"}
              </Text>

              <TextInput
                placeholder="Tên nhiệm vụ (ví dụ: Đọc sách 15 phút)"
                value={taskTitle}
                onChangeText={setTaskTitle}
                style={styles.input}
              />
              <TextInput
                placeholder="Số sao"
                value={taskPoints}
                onChangeText={setTaskPoints}
                keyboardType="number-pad"
                style={styles.input}
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {QUICK_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.pill, taskIcon === icon ? styles.pillActive : undefined]}
                    onPress={(): void => setTaskIcon(icon)}
                  >
                    <Text style={styles.pillText}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={(): void => {
                  void handleCreateTask();
                }}
                disabled={isLoading || taskChildId.length === 0}
              >
                <Text style={styles.primaryButtonText}>Thêm nhiệm vụ</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>
                {`Danh sách nhiệm vụ hiện tại của ${selectedTaskChild?.name ?? "bé đã chọn"}`}
              </Text>
              {adminTasks.length === 0 ? (
                <Text style={styles.emptyText}>Chưa có nhiệm vụ nào cho bé này.</Text>
              ) : (
                adminTasks.map((task: Task) => (
                  <View key={task.id} style={styles.taskRow}>
                    <View style={styles.taskInfo}>
                      <Text style={styles.taskTitle}>{`${task.icon} ${task.title}`}</Text>
                      <Text style={styles.taskMeta}>{`+${task.points} ⭐`}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(): void => {
                        void deleteTask(task.id, task.childId);
                      }}
                      disabled={isLoading}
                    >
                      <Text style={styles.deleteButtonText}>🗑️ Xóa</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chọn bé</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {children.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    style={[styles.pill, rewardChildId === child.id ? styles.pillActive : undefined]}
                    onPress={(): void => setRewardChildId(child.id)}
                  >
                    <Text style={styles.pillText}>{`${child.avatar} ${child.name} (${child.totalStars} ⭐)`}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.sectionTitle}>Thêm phần thưởng</Text>
              <TextInput
                placeholder="Tên quà (VD: Đi công viên)"
                value={rewardTitle}
                onChangeText={setRewardTitle}
                style={styles.input}
              />
              <TextInput
                placeholder="Sao cần đổi"
                value={rewardPoints}
                onChangeText={setRewardPoints}
                keyboardType="number-pad"
                style={styles.input}
              />
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={(): void => {
                  void addReward(rewardChildId, rewardTitle, Number(rewardPoints));
                  setRewardTitle("");
                  setRewardPoints("20");
                }}
                disabled={isLoading || rewardChildId.length === 0}
              >
                <Text style={styles.primaryButtonText}>Thêm phần thưởng</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Danh sách phần thưởng</Text>
              <Text style={styles.balanceText}>
                {`Số dư kho báu hiện tại của bé: ${children.find((c) => c.id === rewardChildId)?.totalStars ?? 0} ⭐`}
              </Text>
              {rewards.map((reward) => {
                const child = children.find((c) => c.id === rewardChildId);
                const canRedeem: boolean = (child?.totalStars ?? 0) >= reward.pointsRequired && reward.stock > 0;
                return (
                  <View key={reward.id} style={styles.taskRow}>
                    <View style={styles.taskInfo}>
                      <Text style={styles.taskTitle}>{reward.title}</Text>
                      <Text style={styles.taskMeta}>{`Cần: ${reward.pointsRequired} ⭐ | Lượt đổi còn lại: ${reward.stock}`}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.primaryButton, { paddingVertical: 8, paddingHorizontal: 10, marginTop: 0, opacity: canRedeem ? 1 : 0.5 }]}
                      onPress={(): void => {
                        void redeemReward(reward.childId, reward.id);
                      }}
                      disabled={!canRedeem || isLoading}
                    >
                      <Text style={styles.primaryButtonText}>Đổi quà</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              <Text style={styles.sectionTitle}>Lịch sử hoàn thành nhiệm vụ</Text>
              {taskLogs.map((log) => (
                <Text key={log.id} style={styles.timelineText}>{`• ${log.completedAt}: ${log.taskTitle}`}</Text>
              ))}
              <Text style={styles.sectionTitle}>Lịch sử đổi quà</Text>
              {rewardLogs.map((log) => (
                <Text key={log.id} style={styles.timelineText}>{`• ${log.redeemedAt}: ${log.rewardTitle} (-${log.pointsSpent} ⭐)`}</Text>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F0F9FF" },
  page: { flex: 1, padding: 16 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  backButton: { backgroundColor: "#E2E8F0", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  backText: { color: "#0F172A", fontWeight: "700", fontSize: 12 },
  tabRow: { flexDirection: "row", marginBottom: 10 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#E2E8F0", marginRight: 8 },
  tabButtonActive: { backgroundColor: "#0EA5E9" },
  tabText: { textAlign: "center", color: "#334155", fontWeight: "700", fontSize: 13 },
  tabTextActive: { color: "#FFFFFF" },
  errorText: { color: "#B91C1C", backgroundColor: "#FEE2E2", borderRadius: 8, padding: 8, marginBottom: 8 },
  body: { paddingBottom: 24 },
  section: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#DBEAFE" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 10, marginTop: 6 },
  childRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  childInfoCol: { flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 8 },
  childAvatarLabel: { fontSize: 18, marginRight: 6 },
  childRowText: { color: "#0F172A", fontSize: 14, fontWeight: "600", flex: 1, paddingRight: 10 },
  inlineInput: {
    borderWidth: 1,
    borderColor: "#93C5FD",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flex: 1,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  inlineActionRow: { flexDirection: "row", alignItems: "center" },
  editButton: { backgroundColor: "#E0F2FE", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginRight: 6 },
  editButtonText: { color: "#075985", fontWeight: "700" },
  saveButton: { backgroundColor: "#DCFCE7", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginRight: 6 },
  saveButtonText: { color: "#166534", fontWeight: "700" },
  cancelButton: { backgroundColor: "#E2E8F0", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginRight: 6 },
  cancelButtonText: { color: "#334155", fontWeight: "700" },
  deleteButton: { backgroundColor: "#FEE2E2", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  deleteButtonText: { color: "#B91C1C", fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: "#0F172A",
  },
  pillRow: { paddingBottom: 8 },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  pillActive: { backgroundColor: "#0EA5E9", borderColor: "#0284C7" },
  pillText: { fontWeight: "700", color: "#0F172A" },
  helperText: { color: "#0369A1", fontSize: 13, marginBottom: 8, fontWeight: "600" },
  balanceText: { color: "#B45309", fontSize: 14, fontWeight: "800", marginBottom: 8 },
  emptyText: { color: "#64748B", fontSize: 13, marginTop: 6, marginBottom: 4 },
  taskRow: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  taskInfo: { flex: 1, paddingRight: 8 },
  taskTitle: { color: "#0F172A", fontSize: 14, fontWeight: "700", marginBottom: 2 },
  taskMeta: { color: "#D97706", fontWeight: "700", fontSize: 13 },
  timelineText: { color: "#334155", fontSize: 13, marginBottom: 6 },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#22C55E",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
