import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#123629",
        tabBarInactiveTintColor: "#7D847E",
        tabBarStyle: {
          backgroundColor: "#FBF8F0",
          borderTopColor: "#DED8CA",
          height: 88,
          paddingTop: 12,
          paddingBottom: 18
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700"
        }
      }}
    >
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule"
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "Add"
        }}
      />
      <Tabs.Screen
        name="share"
        options={{
          title: "Share"
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings"
        }}
      />
    </Tabs>
  );
}
