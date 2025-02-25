import { useSignal, useSignalEffect } from "@preact/signals";
import { Modal } from "@tkottke90/preact-components";
import { useEffect, useRef } from "preact/hooks";
import { EmptyVideo } from "../../components/EmptyAsset";
import { useAsyncResource } from "../../components/Layouts/AsyncResource";
import { Card } from "../../components/Layouts/Card";
import { CustomComponent, getPortalContainer } from "../../utilities/component.utils";
import { returnFileSize } from "../../utilities/number.utils";
import { useDetailsPageContext } from "./context";
import { Fragment } from "preact/jsx-runtime";

const portal = getPortalContainer("modals");

export function MediaCard({ className }: CustomComponent) {
  const { post } = useDetailsPageContext();
  const showAddModal = useSignal(false);
  const fileQueue = useSignal<File[]>([]);

  const TextLoader = useAsyncResource();


  useSignalEffect(() => {
    if (!showAddModal.value) {
      fileQueue.value = [];
    }
  });

  return (
    <Card className={`col-span-4 md:col-span-2 ${className}`}>
      <div className="flex justify-between">
        <h4>Media</h4>
        <div>
          <button className="rounded-full hover:bg-stone-400 p-2" onClick={() => showAddModal.value = true}>
            <svg className="w-6 h-6 cursor-pointer hover:brightness-150" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>plus</title><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" /></svg>
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

          if (file.mime.startsWith("image")) {
            return <img key={`details-media-img-${i}`} src={file.links.media} className={commonClasses} />;
          }

          if (file.mime.startsWith("video")) {
            return file.size > 0
              ? <video key={`details-media-vid-${i}`} src={file.links.media} loop controls className={commonClasses} />
              : <EmptyVideo className={commonClasses} />
          }

          if (file.mime.startsWith('text')) {
            const key = `details-media-text-${i}`;
            const textValue = useSignal('');

            useEffect(() => {
              TextLoader.execute<string>(fetch(file.links.media)
                .then(async res => textValue.value = await res.text()))
            });

            return (
              <TextLoader.Provider key={key} >
                <pre className="whitespace-pre-wrap p-2 overflow-hidden" >{ textValue }</pre>
              </TextLoader.Provider>
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
                <svg
                  onClick={(e) => {
                    e.preventDefault();

                    const newQueue = [...fileQueue.value];
                    newQueue.splice(index, 1);

                    fileQueue.value = newQueue;
                  }}
                  className="w-[24px] h-[24px] "
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>close</title><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>
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
        <div className="actions">
          <button onClick={() => {
            const { value } = fileQueue;
            console.dir(value);

          }} className="primary">Upload</button>
        </div>
      </Modal>
    </Card>
  );
}

function Image({ src, className }: CustomComponent<{ src: string }>) {
  const imgRef = useRef<HTMLImageElement>();
  const loading = useSignal(true);

  useEffect(() => {
    if (!imgRef.current) return;

    const loadSignal = new AbortController();

    imgRef.current.addEventListener('load', () => {
      loading.value = false;
    }, { signal: loadSignal.signal })

    return () => {
      loadSignal.abort();
    }
  }, [src]);

  return (
    <div className="relative">
      <img src={src} className={className} />
      { loading.value && <div class="image-facade absolute inset-0"></div>}
    </div>
  )
}