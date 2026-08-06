import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { api } from "@/lib/api";
import { colors } from "@/theme";
const money = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function OrderDetail() {
  const { id, number, status, total, date } = useLocalSearchParams<{ id: string; number?: string; status?: string; total?: string; date?: string }>();
  const [tracking, setTracking] = useState<any>(); const [error, setError] = useState("");
  useEffect(() => { api.tracking(id).then(setTracking).catch((e) => setError(e.message)); }, [id]);
  return <Screen title={number || "Order tracking"} back><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.state}><Ionicons name="cube" size={28} color={colors.primary} /><View><Text style={styles.status}>{tracking?.currentStatus || status || "Processing"}</Text>{date && <Text style={styles.muted}>Placed {new Date(date).toLocaleDateString("en-IN")}</Text>}</View></View>
    {total && <View style={styles.totalRow}><Text style={styles.heading}>Order total</Text><Text style={styles.total}>{money(Number(total))}</Text></View>}
    <Text style={styles.heading}>Tracking timeline</Text>
    {!tracking && !error ? <ActivityIndicator color={colors.primary} /> : error ? <Text style={styles.error}>{error}</Text> : (tracking.activities || []).length ? (tracking.activities || []).map((activity: any, index: number) => <View key={index} style={styles.step}><View style={styles.dot} /><View style={{ flex: 1 }}><Text style={styles.itemName}>{activity.activity || activity.title || activity.status}</Text><Text style={styles.muted}>{activity.date || activity.comment || activity.details || ""}</Text></View></View>) : <Text style={styles.muted}>Tracking updates will appear when your order is processed.</Text>}
    {tracking?.awb ? <Text style={styles.awb}>Tracking number: {tracking.awb}</Text> : null}
  </ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { padding: 18, gap: 15 }, state: { backgroundColor: colors.primarySoft, borderRadius: 16, padding: 16, flexDirection: "row", gap: 12, alignItems: "center" }, status: { fontSize: 18, fontWeight: "900", color: colors.primaryDark }, muted: { fontSize: 12, color: colors.muted, marginTop: 3 }, heading: { fontSize: 18, fontWeight: "900", color: colors.ink, marginTop: 8 }, totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, total: { fontSize: 21, fontWeight: "900" }, itemName: { fontWeight: "800", color: colors.ink }, step: { flexDirection: "row", gap: 12, borderLeftWidth: 2, borderColor: colors.line, paddingLeft: 15, paddingBottom: 13 }, dot: { position: "absolute", left: -6, top: 3, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }, awb: { backgroundColor: "white", borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 13, color: colors.muted }, error: { color: colors.danger, backgroundColor: "#fff0f0", padding: 12, borderRadius: 10 } });
