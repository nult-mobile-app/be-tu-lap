import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import type { Child } from "../../domain/entities/Child";

interface ChildSelectorProps {
  children: Child[];
  selectedChildId: string | null;
  onSelectChild: (childId: string) => void;
}

export function ChildSelector({
  children,
  selectedChildId,
  onSelectChild,
}: ChildSelectorProps): React.JSX.Element {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {children.map((child: Child) => {
        const isSelected: boolean = child.id === selectedChildId;

        return (
          <TouchableOpacity
            key={child.id}
            style={[styles.pill, isSelected ? styles.pillSelected : undefined]}
            onPress={(): void => onSelectChild(child.id)}
            activeOpacity={0.85}
          >
            <Text style={styles.avatar}>{child.avatar}</Text>
            <Text style={[styles.name, isSelected ? styles.nameSelected : undefined]}>
              {child.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingTop: 2,
    paddingBottom: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#F8FAFC",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  pillSelected: {
    backgroundColor: "#0EA5E9",
    borderColor: "#0284C7",
  },
  avatar: {
    fontSize: 16,
    marginRight: 6,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  nameSelected: {
    color: "#FFFFFF",
  },
});

