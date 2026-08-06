import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { EmptyState } from "@/components/Ui";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { Order } from "@/types";
import { colors } from "@/theme";
const money = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function Orders() {
  const { customer } = useAuth(); const [orders, setOrders] = useState<Order[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { if (!customer) { router.replace("/login"); return; } api.orders().then((result) => setOrders(result.items || [])).finally(() => setLoading(false)); }, [customer]);
  return <Screen title="My orders" back>{loading ? <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} /> : <FlatList data={orders} keyExtractor={(order) => order._id} contentContainerStyle={styles.list} ListEmptyComponent={<EmptyState icon="cube-outline" title="No orders yet" message="Your completed purchases will appear here." />} renderItem={({ item }) =>
    <Pressable onPress={() => router.push({ pathname: "/order/[id]", params: { id: item._id, number: item.orderNumber, status: item.status, total: String(item.grandTotal), date: item.createdAt } })} style={styles.card}>
      <View style={styles.row}><Text style={styles.number}>{item.orderNumber}</Text><View style={styles.status}><Text style={styles.statusText}>{item.status}</Text></View></View>
      <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {item.items.length} item(s)</Text>
      <View style={styles.row}><Text style={styles.total}>{money(item.grandTotal)}</Text><View style={styles.view}><Text style={styles.viewText}>Track order</Text><Ionicons name="chevron-forward" size={17} color={colors.primary} /></View></View>
    </Pressable>} />}</Screen>;
}
const styles = StyleSheet.create({ list: { padding: 16, gap: 12 }, card: { backgroundColor: "white", borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16, gap: 11 }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, number: { fontWeight: "900", fontSize: 16 }, status: { backgroundColor: colors.primarySoft, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 }, statusText: { fontSize: 11, fontWeight: "800", color: colors.primary }, date: { color: colors.muted, fontSize: 12 }, total: { fontSize: 18, fontWeight: "900" }, view: { flexDirection: "row", alignItems: "center" }, viewText: { color: colors.primary, fontWeight: "700" } });
