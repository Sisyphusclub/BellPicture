import { ArrowUpRight, Copy, Heart, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useToast } from '@/components/common/ToastProvider';
import { MorphicCard, MorphicCardModal } from '@/components/premium/morphic-card-modal';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/icon-tooltip';
import { Input } from '@/components/ui/input';
import { SelectMenu } from '@/components/ui/select-menu';
import {
  CREATION_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type CreationTemplate,
} from '@/data/creationTemplates';
import { useTemplatePreferences } from '@/hooks/useTemplatePreferences';
import { cn } from '@/lib/utils';
import { ASPECT_RATIO_LABELS, IMAGE_RESOLUTION_LABELS } from '@/types/image';

type TemplateSort = 'featured' | 'recent' | 'title';

const CATEGORY_OPTIONS = TEMPLATE_CATEGORIES.map((value) => ({ value, label: value }));
const SORT_OPTIONS: readonly { value: TemplateSort; label: string }[] = [
  { value: 'featured', label: '精选排序' },
  { value: 'recent', label: '最近使用' },
  { value: 'title', label: '名称排序' },
];

function templateSearchParams(template: CreationTemplate): string {
  return new URLSearchParams({
    prompt: template.prompt,
    aspect: template.settings.aspectRatio,
    count: String(template.settings.count),
    resolution: template.settings.resolution,
    isPublic: String(template.settings.isPublic),
  }).toString();
}

export function TemplatesView() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { favoriteIds, recent, toggleFavorite, markUsed } = useTemplatePreferences();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof TEMPLATE_CATEGORIES)[number]>('全部');
  const [sort, setSort] = useState<TemplateSort>('featured');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selected, setSelected] = useState<CreationTemplate | null>(null);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
    const items = CREATION_TEMPLATES.filter((template) => {
      if (category !== '全部' && template.category !== category) return false;
      if (favoritesOnly && !favoriteIds.includes(template.id)) return false;
      return (
        !normalizedQuery ||
        `${template.title} ${template.category} ${template.prompt}`
          .toLocaleLowerCase('zh-CN')
          .includes(normalizedQuery)
      );
    });
    if (sort === 'recent') {
      return [...items].sort((a, b) => (recent[b.id] ?? '').localeCompare(recent[a.id] ?? ''));
    }
    if (sort === 'title') {
      return [...items].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
    }
    return items;
  }, [category, favoriteIds, favoritesOnly, query, recent, sort]);

  const copyPrompt = async (template: CreationTemplate): Promise<void> => {
    try {
      await navigator.clipboard.writeText(template.prompt);
      notify('提示词已复制。');
    } catch {
      notify('复制失败，请手动复制。', 'error');
    }
  };
  const applyTemplate = (template: CreationTemplate): void => {
    markUsed(template.id);
    void navigate(`/generate?${templateSearchParams(template)}`);
  };
  const closePreview = (): void => {
    setSelected(null);
  };

  return (
    <section className="workspace-page templates-page" data-view="templates" aria-label="创作模板">
      <div className="workspace-toolbar template-toolbar">
        <label className="search-field template-search">
          <Search aria-hidden="true" />
          <span className="sr-only">搜索创作模板</span>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索模板"
          />
        </label>
        <span className="toolbar-count" aria-live="polite">
          {filtered.length} 个模板
        </span>
        <SelectMenu
          label="模板分类"
          value={category}
          options={CATEGORY_OPTIONS}
          onValueChange={setCategory}
        />
        <SelectMenu label="模板排序" value={sort} options={SORT_OPTIONS} onValueChange={setSort} />
        <IconTooltip label="仅显示收藏模板">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('icon-button', favoritesOnly && 'is-active')}
            aria-label="仅显示收藏模板"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((current) => !current)}
          >
            <Heart aria-hidden="true" />
          </Button>
        </IconTooltip>
      </div>

      {filtered.length ? (
        <div className="template-gallery" aria-label="创作模板列表">
          {filtered.map((template, index) => {
            const favorite = favoriteIds.includes(template.id);
            const used = recent[template.id] !== undefined;
            return (
              <article
                className={cn('template-tile', index % 5 === 0 && 'template-tile--wide')}
                key={template.id}
              >
                <MorphicCard id={`template-${template.id}`} className="template-tile__morph">
                  <Button
                    type="button"
                    variant="ghost"
                    className="template-tile__preview"
                    aria-label={`预览模板：${template.title}`}
                    onClick={() => setSelected(template)}
                  >
                    <img src={template.imageUrl} alt={`${template.title}示例`} loading="lazy" />
                    <span className="template-tile__label">
                      <small>{used ? '最近使用' : template.category}</small>
                      <strong>{template.title}</strong>
                    </span>
                  </Button>
                </MorphicCard>
                <div className="template-tile__actions">
                  <IconTooltip label={favorite ? '取消收藏模板' : '收藏模板'}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={
                        favorite ? `取消收藏 ${template.title}` : `收藏 ${template.title}`
                      }
                      aria-pressed={favorite}
                      onClick={() => toggleFavorite(template.id)}
                    >
                      <Heart aria-hidden="true" fill={favorite ? 'currentColor' : 'none'} />
                    </Button>
                  </IconTooltip>
                  <IconTooltip label="使用模板">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`使用模板 ${template.title}`}
                      onClick={() => applyTemplate(template)}
                    >
                      <ArrowUpRight aria-hidden="true" />
                    </Button>
                  </IconTooltip>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state template-empty" role="status">
          <p>没有匹配的模板。</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setQuery('');
              setCategory('全部');
              setFavoritesOnly(false);
            }}
          >
            清除筛选
          </Button>
        </div>
      )}

      {selected ? (
        <MorphicCardModal
          id={`template-${selected.id}`}
          open
          onClose={closePreview}
          className="template-detail-modal"
        >
          <section
            className="template-detail"
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-detail-title"
          >
            <div className="template-detail__media">
              <img src={selected.imageUrl} alt={`${selected.title}示例`} />
            </div>
            <div className="template-detail__body">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="icon-button dialog__close"
                aria-label="关闭模板预览"
                onClick={closePreview}
              >
                <X aria-hidden="true" />
              </Button>
              <span>{selected.category}</span>
              <h2 id="template-detail-title">{selected.title}</h2>
              <p>{selected.prompt}</p>
              <dl className="template-settings">
                <div>
                  <dt>比例</dt>
                  <dd>{ASPECT_RATIO_LABELS[selected.settings.aspectRatio]}</dd>
                </div>
                <div>
                  <dt>数量</dt>
                  <dd>{selected.settings.count} 张</dd>
                </div>
                <div>
                  <dt>清晰度</dt>
                  <dd>{IMAGE_RESOLUTION_LABELS[selected.settings.resolution]}</dd>
                </div>
              </dl>
              <div className="detail-actions">
                <Button type="button" onClick={() => applyTemplate(selected)}>
                  使用模板
                  <ArrowUpRight aria-hidden="true" />
                </Button>
                <Button type="button" variant="secondary" onClick={() => void copyPrompt(selected)}>
                  <Copy aria-hidden="true" />
                  复制提示词
                </Button>
                <Button type="button" variant="ghost" onClick={() => toggleFavorite(selected.id)}>
                  <Heart
                    aria-hidden="true"
                    fill={favoriteIds.includes(selected.id) ? 'currentColor' : 'none'}
                  />
                  {favoriteIds.includes(selected.id) ? '取消收藏' : '收藏'}
                </Button>
              </div>
            </div>
          </section>
        </MorphicCardModal>
      ) : null}
    </section>
  );
}
