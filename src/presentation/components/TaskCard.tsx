import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Task } from "../../domain/entities/Task";

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
}

export function TaskCard({ task, onComplete }: TaskCardProps): React.JSX.Element {
  const completed: boolean = task.isCompleted;

  return (
    <View style={[styles.card, completed ? styles.cardCompleted : undefined]}>
      <View style={styles.leftContent}>
        <Text style={styles.icon}>{task.icon}</Text>
        <View style={styles.textGroup}>
          <Text style={[styles.title, completed ? styles.dimmedText : undefined]}>{task.title}</Text>
          <Text style={styles.points}>{`+${task.points} ⭐`}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, completed ? styles.buttonDone : styles.buttonAction]}
        onPress={(): void => onComplete(task.id)}
        disabled={completed}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, completed ? styles.buttonTextDone : undefined]}>
          {completed ? "Đã xong" : "Hoàn thành"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardCompleted: {
    backgroundColor: "#F8FAFC",
    borderColor: "#D1FAE5",
    opacity: 0.8,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    paddingRight: 10,
  },
  icon: {
    fontSize: 28,
    marginRight: 10,
  },
  textGroup: {
    flexShrink: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  points: {
    fontSize: 14,
    color: "#D97706",
    fontWeight: "600",
  },
  dimmedText: {
    color: "#64748B",
  },
  button: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 98,
    alignItems: "center",
  },
  buttonAction: {
    backgroundColor: "#22C55E",
  },
  buttonDone: {
    backgroundColor: "#E2E8F0",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  buttonTextDone: {
    color: "#334155",
  },
});

