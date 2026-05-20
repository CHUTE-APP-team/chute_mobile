import { api } from './api';

export interface PostAuthor {
  _id: string;
  name: string;
}

export interface Post {
  _id: string;
  content: string;
  author: PostAuthor;
  likes: string[];
  createdAt: string;
}

export async function getPosts(): Promise<Post[]> {
  const res = await api.get('/posts');
  const data = res.data?.data;
  return Array.isArray(data) ? data : [];
}

export async function createPost(content: string): Promise<Post> {
  const res = await api.post('/posts', { content });
  return res.data.data as Post;
}

export async function toggleLike(postId: string): Promise<{ likes: number; liked: boolean }> {
  const res = await api.post(`/posts/${postId}/like`);
  return res.data.data as { likes: number; liked: boolean };
}

export async function deletePost(postId: string): Promise<void> {
  await api.delete(`/posts/${postId}`);
}
