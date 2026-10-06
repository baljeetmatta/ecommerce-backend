import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Screen } from "@/components/Screen";
import { Button, Field } from "@/components/Ui";
import { useShop } from "@/context/ShopContext";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { colors } from "@/theme";

export default function Contact() {
  const { customer } = useAuth();
  const {store} = useShop();
  const contact = store.settings.contactDetails || store.settings;
  const [form, setForm] = useState({ name: customer?.name || "", email: customer?.email || "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const send = async () => {
    setBusy(true); setNote("");
    try { await api.contact(form); setNote("Thanks! Your message has been received."); setForm((current) => ({ ...current, subject: "", message: "" })); }
    catch (error: any) { setNote(error.message); }
    finally { setBusy(false); }
  };
  return <Screen title="Help & contact" back><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>How can we help?</Text>{[contact.address,contact.city,contact.state,contact.pincode,contact.email,contact.mobile||contact.phone].filter(Boolean).map((line,i)=><Text key={i} style={styles.sub}>{line}</Text>)}<Text style={styles.sub}>Send us a note and our support team will get back to you.</Text>
    <Field label="Name" value={form.name} onChangeText={(value) => set("name", value)} />
    <Field label="Email" value={form.email} onChangeText={(value) => set("email", value)} keyboardType="email-address" autoCapitalize="none" />
    <Field label="Subject" value={form.subject} onChangeText={(value) => set("subject", value)} />
    <Field label="Message" value={form.message} onChangeText={(value) => set("message", value)} multiline />
    {note && <Text style={styles.note}>{note}</Text>}<Button title="Send message" loading={busy} onPress={send} />
  </ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { padding: 22, gap: 15 }, title: { fontSize: 27, fontWeight: "900", color: colors.ink }, sub: { color: colors.muted, lineHeight: 21, marginBottom: 7 }, note: { color: colors.primary, backgroundColor: colors.primarySoft, padding: 12, borderRadius: 10 } });
