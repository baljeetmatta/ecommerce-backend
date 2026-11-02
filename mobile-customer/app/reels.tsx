import { useCallback, useEffect, useState } from 'react';
import { useIsFocused } from 'expo-router/react-navigation';
import { router } from 'expo-router';
import { FlatList, Modal, Pressable, Share, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video } from '@/components/Video';
import { Button, EmptyState, Field } from '@/components/Ui';
import { useShop } from '@/context/ShopContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { money, productPrice } from '@/lib/commerce';
import type { Product } from '@/types';

function Reel({ product, active, height, width, bottomInset }: { product: Product; active: boolean; height: number; width: number; bottomInset: number }) {
  const { customer } = useAuth();
  const [engagement, setEngagement] = useState<any>({});
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    api.engagement(product._id).then(setEngagement).catch(() => {});
    if (active) api.reelView(product._id).then(setEngagement).catch(() => {});
  }, [product._id, active]);

  const run = async (action: () => Promise<any>) => {
    if (!customer) {
      router.push('/login');
      return;
    }
    try {
      setEngagement(await action());
      setText('');
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return <View style={[s.reel, { height, width }]}>
    <View style={StyleSheet.absoluteFill}>
      <Video url={product.videoUrl || product.media?.find(m => m.type === 'video')?.url || ''} active={active} height={height} fullScreen muted={muted} />
    </View>
    <View style={[s.overlay, { paddingBottom: Math.max(bottomInset, 16) }]}>
      <View style={s.rightActions}>
        <Pressable accessibilityLabel={engagement.liked ? 'Unlike reel' : 'Like reel'} onPress={() => run(() => api.reelLike(product._id))} style={s.action}>
          <Ionicons name={engagement.liked ? 'heart' : 'heart-outline'} size={30} color={engagement.liked ? '#ff5268' : 'white'} />
          <Text style={s.actionLabel}>{engagement.likeCount || 'Like'}</Text>
        </Pressable>
        <Pressable accessibilityLabel="View comments" onPress={() => setCommentsOpen(true)} style={s.action}>
          <Ionicons name="chatbubble-ellipses-outline" size={27} color="white" />
          <Text style={s.actionLabel}>{engagement.commentCount ?? engagement.comments?.length ?? 'Comment'}</Text>
        </Pressable>
        <View style={s.action}>
          <Ionicons name="eye-outline" size={27} color="white" />
          <Text style={s.actionLabel}>{engagement.viewCount || 0}</Text>
        </View>
        <Pressable accessibilityLabel={muted ? 'Turn sound on' : 'Mute reel'} onPress={() => setMuted(value => !value)} style={s.action}>
          <Ionicons name={muted ? 'volume-mute-outline' : 'volume-high-outline'} size={27} color="white" />
          <Text style={s.actionLabel}>{muted ? 'Sound off' : 'Sound on'}</Text>
        </Pressable>
        <Pressable accessibilityLabel="Share reel" onPress={() => Share.share({ message: `${product.name} · ${money(productPrice(product))}` })} style={s.action}>
          <Ionicons name="share-social-outline" size={26} color="white" />
          <Text style={s.actionLabel}>Share</Text>
        </Pressable>
      </View>
      <View style={s.productInfo}>
        <Text numberOfLines={2} style={s.productName}>{product.name}</Text>
        <Text style={s.productPrice}>{money(productPrice(product))}</Text>
        {!!product.shortDescription && <Text numberOfLines={2} style={s.productDescription}>{product.shortDescription}</Text>}
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/product/[id]', params: { id: product._id } })} style={s.buyButton}>
          <Ionicons name="bag-handle-outline" size={18} color="white" />
          <Text style={s.buyText}>View product</Text>
        </Pressable>
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
    <Modal visible={commentsOpen} transparent animationType="slide" onRequestClose={() => setCommentsOpen(false)}>
      <Pressable style={s.modalScrim} onPress={() => setCommentsOpen(false)} />
      <View style={[s.commentsSheet, { paddingBottom: Math.max(bottomInset, 16) }]}>
        <View style={s.commentsHeader}>
          <Text style={s.commentsTitle}>Comments</Text>
          <Pressable accessibilityLabel="Close comments" onPress={() => setCommentsOpen(false)}><Ionicons name="close" size={24} color="#17211d" /></Pressable>
        </View>
        <FlatList data={engagement.comments || []} keyExtractor={(comment: any, index) => comment._id || String(index)} ListEmptyComponent={<Text style={s.noComments}>Be the first to comment.</Text>} renderItem={({ item }: any) => <View style={s.commentItem}><Text style={s.commentAuthor}>{item.name || item.customer?.name || 'Customer'}</Text><Text style={s.commentText}>{item.text}</Text></View>} />
        <View style={s.commentComposer}>
          <TextInput value={text} onChangeText={setText} placeholder="Add a comment" maxLength={1000} style={s.commentInput} />
          <Pressable accessibilityLabel="Post comment" disabled={!text.trim()} onPress={() => run(() => api.reelComment(product._id, text))} style={s.sendButton}><Ionicons name="send" size={20} color={text.trim() ? '#176b43' : '#9aa39e'} /></Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}

const viewabilityConfig = { itemVisiblePercentThreshold: 60 };

export default function Reels() {
  const { store, loading, reload } = useShop();
  const focused = useIsFocused();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState(0);
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => setActive(viewableItems[0]?.index ?? 0), []);
  const products = store.products.filter(product => product.displayType === 'Reel' && (product.videoUrl || product.media?.some(media => media.type === 'video')));

  return <View style={s.screen}>
    <FlatList
      data={products}
      keyExtractor={product => product._id}
      pagingEnabled
      getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
      refreshing={loading}
      onRefresh={reload}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      renderItem={({ item, index }) => <Reel product={item} active={focused && index === active} height={height} width={width} bottomInset={insets.bottom} />}
      ListEmptyComponent={<View style={s.empty}><EmptyState title="No reels found" message="Product videos uploaded by sellers will appear here." /><Button title="Go to home" onPress={() => router.replace('/(tabs)')} /></View>}
    />
    <Pressable accessibilityLabel="Go to home" onPress={() => router.replace('/(tabs)')} style={[s.homeButton, { top: insets.top + 12 }]}>
      <Ionicons name="home-outline" size={20} color="white" />
      <Text style={s.homeText}>Home</Text>
    </Pressable>
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  reel: { backgroundColor: '#000', justifyContent: 'flex-end' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end', paddingHorizontal: 16 },
  productInfo: { width: '84%', gap: 5, padding: 14, borderRadius: 14, backgroundColor: 'rgba(0,0,0,.58)' },
  productName: { fontSize: 18, fontWeight: '900', color: 'white' },
  productPrice: { fontSize: 15, fontWeight: '800', color: 'white' },
  productDescription: { color: 'white', fontSize: 12, marginTop: 2 },
  buyButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 22, backgroundColor: '#176b43' },
  buyText: { color: 'white', fontWeight: '800' },
  rightActions: { position: 'absolute', right: 4, bottom: 150, alignItems: 'center', gap: 20 },
  action: { width: 58, alignItems: 'center', gap: 3 },
  actionLabel: { color: 'white', fontSize: 11, fontWeight: '800', textShadowColor: 'rgba(0,0,0,.8)', textShadowRadius: 5 },
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,.5)' },
  commentsSheet: { maxHeight: '65%', paddingHorizontal: 18, paddingTop: 16, gap: 12, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: 'white' },
  commentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderColor: '#e1e7e3' },
  commentsTitle: { fontSize: 18, fontWeight: '900', color: '#17211d' },
  noComments: { paddingVertical: 18, color: '#68746e', textAlign: 'center' },
  commentItem: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#edf0ee' },
  commentAuthor: { fontSize: 13, fontWeight: '800', color: '#17211d' },
  commentText: { paddingTop: 3, color: '#46514b' },
  commentComposer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderColor: '#e1e7e3' },
  commentInput: { flex: 1, height: 44, paddingHorizontal: 14, borderWidth: 1, borderColor: '#dfe7e2', borderRadius: 22, color: '#17211d' },
  sendButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#ffb5b5' },
  homeButton: { position: 'absolute', left: 16, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, backgroundColor: 'rgba(0,0,0,.65)' },
  homeText: { color: 'white', fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', gap: 16 },
});
