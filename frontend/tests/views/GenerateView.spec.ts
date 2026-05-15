import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { computed, readonly, ref, type ComputedRef } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GenerateImageOptions } from '@/composables/useImageGeneration';
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
  downloadUrl: ReturnType<typeof vi.fn<(url: string, filename: string) => Promise<void>>>;
  resolveGeneration: () => void;
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

function createHistoryEntry(id: string, prompt: string, isPublic: boolean): HistoryEntry {
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
    },
    imageUrl: `http://localhost:3000/api/outputs/${id}`,
  };
}

describe('GenerateView', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('submitting a prompt immediately opens the inline generation surface', async () => {
    const { wrapper, generate } = await mountGenerateView();

    expect(wrapper.get('.canvas-hero__title').text()).toBe('Turn your idea into images');

    await wrapper.get('textarea[name="heroPrompt"]').setValue('生成一张猫猫照片');
    await wrapper.get('form.prompt-showcase').trigger('submit');

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

  it('passes only public entries to the homepage gallery', async () => {
    const publicEntry = createHistoryEntry('public.png', '公开作品', true);
    const privateEntry = createHistoryEntry('private.png', '私密作品', false);
    const { wrapper } = await mountGenerateView({ entries: [publicEntry, privateEntry] });

    const gallery = wrapper.getComponent({ name: 'RecentCreationsMasonryStub' });
    expect(gallery.props('entries')).toEqual([publicEntry]);
  });

  it('starts a second generation from the dock composer generate button after a completed result', async () => {
    const { wrapper, generate, resolveGeneration } = await mountGenerateView();

    await wrapper.get('textarea[name="heroPrompt"]').setValue('生成一张猫猫照片');
    await wrapper.get('form.prompt-showcase').trigger('submit');
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

  it('reveals result actions, saves the generated image, and regenerates the same prompt', async () => {
    const { wrapper, generate, downloadUrl, resolveGeneration } = await mountGenerateView();

    await wrapper.get('textarea[name="heroPrompt"]').setValue('生成一张猫猫照片');
    await wrapper.get('form.prompt-showcase').trigger('submit');
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
  });
});

async function mountGenerateView(
  options: { entries?: HistoryEntry[] } = {},
): Promise<GenerateViewHarness> {
  vi.resetModules();

  const entries = ref<HistoryEntry[]>(options.entries ?? []);
  const batchList = ref<GroupedBatch[]>([]);
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

  function createResult(): GeneratedBatchResult {
    const options = lastOptions.value;
    if (!options) throw new Error('测试未提交生成请求。');
    const createdAt = '2026-05-14T09:00:00.000Z';
    const entry: HistoryEntry = {
      record: {
        id: 'generated.png',
        batchId: 'batch-1',
        createdAt,
        prompt: options.prompt,
        model: options.model ?? 'gpt-image-2',
        aspectRatio: options.aspectRatio ?? '1:1',
        width: 1024,
        height: 1024,
        isPublic: options.isPublic ?? false,
      },
      imageUrl: 'http://localhost:3000/api/outputs/generated.png',
    };
    entries.value = [entry];
    batchList.value = [
      {
        batchId: 'batch-1',
        createdAt,
        prompt: options.prompt,
        model: options.model ?? 'gpt-image-2',
        entries: [entry],
      },
    ];
    return {
      batchId: 'batch-1',
      aspectRatio: options.aspectRatio ?? '1:1',
      generationMode: options.referenceFile ? 'image-to-image' : 'text-to-image',
      entries: [entry],
    };
  }

  function resolveGeneration(): void {
    generation.value.resolve(createResult());
    generation.value = createDeferred<GeneratedBatchResult>();
  }

  const refreshQuota = vi.fn<() => Promise<void>>(() => Promise.resolve());
  const removeBatch = vi.fn<(batchId: string) => Promise<void>>(() => Promise.resolve());
  const downloadUrl = vi.fn<(url: string, filename: string) => Promise<void>>(() =>
    Promise.resolve(),
  );
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
    useRouter: () => ({ push: vi.fn() }),
  }));

  vi.doMock('@/components/gallery/RecentCreationsMasonry.vue', () => ({
    default: {
      name: 'RecentCreationsMasonryStub',
      props: {
        entries: {
          type: Array,
          required: true,
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

  vi.doMock('@/composables/useFileUpload', () => ({
    useFileUpload: () => ({
      selectedFile: ref<File | null>(null),
      previewUrl: ref<string | null>(null),
      validationMessage: ref<string | null>(null),
      selectFile: vi.fn<(file: File) => void>(),
      clear: vi.fn<() => void>(),
    }),
  }));

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
  const wrapper = mount(GenerateView);

  return {
    wrapper,
    generate,
    downloadUrl,
    resolveGeneration,
  };
}
