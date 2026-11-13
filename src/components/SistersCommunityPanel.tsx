import React, { useEffect, useState } from 'react';
import {
  Heart,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type { CommunityPost, CommunityTopic } from '../shared/types';

interface SistersCommunityPanelProps {
  onAskNomiToFactCheck: (question: string) => void;
}

const STORAGE_KEY = 'nomi_sisters_posts_v1';

const TOPICS: CommunityTopic[] = [
  'Periods & Fatigue',
  'Ferritin & Labs',
  'Pap & Checkups',
  'Ultrasound & Meds',
];

const SAMPLE_POSTS: CommunityPost[] = [
  {
    id: 'sister-1',
    author: 'Maya · 27 (Sample)',
    topic: 'Ferritin & Labs',
    question:
      'Anyone else get told their ferritin of 21 ng/mL was "normal" even while feeling wiped out after every period?',
    details:
      'Looking back across 3 years of labs helped me spot a steady drop that single-year visits brushed off. Curious what questions you brought to your doctor.',
    createdAtLabel: 'Sample discussion',
    helpfulCount: 14,
    isSample: true,
    replies: [
      {
        id: 'rep-1',
        author: 'Leila · 29 (Sample)',
        content:
          'Yes! Printing a multi-year trend summary and asking about a full iron panel + CBC changed the whole conversation at my primary care visit.',
        createdAtLabel: 'Sample reply',
      },
      {
        id: 'rep-2',
        author: 'Sora · 25 (Sample)',
        content:
          'Same here—my doctor also checked TSH and Vitamin D so we were not guessing which factor caused the fatigue.',
        createdAtLabel: 'Sample reply',
      },
    ],
  },
  {
    id: 'sister-2',
    author: 'Elena · 31 (Sample)',
    topic: 'Pap & Checkups',
    question:
      'How do you calm nerves before your routine Pap smear or pelvic ultrasound?',
    details:
      'Mine is coming up this month after putting it off for a year. Would love practical comfort tips from sisters.',
    createdAtLabel: 'Sample discussion',
    helpfulCount: 19,
    isSample: true,
    replies: [
      {
        id: 'rep-3',
        author: 'Nadia · 33 (Sample)',
        content:
          'Tell the nurse or clinician right away if you feel anxious—asking them to explain each step before they do it helps so much.',
        createdAtLabel: 'Sample reply',
      },
    ],
  },
  {
    id: 'sister-3',
    author: 'Priya · 24 (Sample)',
    topic: 'Ultrasound & Meds',
    question:
      'What helped you remember daily iron/meds and ask your pharmacist about timing?',
    details:
      'I kept forgetting morning doses or accidentally taking them right with coffee.',
    createdAtLabel: 'Sample discussion',
    helpfulCount: 11,
    isSample: true,
    replies: [
      {
        id: 'rep-4',
        author: 'Hannah · 28 (Sample)',
        content:
          'Using a daily reminder paired with my morning water bottle and asking my pharmacist directly about coffee spacing made it effortless.',
        createdAtLabel: 'Sample reply',
      },
    ],
  },
];

function loadCommunityPosts(): CommunityPost[] {
  if (typeof window === 'undefined') return SAMPLE_POSTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SAMPLE_POSTS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return SAMPLE_POSTS;
    return parsed;
  } catch {
    return SAMPLE_POSTS;
  }
}

export const SistersCommunityPanel: React.FC<SistersCommunityPanelProps> = ({
  onAskNomiToFactCheck,
}) => {
  const [posts, setPosts] = useState<CommunityPost[]>(() => loadCommunityPosts());
  const [selectedTopic, setSelectedTopic] = useState<'All' | CommunityTopic>('All');

  const [authorName, setAuthorName] = useState('');
  const [newTopic, setNewTopic] = useState<CommunityTopic>('Periods & Fatigue');
  const [newQuestion, setNewQuestion] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [showComposer, setShowComposer] = useState(false);

  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [expandedPostId, setExpandedPostId] = useState<string | null>('sister-1');

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    } catch {
      // Ignore storage quota errors
    }
  }, [posts]);

  const filteredPosts =
    selectedTopic === 'All'
      ? posts
      : posts.filter((p) => p.topic === selectedTopic);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    const q = newQuestion.trim();
    if (!q) return;

    const created: CommunityPost = {
      id: `post-${Date.now()}`,
      author: authorName.trim() || 'Sister (You)',
      topic: newTopic,
      question: q,
      details: newDetails.trim(),
      createdAtLabel: 'Just now',
      helpfulCount: 1,
      likedByMe: true,
      replies: [],
    };

    setPosts((prev) => [created, ...prev]);
    setExpandedPostId(created.id);
    setNewQuestion('');
    setNewDetails('');
    setShowComposer(false);
  };

  const handleToggleHelpful = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const nextLiked = !post.likedByMe;
        return {
          ...post,
          likedByMe: nextLiked,
          helpfulCount: Math.max(0, post.helpfulCount + (nextLiked ? 1 : -1)),
        };
      })
    );
  };

  const handleAddReply = (postId: string) => {
    const text = (replyDrafts[postId] || '').trim();
    if (!text) return;

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              replies: [
                ...post.replies,
                {
                  id: `reply-${Date.now()}`,
                  author: authorName.trim() || 'Sister (You)',
                  content: text,
                  createdAtLabel: 'Just now',
                },
              ],
            }
          : post
      )
    );
    setReplyDrafts((prev) => ({ ...prev, [postId]: '' }));
    setExpandedPostId(postId);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-5 pt-1 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-display text-[29px] leading-tight text-[#2B1810] font-normal tracking-[-0.015em]">
              Nomi Sisters
            </h1>
            <p className="text-[12.5px] leading-relaxed text-[#73635A] mt-0.5">
              Ask peers, share lived experiences, and fact-check questions with Nomi.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowComposer((prev) => !prev)}
            className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-[#2B1810] text-[#FAF5EF] text-xs font-medium inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>{showComposer ? 'Close' : 'Ask Sisters'}</span>
          </button>
        </div>

        {/* Topic Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-0.5">
          {(['All', ...TOPICS] as const).map((topic) => {
            const active = selectedTopic === topic;
            return (
              <button
                key={topic}
                type="button"
                onClick={() => setSelectedTopic(topic)}
                className={`min-h-[36px] px-3.5 py-1 rounded-full text-[11.5px] font-medium whitespace-nowrap cursor-pointer transition ${
                  active
                    ? 'bg-[#2B1810] text-[#FAF5EF] shadow-xs'
                    : 'bg-[#FBF7F2] text-[#5C4D44] border border-[#EAE2D8]'
                }`}
              >
                {topic}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Feed */}
      <div className="flex-1 px-5 py-2 space-y-3.5 overflow-y-auto min-h-0">
        {/* Peer Safety & Local Demo Notice */}
        <div className="rounded-2xl border border-[#E3D1DD] bg-[#F5EDF2]/80 px-3.5 py-2.5 text-[11px] text-[#4A2D3C] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Peer Community Space (Local Session):</strong> Stories shared here are peer
            perspectives, not medical advice. Tap <strong>Check with Nomi</strong> on any thread to
            compare with verified evidence.
          </p>
        </div>

        {/* Post Composer */}
        {showComposer && (
          <form
            onSubmit={handleCreatePost}
            className="rounded-[20px] border border-[#EAE2D8] bg-[#FBF7F2] p-4 space-y-3 text-xs shadow-xs"
          >
            <p className="font-display text-lg font-medium text-[#2B1810]">
              Ask the Sisters Community
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="sister-alias" className="block text-[11px] text-[#594C44] mb-1">
                  Display Name
                </label>
                <input
                  id="sister-alias"
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Sister (Anonymous)"
                  className="w-full min-h-[40px] rounded-xl border border-[#EAE2D8] bg-[#FAF5EF] px-3 text-xs text-[#2B1810]"
                />
              </div>
              <div>
                <label htmlFor="sister-topic" className="block text-[11px] text-[#594C44] mb-1">
                  Topic
                </label>
                <select
                  id="sister-topic"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value as CommunityTopic)}
                  className="w-full min-h-[40px] rounded-xl border border-[#EAE2D8] bg-[#FAF5EF] px-2.5 text-xs text-[#2B1810]"
                >
                  {TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="sister-question" className="block text-[11px] text-[#594C44] mb-1">
                Your Question
              </label>
              <input
                id="sister-question"
                type="text"
                required
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Ask other women about checkups, symptoms, or clinic prep..."
                className="w-full min-h-[42px] rounded-xl border border-[#EAE2D8] bg-[#FAF5EF] px-3 text-xs text-[#2B1810]"
              />
            </div>

            <div>
              <label htmlFor="sister-details" className="block text-[11px] text-[#594C44] mb-1">
                Context (optional, avoid sharing private contact info)
              </label>
              <textarea
                id="sister-details"
                rows={2}
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                placeholder="Share what you're wondering or preparing to ask your doctor..."
                className="w-full rounded-xl border border-[#EAE2D8] bg-[#FAF5EF] p-3 text-xs text-[#2B1810]"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] rounded-full bg-[#2B1810] text-[#FAF5EF] text-xs font-semibold cursor-pointer"
            >
              Post to Nomi Sisters
            </button>
          </form>
        )}

        {/* Community Threads */}
        {filteredPosts.map((post) => {
          const isExpanded = expandedPostId === post.id;
          return (
            <article
              key={post.id}
              className="rounded-[20px] border border-[#EAE2D8] bg-[#FBF7F2] p-4 space-y-2.5 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-semibold text-[#2B1810] truncate">
                    {post.author}
                  </span>
                  <span className="text-[10px] text-[#78665E]">· {post.createdAtLabel}</span>
                </div>
                <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-[#EFE4EB] text-[#4A2D3C] border border-[#E3D1DD]">
                  {post.topic}
                </span>
              </div>

              <h2 className="font-display text-[19px] font-medium text-[#2B1810] leading-snug">
                {post.question}
              </h2>

              {post.details && (
                <p className="text-[12.5px] text-[#594C44] leading-relaxed">{post.details}</p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#EAE2D8]/80">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleHelpful(post.id)}
                    aria-pressed={Boolean(post.likedByMe)}
                    className={`min-h-[36px] px-3 py-1 rounded-full text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer border transition ${
                      post.likedByMe
                        ? 'bg-[#F7EBE8] text-[#B3534B] border-[#F0DCD7]'
                        : 'bg-[#FAF5EF] text-[#5C4D44] border-[#EAE2D8]'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${post.likedByMe ? 'fill-current' : ''}`}
                    />
                    <span>{post.helpfulCount}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                    className="min-h-[36px] px-3 py-1 rounded-full bg-[#FAF5EF] border border-[#EAE2D8] text-[#5C4D44] text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>
                      {post.replies.length}{' '}
                      {post.replies.length === 1 ? 'Reply' : 'Replies'}
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onAskNomiToFactCheck(post.question)}
                  className="min-h-[36px] px-3 py-1 rounded-full bg-[#E9DEE4] hover:bg-[#DFCFD7] text-[#2B1810] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Check with Nomi</span>
                </button>
              </div>

              {isExpanded && (
                <div className="pt-2 space-y-2.5">
                  {post.replies.length > 0 ? (
                    <div className="space-y-2">
                      {post.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className="rounded-2xl bg-[#FAF5EF] border border-[#EAE2D8] p-3 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[#2B1810]">{reply.author}</span>
                            <span className="text-[10px] text-[#78665E]">
                              {reply.createdAtLabel}
                            </span>
                          </div>
                          <p className="text-[#594C44] leading-relaxed">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11.5px] text-[#78665E] italic">
                      No replies yet—be the first sister to share a supportive note.
                    </p>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddReply(post.id);
                    }}
                    className="flex items-center gap-2"
                  >
                    <label htmlFor={`reply-${post.id}`} className="sr-only">
                      Reply to {post.author}
                    </label>
                    <input
                      id={`reply-${post.id}`}
                      type="text"
                      value={replyDrafts[post.id] || ''}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [post.id]: e.target.value,
                        }))
                      }
                      placeholder="Write a supportive reply..."
                      className="flex-1 min-w-0 min-h-[40px] rounded-full border border-[#EAE2D8] bg-[#FAF5EF] px-3.5 text-xs text-[#2B1810] placeholder-[#8C7A70]"
                    />
                    <button
                      type="submit"
                      aria-label="Send reply"
                      className="min-w-[40px] min-h-[40px] rounded-full bg-[#2B1810] text-[#FAF5EF] flex items-center justify-center cursor-pointer shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
