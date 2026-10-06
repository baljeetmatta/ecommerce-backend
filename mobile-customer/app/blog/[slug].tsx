import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { RichContent } from '@/components/RichContent';
import { api, mediaUrl } from '@/lib/api';
export default function Blog(){const {slug}=useLocalSearchParams<{slug:string}>();const [post,setPost]=useState<any>();const [error,setError]=useState('');useEffect(()=>{setPost(undefined);api.blog(slug).then(r=>setPost(r.post||r)).catch(e=>setError(e.message))},[slug]);return <Screen title={post?.title||'Journal'} back><ScrollView contentContainerStyle={{padding:18,gap:16}}>{error?<Text>{error}</Text>:!post?<ActivityIndicator/>:<>{(post.coverImage||post.imageUrl||post.featuredImage)&&<Image source={{uri:mediaUrl(post.coverImage||post.imageUrl||post.featuredImage)}} style={{width:'100%',aspectRatio:1.8,borderRadius:18}}/>}<Text style={{fontSize:28,fontWeight:'900'}}>{post.title}</Text><RichContent html={post.content||post.body||''}/></>}</ScrollView></Screen>}
