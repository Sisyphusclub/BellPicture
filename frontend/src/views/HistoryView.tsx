import {
  Check,
  Copy,
  Download,
  Globe2,
  Grid2X2,
  Heart,
  List,
  Lock,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { useToast } from '@/components/common/ToastProvider';
import { ImageDetailModal } from '@/components/gallery/ImageDetailModal';
import { ImageGrid } from '@/components/gallery/ImageGrid';
import { EmptyStateArchive } from '@/components/premium/empty-states';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/icon-tooltip';
import { Input } from '@/components/ui/input';
import { SelectMenu } from '@/components/ui/select-menu';
import { useAuth } from '@/hooks/useAuth';
import { openAuthModal } from '@/hooks/useAuthModal';
import { useImageHistory } from '@/hooks/useImageHistory';
import { cn } from '@/lib/utils';
import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_COUNT,
  DEFAULT_IMAGE_RESOLUTION,
  type HistoryEntry,
} from '@/types/image';
import { downloadUrl } from '@/utils/download';
import { formatDateTime } from '@/utils/format';

type AssetSort = 'newest' | 'oldest' | 'prompt';
type DateFilter = 'all' | 'today' | 'week' | 'month';
type VisibilityFilter = 'all' | 'public' | 'private';
type AssetView = 'grid' | 'list';
type DeleteTarget = { kind: 'entry'; entry: HistoryEntry } | { kind: 'bulk'; ids: string[] };

const SORT_OPTIONS: readonly { value: AssetSort; label: string }[] = [
  { value: 'newest', label: '最新优先' },
  { value: 'oldest', label: '最早优先' },
  { value: 'prompt', label: '提示词排序' },
];
const DATE_OPTIONS: readonly { value: DateFilter; label: string }[] = [
  { value: 'all', label: '全部日期' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '最近 7 天' },
  { value: 'month', label: '最近 30 天' },
];
const VISIBILITY_OPTIONS: readonly { value: VisibilityFilter; label: string }[] = [
  { value: 'all', label: '全部可见性' },
  { value: 'public', label: '公开' },
  { value: 'private', label: '私有' },
];
const DEFAULT_COLLECTIONS = ['灵感库', '客户项目', '待筛选'] as const;

function matchesDate(createdAt: string, filter: DateFilter): boolean {
  if (filter === 'all') return true;
  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) return false;
  const now = new Date();
  if (filter === 'today') {
    const created = new Date(time);
    return created.toDateString() === now.toDateString();
  }
  const days = filter === 'week' ? 7 : 30;
  return time >= now.getTime() - days * 24 * 60 * 60 * 1000;
}

export function HistoryView() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const history = useImageHistory();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<AssetSort>('newest');
  const [date, setDate] = useState<DateFilter>('all');
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [collection, setCollection] = useState('all');
  const [view, setView] = useState<AssetView>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const [mutating, setMutating] = useState(false);
  const [collectionAssignment, setCollectionAssignment] = useState('choose');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const collections = useMemo(
    () => [
      ...new Set([
        ...DEFAULT_COLLECTIONS,
        ...history.records.flatMap((record) => (record.collection ? [record.collection] : [])),
      ]),
    ],
    [history.records],
  );
  const collectionOptions = useMemo(
    () => [
      { value: 'choose', label: '加入收藏集' },
      { value: 'none', label: '移出收藏集' },
      ...collections.map((value) => ({ value, label: value })),
    ],
    [collections],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('zh-CN');
    const items = history.entries.filter((entry) => {
      const record = entry.record;
      if (
        normalized &&
        !`${record.prompt} ${record.model} ${record.id} ${record.collection ?? ''}`
          .toLocaleLowerCase('zh-CN')
          .includes(normalized)
      ) {
        return false;
      }
      if (!matchesDate(record.createdAt, date)) return false;
      if (visibility === 'public' && !record.isPublic) return false;
      if (visibility === 'private' && record.isPublic) return false;
      if (favoritesOnly && !record.isFavorite) return false;
      if (collection === 'none' && record.collection) return false;
      if (collection !== 'all' && collection !== 'none' && record.collection !== collection) {
        return false;
      }
      return true;
    });
    return [...items].sort((a, b) => {
      if (sort === 'oldest') return a.record.createdAt.localeCompare(b.record.createdAt);
      if (sort === 'prompt') return a.record.prompt.localeCompare(b.record.prompt, 'zh-CN');
      return b.record.createdAt.localeCompare(a.record.createdAt);
    });
  }, [collection, date, favoritesOnly, history.entries, query, sort, visibility]);

  useEffect(() => {
    const available = new Set(history.records.map((record) => record.id));
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => available.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [history.records]);

  const updateEntry = async (
    entry: HistoryEntry,
    updates: { isFavorite?: boolean; isPublic?: boolean; collection?: string | null },
  ): Promise<void> => {
    setMutating(true);
    try {
      const record = await history.update(entry.record.id, updates);
      if (selected?.record.id === record.id) setSelected({ ...entry, record });
      notify('资产已更新。');
    } catch (error) {
      notify(error instanceof Error ? error.message : '资产更新失败。', 'error');
    } finally {
      setMutating(false);
    }
  };

  const removeEntry = async (entry: HistoryEntry): Promise<void> => {
    setMutating(true);
    try {
      await history.remove(entry.record.id);
      if (selected?.record.id === entry.record.id) setSelected(null);
      notify('图片已删除。');
      setDeleteTarget(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : '删除失败，请稍后重试。', 'error');
    } finally {
      setMutating(false);
    }
  };

  const copyPrompt = async (entry: HistoryEntry): Promise<void> => {
    try {
      await navigator.clipboard.writeText(entry.record.prompt);
      notify('提示词已复制。');
    } catch {
      notify('复制失败，请手动复制。', 'error');
    }
  };

  const reuse = (entry: HistoryEntry): void => {
    const params = new URLSearchParams({
      prompt: entry.record.prompt,
      aspect: entry.record.aspectRatio ?? DEFAULT_ASPECT_RATIO,
      count: String(entry.record.count ?? DEFAULT_COUNT),
      resolution: entry.record.resolution ?? DEFAULT_IMAGE_RESOLUTION,
      isPublic: String(entry.record.isPublic),
    });
    const referenceIds =
      entry.record.referenceIds ?? (entry.record.referenceId ? [entry.record.referenceId] : []);
    referenceIds.forEach((id) => params.append('referenceId', id));
    void navigate(`/generate?${params.toString()}`);
  };

  const toggleSelection = (entry: HistoryEntry): void => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(entry.record.id)) next.delete(entry.record.id);
      else next.add(entry.record.id);
      return next;
    });
  };

  const selectAll = (): void => {
    const ids = filtered.map((entry) => entry.record.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
    setSelectedIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const bulkDownload = async (): Promise<void> => {
    const selectedEntries = filtered.filter((entry) => selectedIds.has(entry.record.id));
    try {
      for (const entry of selectedEntries) {
        await downloadUrl(entry.imageUrl, entry.record.id);
      }
      notify(`已下载 ${selectedEntries.length} 张图片。`);
    } catch (error) {
      notify(error instanceof Error ? error.message : '批量下载失败。', 'error');
    }
  };

  const assignCollection = async (value: string): Promise<void> => {
    setCollectionAssignment(value);
    if (value === 'choose') return;
    setMutating(true);
    try {
      await history.updateMany([...selectedIds], { collection: value === 'none' ? null : value });
      notify(value === 'none' ? '已移出收藏集。' : `已加入“${value}”。`);
    } catch (error) {
      notify(error instanceof Error ? error.message : '收藏集更新失败。', 'error');
    } finally {
      setCollectionAssignment('choose');
      setMutating(false);
    }
  };

  const bulkDelete = async (ids: readonly string[]): Promise<void> => {
    setMutating(true);
    try {
      const removed = await history.removeMany([...ids]);
      setSelectedIds(new Set());
      if (selected && ids.includes(selected.record.id)) setSelected(null);
      notify(`已删除 ${removed} 张图片。`);
      setDeleteTarget(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : '批量删除失败。', 'error');
    } finally {
      setMutating(false);
    }
  };

  const confirmDeletion = async (): Promise<void> => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'bulk') await bulkDelete(deleteTarget.ids);
    else await removeEntry(deleteTarget.entry);
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((entry) => selectedIds.has(entry.record.id));

  return (
    <section className="workspace-page assets-page" data-view="assets" aria-label="个人资产">
      {authLoading ? (
        <div className="asset-auth-loading" role="status" aria-label="正在确认登录状态">
          <div className="asset-auth-loading__toolbar" aria-hidden="true">
            <span className="asset-auth-loading__search" />
            {Array.from({ length: 4 }, (_, index) => (
              <span className="asset-auth-loading__control" key={index} />
            ))}
          </div>
          <div className="asset-auth-loading__rail" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
          <div className="asset-loading" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        </div>
      ) : !isAuthenticated ? (
        <div className="auth-gate">
          <h2>登录后查看资产</h2>
          <Button type="button" onClick={() => openAuthModal()}>
            登录
          </Button>
        </div>
      ) : (
        <>
          <div className="asset-workbench__chrome">
            <div className="asset-commandbar">
              <div className="asset-commandbar__primary">
                <label className="search-field asset-search">
                  <Search aria-hidden="true" />
                  <span className="sr-only">搜索资产</span>
                  <Input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索提示词、模型或收藏集"
                  />
                </label>
                <span
                  className="asset-result-count"
                  aria-label={`当前显示 ${filtered.length} 项，共 ${history.entries.length} 项`}
                  aria-live="polite"
                >
                  <strong>{filtered.length}</strong>
                  <span> / {history.entries.length} 项</span>
                </span>
              </div>
              <div className="asset-commandbar__controls">
                <SelectMenu
                  label="日期筛选"
                  value={date}
                  options={DATE_OPTIONS}
                  onValueChange={setDate}
                />
                <SelectMenu
                  label="可见性筛选"
                  value={visibility}
                  options={VISIBILITY_OPTIONS}
                  onValueChange={setVisibility}
                />
                <SelectMenu
                  label="资产排序"
                  value={sort}
                  options={SORT_OPTIONS}
                  onValueChange={setSort}
                />
                <IconTooltip label="仅显示收藏资产">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn('icon-button', favoritesOnly && 'is-active')}
                    aria-label="仅显示收藏资产"
                    aria-pressed={favoritesOnly}
                    onClick={() => setFavoritesOnly((current) => !current)}
                  >
                    <Heart aria-hidden="true" />
                  </Button>
                </IconTooltip>
                <div className="view-switch" role="group" aria-label="资产视图">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="网格视图"
                    aria-pressed={view === 'grid'}
                    onClick={() => setView('grid')}
                  >
                    <Grid2X2 aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="列表视图"
                    aria-pressed={view === 'list'}
                    onClick={() => setView('list')}
                  >
                    <List aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>

            <nav className="collection-rail" aria-label="收藏集筛选">
              <span className="collection-rail__label">收藏集</span>
              <div className="collection-rail__items">
                {[
                  { id: 'all', label: '全部' },
                  { id: 'none', label: '未分类' },
                  ...collections.map((item) => ({ id: item, label: item })),
                ].map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    variant="ghost"
                    size="compact"
                    aria-pressed={collection === item.id}
                    onClick={() => setCollection(item.id)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </nav>

            {history.entries.length ? (
              <div className="asset-selection-slot">
                {selectedIds.size ? (
                  <div className="selection-bar" role="toolbar" aria-label="已选资产操作">
                    <strong>{selectedIds.size} 项</strong>
                    <Button
                      type="button"
                      variant="ghost"
                      size="compact"
                      aria-pressed={allFilteredSelected}
                      onClick={selectAll}
                    >
                      <Check aria-hidden="true" />
                      {allFilteredSelected ? '取消全选' : '全选结果'}
                    </Button>
                    <Button
                      type="button"
                      size="compact"
                      variant="secondary"
                      onClick={() => void bulkDownload()}
                    >
                      <Download aria-hidden="true" />
                      下载
                    </Button>
                    <SelectMenu
                      label="批量分配收藏集"
                      value={collectionAssignment}
                      options={collectionOptions}
                      disabled={mutating}
                      onValueChange={(value) => void assignCollection(value)}
                    />
                    <Button
                      type="button"
                      size="compact"
                      variant="danger"
                      disabled={mutating}
                      onClick={() => setDeleteTarget({ kind: 'bulk', ids: [...selectedIds] })}
                    >
                      <Trash2 aria-hidden="true" />
                      删除
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="compact"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <div className="asset-selection-idle">
                    <span>{filtered.length} 项结果</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="compact"
                      className="select-all-entry"
                      disabled={!filtered.length}
                      onClick={selectAll}
                    >
                      选择当前结果
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {history.hydrateError ? (
            <div className="inline-error" role="alert">
              <span>{history.hydrateError.message}</span>
              <Button
                type="button"
                variant="secondary"
                size="compact"
                disabled={history.isHydrating}
                onClick={() => void history.refresh()}
              >
                {history.isHydrating ? '重试中' : '重新加载'}
              </Button>
            </div>
          ) : null}

          <section
            className="asset-library"
            aria-label="个人资产列表"
            aria-busy={history.isHydrating}
          >
            {history.isHydrating && !history.entries.length ? (
              <div className="asset-loading" role="status" aria-label="正在同步资产">
                {Array.from({ length: 8 }, (_, index) => (
                  <span key={index} />
                ))}
              </div>
            ) : history.hydrateError && !history.entries.length ? null : !history.entries.length ? (
              <EmptyStateArchive onAction={() => void navigate('/generate')} />
            ) : !filtered.length ? (
              <div className="empty-state">
                <p>暂无符合条件的资产。</p>
              </div>
            ) : view === 'grid' ? (
              <ImageGrid
                entries={filtered}
                selectedIds={selectedIds}
                onSelect={setSelected}
                onToggleSelection={toggleSelection}
                onToggleFavorite={(entry) =>
                  void updateEntry(entry, { isFavorite: !entry.record.isFavorite })
                }
                onCopyPrompt={(entry) => void copyPrompt(entry)}
                onReuse={reuse}
                onDownload={(entry) => void downloadUrl(entry.imageUrl, entry.record.id)}
                onToggleVisibility={(entry) =>
                  void updateEntry(entry, { isPublic: !entry.record.isPublic })
                }
                onRemove={(entry) => setDeleteTarget({ kind: 'entry', entry })}
              />
            ) : (
              <div className="asset-list" role="table" aria-label="资产紧凑列表">
                <div className="asset-list__head" role="row">
                  <span role="columnheader">选择</span>
                  <span role="columnheader">图片</span>
                  <span role="columnheader">提示词</span>
                  <span role="columnheader">模型与尺寸</span>
                  <span role="columnheader">可见性</span>
                  <span role="columnheader">收藏集</span>
                  <span role="columnheader">时间</span>
                  <span role="columnheader">操作</span>
                </div>
                {filtered.map((entry) => (
                  <div className="asset-list__row" role="row" key={entry.record.id}>
                    <span role="cell" data-label="选择">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="asset-row-select"
                        aria-label={
                          selectedIds.has(entry.record.id)
                            ? `取消选择 ${entry.record.id}`
                            : `选择 ${entry.record.id}`
                        }
                        aria-pressed={selectedIds.has(entry.record.id)}
                        onClick={() => toggleSelection(entry)}
                      >
                        {selectedIds.has(entry.record.id) ? <Check aria-hidden="true" /> : null}
                      </Button>
                    </span>
                    <span role="cell" data-label="图片">
                      <Button
                        type="button"
                        variant="ghost"
                        className="asset-list__preview"
                        aria-label={`查看图片：${entry.record.prompt}`}
                        onClick={() => setSelected(entry)}
                      >
                        <img src={entry.imageUrl} alt="" loading="lazy" />
                      </Button>
                    </span>
                    <span role="cell" className="asset-list__prompt" data-label="提示词">
                      {entry.record.prompt}
                    </span>
                    <span role="cell" data-label="模型与尺寸">
                      {entry.record.model}
                      <small>
                        {entry.record.width} × {entry.record.height} ·{' '}
                        {entry.record.aspectRatio ?? '1:1'}
                      </small>
                    </span>
                    <span role="cell" className="asset-visibility" data-label="可见性">
                      {entry.record.isPublic ? (
                        <Globe2 aria-hidden="true" />
                      ) : (
                        <Lock aria-hidden="true" />
                      )}
                      {entry.record.isPublic ? '公开' : '私有'}
                    </span>
                    <span role="cell" data-label="收藏集">
                      {entry.record.collection ?? '未分类'}
                    </span>
                    <span role="cell" data-label="时间">
                      {formatDateTime(entry.record.createdAt)}
                    </span>
                    <span role="cell" className="asset-list__actions" data-label="操作">
                      <IconTooltip label={entry.record.isFavorite ? '取消收藏' : '收藏'}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={entry.record.isFavorite ? '取消收藏' : '收藏'}
                          onClick={() =>
                            void updateEntry(entry, { isFavorite: !entry.record.isFavorite })
                          }
                        >
                          <Heart
                            aria-hidden="true"
                            fill={entry.record.isFavorite ? 'currentColor' : 'none'}
                          />
                        </Button>
                      </IconTooltip>
                      <IconTooltip label="复制提示词">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="复制提示词"
                          onClick={() => void copyPrompt(entry)}
                        >
                          <Copy aria-hidden="true" />
                        </Button>
                      </IconTooltip>
                      <IconTooltip label="复用设置">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="复用设置"
                          onClick={() => reuse(entry)}
                        >
                          <RefreshCw aria-hidden="true" />
                        </Button>
                      </IconTooltip>
                      <IconTooltip label={entry.record.isPublic ? '设为私有' : '设为公开'}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={entry.record.isPublic ? '设为私有' : '设为公开'}
                          onClick={() =>
                            void updateEntry(entry, { isPublic: !entry.record.isPublic })
                          }
                        >
                          {entry.record.isPublic ? (
                            <Globe2 aria-hidden="true" />
                          ) : (
                            <Lock aria-hidden="true" />
                          )}
                        </Button>
                      </IconTooltip>
                      <IconTooltip label="下载图片">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="下载图片"
                          onClick={() => void downloadUrl(entry.imageUrl, entry.record.id)}
                        >
                          <Download aria-hidden="true" />
                        </Button>
                      </IconTooltip>
                      <IconTooltip label="删除图片">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="删除图片"
                          onClick={() => setDeleteTarget({ kind: 'entry', entry })}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </IconTooltip>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <ImageDetailModal
        entry={selected}
        canDelete
        isDeleting={mutating}
        onClose={() => setSelected(null)}
        onCopyPrompt={(entry) => void copyPrompt(entry)}
        onReuse={reuse}
        onToggleVisibility={(entry) =>
          void updateEntry(entry, { isPublic: !entry.record.isPublic })
        }
        onDelete={(entry) => {
          setSelected(null);
          setDeleteTarget({ kind: 'entry', entry });
        }}
      />
      <ConfirmActionModal
        id="asset-delete"
        open={deleteTarget !== null}
        title={deleteTarget?.kind === 'bulk' ? '删除所选图片' : '删除图片'}
        description={
          deleteTarget?.kind === 'bulk'
            ? `将永久删除所选的 ${deleteTarget.ids.length} 张图片。`
            : '将永久删除这张图片。'
        }
        confirmLabel={deleteTarget?.kind === 'bulk' ? '删除所选' : '删除图片'}
        isPending={mutating}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeletion}
      />
    </section>
  );
}
