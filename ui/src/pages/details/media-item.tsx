import { useSignal } from '@preact/signals';
import { Signal } from '@preact/signals';
import type { JSX } from 'preact';
import { Loader2, Pencil, Trash } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { motion } from 'framer-motion';
import { PostDTO, PostFileDTO } from '@web-archive/shared';
import { EmptyAudio, EmptyVideo } from '../../components/EmptyAsset';
import { LazyImage } from '../../components/LazyImage';
import { useAsyncResource } from '../../components/Layouts/AsyncResource';
import { useToaster, type FailureTracker } from '@/context/toast.context';
import * as PostService from '../../services/post.service';

type DeletionState = 'idle' | 'deleting' | 'error';

type MediaItemProps = {
  file: PostFileDTO;
  post: Signal<PostDTO | undefined>;
  fileCount: number;
  onReplace: (file: PostFileDTO) => void;
};

export function MediaItem({ file, post, fileCount, onReplace }: MediaItemProps) {
  const { createToastTracker } = useToaster();
  const deletionState = useSignal<DeletionState>('idle');
  const activeFailureTracker = useRef<FailureTracker | null>(null);

  const TextLoader = useAsyncResource();
  const textValue = useSignal('');

  useEffect(() => {
    if (!file.mime.startsWith('text')) return;
    TextLoader.execute<string>(
      fetch(file.links.media)
        .then(res => res.text())
        .then(text => (textValue.value = text))
    );
  });

  const handleDelete = async () => {
    const isRetry = deletionState.value === 'error' && activeFailureTracker.current;

    const tracker = isRetry
      ? activeFailureTracker.current!.retry()
      : createToastTracker(`Deleting ${file.original_filename}...`);

    activeFailureTracker.current = null;
    deletionState.value = 'deleting';

    try {
      await PostService.deleteFileFromPost(file.links.self);
      post.value = {
        ...post.value!,
        files: (post.value!.files ?? []).filter(f => f.links.self !== file.links.self),
      };
      tracker.success(`${file.original_filename} deleted`);
    } catch {
      activeFailureTracker.current = tracker.failure(
        `Failed to delete ${file.original_filename}`,
        handleDelete
      );
      deletionState.value = 'error';
    }
  };

  const isDeleting = deletionState.value === 'deleting';

  let commonClasses = 'md:max-h-72';
  if (fileCount < 2) {
    commonClasses += ' col-span-3 m-auto';
  }

  const wrapperClass = `grid grid-cols-3 gap-1 ${fileCount < 2 ? 'col-span-3' : ''}`;

  const mediaActions = (
    <div className="flex gap-1 justify-end col-span-3">
      <button
        title="Replace file"
        className="rounded-full hover:bg-stone-400 p-1"
        onClick={() => onReplace(file)}
      >
        <Pencil className="w-5 h-5" />
      </button>
      {isDeleting ? (
        <div className="p-1">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <button
          title="Delete file"
          className="rounded-full hover:bg-stone-400 p-1"
          onClick={handleDelete}
        >
          <Trash className="w-5 h-5" />
        </button>
      )}
    </div>
  );

  let mediaContent: JSX.Element | null = null;

  if (file.mime.startsWith('image')) {
    mediaContent = (
      <LazyImage
        src={file.links.media}
        placeholder={file.placeholder}
        width={file.width}
        height={file.height}
        alt={file.original_filename}
        className={`col-span-3 ${commonClasses}`}
      />
    );
  } else if (file.mime.startsWith('video')) {
    mediaContent = file.size > 0
      ? (
        <video
          src={file.links.media}
          poster={file.placeholder || undefined}
          loop
          controls
          className={`col-span-3 ${commonClasses}`}
        />
      )
      : <EmptyVideo className={`col-span-3 ${commonClasses}`} />;
  } else if (file.mime.startsWith('audio')) {
    mediaContent = (
      <div className="col-span-3 flex flex-col gap-1">
        <p className="text-sm truncate" title={file.original_filename}>{file.original_filename}</p>
        {file.size > 0
          ? <audio src={file.links.media} controls className="w-full" />
          : <EmptyAudio className="w-full h-12" />
        }
      </div>
    );
  } else if (file.mime.startsWith('text')) {
    mediaContent = (
      <TextLoader.Provider>
        <pre className="whitespace-pre-wrap p-2 overflow-hidden col-span-3">{textValue}</pre>
      </TextLoader.Provider>
    );
  }

  return (
    <motion.div
      layout
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      style={{ opacity: isDeleting ? 0.5 : 1 }}
      className={wrapperClass}
    >
      {mediaContent}
      {mediaActions}
    </motion.div>
  );
}
