import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/context/AuthContext";
import { ShopProvider } from "@/context/ShopContext";
export default function RootLayout(){return <SafeAreaProvider><AuthProvider><ShopProvider><StatusBar style="dark"/><Stack screenOptions={{headerShown:false,animation:"slide_from_right"}}/></ShopProvider></AuthProvider></SafeAreaProvider>}

