import { useSignal, useSignalEffect } from "@preact/signals";
import { Modal } from "@tkottke90/preact-components";
import { Pencil, Plus, Trash, X } from "lucide-preact";
import { useEffect } from "preact/hooks";
import { EmptyVideo } from "../../components/EmptyAsset";
import { useAsyncResource } from "../../components/Layouts/AsyncResource";
import { Card } from "../../components/Layouts/Card";
import { CustomComponent, getPortalContainer } from "../../utilities/component.utils";
import { returnFileSize } from "../../utilities/number.utils";
import { useDetailsPageContext } from "./context";
import * as PostService from '../../services/post.service';
import { PostFileDTO } from "../../../../server/src/dto/post-file.dto";

const portal = getPortalContainer("modals");

export function MediaCard({ className }: CustomComponent) {
  const { post } = useDetailsPageContext();
  const showAddModal = useSignal(false);
  const showReplaceModal = useSignal(false);
  const fileQueue = useSignal<File[]>([]);
  const uploadUrl = useSignal("");
  const uploadError = useSignal<string>("");
  const isUploading = useSignal(false);
  const replaceQueue = useSignal<File[]>([]);
  const editingFile = useSignal<PostFileDTO | undefined>(undefined);

  const TextLoader = useAsyncResource();


  useSignalEffect(() => {
    if (!showAddModal.value) {
      fileQueue.value = [];
      uploadUrl.value = "";
      uploadError.value = "";
    }
  });

  useSignalEffect(() => {
    if (!showReplaceModal.value) {
      editingFile.value = undefined;
      replaceQueue.value = [];
    }
  });

  return (
    <Card className={`col-span-4 md:col-span-2 ${className}`}>
      <div className="flex justify-between">
        <h4>Media</h4>
        <div>
          <button className="rounded-full hover:bg-stone-400 p-2" onClick={() => showAddModal.value = true}>
            <Plus className="w-6 h-6 cursor-pointer hover:brightness-150" />
          </button>
        </div>
      </div>
      <br />
      {!post.value?.files?.length && <p>No Media</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 auto-rows-min gap-2">
        {post.value?.files?.map((file, i, fileList) => {
          let commonClasses = "md:max-h-72";

          if (fileList.length < 2) {
            commonClasses += " col-span-3 m-auto";
          }

          const wrapperClass = `grid grid-cols-3 gap-1 ${fileList.length < 2 ? 'col-span-3' : ''}`;

          const mediaActions = (
            <div className="flex gap-1 justify-end col-span-3">
              <button
                title="Replace file"
                className="rounded-full hover:bg-stone-400 p-1"
                onClick={() => {
                  editingFile.value = file;
                  showReplaceModal.value = true;
                }}
              >
                <Pencil className="w-5 h-5" />
              </button>
              <button
                title="Delete file"
                className="rounded-full hover:bg-stone-400 p-1"
                onClick={async () => {
                  try {
                    await PostService.deleteFileFromPost(post, file.links.self);
                  } catch (err) {
                    console.error('Failed to delete file:', err);
                  }
                }}
              >
                <Trash className="w-5 h-5" />
              </button>
            </div>
          );

          if (file.mime.startsWith("image")) {
            return (
              <div key={`details-media-img-${i}`} className={wrapperClass}>
                <img src={file.links.media} className={`col-span-3 ${commonClasses}`} />
                {mediaActions}
              </div>
            );
          }

          if (file.mime.startsWith("video")) {
            return (
              <div key={`details-media-vid-${i}`} className={wrapperClass}>
                {file.size > 0
                  ? <video src={file.links.media} loop controls className={`col-span-3 ${commonClasses}`} />
                  : <EmptyVideo className={`col-span-3 ${commonClasses}`} />
                }
                {mediaActions}
              </div>
            );
          }

          if (file.mime.startsWith('text')) {
            const key = `details-media-text-${i}`;
            const textValue = useSignal('');

            useEffect(() => {
              TextLoader.execute<string>(fetch(file.links.media)
                .then(async res => textValue.value = await res.text()))
            });

            return (
              <div key={key} className={wrapperClass}>
                <TextLoader.Provider>
                  <pre className="whitespace-pre-wrap p-2 overflow-hidden col-span-3" >{ textValue }</pre>
                </TextLoader.Provider>
                {mediaActions}
              </div>
            )
          }
        })}
      </div>
      <Modal portal={portal} show={showAddModal} className="p-4">
        <h3>Upload File</h3>
        <br />
        <label
          htmlFor="file-input"
          className="flex flex-col justify-center items-center min-w-[500px] min-h-40 border-dashed border-2 border-slate-500 rounded relative cursor-pointer transition-transform"
          onDragEnter={e => {
            e.preventDefault();
            const target = e.target as HTMLInputElement;

            target.classList.add('scale-[1.02]');
          }}
          onDragLeave={e => {
            e.preventDefault();
            const target = e.target as HTMLInputElement;

            target.classList.remove('scale-[1.02]');
          }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();

            if (e.dataTransfer?.files) {
              const { files } = e.dataTransfer;

              fileQueue.value = [...fileQueue.value, ...files];
            } else {
              console.group('missingFiles');
              console.warn('No Files');
              console.dir(e.dataTransfer);
              console.groupEnd();
            }
          }}
        >
          <p className={["z-40 absolute text-4xl transition-opacity", fileQueue.value.length === 0 ? 'opacity-50' : 'opacity-5'].join(' ')}>Click to Upload or Drag a File</p>
          <div className="z-50 w-[90%]">
            {fileQueue.value.length > 0 && fileQueue.value.map((file, index) => (
              <div className="flex justify-between w-full">
                <p>{file.name}</p>
                <p>{returnFileSize(file.size)}</p>
                <X
                  onClick={(e) => {
                    e.preventDefault();

                    const newQueue = [...fileQueue.value];
                    newQueue.splice(index, 1);

                    fileQueue.value = newQueue;
                  }}
                  className="w-[24px] h-[24px]"
                />
              </div>
            ))}
          </div>
          <input multiple onChange={(e) => {
            const input = e.target as HTMLInputElement;

            if (input.files) {
              fileQueue.value = [...fileQueue.value, ...input.files];
            }
          }} id="file-input" type="file" className="hidden" />
        </label>
        <br />
        <label className="flex flex-col gap-1">
          <span>Or Upload from URL</span>
          <input
            type="url"
            value={uploadUrl.value}
            placeholder="https://..."
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              uploadUrl.value = target.value;
            }}
            className="p-2 rounded bg-slate-700 border border-slate-500"
          />
        </label>
        <br />
        {uploadError.value && (
          <div className="w-full border-red-600 bg-red-200 text-red-600 rounded p-4 mt-2">
            <p>{uploadError.value}</p>
          </div>
        )}
        <div className="actions">
          <button onClick={async () => {
            const { value } = fileQueue;
            const targetUrl = uploadUrl.value.trim();
            if (value.length === 0 && !targetUrl) return;
            isUploading.value = true;
            uploadError.value = "";
            try {
              if (value.length > 0) {
                await PostService.uploadFilesToPost(post, value);
              }

              if (targetUrl) {
                await PostService.uploadFileUrlToPost(post, targetUrl);
              }

              showAddModal.value = false;
            } catch (err: any) {
              uploadError.value = err?.data?.message ?? err?.message ?? 'Upload failed. Please try again.';
              console.error('Failed to upload files:', err);
            } finally {
              isUploading.value = false;
            }
          }} disabled={isUploading.value} className="primary">Upload</button>
        </div>
      </Modal>
      <Modal portal={portal} show={showReplaceModal} className="p-4">
        <h3>Replace File</h3>
        {editingFile.value && <p className="text-sm text-gray-500">{editingFile.value.original_filename}</p>}
        <br />
        <label
          htmlFor="replace-file-input"
          className="flex flex-col justify-center items-center min-w-[500px] min-h-40 border-dashed border-2 border-slate-500 rounded relative cursor-pointer transition-transform"
          onDragEnter={e => {
            e.preventDefault();
            const target = e.target as HTMLInputElement;
            target.classList.add('scale-[1.02]');
          }}
          onDragLeave={e => {
            e.preventDefault();
            const target = e.target as HTMLInputElement;
            target.classList.remove('scale-[1.02]');
          }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            if (e.dataTransfer?.files?.length) {
              replaceQueue.value = [e.dataTransfer.files[0]];
            }
          }}
        >
          <p className={["z-40 absolute text-4xl transition-opacity", replaceQueue.value.length === 0 ? 'opacity-50' : 'opacity-5'].join(' ')}>Click to Upload or Drag a File</p>
          <div className="z-50 w-[90%]">
            {replaceQueue.value.length > 0 && replaceQueue.value.map((file) => (
              <div key={file.name} className="flex justify-between w-full">
                <p>{file.name}</p>
                <p>{returnFileSize(file.size)}</p>
                <X
                  onClick={(e) => {
                    e.preventDefault();
                    replaceQueue.value = [];
                  }}
                  className="w-[24px] h-[24px]"
                />
              </div>
            ))}
          </div>
          <input onChange={(e) => {
            const input = e.target as HTMLInputElement;
            if (input.files?.length) {
              replaceQueue.value = [input.files[0]];
            }
          }} id="replace-file-input" type="file" className="hidden" />
        </label>
        <br />
        <div className="actions">
          <button onClick={async () => {
            if (!replaceQueue.value.length || !editingFile.value) return;
            try {
              await PostService.replaceFileInPost(post, editingFile.value.links.self, replaceQueue.value[0]);
              showReplaceModal.value = false;
            } catch (err) {
              console.error('Failed to replace file:', err);
            }
          }} className="primary">Replace</button>
          <button onClick={() => showReplaceModal.value = false}>Cancel</button>
        </div>
      </Modal>
    </Card>
  );
}