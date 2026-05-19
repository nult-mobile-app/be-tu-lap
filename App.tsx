import React from "react";
import { useState } from "react";
import { AdminScreen } from "./src/presentation/screens/AdminScreen";
import { HomeScreen } from "./src/presentation/screens/HomeScreen";

export default function App(): React.JSX.Element {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);

  if (isAdminMode) {
    return (
      <AdminScreen
        onBackHome={(): void => {
          setIsAdminMode(false);
        }}
      />
    );
  }

  return (
    <HomeScreen
      onOpenAdmin={(): void => {
        setIsAdminMode(true);
      }}
    />
  );
}
