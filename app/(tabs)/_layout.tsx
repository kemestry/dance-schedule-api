import { View } from "react-native";
import { Tabs } from "expo-router";

function TabIcon({
  color,
  size,
  variant,
}: {
  color: string;
  size: number;
  variant: "schedule" | "add" | "share" | "settings";
}) {
  const stroke = Math.max(1.75, size * 0.1);
  const box = size * 0.95;

  if (variant === "schedule") {
    return (
      <View
        style={{
          width: box,
          height: box,
          borderRadius: 6,
          borderWidth: stroke,
          borderColor: color,
          alignItems: "center",
          paddingTop: 4,
        }}
      >
        <View
          style={{
            width: box * 0.6,
            height: stroke,
            backgroundColor: color,
            borderRadius: 999,
            marginTop: 2,
          }}
        />
        <View
          style={{
            width: box * 0.6,
            height: stroke,
            backgroundColor: color,
            borderRadius: 999,
            marginTop: 5,
          }}
        />
      </View>
    );
  }

  if (variant === "add") {
    return (
      <View
        style={{
          width: box,
          height: box,
          borderRadius: box / 2,
          borderWidth: stroke,
          borderColor: color,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            position: "absolute",
            width: box * 0.48,
            height: stroke,
            backgroundColor: color,
            borderRadius: 999,
          }}
        />
        <View
          style={{
            position: "absolute",
            width: stroke,
            height: box * 0.48,
            backgroundColor: color,
            borderRadius: 999,
          }}
        />
      </View>
    );
  }

  if (variant === "share") {
    return (
      <View
        style={{
          width: box,
          height: box,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: box * 0.6,
            height: box * 0.6,
            borderLeftWidth: stroke,
            borderTopWidth: stroke,
            borderColor: color,
            transform: [{ rotate: "45deg" }, { translateY: 1 }],
            marginTop: box * 0.12,
          }}
        />
        <View
          style={{
            position: "absolute",
            width: stroke,
            height: box * 0.48,
            backgroundColor: color,
            borderRadius: 999,
            transform: [{ translateY: 2 }],
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width: box,
        height: box,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: box * 0.78,
          height: box * 0.78,
          borderRadius: box / 2,
          borderWidth: stroke,
          borderColor: color,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: box * 0.18,
            height: box * 0.18,
            borderRadius: 999,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

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
        },
        tabBarIconStyle: {
          marginBottom: 2
        }
      }}
    >
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color, size }) => <TabIcon variant="schedule" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "Add",
          tabBarIcon: ({ color, size }) => <TabIcon variant="add" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="share"
        options={{
          title: "Share",
          tabBarIcon: ({ color, size }) => <TabIcon variant="share" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <TabIcon variant="settings" color={color} size={size} />
        }}
      />
    </Tabs>
  );
}
