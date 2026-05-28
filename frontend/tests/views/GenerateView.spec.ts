import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { computed, readonly, ref, type ComputedRef } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GenerateImageOptions } from '@/composables/useImageGeneration';
import generateViewSource from '@/views/GenerateView.vue?raw';
import type { GroupedBatch } from '@/composables/useImageHistory';
import type { GeneratedBatchResult, HistoryEntry } from '@/types/image';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
}

interface GenerateViewHarness {
  wrapper: VueWrapper;
  generate: ReturnType<
    typeof vi.fn<(options: GenerateImageOptions) => Promise<GeneratedBatchResult>>
  >;
  addPublicGalleryRecord: ReturnType<
    typeof vi.fn<(record: HistoryEntry['record']) => HistoryEntry | null>
  >;
  removePublicGalleryRecordAsAdmin: ReturnType<typeof vi.fn<(id: string) => Promise<void>>>;
  downloadUrl: ReturnType<typeof vi.fn<(url: string, filename: string) => Promise<void>>>;
  routerPush: ReturnType<typeof vi.fn<(path: string) => void>>;
  resolveGeneration: () => void;
  resolveGenerationWithOptions: (overrides: { id: string; prompt?: string }) => void;
}

type GenerateViewMode = 'discover' | 'generate';

interface MockSelectedReferenceFile {
  id: string;
  file: File;
  previewUrl: string | null;
  validationMessage: string | null;
}

function createMatchMedia(matches: boolean): typeof window.matchMedia {
  return vi.fn((query: string): MediaQueryList => {
    const listeners = new Set<EventListenerOrEventListenerObject>();
    const legacyListeners = new Set<(this: MediaQueryList, ev: MediaQueryListEvent) => unknown>();
    const mediaQueryList: MediaQueryList = {
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn((event: string, listener: EventListenerOrEventListenerObject) => {
        if (event === 'change') listeners.add(listener);
      }),
      removeEventListener: vi.fn((event: string, listener: EventListenerOrEventListenerObject) => {
        if (event === 'change') listeners.delete(listener);
      }),
      addListener: vi.fn(
        (listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null) => {
          if (listener) legacyListeners.add(listener);
        },
      ),
      removeListener: vi.fn(
        (listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null) => {
          if (listener) legacyListeners.delete(listener);
        },
      ),
      dispatchEvent: vi.fn((event: Event) => {
        listeners.forEach((listener) => {
          if (typeof listener === 'function') listener.call(mediaQueryList, event);
          else listener.handleEvent(event);
        });
        legacyListeners.forEach((listener) => listener.call(mediaQueryList, event as MediaQueryListEvent));
        return true;
      }),
    };
    return mediaQueryList;
  });
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createHistoryEntry(
  id: string,
  prompt: string,
  isPublic: boolean,
  overrides: Partial<HistoryEntry['record']> = {},
): HistoryEntry {
  return {
    record: {
      id,
      batchId: `batch-${id}`,
      createdAt: '2026-05-14T09:00:00.000Z',
      prompt,
      model: 'gpt-image-2',
      aspectRatio: '1:1',
      width: 1024,
      height: 1024,
      isPublic,
      ...overrides,
    },
    imageUrl: `http://localhost:3000/api/outputs/${id}`,
  };
}

function getButtonByText(buttons: DOMWrapper<Element>[], text: string): DOMWrapper<Element> {
  const button = buttons.find((item) => item.text().includes(text));
  if (!button) throw new Error(`未找到 ${text} 按钮。`);
  return button;
}

function extractStyleRules(selector: string): string[] {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rulePattern = new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, 'g');
  return Array.from(generateViewSource.matchAll(rulePattern), (match) => match[1] ?? '');
}

function expectStyleDeclaration(rule: string, property: string, value: string): void {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  expect(rule).toMatch(new RegExp(`(?:^|[;\\s])${escapedProperty}\\s*:\\s*${escapedValue}\\s*;`));
}

function referenceFieldsFromOptions(
  options: GenerateImageOptions,
): Partial<HistoryEntry['record']> {
  const referenceIds = options.referenceIds ?? (options.referenceId ? [options.referenceId] : []);
  if (referenceIds.length > 0) {
    const firstReferenceId = referenceIds[0];
    return {
      ...(firstReferenceId !== undefined ? { referenceId: firstReferenceId } : {}),
      referenceIds,
    };
  }
  const referenceFiles = options.referenceFiles ?? (options.referenceFile ? [options.referenceFile] : []);
  if (referenceFiles.length > 0) {
    return {
      referenceId: 'uploaded-reference.png',
      referenceIds: referenceFiles.map((_file, index) => `uploaded-reference-${index + 1}.png`),
    };
  }
  return {};
}

function hasReferenceOptions(options: GenerateImageOptions): boolean {
  return Boolean(
    options.referenceFile ||
      options.referenceId ||
      (options.referenceFiles?.length ?? 0) > 0 ||
      (options.referenceIds?.length ?? 0) > 0,
  );
}

describe('GenerateView', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useRealTimers();
    window.matchMedia = createMatchMedia(false);
  });

  it('shows a visual-only streaming suggestion in the empty discover hero prompt', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { wrapper } = await mountGenerateView();

    const suggestion = wrapper.get('.prompt-showcase__suggestion');
    const textarea = wrapper.get('textarea[name="heroPrompt"]');
    const textareaElement = textarea.element as HTMLTextAreaElement;

    expect(suggestion.attributes('aria-hidden')).toBe('true');
    expect(suggestion.text()).toBe('一');
    expect(textareaElement.value).toBe('');
    expect(textarea.attributes('placeholder')).toBe('');

    await vi.advanceTimersByTimeAsync(180);
    await wrapper.vm.$nextTick();

    expect(wrapper.get('.prompt-showcase__suggestion').text()).toBe('一间');
    expect(textareaElement.value).toBe('');
  });

  it('hides the discover hero suggestion while focused or filled without mutating the prompt', async () => {
    const { wrapper } = await mountGenerateView();
    const textarea = wrapper.get('textarea[name="heroPrompt"]');
    const textareaElement = textarea.element as HTMLTextAreaElement;

    expect(wrapper.find('.prompt-showcase__suggestion').exists()).toBe(true);

    await textarea.trigger('focus');

    expect(wrapper.find('.prompt-showcase__suggestion').exists()).toBe(false);
    expect(textarea.attributes('placeholder')).toBe('请输入你的创意（按 Enter 发送，Shift+Enter 换行）');
    expect(textareaElement.value).toBe('');

    await textarea.setValue('我的真实提示词');
    await textarea.trigger('blur');

    expect(wrapper.find('.prompt-showcase__suggestion').exists()).toBe(false);
    expect(textareaElement.value).toBe('我的真实提示词');
  });

  it('uses a static hero suggestion for reduced-motion users', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    window.matchMedia = createMatchMedia(true);
    const { wrapper } = await mountGenerateView();

    expect(wrapper.get('.prompt-showcase__suggestion').text()).toBe(
      '一间清晨阳光洒入的复古书房，木质书桌上摆着咖啡、手稿与一束白色小花。',
    );
    expect(wrapper.find('.prompt-showcase__suggestion i').exists()).toBe(false);
  });

  it('does not apply the discover hero suggestion to the generate route dock composer', async () => {
    const { wrapper } = await mountGenerateView({ mode: 'generate' });

    expect(wrapper.find('.prompt-showcase__suggestion').exists()).toBe(false);
    expect(wrapper.get('textarea[name="prompt"]').attributes('placeholder')).toBe(
      '输入你想要生成的画面，也可直接粘贴图片',
    );
  });

  it('submitting a discover prompt switches to the generate route and opens the inline generation surface', async () => {
    const { wrapper, generate, routerPush } = await mountGenerateView();

    expect(wrapper.get('.canvas-hero__title').text()).toBe('Turn your idea into images');

    await wrapper.get('textarea[name="heroPrompt"]').setValue('生成一张猫猫照片');
    await wrapper.get('form.prompt-showcase').trigger('submit');

    expect(routerPush).toHaveBeenCalledWith('/generate');
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: '生成一张猫猫照片',
        model: 'gpt-image-2',
        count: 1,
      }),
    );
    expect(wrapper.classes()).toContain('studio--stage');
    expect(wrapper.find('.generation-placeholder').exists()).toBe(true);
    expect(wrapper.find('form.prompt-showcase--dock').exists()).toBe(true);
    expect(wrapper.find('form.composer-shell').exists()).toBe(false);
    expect(wrapper.text()).toContain('生成一张猫猫照片');
    expect(wrapper.text()).toContain('GPT-IMAGE-2');
    expect(wrapper.text()).toContain('生成中...');
  });

  it('renders historical generated batches as a vertical feed in the generate workspace', async () => {
    const olderEntry = createHistoryEntry('older.png', '上一轮的复古书房', false, {
      batchId: 'batch-older',
      createdAt: '2026-05-14T09:00:00.000Z',
    });
    const latestEntry = createHistoryEntry('latest.png', '最新完成的电影海报', true, {
      batchId: 'batch-latest',
      createdAt: '2026-05-15T09:00:00.000Z',
    });
    const { wrapper } = await mountGenerateView({
      mode: 'generate',
      entries: [latestEntry, olderEntry],
      batches: [
        {
          batchId: 'batch-latest',
          createdAt: '2026-05-15T09:00:00.000Z',
          prompt: '最新完成的电影海报',
          model: 'gpt-image-2',
          entries: [latestEntry],
        },
        {
          batchId: 'batch-older',
          createdAt: '2026-05-14T09:00:00.000Z',
          prompt: '上一轮的复古书房',
          model: 'gpt-image-2',
          entries: [olderEntry],
        },
      ],
    });

    const feedItems = wrapper.findAll('.generation-feed > .generation-item');
    const stageRules = extractStyleRules('.studio--stage');
    const stageRule = stageRules[0] ?? '';
    const narrowStageRule = stageRules[1] ?? '';
    const stageMainRule = extractStyleRules('.studio--stage .studio__main')[0] ?? '';
    const feedRule = extractStyleRules('.generation-feed')[0] ?? '';
    const itemRule = extractStyleRules('.generation-item')[0] ?? '';
    const visualRule = extractStyleRules('.generation-visual')[0] ?? '';
    const frameRule = extractStyleRules('.generated-figure__frame')[0] ?? '';

    expect(feedItems).toHaveLength(2);
    expectStyleDeclaration(stageRule, '--generation-card-width', '304px');
    expectStyleDeclaration(stageRule, '--generation-feed-align-offset', '8px');
    expectStyleDeclaration(narrowStageRule, '--generation-feed-align-offset', '0px');
    expectStyleDeclaration(stageMainRule, 'grid-column', '1 / -1');
    expectStyleDeclaration(feedRule, 'width', 'min(100%, var(--generation-card-width))');
    expect(feedRule).not.toMatch(/margin-left\s*:/);
    expectStyleDeclaration(feedRule, 'gap', '48px');
    expectStyleDeclaration(feedRule, 'transform', 'translateX(var(--generation-feed-align-offset))');
    expectStyleDeclaration(itemRule, 'align-items', 'stretch');
    expectStyleDeclaration(visualRule, 'justify-items', 'stretch');
    expectStyleDeclaration(frameRule, 'width', '100%');
    expect(feedItems[0]?.text()).toContain('最新完成的电影海报');
    expect(feedItems[0]?.text()).toContain('GPT-IMAGE-2 · 已保存 · 1 张图');
    expect(feedItems[1]?.text()).toContain('上一轮的复古书房');
    expect(wrapper.findAll('.generated-figure__frame img')).toHaveLength(2);
    expect(wrapper.text()).toContain('重新编辑');
    expect(wrapper.text()).toContain('再次生成');
    expect(wrapper.text()).toContain('保存');
  });

  it('omits the framed empty workspace card while preserving generate route context', async () => {
    const { wrapper } = await mountGenerateView({ mode: 'generate' });

    expect(wrapper.classes()).toContain('studio--stage');
    expect(wrapper.find('.canvas-hero').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'RecentCreationsMasonryStub' }).exists()).toBe(false);
    expect(wrapper.find('.generation-empty-card').exists()).toBe(false);
    expect(wrapper.find('.generation-visual').exists()).toBe(false);
    expect(wrapper.find('.generation-actions').exists()).toBe(false);
    expect(wrapper.find('form.prompt-showcase--dock').exists()).toBe(true);
    expect(wrapper.get('textarea[name="prompt"]').attributes('placeholder')).toBe(
      '输入你想要生成的画面，也可直接粘贴图片',
    );
    expect(wrapper.text()).toContain('生成工作区');
    expect(wrapper.text()).toContain('从下方输入框开始生成图片');
  });

  it('sends public visibility when the homepage public toggle is enabled', async () => {
    const { wrapper, generate } = await mountGenerateView();

    await wrapper.get('textarea[name="heroPrompt"]').setValue('公开到画廊');
    await wrapper.get('button.prompt-showcase__public').trigger('click');
    await wrapper.get('form.prompt-showcase').trigger('submit');

    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ isPublic: true }));
  });

  it('submits the selected homepage count', async () => {
    const { wrapper, generate } = await mountGenerateView();
    const homeComposer = wrapper.get('form.prompt-showcase');
    const stepper = homeComposer.get('.prompt-showcase__stepper');

    expect(stepper.text()).toContain('1 张');

    const increaseCountButton = stepper.get('button[aria-label="增加数量"]');
    await increaseCountButton.trigger('click');

    expect(stepper.text()).toContain('2 张');

    await homeComposer.get('textarea[name="heroPrompt"]').setValue('生成两张海报');
    await homeComposer.trigger('submit');

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: '生成两张海报',
        count: 2,
      }),
    );
  });

  it('submits the selected homepage aspect ratio', async () => {
    const { wrapper, generate } = await mountGenerateView();
    const homeComposer = wrapper.get('form.prompt-showcase');
    const aspectControl = homeComposer.get('.prompt-showcase__aspect');

    await aspectControl.get('button.prompt-showcase__smart').trigger('click');
    await getButtonByText(aspectControl.findAll('.prompt-showcase__menu button'), '2:3').trigger(
      'click',
    );

    expect(aspectControl.get('button.prompt-showcase__smart').text()).toContain('2:3（纵向）');

    await homeComposer.get('textarea[name="heroPrompt"]').setValue('生成竖版海报');
    await homeComposer.trigger('submit');

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: '生成竖版海报',
        aspectRatio: '2:3',
      }),
    );
  });

  it('passes public gallery entries from the public gallery store', async () => {
    const publicEntry = createHistoryEntry('public.png', '其他账号公开作品', true);
    const { wrapper } = await mountGenerateView({ galleryEntries: [publicEntry] });

    const gallery = wrapper.getComponent({ name: 'RecentCreationsMasonryStub' });
    expect(gallery.props('entries')).toEqual([publicEntry]);
    expect(gallery.props('canDelete')).toBe(false);
  });

  it('passes admin gallery delete controls and removes public entries as admin', async () => {
    const publicEntry = createHistoryEntry('public-admin.png', '需要下架的公开作品', true);
    const { wrapper, removePublicGalleryRecordAsAdmin } = await mountGenerateView({
      galleryEntries: [publicEntry],
      isAdmin: true,
    });

    const gallery = wrapper.getComponent({ name: 'RecentCreationsMasonryStub' });
    expect(gallery.props('canDelete')).toBe(true);

    await gallery.vm.$emit('delete', publicEntry);
    await flushPromises();

    expect(removePublicGalleryRecordAsAdmin).toHaveBeenCalledWith('public-admin.png');
  });

  it('starts a second generation from the dock composer generate button after a completed result', async () => {
    const { wrapper, generate, resolveGeneration } = await mountGenerateView();

    await wrapper.get('textarea[name="heroPrompt"]').setValue('生成一张猫猫照片');
    await wrapper.get('form.prompt-showcase').trigger('submit');
    await wrapper.setProps({ mode: 'generate' });
    resolveGeneration();
    await flushPromises();

    expect(wrapper.find('.generated-figure__frame img').exists()).toBe(true);

    const dockComposer = wrapper.get('form.prompt-showcase--dock');
    await dockComposer.get('textarea[name="prompt"]').setValue('生成一张赛博城市海报');

    const increaseCountButton = dockComposer
      .findAll('.prompt-showcase__stepper button')
      .find((button) => button.attributes('aria-label') === '增加数量');
    expect(increaseCountButton).toBeDefined();
    await increaseCountButton?.trigger('click');

    await dockComposer.get('button.prompt-showcase__generate').trigger('click');

    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: '生成一张赛博城市海报',
        model: 'gpt-image-2',
        count: 2,
      }),
    );
    expect(wrapper.find('.generation-placeholder').exists()).toBe(true);
    expect(wrapper.text()).toContain('生成中...');
  });

  it('sends public visibility when the dock public toggle is enabled', async () => {
    const { wrapper, generate, addPublicGalleryRecord, resolveGenerationWithOptions } =
      await mountGenerateView();

    await wrapper.get('textarea[name="heroPrompt"]').setValue('生成一张猫猫照片');
    await wrapper.get('form.prompt-showcase').trigger('submit');
    await wrapper.setProps({ mode: 'generate' });
    resolveGenerationWithOptions({ id: 'private-generated.png' });
    await flushPromises();

    const dockComposer = wrapper.get('form.prompt-showcase--dock');
    await dockComposer.get('textarea[name="prompt"]').setValue('公开的工作区作品');
    await dockComposer.get('button.prompt-showcase__public').trigger('click');
    await dockComposer.get('button.prompt-showcase__generate').trigger('click');
    resolveGenerationWithOptions({ id: 'public-generated.png' });
    await flushPromises();

    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: '公开的工作区作品',
        isPublic: true,
      }),
    );
    expect(addPublicGalleryRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: '公开的工作区作品',
        isPublic: true,
      }),
    );
  });

  it('preserves previous generated results above the dock composer after another generation completes', async () => {
    const { wrapper, resolveGenerationWithOptions } = await mountGenerateView();

    await wrapper.get('textarea[name="heroPrompt"]').setValue('第一轮生成的猫猫照片');
    await wrapper.get('form.prompt-showcase').trigger('submit');
    await wrapper.setProps({ mode: 'generate' });
    resolveGenerationWithOptions({ id: 'first.png' });
    await flushPromises();

    const dockComposer = wrapper.get('form.prompt-showcase--dock');
    await dockComposer.get('textarea[name="prompt"]').setValue('第二轮生成的赛博城市');
    await dockComposer.get('button.prompt-showcase__generate').trigger('click');
    resolveGenerationWithOptions({ id: 'second.png' });
    await flushPromises();

    const feedItems = wrapper.findAll('.generation-feed > .generation-item');

    expect(feedItems).toHaveLength(2);
    expect(feedItems[0]?.text()).toContain('第二轮生成的赛博城市');
    expect(feedItems[1]?.text()).toContain('第一轮生成的猫猫照片');
    expect(wrapper.findAll('.generated-figure__frame img')).toHaveLength(2);
  });

  it('submits the selected dock aspect ratio after a completed result', async () => {
    const { wrapper, generate, resolveGeneration } = await mountGenerateView();

    await wrapper.get('textarea[name="heroPrompt"]').setValue('生成一张猫猫照片');
    await wrapper.get('form.prompt-showcase').trigger('submit');
    await wrapper.setProps({ mode: 'generate' });
    resolveGeneration();
    await flushPromises();

    const dockComposer = wrapper.get('form.prompt-showcase--dock');
    const aspectControl = dockComposer.get('.prompt-showcase__aspect');

    await aspectControl.get('button.prompt-showcase__smart').trigger('click');
    await getButtonByText(aspectControl.findAll('.prompt-showcase__menu button'), '16:9').trigger(
      'click',
    );

    expect(aspectControl.get('button.prompt-showcase__smart').text()).toContain('16:9（宽屏）');

    await dockComposer.get('textarea[name="prompt"]').setValue('生成宽屏海报');
    await dockComposer.get('button.prompt-showcase__generate').trigger('click');

    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: '生成宽屏海报',
        model: 'gpt-image-2',
        aspectRatio: '16:9',
      }),
    );
  });

  it('keeps the full long result prompt available while rendering the compact prompt node', async () => {
    const { wrapper, resolveGeneration } = await mountGenerateView();
    const longPrompt =
      '一张电影感海报，包含雨夜城市、霓虹灯、反光地面、远处的红色伞、细腻人物表情、复杂背景层次、柔和景深、丰富材质细节，并保持整体构图优雅克制。';

    await wrapper.get('textarea[name="heroPrompt"]').setValue(longPrompt);
    await wrapper.get('form.prompt-showcase').trigger('submit');
    await wrapper.setProps({ mode: 'generate' });
    resolveGeneration();
    await flushPromises();

    const promptHeading = wrapper.get('.generation-item__prompt');
    expect(promptHeading.text()).toBe(longPrompt);
    expect(promptHeading.attributes('title')).toBe(longPrompt);
  });

  it('returns to the discover hero after a routed generation completes', async () => {
    const { wrapper, resolveGeneration } = await mountGenerateView();

    await wrapper.get('textarea[name="heroPrompt"]').setValue('生成一张猫猫照片');
    await wrapper.get('form.prompt-showcase').trigger('submit');
    expect(wrapper.find('form.prompt-showcase--dock').exists()).toBe(true);

    await wrapper.setProps({ mode: 'generate' });
    resolveGeneration();
    await flushPromises();

    expect(wrapper.find('.generated-figure__frame img').exists()).toBe(true);
    expect(wrapper.find('form.prompt-showcase--dock').exists()).toBe(true);

    await wrapper.setProps({ mode: 'discover' });

    expect(wrapper.find('.canvas-hero').exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'RecentCreationsMasonryStub' }).exists()).toBe(true);
    expect(wrapper.find('form.prompt-showcase--dock').exists()).toBe(false);
    expect(wrapper.text()).toContain('Turn your idea');
  });

  it('reveals result actions, saves the generated image, and regenerates the same prompt', async () => {
    const { wrapper, generate, downloadUrl, resolveGeneration } = await mountGenerateView();

    await wrapper.get('textarea[name="heroPrompt"]').setValue('生成一张猫猫照片');
    await wrapper.get('form.prompt-showcase').trigger('submit');
    await wrapper.setProps({ mode: 'generate' });
    resolveGeneration();
    await flushPromises();

    expect(wrapper.find('.generated-figure__frame img').exists()).toBe(true);
    expect(wrapper.text()).toContain('重新编辑');
    expect(wrapper.text()).toContain('再次生成');
    expect(wrapper.text()).toContain('保存');

    const saveButton = wrapper
      .findAll('button.generation-action')
      .find((button) => button.text().includes('保存'));
    expect(saveButton).toBeDefined();
    await saveButton?.trigger('click');
    expect(downloadUrl).toHaveBeenCalledWith(
      'http://localhost:3000/api/outputs/generated.png',
      'generated.png',
    );

    const regenerateButton = wrapper
      .findAll('button.generation-action')
      .find((button) => button.text().includes('再次生成'));
    expect(regenerateButton).toBeDefined();
    await regenerateButton?.trigger('click');

    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: '生成一张猫猫照片',
        model: 'gpt-image-2',
        count: 1,
      }),
    );
    expect(generate).toHaveBeenLastCalledWith(
      expect.not.objectContaining({
        referenceId: expect.any(String),
        referenceIds: expect.any(Array),
      }),
    );
  });

  it('preserves the saved reference id when regenerating an image-to-image batch', async () => {
    const referenceEntry = createHistoryEntry('reference-result.png', '照着参考图做一张海报', false, {
      batchId: 'batch-reference',
      referenceId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png',
    });
    const { wrapper, generate } = await mountGenerateView({
      mode: 'generate',
      entries: [referenceEntry],
      batches: [
        {
          batchId: 'batch-reference',
          createdAt: referenceEntry.record.createdAt,
          prompt: referenceEntry.record.prompt,
          model: referenceEntry.record.model,
          entries: [referenceEntry],
        },
      ],
    });

    expect(wrapper.text()).toContain('再次生成');

    const regenerateButton = wrapper
      .findAll('button.generation-action')
      .find((button) => button.text().includes('再次生成'));
    expect(regenerateButton).toBeDefined();
    await regenerateButton?.trigger('click');

    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: '照着参考图做一张海报',
        model: 'gpt-image-2',
        count: 1,
        referenceIds: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png'],
      }),
    );
    expect(generate).toHaveBeenLastCalledWith(
      expect.not.objectContaining({
        referenceFile: expect.any(File),
        referenceFiles: expect.any(Array),
      }),
    );
  });
});

async function mountGenerateView(
  options: {
    entries?: HistoryEntry[];
    galleryEntries?: HistoryEntry[];
    batches?: GroupedBatch[];
    mode?: GenerateViewMode;
    isAdmin?: boolean;
  } = {},
): Promise<GenerateViewHarness> {
  vi.resetModules();

  const entries = ref<HistoryEntry[]>(options.entries ?? []);
  const publicGalleryEntries = ref<HistoryEntry[]>(options.galleryEntries ?? []);
  const batchList = ref<GroupedBatch[]>(options.batches ?? []);
  const isAdmin = ref(options.isAdmin ?? false);
  const batches: ComputedRef<GroupedBatch[]> = computed(() => batchList.value);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const lastBatch = ref<GeneratedBatchResult | null>(null);
  const statusMessage = ref('正在根据提示词生成图片。');
  const generation = ref(createDeferred<GeneratedBatchResult>());
  const lastOptions = ref<GenerateImageOptions | null>(null);

  const generate = vi.fn<(options: GenerateImageOptions) => Promise<GeneratedBatchResult>>(
    (options) => {
      lastOptions.value = options;
      isLoading.value = true;
      error.value = null;
      statusMessage.value = '正在根据提示词生成图片。';
      return generation.value.promise
        .then((result) => {
          lastBatch.value = result;
          return result;
        })
        .finally(() => {
          isLoading.value = false;
        });
    },
  );

  function createResult(overrides: { id: string; prompt?: string } = { id: 'generated.png' }): GeneratedBatchResult {
    const options = lastOptions.value;
    if (!options) throw new Error('测试未提交生成请求。');
    const createdAt = new Date(Date.UTC(2026, 4, 14, 9, batchList.value.length)).toISOString();
    const entry: HistoryEntry = {
      record: {
        id: overrides.id,
        batchId: `batch-${overrides.id}`,
        createdAt,
        prompt: overrides.prompt ?? options.prompt,
        model: options.model ?? 'gpt-image-2',
        aspectRatio: options.aspectRatio ?? '1:1',
        width: 1024,
        height: 1024,
        isPublic: options.isPublic ?? false,
        ...referenceFieldsFromOptions(options),
      },
      imageUrl: `http://localhost:3000/api/outputs/${overrides.id}`,
    };
    entries.value = [entry, ...entries.value.filter((item) => item.record.id !== entry.record.id)];
    batchList.value = [
      {
        batchId: entry.record.batchId ?? entry.record.id,
        createdAt,
        prompt: entry.record.prompt,
        model: entry.record.model,
        entries: [entry],
      },
      ...batchList.value.filter((batch) => batch.batchId !== (entry.record.batchId ?? entry.record.id)),
    ];
    return {
      batchId: entry.record.batchId ?? entry.record.id,
      aspectRatio: options.aspectRatio ?? '1:1',
      generationMode: hasReferenceOptions(options) ? 'image-to-image' : 'text-to-image',
      entries: [entry],
    };
  }

  function resolveGeneration(): void {
    generation.value.resolve(createResult());
    generation.value = createDeferred<GeneratedBatchResult>();
  }

  function resolveGenerationWithOptions(overrides: { id: string; prompt?: string }): void {
    generation.value.resolve(createResult(overrides));
    generation.value = createDeferred<GeneratedBatchResult>();
  }

  const refreshQuota = vi.fn<() => Promise<void>>(() => Promise.resolve());
  const removeBatch = vi.fn<(batchId: string) => Promise<void>>(() => Promise.resolve());
  const addPublicGalleryRecord = vi.fn<(record: HistoryEntry['record']) => HistoryEntry | null>(
    (record) => {
      if (!record.isPublic) return null;
      const entry = {
        record,
        imageUrl: `http://localhost:3000/api/outputs/${record.id}`,
      };
      publicGalleryEntries.value = [
        entry,
        ...publicGalleryEntries.value.filter((item) => item.record.id !== record.id),
      ];
      return entry;
    },
  );
  const removePublicGalleryRecordAsAdmin = vi.fn<(id: string) => Promise<void>>((id) => {
    publicGalleryEntries.value = publicGalleryEntries.value.filter(
      (entry) => entry.record.id !== id,
    );
    return Promise.resolve();
  });
  const downloadUrl = vi.fn<(url: string, filename: string) => Promise<void>>(() =>
    Promise.resolve(),
  );
  const routerPush = vi.fn<(path: string) => void>();
  const clearLastBatch = vi.fn(() => {
    lastBatch.value = null;
  });

  vi.doMock('element-plus', () => ({
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }));

  vi.doMock('vue-router', () => ({
    useRoute: () => ({ query: {} }),
    useRouter: () => ({ push: routerPush }),
  }));

  vi.doMock('@/components/gallery/RecentCreationsMasonry.vue', () => ({
    default: {
      name: 'RecentCreationsMasonryStub',
      props: {
        entries: {
          type: Array,
          required: true,
        },
        canDelete: {
          type: Boolean,
          default: false,
        },
        deletingId: {
          type: String,
          default: null,
        },
      },
      template: '<div data-testid="recent-creations" />',
    },
  }));

  vi.doMock('@/components/gallery/RecentCreationDetailModal.vue', () => ({
    default: {
      name: 'RecentCreationDetailModalStub',
      props: {
        entry: {
          type: Object,
          default: null,
        },
        canDelete: {
          type: Boolean,
          default: false,
        },
        isDeleting: {
          type: Boolean,
          default: false,
        },
      },
      template: '<div />',
    },
  }));

  vi.doMock('@/composables/useImageHistory', () => ({
    useImageHistory: () => ({
      entries,
      batches,
      removeBatch,
    }),
  }));

  vi.doMock('@/composables/usePublicGallery', () => ({
    usePublicGallery: () => ({
      entries: publicGalleryEntries,
      add: addPublicGalleryRecord,
      removeAsAdmin: removePublicGalleryRecordAsAdmin,
    }),
  }));

  vi.doMock('@/composables/useAuth', () => ({
    useAuth: () => ({
      isAdmin,
    }),
  }));

  vi.doMock('@/composables/useFileUpload', () => {
    const selectedFiles = ref<MockSelectedReferenceFile[]>([]);
    return {
      useFileUpload: () => ({
        selectedFiles: readonly(selectedFiles),
        replaceFiles: vi.fn((files: readonly File[]) => {
          selectedFiles.value = files.map((file, index) => ({
            id: `reference-${index + 1}`,
            file,
            previewUrl: file.type.startsWith('image/') ? `blob:reference-${index + 1}` : null,
            validationMessage: null,
          }));
          return {
            added: selectedFiles.value.length,
            skipped: 0,
            selected: selectedFiles.value,
          };
        }),
        clear: vi.fn(() => {
          selectedFiles.value = [];
        }),
      }),
    };
  });

  vi.doMock('@/composables/useImageQuota', () => ({
    useImageQuota: () => ({
      quota: readonly(ref({ total: 20, remaining: 20 })),
      isLoading: readonly(ref(false)),
      refresh: refreshQuota,
    }),
  }));

  vi.doMock('@/composables/useImageGeneration', () => ({
    useImageGeneration: () => ({
      generate,
      isLoading: readonly(isLoading),
      error: readonly(error),
      lastBatch: readonly(lastBatch),
      statusMessage: readonly(statusMessage),
      clearLastBatch,
    }),
  }));

  vi.doMock('@/utils/download', () => ({
    downloadUrl,
  }));

  const GenerateView = (await import('@/views/GenerateView.vue')).default;
  const wrapper = mount(GenerateView, {
    props: {
      mode: options.mode ?? 'discover',
    },
  });

  return {
    wrapper,
    generate,
    addPublicGalleryRecord,
    removePublicGalleryRecordAsAdmin,
    downloadUrl,
    routerPush,
    resolveGeneration,
    resolveGenerationWithOptions,
  };
}
