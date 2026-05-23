import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
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
import type { TaskTemplate } from "../../domain/entities/TaskTemplate";
import { useTaskStore } from "../state/useTaskStore";

interface AdminScreenProps {
  onBackHome: () => void;
}

type AdminTab = "children" | "tasks" | "history";

const QUICK_AVATARS: readonly string[] = ["🦁", "🦊", "🐼", "🐯", "🐨", "🐵"];
const QUICK_ICONS: readonly string[] = ["🪥", "📚", "🧸", "🧹", "🫧", "🥛"];

export function AdminScreen({ onBackHome }: AdminScreenProps): React.JSX.Element {
  const children: Child[] = useTaskStore((state) => state.children ?? []);
  const isLoading: boolean = useTaskStore((state) => state.isLoading);
  const errorMessage: string | null = useTaskStore((state) => state.errorMessage);
  const adminTasks: Task[] = useTaskStore((state) => state.adminTasks ?? []);
  const addChild = useTaskStore((state) => state.addChild);
  const deleteChild = useTaskStore((state) => state.deleteChild);
  const createTask = useTaskStore((state) => state.createTask);
  const updateChildName = useTaskStore((state) => state.updateChildName);
  const fetchTasksForChild = useTaskStore((state) => state.fetchTasksForChild);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const taskLogs = useTaskStore((state) => state.taskLogs ?? []);
  const rewards = useTaskStore((state) => state.rewards ?? []);
  const rewardLogs = useTaskStore((state) => state.rewardLogs ?? []);
  const loadHistoryAndRewards = useTaskStore((state) => state.loadHistoryAndRewards);
  const addReward = useTaskStore((state) => state.addReward);
  const redeemReward = useTaskStore((state) => state.redeemReward);
  const taskTemplates = useTaskStore((state) => state.taskTemplates ?? []);
  const fetchTaskTemplates = useTaskStore((state) => state.fetchTaskTemplates);
  const createTaskTemplate = useTaskStore((state) => state.createTaskTemplate);
  const deleteTaskTemplate = useTaskStore((state) => state.deleteTaskTemplate);

  const [activeTab, setActiveTab] = useState<AdminTab>("children");
  const [childName, setChildName] = useState<string>("");
  const [childAvatar, setChildAvatar] = useState<string>(QUICK_AVATARS[0]);
  const [taskChildIds, setTaskChildIds] = useState<string[]>([]);
  const [taskTitle, setTaskTitle] = useState<string>("");
  const [taskIcon, setTaskIcon] = useState<string>(QUICK_ICONS[0]);
  const [taskPoints, setTaskPoints] = useState<string>("10");
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editingChildName, setEditingChildName] = useState<string>("");
  const [rewardChildId, setRewardChildId] = useState<string>("");
  const [rewardTitle, setRewardTitle] = useState<string>("");
  const [rewardPoints, setRewardPoints] = useState<string>("20");

  const handleSelectChild = (id: string): void => {
    setTaskChildIds([id]);
  };

  React.useEffect(() => {
    const safeChildren = Array.isArray(children) ? children : [];
    if (safeChildren.length > 0 && taskChildIds.length === 0) {
      setTaskChildIds([safeChildren[0].id]);
    }
    if (safeChildren.length > 0 && rewardChildId.length === 0) {
      setRewardChildId(safeChildren[0].id);
    }
  }, [children, taskChildIds, rewardChildId]);

  React.useEffect(() => {
    if (activeTab === "tasks") {
      void fetchTaskTemplates();
      if (taskChildIds.length === 1) {
        void fetchTasksForChild(taskChildIds[0]);
      }
    }
  }, [activeTab, taskChildIds, fetchTasksForChild, fetchTaskTemplates]);

  React.useEffect(() => {
    if (activeTab === "history" && rewardChildId.length > 0) {
      void loadHistoryAndRewards(rewardChildId);
    }
  }, [activeTab, rewardChildId, loadHistoryAndRewards]);

  const handleAddChild = async (): Promise<void> => {
    await addChild(childName, childAvatar);
    setChildName("");
  };

  const handleCreateTemplate = async (): Promise<void> => {
    const points: number = Number(taskPoints);
    await createTaskTemplate(taskTitle, taskIcon, points);
    setTaskTitle("");
    setTaskPoints("10");
  };

  const handleAssignTemplate = async (template: TaskTemplate): Promise<void> => {
    if (taskChildIds.length === 0) {
      if (Platform.OS === "web") {
        window.alert("Vui lòng chọn 1 bé để gán nhiệm vụ.");
      } else {
        Alert.alert("Lỗi", "Vui lòng chọn 1 bé để gán nhiệm vụ.");
      }
      return;
    }

    const cid = taskChildIds[0];

    // Kiểm tra trùng lặp: bé đã có nhiệm vụ cùng tên chưa?
    const isDuplicate = (Array.isArray(adminTasks) ? adminTasks : []).some(
      (t) => t && t.childId === cid && t.title.trim().toLowerCase() === template.title.trim().toLowerCase(),
    );
    if (isDuplicate) {
      const childName = (Array.isArray(children) ? children : []).find((c) => c && c.id === cid)?.name ?? "Bé";
      const msg = `"${template.title}" đã được gán cho ${childName} rồi!`;
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Nhiệm vụ đã tồn tại", msg);
      }
      return;
    }

    await createTask(cid, template.title, template.icon, template.points);
    await fetchTasksForChild(cid);
  };

  const handleDeleteTemplate = async (id: string, title: string): Promise<void> => {
    let shouldDelete = false;
    if (Platform.OS === "web") {
      shouldDelete = window.confirm(`Bạn có chắc muốn xóa nhiệm vụ mẫu "${title}" không?`);
    } else {
      shouldDelete = await new Promise((resolve) => {
        Alert.alert("Xác nhận xóa", `Bạn có chắc muốn xóa nhiệm vụ mẫu "${title}" không?`, [
          { text: "Hủy", style: "cancel", onPress: () => resolve(false) },
          { text: "Xóa", style: "destructive", onPress: () => resolve(true) },
        ]);
      });
    }
    if (shouldDelete) {
      await deleteTaskTemplate(id);
    }
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
              {(Array.isArray(children) ? children : [])
                .filter((child): child is Child => child !== null && child !== undefined)
                .map((child: Child) => (
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
                        <Text style={styles.childRowText}>{`${child.name} (${child.totalStars ?? 0} ⭐)`}</Text>
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
                          const msg = `Bạn có chắc muốn xóa "${child.name}"? Tất cả nhiệm vụ và lịch sử của bé cũng sẽ bị xóa.`;
                          if (Platform.OS === "web") {
                            if (window.confirm(msg)) {
                              void deleteChild(child.id);
                            }
                          } else {
                            Alert.alert(
                              "Xác nhận xóa",
                              msg,
                              [
                                { text: "Hủy", style: "cancel" },
                                {
                                  text: "Xóa",
                                  style: "destructive",
                                  onPress: (): void => {
                                    void deleteChild(child.id);
                                  },
                                },
                              ],
                            );
                          }
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
              <Text style={styles.sectionTitle}>1. Chọn bé để gán nhiệm vụ & xem</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {(Array.isArray(children) ? children : [])
                  .filter((child): child is Child => child !== null && child !== undefined)
                  .map((child) => (
                    <TouchableOpacity
                      key={child.id}
                      style={[styles.pill, taskChildIds.includes(child.id) ? styles.pillActive : undefined]}
                      onPress={(): void => handleSelectChild(child.id)}
                    >
                      <Text style={styles.pillText}>{`${child.avatar} ${child.name}`}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              <Text style={styles.helperText}>
                {taskChildIds.length > 0
                  ? `Đang chọn: ${taskChildIds.map((id) => (Array.isArray(children) ? children : []).find((c) => c && c.id === id)?.name).filter(Boolean).join(", ")}`
                  : "Vui lòng chọn 1 bé để gán nhiệm vụ"}
              </Text>

              <Text style={styles.sectionTitle}>
                {taskChildIds.length === 1
                  ? `Danh sách nhiệm vụ riêng của ${(Array.isArray(children) ? children : []).find((c) => c && c.id === taskChildIds[0])?.name}`
                  : "Danh sách nhiệm vụ (Vui lòng chọn 1 bé để xem)"}
              </Text>
              {taskChildIds.length !== 1 ? (
                <Text style={styles.emptyText}>Chọn duy nhất 1 bé để xem và xóa nhiệm vụ.</Text>
              ) : !Array.isArray(adminTasks) || adminTasks.length === 0 ? (
                <Text style={styles.emptyText}>Chưa có nhiệm vụ nào cho bé này.</Text>
              ) : (
                adminTasks
                  .filter((task): task is Task => task !== null && task !== undefined)
                  .map((task: Task) => (
                    <View key={task.id} style={styles.taskRow}>
                      <View style={styles.taskInfo}>
                        <Text style={styles.taskTitle}>{`${task.icon} ${task.title}`}</Text>
                        <Text style={styles.taskMeta}>{`+${task.points} ⭐`}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={(): void => {
                          const msg = `Bạn có chắc muốn xóa nhiệm vụ "${task.title}"?`;
                          if (Platform.OS === "web") {
                            if (window.confirm(msg)) {
                              void deleteTask(task.id, task.childId);
                            }
                          } else {
                            Alert.alert(
                              "Xác nhận xóa",
                              msg,
                              [
                                { text: "Hủy", style: "cancel" },
                                {
                                  text: "Xóa",
                                  style: "destructive",
                                  onPress: (): void => {
                                    void deleteTask(task.id, task.childId);
                                  },
                                },
                              ],
                            );
                          }
                        }}
                        disabled={isLoading}
                      >
                        <Text style={styles.deleteButtonText}>🗑️ Xóa</Text>
                      </TouchableOpacity>
                    </View>
                  ))
              )}

              <Text style={[styles.sectionTitle, { borderTopWidth: 1, borderTopColor: "#EEE", paddingTop: 16, marginTop: 8 }]}>
                2. Thư viện nhiệm vụ chung (Mẫu)
              </Text>
              
              <TextInput
                placeholder="Tên nhiệm vụ mẫu (ví dụ: Đọc sách)"
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
                  void handleCreateTemplate();
                }}
                disabled={isLoading || taskTitle.trim() === ""}
              >
                <Text style={styles.primaryButtonText}>Thêm nhiệm vụ vào Thư viện</Text>
              </TouchableOpacity>

              <View style={{ marginTop: 16, marginBottom: 24 }}>
                {!Array.isArray(taskTemplates) || taskTemplates.length === 0 ? (
                  <Text style={styles.emptyText}>Thư viện trống.</Text>
                ) : (
                  taskTemplates.map((template) => (
                    <TouchableOpacity 
                      key={template.id} 
                      style={[styles.taskRow, { borderColor: "#4CAF50", borderWidth: 1 }]}
                      onPress={(): void => { void handleAssignTemplate(template); }}
                    >
                      <View style={styles.taskInfo}>
                        <Text style={styles.taskTitle}>{`${template.icon} ${template.title}`}</Text>
                        <Text style={styles.taskMeta}>{`+${template.points} ⭐ (Bấm để gán)`}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={(): void => {
                          void handleDeleteTemplate(template.id, template.title);
                        }}
                      >
                        <Text style={styles.deleteButtonText}>Xóa</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chọn bé</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {(Array.isArray(children) ? children : [])
                  .filter((child): child is Child => child !== null && child !== undefined)
                  .map((child) => (
                    <TouchableOpacity
                      key={child.id}
                      style={[styles.pill, rewardChildId === child.id ? styles.pillActive : undefined]}
                      onPress={(): void => setRewardChildId(child.id)}
                    >
                      <Text style={styles.pillText}>{`${child.avatar} ${child.name} (${child.totalStars ?? 0} ⭐)`}</Text>
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
                  void addReward(rewardTitle, Number(rewardPoints));
                  setRewardTitle("");
                  setRewardPoints("20");
                }}
                disabled={isLoading || rewardTitle.trim() === ""}
              >
                <Text style={styles.primaryButtonText}>Thêm phần thưởng</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Danh sách phần thưởng</Text>
              <Text style={styles.balanceText}>
                {`Số dư kho báu hiện tại của bé: ${(Array.isArray(children) ? children : []).find((c) => c && c.id === rewardChildId)?.totalStars ?? 0} ⭐`}
              </Text>
              {(Array.isArray(rewards) ? rewards : [])
                .filter((reward) => reward !== null && reward !== undefined)
                .map((reward) => {
                  const safeChildren = Array.isArray(children) ? children : [];
                  const child = safeChildren.find((c) => c && c.id === rewardChildId);
                  const currentStars: number = Number(child?.totalStars ?? 0);
                  const pointsRequired: number = Number(reward.pointsRequired ?? 0);
                  const redeemableTurns: number =
                    pointsRequired > 0 ? Math.floor(currentStars / pointsRequired) : 0;
                  const canRedeem: boolean =
                    Number.isFinite(currentStars) &&
                    Number.isFinite(pointsRequired) &&
                    currentStars >= pointsRequired;
                  return (
                    <View key={reward.id} style={styles.taskRow}>
                      <View style={styles.taskInfo}>
                        <Text style={styles.taskTitle}>{reward.title}</Text>
                        <Text style={styles.taskMeta}>{`Cần: ${reward.pointsRequired} ⭐ | Lượt đổi còn lại: ${redeemableTurns}`}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.primaryButton, { paddingVertical: 8, paddingHorizontal: 10, marginTop: 0, opacity: canRedeem ? 1 : 0.5 }]}
                        onPress={(): void => {
                          void redeemReward(rewardChildId, reward.id);
                        }}
                        disabled={!canRedeem || isLoading}
                      >
                        <Text style={styles.primaryButtonText}>Đổi quà</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}

              <Text style={styles.sectionTitle}>Lịch sử hoàn thành nhiệm vụ</Text>
              {(Array.isArray(taskLogs) ? taskLogs : [])
                .filter((log) => log !== null && log !== undefined)
                .map((log) => (
                  <Text key={log.id} style={styles.timelineText}>{`• ${log.completedAt}: ${log.taskTitle}`}</Text>
                ))}
              <Text style={styles.sectionTitle}>Lịch sử đổi quà</Text>
              {(Array.isArray(rewardLogs) ? rewardLogs : [])
                .filter((log) => log !== null && log !== undefined)
                .map((log) => (
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
