"use client";

import React, { useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PostSkeleton } from '@/components';

/**
 * PostDetailPage:
 * The legacy standalone card view (/posts/[id]) is deprecated in favor of the
 * Instagram-style split CommentDrawer modal on the feed (comments displayed on the side).
 * Any direct navigation to /posts/[id] seamlessly forwards to /?postId=[id].
 */
function PostDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const postId = resolvedParams.id;
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('postId', postId);
    router.replace(`/?${nextParams.toString()}`);
  }, [postId, router, searchParams]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <PostSkeleton />
    </div>
  );
}

export default function PostDetailPage(props: { params: Promise<{ id: string }> }) {
  return (
    <React.Suspense fallback={<PostSkeleton />}>
      <PostDetailRedirect {...props} />
    </React.Suspense>
  );
}
