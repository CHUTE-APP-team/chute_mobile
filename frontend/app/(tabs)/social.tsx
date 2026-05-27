import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/src/context/AuthContext";
import { getPosts, createPost, toggleLike, deletePost, Post } from "@/src/services/postService";
import { colors } from "@/src/theme/colors";

const theme = colors;

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)  return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "há 1 dia";
  if (days < 7)  return `há ${days} dias`;
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// ─── Post Card ────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: Post;
  currentUserId: string | undefined;
  onLike: (postId: string) => void;
  onDelete: (postId: string) => void;
}

function PostCard({ post, currentUserId, onLike, onDelete }: PostCardProps) {
  const authorName = post.author?.name ?? "Usuário removido";
  const authorId   = post.author?._id ?? "";
  const isLiked    = currentUserId ? post.likes.includes(currentUserId) : false;
  const isAuthor   = currentUserId === authorId;
  const initials   = authorName.charAt(0).toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.authorBlock}>
          <Text style={styles.authorName}>{authorName}</Text>
          <Text style={styles.timestamp}>{relativeTime(post.createdAt)}</Text>
        </View>
        {isAuthor && (
          <TouchableOpacity
            onPress={() => onDelete(post._id)}
            style={styles.deleteIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteIconText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.content}>{post.content}</Text>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.likeBtn}
          onPress={() => onLike(post._id)}
          activeOpacity={0.75}
        >
          <Text style={[styles.likeIcon, isLiked && styles.likeIconActive]}>
            {isLiked ? "❤️" : "🤍"}
          </Text>
          <Text style={[styles.likeCount, isLiked && styles.likeCountActive]}>
            {post.likes.length}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Compose Box ──────────────────────────────────────────────────────────────

interface ComposeBoxProps {
  onPost: (content: string) => Promise<void>;
}

function ComposeBox({ onPost }: ComposeBoxProps) {
  const [text, setText]       = useState("");
  const [posting, setPosting] = useState(false);
  const MAX = 280;

  async function handlePost() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPosting(true);
    try {
      await onPost(trimmed);
      setText("");
    } catch {
      Alert.alert("Erro", "Não foi possível publicar. Tente novamente.");
    } finally {
      setPosting(false);
    }
  }

  const remaining = MAX - text.length;
  const nearLimit = remaining <= 30;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.compose}>
        <TextInput
          style={styles.composeInput}
          value={text}
          onChangeText={setText}
          placeholder="O que está acontecendo no campo? ⚽"
          placeholderTextColor={theme.textMuted}
          multiline
          maxLength={MAX}
        />
        <View style={styles.composeFooter}>
          <Text style={[styles.charCount, nearLimit && styles.charCountWarn]}>
            {remaining}
          </Text>
          <TouchableOpacity
            style={[styles.postBtn, (!text.trim() || posting) && styles.postBtnDisabled]}
            onPress={handlePost}
            disabled={!text.trim() || posting}
            activeOpacity={0.85}
          >
            {posting
              ? <ActivityIndicator color={theme.textOnPrimary} size="small" />
              : <Text style={styles.postBtnText}>Postar</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Social Screen ────────────────────────────────────────────────────────────

export default function SocialScreen() {
  const { user } = useAuth();
  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  async function fetchPosts(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await getPosts();
      if (mountedRef.current) setPosts(data);
    } catch {
      if (mountedRef.current) {
        Alert.alert("Erro", "Não foi possível carregar o feed.");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  useFocusEffect(useCallback(() => {
    fetchPosts();
    return () => { mountedRef.current = false; };
  }, []));

  async function handlePost(content: string) {
    const newPost = await createPost(content);
    setPosts((prev) => [newPost, ...prev]);
  }

  async function handleLike(postId: string) {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p._id !== postId) return p;
        const liked = user?.id ? p.likes.includes(user.id) : false;
        const likes = liked
          ? p.likes.filter((id) => id !== user?.id)
          : [...p.likes, user?.id ?? ""];
        return { ...p, likes };
      })
    );
    try {
      await toggleLike(postId);
    } catch {
      // Revert on failure
      fetchPosts(true);
    }
  }

  function handleDelete(postId: string) {
    Alert.alert("Excluir post", "Tem certeza que deseja excluir este post?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(postId);
            setPosts((prev) => prev.filter((p) => p._id !== postId));
          } catch {
            Alert.alert("Erro", "Não foi possível excluir o post.");
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Social</Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchPosts(true); }}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ListHeaderComponent={<ComposeBox onPost={handlePost} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={theme.primary} size="large" />
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyText}>
                Nenhuma publicação ainda.{"\n"}Seja o primeiro a postar!
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user?.id}
            onLike={handleLike}
            onDelete={handleDelete}
          />
        )}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: theme.background, paddingTop: 56 },
  header:   { paddingHorizontal: 16, marginBottom: 8 },
  title:    { fontSize: 22, fontWeight: "800", color: theme.text },
  list:     { paddingHorizontal: 16, paddingBottom: 48 },
  centered: { marginTop: 48, alignItems: "center" },
  emptyBox: { alignItems: "center", marginTop: 48, gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyText:  { fontSize: 15, color: theme.textMuted, textAlign: "center", lineHeight: 22 },

  // Compose
  compose:       { backgroundColor: theme.card, borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  composeInput:  { fontSize: 15, color: theme.text, minHeight: 64, textAlignVertical: "top", marginBottom: 8 },
  composeFooter: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 12 },
  charCount:     { fontSize: 12, color: theme.textMuted, fontWeight: "600" },
  charCountWarn: { color: theme.error },
  postBtn:       { backgroundColor: theme.primary, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, minWidth: 72, alignItems: "center" },
  postBtnDisabled: { backgroundColor: theme.disabled },
  postBtnText:   { color: theme.textOnPrimary, fontWeight: "700", fontSize: 14 },

  // Post card
  card:         { backgroundColor: theme.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  cardHeader:   { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  avatar:       { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primary + "33", justifyContent: "center", alignItems: "center" },
  avatarText:   { fontSize: 17, fontWeight: "bold", color: theme.primary },
  authorBlock:  { flex: 1 },
  authorName:   { fontSize: 14, fontWeight: "700", color: theme.text },
  timestamp:    { fontSize: 11, color: theme.textMuted, marginTop: 1 },
  deleteIcon:   { padding: 4 },
  deleteIconText: { fontSize: 13, color: theme.textMuted },
  content:      { fontSize: 15, color: theme.text, lineHeight: 22, marginBottom: 12 },
  cardFooter:   { flexDirection: "row", alignItems: "center" },
  likeBtn:      { flexDirection: "row", alignItems: "center", gap: 5 },
  likeIcon:     { fontSize: 18 },
  likeIconActive: {},
  likeCount:    { fontSize: 13, color: theme.textMuted, fontWeight: "600" },
  likeCountActive: { color: theme.primary },
});
